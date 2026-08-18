import { GlassCard } from "./GlassCard";
import { formatDuration } from "@/lib/duration";
import type { ParticipantStats, ParticipantWatchStats } from "@/lib/types";

type Props = {
  stats: ParticipantStats;
  watchStats?: ParticipantWatchStats;
};

export function StatCard({ stats, watchStats }: Props) {
  return (
    <GlassCard>
      <p className="text-lg font-medium">{stats.name}</p>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-4xl font-light tabular-nums">
          {stats.average_score_given?.toFixed(1) ?? "—"}
        </span>
        <span className="mb-1 text-sm text-gray-400">معدل تقييماته</span>
      </div>
      <p className="mt-2 text-sm text-gray-400">قيّم {stats.ratings_given} فلم</p>

      {watchStats && (
        <div className="mt-3 flex flex-col gap-1 border-t border-white/10 pt-3 text-sm text-gray-400">
          <p>شاف أفلام: {formatDuration(watchStats.movie_minutes)}</p>
          <p>
            يتابع {watchStats.shows_count} مسلسل
            {watchStats.episodes_count > 0
              ? ` (${watchStats.episodes_count} حلقة) — ${formatDuration(watchStats.show_minutes)}`
              : ""}
          </p>
        </div>
      )}
    </GlassCard>
  );
}
