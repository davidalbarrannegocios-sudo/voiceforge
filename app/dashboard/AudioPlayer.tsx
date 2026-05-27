"use client";

import { useState, useRef } from "react";

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({
  src,
  filename = "elitelabs-audio.mp3",
}: {
  src: string;
  filename?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const progress = duration > 0 ? currentTime / duration : 0;

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); } else { audio.play(); }
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration;
  }

  return (
    <div
      className="rounded-xl p-4 border"
      style={{ background: "#12121a", borderColor: "#2a2a3e" }}
    >
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
      />

      {/* Controls row */}
      <div className="flex items-center gap-3">
        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          style={{ background: "#ffffff", boxShadow: "0 0 12px rgba(255,255,255,0.15)" }}
          aria-label={playing ? "Pausar" : "Reproducir"}
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="#000000">
              <rect x="2" y="1" width="4" height="12" rx="1" />
              <rect x="8" y="1" width="4" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="#000000">
              <path d="M3 1.5L12.5 7 3 12.5V1.5z" />
            </svg>
          )}
        </button>

        {/* Progress bar */}
        <div
          className="flex-1 group cursor-pointer"
          onClick={handleSeek}
          aria-label="Barra de progreso"
        >
          <div className="relative h-1.5 rounded-full" style={{ background: "#333333" }}>
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all"
              style={{ width: `${progress * 100}%`, background: "#ffffff" }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${progress * 100}% - 6px)`, background: "#ffffff", boxShadow: "0 0 6px rgba(255,255,255,0.5)" }}
            />
          </div>
        </div>

        {/* Time */}
        <span className="flex-shrink-0 text-xs font-mono tabular-nums" style={{ color: "#8888a8", minWidth: "75px", textAlign: "right" }}>
          {fmt(currentTime)} / {fmt(duration)}
        </span>

        {/* Download */}
        <a
          href={src}
          download={filename}
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105"
          style={{ background: "#1a1a2e", border: "1px solid #2a2a3e", color: "#93c5fd" }}
          aria-label="Descargar audio"
          title="Descargar"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 1v8M4 6l3 3 3-3" />
            <path d="M1 11h12" />
          </svg>
        </a>
      </div>
    </div>
  );
}
