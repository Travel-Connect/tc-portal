"use client";

import { useRef } from "react";

const sounds = [
  { src: "/sounds/whistle.mp3", label: "ホイッスル", icon: "🏁" },
  { src: "/sounds/vibraslap.mp3", label: "ビブラスラップ", icon: "🎵" },
] as const;

export function SoundButtons() {
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);

  const play = (index: number) => {
    const audio = audioRefs.current[index];
    if (!audio) return;
    audio.currentTime = 0;
    audio.play();
  };

  return (
    <div className="fixed left-[4rem] bottom-4 z-50 flex gap-2">
      {sounds.map((s, i) => (
        <button
          key={s.src}
          onClick={() => play(i)}
          title={s.label}
          className="w-10 h-10 rounded-full bg-muted/80 backdrop-blur hover:bg-muted border border-border shadow-sm flex items-center justify-center text-lg transition-colors"
        >
          {s.icon}
          <audio
            ref={(el) => { audioRefs.current[i] = el; }}
            src={s.src}
            preload="auto"
          />
        </button>
      ))}
    </div>
  );
}
