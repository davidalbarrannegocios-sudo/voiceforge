export function EliteLoader({ size = 20 }: { size?: number }) {
  const bars = [0.45, 1, 0.65, 1, 0.45]

  return (
    <div className="flex items-center gap-[10%]" style={{ height: size, width: size * 1.5 }}>
      {bars.map((scale, i) => (
        <div
          key={i}
          className="flex-1 rounded-full bg-white/40 animate-equalizer"
          style={{
            height: `${size * scale}px`,
            animationDelay: `${i * 0.12}s`,
          }}
        />
      ))}
    </div>
  )
}
