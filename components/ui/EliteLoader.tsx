export function EliteLoader({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-end gap-[3px]" style={{ height: size }}>
      {[0.4, 0.7, 1, 0.7, 0.4].map((scale, i) => (
        <div
          key={i}
          className="w-[4px] rounded-full bg-white animate-equalizer"
          style={{
            height: `${size * scale}px`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}
