import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getPresignedUploadUrl } from "@/lib/r2";

export const runtime = "nodejs";

const MAX_SIZE = 200 * 1024 * 1024; // 200 MB

export async function POST(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { filename, contentType, size } = await req.json() as {
    filename: string;
    contentType: string;
    size: number;
  };

  if (!filename || !contentType || typeof size !== "number") {
    return NextResponse.json({ error: "Faltan parámetros: filename, contentType, size" }, { status: 400 });
  }
  if (size > MAX_SIZE) {
    return NextResponse.json({ error: "Archivo demasiado grande. Máximo 200 MB." }, { status: 400 });
  }

  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileKey = `uploads/translations/${clerkUser.id}/${Date.now()}-${sanitized}`;

  const uploadUrl = await getPresignedUploadUrl(fileKey, contentType, 300);

  console.log("[upload-presigned] generated for user:", clerkUser.id, "key:", fileKey);
  return NextResponse.json({ uploadUrl, fileKey });
}
