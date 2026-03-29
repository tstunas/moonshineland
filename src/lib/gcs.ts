import "server-only";

import { Storage } from "@google-cloud/storage";

// 환경변수:
//   GCS_BUCKET_NAME      — 업로드 대상 버킷 이름 (필수)
//   GCS_KEY_FILE         — 서비스 계정 JSON 파일 경로 (선택: 생략 시 ADC 사용)
//   GCS_PROJECT_ID       — 프로젝트 ID (선택: ADC 사용 시 생략 가능)
//   GCS_PUBLIC_URL_BASE  — 커스텀 도메인 베이스 URL (선택: 생략 시 storage.googleapis.com 사용)

function createStorage(): Storage {
  const keyFile = process.env.GCS_KEY_FILE;
  const projectId = process.env.GCS_PROJECT_ID;

  return new Storage({
    ...(keyFile ? { keyFile } : {}),
    ...(projectId ? { projectId } : {}),
  });
}

// Next.js dev 핫리로드에서 중복 인스턴스를 방지하기 위해 global에 캐시
const gcsGlobal = globalThis as typeof globalThis & {
  __gcs?: Storage;
};

export const gcs: Storage = gcsGlobal.__gcs ?? (gcsGlobal.__gcs = createStorage());

export function getGcsBucket() {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("GCS_BUCKET_NAME 환경변수가 설정되지 않았습니다.");
  }
  return gcs.bucket(bucketName);
}

/**
 * GCS에 이미지 파일을 업로드하고 공개 URL을 반환합니다.
 *
 * @param file      업로드할 File 객체
 * @param destPath  버킷 내 저장 경로 (예: "boards/anchor/1/filename.jpg")
 * @returns         파일의 공개 접근 URL
 */
export async function uploadImageToGcs(
  file: File,
  destPath: string,
): Promise<string> {
  const bucket = getGcsBucket();
  const blob = bucket.file(destPath);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  await blob.save(buffer, {
    metadata: {
      contentType: file.type || "application/octet-stream",
      cacheControl: "public, max-age=31536000",
    },
    resumable: false,
  });

  const customBase = process.env.GCS_PUBLIC_URL_BASE;
  if (customBase) {
    return `${customBase.replace(/\/$/, "")}/${destPath}`;
  }

  const bucketName = process.env.GCS_BUCKET_NAME!;
  return `https://storage.googleapis.com/${bucketName}/${destPath}`;
}
