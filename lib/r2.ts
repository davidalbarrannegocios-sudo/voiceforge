import { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cliente para backups (privado)
export const r2Client = new S3Client({
  region: "eu-central",
  endpoint: process.env.HETZNER_OS_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.HETZNER_OS_ACCESS_KEY!,
    secretAccessKey: process.env.HETZNER_OS_SECRET_KEY!,
  },
  forcePathStyle: true,
});

// Cliente para audios (público)
export const audioClient = new S3Client({
  region: "eu-central",
  endpoint: process.env.HETZNER_AUDIO_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.HETZNER_AUDIO_ACCESS_KEY!,
    secretAccessKey: process.env.HETZNER_AUDIO_SECRET_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.HETZNER_OS_BUCKET!;
const AUDIO_BUCKET = process.env.HETZNER_AUDIO_BUCKET!;
const PUBLIC_URL = process.env.HETZNER_AUDIO_PUBLIC_URL!;

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  await audioClient.send(
    new PutObjectCommand({
      Bucket: AUDIO_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return `${PUBLIC_URL}/${key}`;
}

export async function getPresignedUploadUrl(key: string, contentType: string, expiresIn = 3600) {
  return getSignedUrl(
    audioClient,
    new PutObjectCommand({ Bucket: AUDIO_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn }
  );
}

export async function downloadFromR2(key: string): Promise<Buffer> {
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const cleanKey = key.startsWith('audio/') ? key : `audio/${key}`;
  const obj = await audioClient.send(new GetObjectCommand({ Bucket: AUDIO_BUCKET, Key: cleanKey }));
  if (!obj.Body) throw new Error(`Object ${key} has no body`);
  return Buffer.from(await obj.Body.transformToByteArray());
}

export function getPublicUrl(key: string): string {
  return `${PUBLIC_URL}/${key}`;
}

export async function r2KeyExists(key: string): Promise<boolean> {
  try {
    await audioClient.send(new HeadObjectCommand({ Bucket: AUDIO_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function deleteFromR2(key: string): Promise<void> {
  await audioClient.send(new DeleteObjectCommand({ Bucket: AUDIO_BUCKET, Key: key }));
}

export function keyFromPublicUrl(url: string): string {
  const base = process.env.HETZNER_AUDIO_PUBLIC_URL ?? "";
  if (base && url.startsWith(base)) return url.slice(base.length + 1);
  try { return new URL(url).pathname.slice(1); } catch { return url; }
}
