"use client";

import { Check } from "lucide-react";
import { GlassCard } from "./GlassCard";
import type { Participant } from "@/lib/types";

type Props = {
  participants: Participant[];
  submittedIds: string[];
  requiredCount: number;
  onForceReveal: () => void;
  onCancel: () => void;
};

export function RoundStatusBanner({
  participants,
  submittedIds,
  requiredCount,
  onForceReveal,
  onCancel,
}: Props) {
  const submittedSet = new Set(submittedIds);

  return (
    <GlassCard className="w-full max-w-md">
      <p className="mb-4 text-lg font-medium">
        {submittedIds.length} من {requiredCount} قيّموا الفلم
      </p>
      <div className="flex flex-wrap gap-2">
        {participants.map((p) => {
          const done = submittedSet.has(p.id);
          return (
            <span
              key={p.id}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
                done ? "bg-white/15 text-white" : "text-gray-400"
              }`}
            >
              {done && <Check size={14} />}
              {p.name}
            </span>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
        <button
          onClick={() => {
            if (window.confirm("متأكد إنك تبي تكشف النتائج قبل ما يخلص الجميع؟")) {
              onForceReveal();
            }
          }}
          className="text-sm text-gray-400 underline-offset-4 hover:text-white hover:underline"
        >
          كشف النتائج الآن
        </button>
        <button
          onClick={() => {
            if (
              window.confirm(
                "متأكد إنك تبي تلغي هذي الفقرة؟ أي تقييمات اترسلت بتنحذف ولازم تبدأون فقرة جديدة.",
              )
            ) {
              onCancel();
            }
          }}
          className="text-sm text-red-400 underline-offset-4 hover:text-red-300 hover:underline"
        >
          إلغاء الفقرة
        </button>
      </div>
    </GlassCard>
  );
}
