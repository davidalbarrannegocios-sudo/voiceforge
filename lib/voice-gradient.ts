export function generateVoiceGradient(voiceId: string): string {
  let hash = 0
  for (let i = 0; i < voiceId.length; i++) {
    hash = ((hash << 5) - hash) + voiceId.charCodeAt(i)
    hash |= 0
  }

  const abs = Math.abs(hash)

  const palettes = [
    ['#ff6b6b', '#feca57'],
    ['#ff9ff3', '#f368e0'],
    ['#54a0ff', '#5f27cd'],
    ['#00d2d3', '#54a0ff'],
    ['#ff9f43', '#ee5a24'],
    ['#1dd1a1', '#10ac84'],
    ['#fd79a8', '#e17055'],
    ['#a29bfe', '#6c5ce7'],
    ['#55efc4', '#00b894'],
    ['#fdcb6e', '#e17055'],
    ['#74b9ff', '#0984e3'],
    ['#ff7675', '#d63031'],
    ['#00cec9', '#6c5ce7'],
    ['#fddb58', '#f9ca24'],
    ['#ff6b9d', '#c44569'],
    ['#f8a5c2', '#f78fb3'],
    ['#786fa6', '#574b90'],
    ['#ea8685', '#cf6a87'],
    ['#3dc1d3', '#33d9b2'],
    ['#ffb142', '#ff793f'],
    ['#fd79a8', '#fdcb6e', '#6c5ce7'],
    ['#55efc4', '#74b9ff', '#a29bfe'],
    ['#ff7675', '#fdcb6e', '#55efc4'],
    ['#fd79a8', '#e17055', '#fdcb6e'],
    ['#6c5ce7', '#a29bfe', '#fd79a8'],
    ['#00cec9', '#55efc4', '#fdcb6e'],
  ]

  const palette = palettes[abs % palettes.length]
  const angle = (abs % 12) * 30

  if (palette.length === 2) {
    return `linear-gradient(${angle}deg, ${palette[0]}, ${palette[1]})`
  }
  return `linear-gradient(${angle}deg, ${palette[0]}, ${palette[1]}, ${palette[2]})`
}
