import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { downloadFromR2, keyFromPublicUrl } from "@/lib/r2";

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? "";
const HETZNER_OS_PUBLIC_URL = process.env.HETZNER_OS_PUBLIC_URL ?? "";

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (R2_PUBLIC_URL && url.startsWith(R2_PUBLIC_URL)) return true;
    if (parsed.hostname.endsWith(".r2.dev")) return true;
    if (HETZNER_OS_PUBLIC_URL && url.startsWith(HETZNER_OS_PUBLIC_URL)) return true;
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
    // Si es URL de Hetzner, usar el SDK directamente (bucket privado)
    if (HETZNER_OS_PUBLIC_URL && url.startsWith(HETZNER_OS_PUBLIC_URL)) {
      const key = keyFromPublicUrl(url);
      const buffer = await downloadFromR2(key);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": buffer.byteLength.toString(),
          "Cache-Control": "no-store",
        },
      });
    }

    // URLs de R2 público — fetch directo
    const upstream = await fetch(url);
    if (!upstream.ok) throw new Error(`Upstream ${upstream.status}`);
    const buffer = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") || "audio/mpeg";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.byteLength.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[download-audio]", error);
    return new NextResponse("Error downloading audio", { status: 500 });
  }
}
