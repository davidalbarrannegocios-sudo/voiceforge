export async function GET(request: Request) {
  const url = new URL(request.url);
  const imageUrl = url.searchParams.get("url");
  if (!imageUrl) return new Response("Missing url", { status: 400 });

  const res = await fetch(imageUrl, {
    headers: { Referer: "https://fish.audio" },
  });

  if (!res.ok) return new Response("Not found", { status: 404 });

  const buffer = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") || "image/jpeg";

  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
