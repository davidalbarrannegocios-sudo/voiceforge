interface FlagIconProps {
  code: string;
  width?: number;
  height?: number;
}

export default function FlagIcon({ code, width = 16, height = 12 }: FlagIconProps) {
  return (
    <span
      className={`fi fi-${code.toLowerCase()}`}
      style={{ width, height, display: "inline-block", borderRadius: "2px", flexShrink: 0 }}
    />
  );
}
