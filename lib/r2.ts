import { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return `${PUBLIC_URL}/${key}`;
}

export async function getPresignedUploadUrl(key: string, contentType: string, expiresIn = 3600) {
  return getSignedUrl(
    r2Client,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
    { expiresIn }
  );
}

export async function downloadFromR2(key: string): Promise<Buffer> {
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const obj = await r2Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!obj.Body) throw new Error(`R2 object ${key} has no body`);
  return Buffer.from(await obj.Body.transformToByteArray());
}

export function getPublicUrl(key: string): string {
  return `${PUBLIC_URL}/${key}`;
}

export async function r2KeyExists(key: string): Promise<boolean> {
  try {
    await r2Client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export function keyFromPublicUrl(url: string): string {
  const base = process.env.R2_PUBLIC_URL ?? "";
  if (base && url.startsWith(base)) return url.slice(base.length + 1);
  try { return new URL(url).pathname.slice(1); } catch { return url; }
}
