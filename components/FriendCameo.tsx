"use client";

import { useEffect, useRef, useState } from "react";

const CAMEO_COUNT = 21;
const TRAVEL_MS = 6500;

const CORNER_PAIRS: Array<[[number, number], [number, number]]> = [
  [
    [0, 0],
    [1, 1],
  ],
  [
    [1, 0],
    [0, 1],
  ],
  [
    [1, 1],
    [0, 0],
  ],
  [
    [0, 1],
    [1, 0],
  ],
];

function easeInOutSine(t: number) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function scheduleNext(trigger: () => void) {
  const delay = 40_000 + Math.random() * 50_000; // 40–90s
  return window.setTimeout(() => {
    if (Math.random() < 0.3) trigger();
    scheduleNext(trigger);
  }, delay);
}

export function FriendCameo() {
  const [src, setSrc] = useState<string | null>(null);
  const elRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const show = () => {
      const n = 1 + Math.floor(Math.random() * CAMEO_COUNT);
      setSrc(`/cameos/${n}.jpg`);
    };
    const timerId = scheduleNext(show);
    return () => window.clearTimeout(timerId);
  }, []);

  useEffect(() => {
    if (!src) return;
    const el = elRef.current;
    if (!el) return;

    const { width: elW, height: elH } = el.getBoundingClientRect();
    const margin = Math.max(elW, elH) * 0.4;
    const [from, to] = CORNER_PAIRS[Math.floor(Math.random() * CORNER_PAIRS.length)];
    const w = window.innerWidth;
    const h = window.innerHeight;
    const x1 = margin + from[0] * (w - margin * 2);
    const y1 = margin + from[1] * (h - margin * 2);
    const x2 = margin + to[0] * (w - margin * 2);
    const y2 = margin + to[1] * (h - margin * 2);

    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy) || 1;
    const perpX = -dy / length;
    const perpY = dx / length;
    const amplitude = Math.min(length * 0.14, 140);

    const start = performance.now();

    const frame = (now: number) => {
      const rawT = Math.min(1, (now - start) / TRAVEL_MS);
      const t = easeInOutSine(rawT);
      const wave = Math.sin(rawT * Math.PI * 2) * amplitude;

      const x = x1 + dx * t + perpX * wave;
      const y = y1 + dy * t + perpY * wave;
      const opacity = rawT < 0.1 ? rawT / 0.1 : rawT > 0.85 ? (1 - rawT) / 0.15 : 1;

      if (elRef.current) {
        elRef.current.style.transform = `translate3d(${x - elW / 2}px, ${y - elH / 2}px, 0)`;
        elRef.current.style.opacity = String(Math.max(0, opacity));
      }

      if (rawT < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        setSrc(null);
      }
    };

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [src]);

  if (!src) return null;

  return (
    <div
      ref={elRef}
      className="liquid-glass pointer-events-none fixed left-0 top-0 z-40 h-44 w-44 overflow-hidden rounded-3xl opacity-0 sm:h-64 sm:w-64"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-cover" />
    </div>
  );
}
