import "server-only";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: destPath,
      Body: buffer,
      ContentType: file.type || "application/octet-stream",
      CacheControl: "public, max-age=31536000",
    }),
  );

  return toS3PublicUrl(bucketName, destPath);
}
