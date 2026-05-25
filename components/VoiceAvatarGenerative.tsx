"use client";

import { useMemo, useRef, useEffect } from "react";

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function VoiceAvatarGenerative({
  seed,
  size = 40,
  className = "",
}: {
  seed: string;
  size?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const config = useMemo(() => {
    const h = hashCode(seed);
    const palettes = [
      ["#60a5fa", "#3b82f6", "#1d4ed8"],
      ["#f472b6", "#ec4899", "#be185d"],
      ["#34d399", "#10b981", "#047857"],
      ["#67e8f9", "#06b6d4", "#0e7490"],
      ["#a3e635", "#84cc16", "#4d7c0f"],
      ["#fb923c", "#f97316", "#c2410c"],
      ["#c084fc", "#a855f7", "#7e22ce"],
    ];
    const palette = palettes[h % palettes.length];
    const petals = 5 + (h >> 4) % 6;
    const rotation = (h >> 8) % 360;
    return { palette, petals, rotation };
  }, [seed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const s = size * 2;
    canvas.width = s;
    canvas.height = s;
    const cx = s / 2, cy = s / 2, r = s * 0.38;

    ctx.clearRect(0, 0, s, s);

    // Background
    ctx.fillStyle = config.palette[2] + "33";
    ctx.fillRect(0, 0, s, s);

    // Petals
    for (let i = 0; i < config.petals; i++) {
      const angle = (i / config.petals) * Math.PI * 2 + (config.rotation * Math.PI / 180);
      const grad = ctx.createRadialGradient(
        cx, cy, 0,
        cx + Math.cos(angle) * r * 0.5,
        cy + Math.sin(angle) * r * 0.5,
        r
      );
      grad.addColorStop(0, config.palette[0] + "cc");
      grad.addColorStop(0.5, config.palette[1] + "99");
      grad.addColorStop(1, config.palette[2] + "00");

      ctx.beginPath();
      ctx.ellipse(
        cx + Math.cos(angle) * r * 0.3,
        cy + Math.sin(angle) * r * 0.3,
        r * 0.7, r * 0.35,
        angle, 0, Math.PI * 2
      );
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Bright center
    const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.4);
    centerGrad.addColorStop(0, config.palette[0] + "ff");
    centerGrad.addColorStop(1, config.palette[1] + "00");
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = centerGrad;
    ctx.fill();
  }, [config, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
