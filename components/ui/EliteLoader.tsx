export function EliteLoader({ size = 40 }: { size?: number }) {
  const bars = [0.45, 1, 1, 0.45];

  return (
    <div className="flex items-center gap-[12%]" style={{ height: size, width: size * 1.4 }}>
      {bars.map((scale, i) => (
        <div
          key={i}
          className="flex-1 rounded-full bg-white animate-equalizer"
          style={{
            height: `${size * scale}px`,
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}
