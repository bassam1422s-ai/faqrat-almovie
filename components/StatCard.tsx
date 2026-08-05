import { GlassCard } from "./GlassCard";
import type { ParticipantStats } from "@/lib/types";

type Props = {
  stats: ParticipantStats;
};

export function StatCard({ stats }: Props) {
  return (
    <GlassCard>
      <p className="text-lg font-medium">{stats.name}</p>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-4xl font-light tabular-nums">
          {stats.average_score_given?.toFixed(1) ?? "—"}
        </span>
        <span className="mb-1 text-sm text-gray-400">معدل تقييماته</span>
      </div>
      <p className="mt-2 text-sm text-gray-400">
        قيّم {stats.ratings_given} فلم
      </p>
    </GlassCard>
  );
}
