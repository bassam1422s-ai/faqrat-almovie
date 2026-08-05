"use client";

import { useEffect, useState } from "react";

const CAMEO_COUNT = 21;
const CORNERS = [
  "top-20 right-4 sm:right-8",
  "top-20 left-4 sm:left-8",
  "bottom-6 right-4 sm:right-8",
  "bottom-6 left-4 sm:left-8",
] as const;

function scheduleNext(trigger: () => void) {
  const delay = 40_000 + Math.random() * 50_000; // 40–90s
  return window.setTimeout(() => {
    if (Math.random() < 0.3) trigger();
    scheduleNext(trigger);
  }, delay);
}

export function FriendCameo() {
  const [visible, setVisible] = useState<{ src: string; corner: string; key: number } | null>(
    null,
  );

  useEffect(() => {
    const show = () => {
      const n = 1 + Math.floor(Math.random() * CAMEO_COUNT);
      const corner = CORNERS[Math.floor(Math.random() * CORNERS.length)];
      setVisible({ src: `/cameos/${n}.jpg`, corner, key: Date.now() });
      window.setTimeout(() => setVisible(null), 4000);
    };

    const timerId = scheduleNext(show);
    return () => window.clearTimeout(timerId);
  }, []);

  if (!visible) return null;

  return (
    <div
      key={visible.key}
      className={`animate-cameo liquid-glass pointer-events-none fixed z-40 h-24 w-24 overflow-hidden rounded-2xl sm:h-32 sm:w-32 ${visible.corner}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={visible.src} alt="" className="h-full w-full object-cover" />
    </div>
  );
}
