"use client";

import { generateVoiceGradient } from "@/lib/voice-gradient";

export function VoiceAvatarGenerative({
  seed,
  size = 40,
  className = "",
}: {
  seed: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg ${className}`}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        background: generateVoiceGradient(seed),
      }}
    />
  );
}
