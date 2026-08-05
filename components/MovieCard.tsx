"use client";

import { useState } from "react";
import { ChevronDown, Star } from "lucide-react";
import { tmdbImageUrl } from "@/lib/tmdb";
import type { MovieAverage, Rating } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  movie: MovieAverage;
  rank: number;
};

export function MovieCard({ movie, rank }: Props) {
  const [open, setOpen] = useState(false);
  const [ratings, setRatings] = useState<Rating[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!open && ratings === null) {
      setLoading(true);
      const { data } = await supabase
        .from("ratings")
        .select("*, participants(*)")
        .eq("round_id", movie.round_id)
        .order("score", { ascending: false });
      setRatings((data as unknown as Rating[]) ?? []);
      setLoading(false);
    }
    setOpen((v) => !v);
  }

  const poster = tmdbImageUrl(movie.poster_path, "w500");

  return (
    <div className="liquid-glass overflow-hidden rounded-2xl">
      <button
        onClick={toggle}
        className="flex w-full items-center gap-4 p-3 text-right"
      >
        <span className="w-6 shrink-0 text-center text-sm text-gray-500">
          {rank}
        </span>
        <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-white/10">
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{movie.title}</p>
          <p className="text-sm text-gray-400">{movie.release_year ?? ""}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-lg font-medium tabular-nums">
          <Star size={16} className="fill-white text-white" />
          {Number(movie.average_score).toFixed(1)}
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-white/10 p-3">
          {loading && <p className="text-sm text-gray-400">جاري التحميل...</p>}
          {ratings?.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between px-2 py-1.5 text-sm"
            >
              <span className="text-gray-300">{r.participants.name}</span>
              <span className="tabular-nums font-medium">
                {Number(r.score).toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
