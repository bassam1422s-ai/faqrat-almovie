"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useMovieAverages } from "@/hooks/useMovieAverages";
import { StatCard } from "@/components/StatCard";
import { GlassCard } from "@/components/GlassCard";
import type { ParticipantStats } from "@/lib/types";

export default function StatsPage() {
  const [participantStats, setParticipantStats] = useState<ParticipantStats[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const { movies, loading: moviesLoading } = useMovieAverages();

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("participant_stats").select("*").order("name");
      setParticipantStats((data as ParticipantStats[]) ?? []);
      setStatsLoading(false);
    }
    load();
  }, []);

  const loading = statsLoading || moviesLoading;

  const overallAverage =
    movies.length > 0
      ? movies.reduce((sum, m) => sum + Number(m.average_score), 0) / movies.length
      : null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 pb-16 pt-4">
      <h1 className="animate-blur-fade-up text-2xl font-medium">الإحصائيات</h1>

      {loading && <p className="text-gray-400">جاري التحميل...</p>}

      {!loading && (
        <>
          <GlassCard className="animate-blur-fade-up grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-light tabular-nums">{movies.length}</p>
              <p className="mt-1 text-xs text-gray-400">فلم شفناه</p>
            </div>
            <div>
              <p className="text-3xl font-light tabular-nums">
                {overallAverage?.toFixed(1) ?? "—"}
              </p>
              <p className="mt-1 text-xs text-gray-400">المعدل العام</p>
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-medium">
                {movies[0]?.title ?? "—"}
              </p>
              <p className="mt-1 text-xs text-gray-400">آخر فلم</p>
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {participantStats.map((s, i) => (
              <div
                key={s.participant_id}
                className="animate-blur-fade-up"
                style={{ animationDelay: `${100 + i * 60}ms` }}
              >
                <StatCard stats={s} />
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
