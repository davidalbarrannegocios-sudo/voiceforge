import { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2Client = new S3Client({
  region: "eu-central",
  endpoint: process.env.HETZNER_OS_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.HETZNER_OS_ACCESS_KEY!,
    secretAccessKey: process.env.HETZNER_OS_SECRET_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.HETZNER_OS_BUCKET!;
const PUBLIC_URL = process.env.HETZNER_OS_PUBLIC_URL!;

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: `audio/${key}`,
      Body: body,
      ContentType: contentType,
    })
  );
  return `${PUBLIC_URL}/audio/${key}`;
}

export async function getPresignedUploadUrl(key: string, contentType: string, expiresIn = 3600) {
  return getSignedUrl(
    r2Client,
    new PutObjectCommand({ Bucket: BUCKET, Key: `audio/${key}`, ContentType: contentType }),
    { expiresIn }
  );
}

export async function downloadFromR2(key: string): Promise<Buffer> {
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const cleanKey = key.startsWith('audio/') ? key : `audio/${key}`;
  const obj = await r2Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: cleanKey }));
  if (!obj.Body) throw new Error(`Object ${key} has no body`);
  return Buffer.from(await obj.Body.transformToByteArray());
}

export function getPublicUrl(key: string): string {
  const cleanKey = key.startsWith('audio/') ? key : `audio/${key}`;
  return `${PUBLIC_URL}/${cleanKey}`;
}

export async function r2KeyExists(key: string): Promise<boolean> {
  try {
    const cleanKey = key.startsWith('audio/') ? key : `audio/${key}`;
    await r2Client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: cleanKey }));
    return true;
  } catch {
    return false;
  }
}

export async function deleteFromR2(key: string): Promise<void> {
  const cleanKey = key.startsWith('audio/') ? key : `audio/${key}`;
  await r2Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: cleanKey }));
}

export function keyFromPublicUrl(url: string): string {
  const base = process.env.HETZNER_OS_PUBLIC_URL ?? "";
  if (base && url.startsWith(base)) return url.slice(base.length + 1);
  try { return new URL(url).pathname.slice(1); } catch { return url; }
}
