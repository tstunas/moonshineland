import "server-only";

import { uploadImageToS3 } from "@/lib/s3";

export async function uploadImageToGcs(
  file: File,
  destPath: string,
): Promise<string> {
  return uploadImageToS3(file, destPath);
}
