"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useCurrentParticipant } from "@/hooks/useCurrentParticipant";
import { MovieCard } from "@/components/MovieCard";
import { UnratedMovieCard } from "@/components/UnratedMovieCard";
import type { MovieAverage } from "@/lib/types";

type SortMode = "recent" | "ranking";

export default function ArchivePage() {
  const { participant, ready } = useCurrentParticipant();
  const [movies, setMovies] = useState<MovieAverage[]>([]);
  const [myRatedRoundIds, setMyRatedRoundIds] = useState<Set<string> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("movie_averages")
      .select("*")
      .order("revealed_at", { ascending: false });
    setMovies((data as MovieAverage[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    if (!ready) return;
    if (!participant) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMyRatedRoundIds(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("ratings")
      .select("round_id")
      .eq("participant_id", participant.id)
      .then(({ data }) => {
        if (cancelled) return;
        setMyRatedRoundIds(new Set((data ?? []).map((r) => r.round_id as string)));
      });
    return () => {
      cancelled = true;
    };
  }, [ready, participant]);

  function handleDeleted(roundId: string) {
    setMovies((prev) => prev.filter((m) => m.round_id !== roundId));
  }

  function handleRated(roundId: string) {
    setMyRatedRoundIds((prev) => new Set(prev).add(roundId));
    load();
  }

  const searchedMovies = movies.filter((m) =>
    m.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const canPersonalize = ready && !!participant && myRatedRoundIds !== null;
  const unratedMovies = canPersonalize
    ? searchedMovies.filter((m) => !myRatedRoundIds!.has(m.round_id))
    : [];
  const ratedMovies = canPersonalize
    ? searchedMovies.filter((m) => myRatedRoundIds!.has(m.round_id))
    : searchedMovies;

  const sorted =
    sortMode === "ranking"
      ? [...ratedMovies].sort(
          (a, b) => (b.average_score ?? 0) - (a.average_score ?? 0),
        )
      : ratedMovies;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pb-16 pt-4">
      <h1 className="animate-blur-fade-up text-2xl font-medium">الأرشيف</h1>

      {!loading && movies.length > 0 && (
        <div className="liquid-glass flex items-center gap-3 rounded-full px-5 py-3">
          <Search size={18} className="shrink-0 text-gray-300" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="دوّر باسم فلم..."
            className="w-full bg-transparent text-white placeholder:text-gray-500 focus:outline-none"
          />
        </div>
      )}

      {loading && <p className="text-gray-400">جاري التحميل...</p>}

      {!loading && canPersonalize && unratedMovies.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-400">
            ما قيّمتها بعد — من دون تقييمات الباقي عشان ما يأثر عليك رايهم
          </p>
          <div className="flex flex-col gap-3">
            {unratedMovies.map((movie) => (
              <UnratedMovieCard
                key={movie.round_id}
                movie={movie}
                participantId={participant!.id}
                onRated={handleRated}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              {canPersonalize ? "الأفلام اللي قيّمتها" : "كل الأفلام"}
            </p>
            <div className="animate-blur-fade-up liquid-glass flex rounded-full p-1 text-sm">
              <button
                onClick={() => setSortMode("recent")}
                className={`rounded-full px-4 py-1.5 ${sortMode === "recent" ? "bg-white text-black" : "text-gray-300"}`}
              >
                الأحدث
              </button>
              <button
                onClick={() => setSortMode("ranking")}
                className={`rounded-full px-4 py-1.5 ${sortMode === "ranking" ? "bg-white text-black" : "text-gray-300"}`}
              >
                الترتيب
              </button>
            </div>
          </div>

          {sorted.length === 0 && query && (
            <p className="text-gray-400">ما فيه فلم بهذا الاسم</p>
          )}
          {sorted.length === 0 && !query && (
            <p className="text-gray-400">ما فيه أفلام بعد — ابدأوا أول فقرة!</p>
          )}

          <div className="flex flex-col gap-3">
            {sorted.map((movie, i) => (
              <MovieCard
                key={movie.round_id}
                movie={movie}
                rank={i + 1}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
