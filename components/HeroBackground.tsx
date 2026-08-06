"use client";

import { useEffect, useRef, useState } from "react";

export function HeroBackground() {
  const glowRef = useRef<HTMLDivElement>(null);
  const [pointerActive, setPointerActive] = useState(false);

  useEffect(() => {
    function handleMove(e: MouseEvent) {
      glowRef.current?.style.setProperty("--mx", `${e.clientX}px`);
      glowRef.current?.style.setProperty("--my", `${e.clientY}px`);
      setPointerActive(true);
    }
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute -left-1/4 top-[-10%] h-[60vmax] w-[60vmax] animate-[heroDriftA_22s_ease-in-out_infinite] rounded-full bg-indigo-600/25 blur-[110px]" />
      <div className="absolute -right-1/4 bottom-[-10%] h-[55vmax] w-[55vmax] animate-[heroDriftB_26s_ease-in-out_infinite] rounded-full bg-amber-500/20 blur-[120px]" />
      <div
        ref={glowRef}
        className="pointer-events-none absolute inset-0 transition-opacity duration-700"
        style={{
          opacity: pointerActive ? 1 : 0,
          background:
            "radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.10), transparent 70%)",
        }}
      />
    </div>
  );
}
