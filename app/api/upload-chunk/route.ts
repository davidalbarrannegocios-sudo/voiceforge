import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { uploadToR2, downloadFromR2, deleteFromR2 } from "@/lib/r2";

export const runtime = "nodejs";
export const maxDuration = 60;

const CONTENT_TYPES: Record<string, string> = {
  mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4",
  ogg: "audio/ogg", webm: "audio/webm",
};

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch (e) {
    return NextResponse.json({ error: "Error al leer el chunk" }, { status: 400 });
  }

  const chunk       = form.get("chunk") as File | null;
  const uploadId    = form.get("uploadId") as string | null;
  const chunkIndex  = parseInt(form.get("chunkIndex") as string, 10);
  const totalChunks = parseInt(form.get("totalChunks") as string, 10);
  const filename    = form.get("filename") as string | null;

  if (!chunk || !uploadId || isNaN(chunkIndex) || isNaN(totalChunks) || !filename) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const userId = clerkUser.id;
  const idx = String(chunkIndex).padStart(5, "0");
  const chunkKey = `uploads/chunks/${userId}/${uploadId}/${idx}`;

  // Write this chunk to R2
  const chunkBuffer = Buffer.from(await chunk.arrayBuffer());
  await uploadToR2(chunkKey, chunkBuffer, "application/octet-stream");

  console.log(`[upload-chunk] ${chunkIndex + 1}/${totalChunks} — ${chunkBuffer.length} bytes → ${chunkKey}`);

  // If this is NOT the last chunk, just acknowledge
  if (chunkIndex < totalChunks - 1) {
    return NextResponse.json({ done: false, chunkIndex });
  }

  // Last chunk: assemble all parts from R2
  console.log(`[upload-chunk] assembling ${totalChunks} chunks for uploadId=${uploadId}`);
  const parts: Buffer[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const key = `uploads/chunks/${userId}/${uploadId}/${String(i).padStart(5, "0")}`;
    const part = await downloadFromR2(key);
    parts.push(part);
  }
  const assembled = Buffer.concat(parts);

  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[ext] ?? "audio/mpeg";
  const fileKey = `uploads/translations/${userId}/${uploadId}-${sanitized}`;

  await uploadToR2(fileKey, assembled, contentType);
  console.log(`[upload-chunk] assembled → ${fileKey} (${assembled.length} bytes)`);

  // Clean up chunks (non-blocking)
  for (let i = 0; i < totalChunks; i++) {
    const key = `uploads/chunks/${userId}/${uploadId}/${String(i).padStart(5, "0")}`;
    deleteFromR2(key).catch(() => {});
  }

  return NextResponse.json({ done: true, fileKey });
}
