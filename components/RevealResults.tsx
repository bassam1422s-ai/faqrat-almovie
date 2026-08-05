"use client";

import { GlassCard } from "./GlassCard";
import { GlassButton } from "./GlassButton";
import type { Rating } from "@/lib/types";

type Props = {
  ratings: Rating[];
  onStartNew: () => void;
};

export function RevealResults({ ratings, onStartNew }: Props) {
  const average =
    ratings.reduce((sum, r) => sum + Number(r.score), 0) /
    (ratings.length || 1);

  const sorted = [...ratings].sort((a, b) => b.score - a.score);

  return (
    <GlassCard className="w-full max-w-md">
      <p className="animate-blur-fade-up text-sm text-gray-400">المعدل النهائي</p>
      <p
        className="animate-blur-fade-up text-6xl font-light tabular-nums"
        style={{ animationDelay: "100ms" }}
      >
        {average.toFixed(1)}
      </p>

      <div className="mt-6 flex flex-col gap-2">
        {sorted.map((r, i) => (
          <div
            key={r.id}
            className="animate-blur-fade-up flex items-center justify-between rounded-xl bg-white/5 px-4 py-2.5"
            style={{ animationDelay: `${200 + i * 120}ms` }}
          >
            <span>{r.participants.name}</span>
            <span className="tabular-nums font-medium">{Number(r.score).toFixed(1)}</span>
          </div>
        ))}
      </div>

      <GlassButton solid onClick={onStartNew} className="mt-6 w-full">
        ابدأ فقرة جديدة
      </GlassButton>
    </GlassCard>
  );
}
