const API_KEY = process.env.SK_AI33_KEY

async function checkEndpoint(label: string, url: string) {
  console.log(`\n── ${label} ──`)
  console.log('URL:', url)
  const res = await fetch(url, {
    headers: { 'xi-api-key': API_KEY ?? '', 'Content-Type': 'application/json' },
  })
  console.log('Status:', res.status)
  const text = await res.text()
  let data: unknown
  try { data = JSON.parse(text) } catch { console.log('Raw:', text.substring(0, 500)); return }

  if (Array.isArray(data)) {
    console.log('Total voces:', data.length)
    if (data.length > 0) console.log('Primera voz:', JSON.stringify(data[0], null, 2))
  } else if (data && typeof data === 'object' && 'voices' in data) {
    const d = data as { voices: unknown[]; total_count?: number }
    console.log('Total voces (voices[]):', d.voices.length)
    if (d.total_count !== undefined) console.log('total_count:', d.total_count)
    if (d.voices.length > 0) console.log('Primera voz:', JSON.stringify(d.voices[0], null, 2))
  } else {
    console.log('Respuesta:', JSON.stringify(data).substring(0, 500))
  }
}

async function main() {
  if (!API_KEY) { console.error('SK_AI33_KEY no está definida en el entorno'); process.exit(1) }
  console.log('API key presente:', API_KEY.substring(0, 8) + '...')

  await checkEndpoint('GET /v1/voices', 'https://api.ai33.pro/v1/voices')
  await checkEndpoint('GET /v1/shared-voices (page_size=100)', 'https://api.ai33.pro/v1/shared-voices?page_size=100')
}

main().catch(console.error)
