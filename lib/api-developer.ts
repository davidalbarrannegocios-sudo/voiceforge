export const BYTES_PER_EURO = 1_000_000 / 18
export const PRICE_PER_MILLION_BYTES = 18

export function getConcurrency(totalSpentEuros: number): number {
  if (totalSpentEuros >= 3000) return 50
  if (totalSpentEuros >= 1500) return 40
  if (totalSpentEuros >= 250)  return 10
  return 3
}

export function getApiKeyLimit(plan: string): number {
  switch (plan?.toLowerCase()) {
    case 'starter':    return 1
    case 'pro':        return 3
    case 'elite':      return 5
    case 'enterprise': return 10
    default:           return 0
  }
}

export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `el_live_${result}`
}

export function formatBytes(bytes: number | bigint): string {
  const n = Number(bytes)
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} GB`
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(2)} M`
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)} KB`
  return `${n} bytes`
}
