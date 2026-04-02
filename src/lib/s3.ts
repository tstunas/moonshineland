import "server-only";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type AwsErrorWithMetadata = Error & {
  name?: string;
  Code?: string;
  code?: string;
  $fault?: "client" | "server";
  $metadata?: {
    httpStatusCode?: number;
    requestId?: string;
    extendedRequestId?: string;
    attempts?: number;
    totalRetryDelay?: number;
  };
};

function getS3FailureHint(error: AwsErrorWithMetadata): string {
  const code = (error.Code ?? error.code ?? error.name ?? "").toLowerCase();
  const status = error.$metadata?.httpStatusCode;

  if (code.includes("accessdenied") || status === 403) {
    return "권한 문제 가능성(IAM 정책, 버킷 정책, KMS 권한)을 확인하세요.";
  }

  if (code.includes("nosuchbucket") || code.includes("notfound") || status === 404) {
    return "버킷 이름/리전 불일치 또는 버킷 미존재 가능성을 확인하세요.";
  }

  if (code.includes("invalidaccesskeyid") || code.includes("signaturedoesnotmatch")) {
    return "AWS 자격증명(AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY) 또는 서명 리전 불일치를 확인하세요.";
  }

  if (code.includes("entitytoolarge") || status === 413) {
    return "업로드 파일 용량 제한 초과 가능성을 확인하세요.";
  }

  if (code.includes("slowdown") || status === 429) {
    return "요청량 제한(Throttle) 가능성이 있습니다. 재시도 정책과 요청 빈도를 확인하세요.";
  }

  if (status && status >= 500) {
    return "S3 서버 측 일시 오류 가능성이 있습니다. 재시도 후 AWS 상태를 확인하세요.";
  }

  return "환경변수, 네트워크, CORS/프록시 설정, 파일 타입/크기를 순서대로 확인하세요.";
}

function logS3UploadFailure(params: {
  error: unknown;
  bucketName: string;
  destPath: string;
  file: File;
  region: string | undefined;
}) {
  const errorObj =
    params.error instanceof Error
      ? (params.error as AwsErrorWithMetadata)
      : (new Error(String(params.error)) as AwsErrorWithMetadata);

  const hint = getS3FailureHint(errorObj);

  console.error("[s3-upload] failed", {
    bucketName: params.bucketName,
    key: params.destPath,
    fileSize: params.file.size,
    fileType: params.file.type || "application/octet-stream",
    region: params.region,
    errorName: errorObj.name,
    errorCode: errorObj.Code ?? errorObj.code,
    errorMessage: errorObj.message,
    fault: errorObj.$fault,
    httpStatusCode: errorObj.$metadata?.httpStatusCode,
    requestId: errorObj.$metadata?.requestId,
    extendedRequestId: errorObj.$metadata?.extendedRequestId,
    attempts: errorObj.$metadata?.attempts,
    totalRetryDelay: errorObj.$metadata?.totalRetryDelay,
    hint,
  });
}

function createS3Client(): S3Client {
  const region = process.env.AWS_REGION;
  if (!region) {
    throw new Error("AWS_REGION 환경변수가 설정되지 않았습니다.");
  }

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  return new S3Client({
    region,
    ...(accessKeyId && secretAccessKey
      ? {
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        }
      : {}),
  });
}

const s3Global = globalThis as typeof globalThis & {
  __s3?: S3Client;
};

export const s3: S3Client = s3Global.__s3 ?? (s3Global.__s3 = createS3Client());

export function getS3BucketName(): string {
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("AWS_S3_BUCKET_NAME 환경변수가 설정되지 않았습니다.");
  }

  return bucketName;
}

function toS3PublicUrl(bucketName: string, key: string): string {
  const customBase = process.env.AWS_S3_PUBLIC_URL_BASE;
  if (customBase) {
    return `${customBase.replace(/\/$/, "")}/${key}`;
  }

  const region = process.env.AWS_REGION;
  if (!region) {
    throw new Error("AWS_REGION 환경변수가 설정되지 않았습니다.");
  }

  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
}

export async function uploadImageToS3(
  file: File,
  destPath: string,
): Promise<string> {
  const bucketName = getS3BucketName();
  const region = process.env.AWS_REGION;
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: destPath,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
        CacheControl: "public, max-age=31536000",
      }),
    );
  } catch (error: unknown) {
    logS3UploadFailure({
      error,
      bucketName,
      destPath,
      file,
      region,
    });
    throw error;
  }

  return toS3PublicUrl(bucketName, destPath);
}
