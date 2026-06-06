function needsProxy(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    // R2 public URLs (pub-*.r2.dev) block browser fetch via CORS
    return hostname.endsWith(".r2.dev");
  } catch {
    return false;
  }
}

export async function downloadAudio(url: string, filename: string) {
  try {
    const fetchUrl = needsProxy(url)
      ? `/api/download-audio?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`
      : url;

    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || "audio.mp3";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Error descargando audio:", error);
  }
}
