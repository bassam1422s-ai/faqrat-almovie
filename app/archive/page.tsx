"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { MovieCard } from "@/components/MovieCard";
import type { MovieAverage } from "@/lib/types";

type SortMode = "recent" | "ranking";

export default function ArchivePage() {
  const [movies, setMovies] = useState<MovieAverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("recent");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("movie_averages")
        .select("*")
        .order("revealed_at", { ascending: false });
      setMovies((data as MovieAverage[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const sorted =
    sortMode === "ranking"
      ? [...movies].sort((a, b) => b.average_score - a.average_score)
      : movies;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pb-16 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="animate-blur-fade-up text-2xl font-medium">الأرشيف</h1>
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

      {loading && <p className="text-gray-400">جاري التحميل...</p>}
      {!loading && sorted.length === 0 && (
        <p className="text-gray-400">ما فيه أفلام بعد — ابدأوا أول فقرة!</p>
      )}

      <div className="flex flex-col gap-3">
        {sorted.map((movie, i) => (
          <MovieCard key={movie.round_id} movie={movie} rank={i + 1} />
        ))}
      </div>
    </main>
  );
}
