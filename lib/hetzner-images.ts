import { audioClient } from "@/lib/r2";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const BUCKET = process.env.HETZNER_AUDIO_BUCKET ?? "elitelabs-audio";
const PUBLIC_URL = process.env.HETZNER_AUDIO_PUBLIC_URL ?? "https://elitelabs-audio.fsn1.your-objectstorage.com";

export async function uploadImageToHetzner(
  base64OrUrl: string,
  key: string,
  contentType = "image/png"
): Promise<string> {
  let buffer: Buffer;
  if (base64OrUrl.startsWith("data:")) {
    const base64Data = base64OrUrl.split(",")[1];
    buffer = Buffer.from(base64Data, "base64");
  } else {
    const res = await fetch(base64OrUrl);
    buffer = Buffer.from(await res.arrayBuffer());
  }

  await audioClient.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: "public-read",
  }));

  return `${PUBLIC_URL}/${key}`;
}

export async function deleteImageFromHetzner(key: string): Promise<void> {
  if (!key) return;
  try {
    await audioClient.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (e) {
    console.error("[hetzner-images] delete error:", e);
  }
}
