import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const ALLOWED_ORIGINS = [
  process.env.R2_PUBLIC_URL ?? "",
  process.env.HETZNER_AUDIO_PUBLIC_URL ?? "",
];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (ALLOWED_ORIGINS.some(o => o && url.startsWith(o))) return true;
    if (parsed.hostname.endsWith(".r2.dev")) return true;
    if (parsed.hostname.endsWith(".your-objectstorage.com")) return true;
    return false;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const url = request.nextUrl.searchParams.get("url");
  const filename = request.nextUrl.searchParams.get("filename") || "audio.mp3";

  if (!url) return new NextResponse("Missing url", { status: 400 });
  if (!isAllowedUrl(url)) return new NextResponse("URL not allowed", { status: 403 });

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) throw new Error(`Upstream ${upstream.status}`);

    const contentType = upstream.headers.get("content-type") || "audio/mpeg";
    const contentLength = upstream.headers.get("content-length");

    const safeFilename = filename.replace(/[^a-zA-Z0-9._\-\s]/g, "_");
    const encodedFilename = encodeURIComponent(safeFilename);

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
      "Cache-Control": "no-store",
    };

    if (contentLength) {
      headers["Content-Length"] = contentLength;
    }

    return new NextResponse(upstream.body, { headers });
  } catch (error) {
    console.error("[download-audio]", error);
    return new NextResponse("Error downloading audio", { status: 500 });
  }
}
