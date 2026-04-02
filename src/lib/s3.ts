import "server-only";

import {
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";

type S3RuntimeConfig = {
  region: string;
  bucketName: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  publicUrlBase?: string;
};

function readTrimmedEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function assertValidBucketName(bucketName: string): void {
  const bucketPattern = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
  if (!bucketPattern.test(bucketName)) {
    throw new Error(
      "AWS_S3_BUCKET_NAME 형식이 올바르지 않습니다. 공백/따옴표/슬래시 포함 여부를 확인하세요.",
    );
  }
}

function getS3RuntimeConfig(): S3RuntimeConfig {
  const region = readTrimmedEnv("AWS_REGION");
  if (!region) {
    throw new Error("AWS_REGION 환경변수가 설정되지 않았습니다.");
  }

  const bucketName = readTrimmedEnv("AWS_S3_BUCKET_NAME");
  if (!bucketName) {
    throw new Error("AWS_S3_BUCKET_NAME 환경변수가 설정되지 않았습니다.");
  }
  assertValidBucketName(bucketName);

  const accessKeyId = readTrimmedEnv("AWS_ACCESS_KEY_ID");
  const secretAccessKey = readTrimmedEnv("AWS_SECRET_ACCESS_KEY");

  if ((accessKeyId && !secretAccessKey) || (!accessKeyId && secretAccessKey)) {
    throw new Error(
      "AWS_ACCESS_KEY_ID와 AWS_SECRET_ACCESS_KEY는 함께 설정하거나 함께 비워야 합니다.",
    );
  }

  return {
    region,
    bucketName,
    accessKeyId,
    secretAccessKey,
    publicUrlBase: readTrimmedEnv("AWS_S3_PUBLIC_URL_BASE"),
  };
}

function createS3Client(config: S3RuntimeConfig): S3Client {
  return new S3Client({
    region: config.region,
    ...(config.accessKeyId && config.secretAccessKey
      ? {
          credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          },
        }
      : {}),
  });
}

const s3Global = globalThis as typeof globalThis & {
  __s3?: S3Client;
  __s3ConfigKey?: string;
};

function getS3Client(config: S3RuntimeConfig): S3Client {
  const configKey = [config.region, config.accessKeyId, config.secretAccessKey].join("|");

  if (!s3Global.__s3 || s3Global.__s3ConfigKey !== configKey) {
    s3Global.__s3 = createS3Client(config);
    s3Global.__s3ConfigKey = configKey;
  }

  return s3Global.__s3;
}

export function getS3BucketName(): string {
  return getS3RuntimeConfig().bucketName;
}

function toS3PublicUrl(config: S3RuntimeConfig, key: string): string {
  if (config.publicUrlBase) {
    return `${config.publicUrlBase.replace(/\/$/, "")}/${key}`;
  }

  return `https://${config.bucketName}.s3.${config.region}.amazonaws.com/${key}`;
}

export async function uploadImageToS3(
  file: File,
  destPath: string,
): Promise<string> {
  const config = getS3RuntimeConfig();
  const s3 = getS3Client(config);
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: config.bucketName,
        Key: destPath,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
        CacheControl: "public, max-age=31536000",
      }),
    );
  } catch (error) {
    if (error instanceof S3ServiceException) {
      const serviceError = error as S3ServiceException & {
        $response?: { headers?: Record<string, string> };
      };
      const bucketRegion = serviceError.$response?.headers?.["x-amz-bucket-region"];

      if (error.name === "NoSuchBucket") {
        throw new Error(
          `S3 버킷을 찾을 수 없습니다: ${config.bucketName}. AWS_S3_BUCKET_NAME 오탈자, 공백 포함 여부, 계정/리전(${config.region}) 일치 여부를 확인하세요.`,
        );
      }

      if (error.name === "PermanentRedirect" || error.name === "AuthorizationHeaderMalformed") {
        throw new Error(
          `S3 버킷 리전이 다를 수 있습니다. 현재 AWS_REGION=${config.region}` +
            (bucketRegion ? `, 실제 버킷 리전=${bucketRegion}` : "") +
            ".",
        );
      }
    }

    throw error;
  }

  return toS3PublicUrl(config, destPath);
}
