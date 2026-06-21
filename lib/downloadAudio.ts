export function generateAudioFilename(text: string): string {
  const words = text.trim().split(/\s+/).slice(0, 2).join('_').replace(/[^a-zA-Z0-9_áéíóúñÁÉÍÓÚÑ]/g, '')
  const now = new Date()
  const date = now.toISOString().slice(0, 16).replace('T', '_').replace(':', '-')
  return `EliteLabs_${words}_${date}.mp3`
}

function needsProxy(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname.endsWith(".r2.dev") || hostname.endsWith(".your-objectstorage.com");
  } catch {
    return false;
  }
}

export function getProxiedUrl(url: string): string {
  return needsProxy(url)
    ? `/api/download-audio?url=${encodeURIComponent(url)}`
    : url;
}

export async function getAudioBlobUrl(url: string): Promise<string> {
  const proxied = getProxiedUrl(url);
  const res = await fetch(proxied);
  const arrayBuffer = await res.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
  return URL.createObjectURL(blob);
}

export async function downloadAudio(url: string, filename: string) {
  try {
    const a = document.createElement("a");
    a.href = `/api/download-audio?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.error("descargando audio:", e);
  }
}
