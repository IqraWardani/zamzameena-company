import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type StorageConfig = {
  bucket: string;
  provider: string;
  client: S3Client;
};

let storageConfig: StorageConfig | undefined;

function getStorageConfig(): StorageConfig {
  if (storageConfig) return storageConfig;

  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Private object storage is not fully configured.");
  }

  const endpoint = process.env.S3_ENDPOINT || undefined;
  const region = process.env.S3_REGION || "us-east-1";
  storageConfig = {
    bucket,
    provider: "s3-compatible",
    client: new S3Client({
      region,
      endpoint,
      forcePathStyle: Boolean(endpoint),
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
  return storageConfig;
}

export async function uploadPrivateObject(input: {
  key: string;
  bytes: Uint8Array;
  checksumSha256: string;
}): Promise<{ provider: string }> {
  const config = getStorageConfig();
  await config.client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: input.key,
      Body: input.bytes,
      ContentType: "application/octet-stream",
      ChecksumSHA256: Buffer.from(input.checksumSha256, "hex").toString("base64"),
      Metadata: { "checksum-sha256": input.checksumSha256 },
    }),
  );
  return { provider: config.provider };
}

export async function readLegacyEventKeyVisualObject(
  key: string,
  maximumBytes: number,
): Promise<Uint8Array> {
  const config = getStorageConfig();
  const result = await config.client.send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Range: `bytes=0-${maximumBytes}`,
    }),
  );
  if (!result.Body) throw new Error("Stored Key Visual object has no body.");
  return result.Body.transformToByteArray();
}

export async function deletePrivateObject(key: string): Promise<void> {
  const config = getStorageConfig();
  await config.client.send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
  );
}

export async function createPrivateObjectDownloadUrl(
  key: string,
  filename: string,
): Promise<string> {
  const config = getStorageConfig();
  const safeFilename = filename.replace(/["\\\r\n]/g, "_").slice(0, 180);
  return getSignedUrl(
    config.client,
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ResponseContentType: "application/octet-stream",
      ResponseContentDisposition: `attachment; filename="${safeFilename}"`,
      ResponseCacheControl: "private, no-store",
    }),
    { expiresIn: 60 },
  );
}
