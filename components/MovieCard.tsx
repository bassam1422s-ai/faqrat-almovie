"use client";

import { useState } from "react";
import { ChevronDown, Search, Star, Trash2, X } from "lucide-react";
import { tmdbImageUrl } from "@/lib/tmdb";
import { participantDotColor } from "@/lib/participantColor";
import type { MovieAverage, Rating } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  movie: MovieAverage;
  rank: number;
  onDeleted: (roundId: string) => void;
};

export function MovieCard({ movie, rank, onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const [ratings, setRatings] = useState<Rating[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [posterOpen, setPosterOpen] = useState(false);

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

  async function handleDelete() {
    if (
      !window.confirm(
        `متأكد إنك تبي تحذف "${movie.title}" وكل تقييماته؟ ما ينرجع بعد الحذف.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    const { error } = await supabase.rpc("delete_round", {
      p_round_id: movie.round_id,
    });
    setDeleting(false);
    if (error) {
      setDeleteError(error.message);
      return;
    }
    onDeleted(movie.round_id);
  }

  const poster = tmdbImageUrl(movie.poster_path, "w500");
  const posterLarge = tmdbImageUrl(movie.poster_path, "original");

  return (
    <div className="liquid-glass overflow-hidden rounded-2xl">
      <div className="flex w-full items-center gap-4 p-3 text-right">
        <span className="w-6 shrink-0 text-center text-sm text-gray-500">
          {rank}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (poster) setPosterOpen(true);
          }}
          className="h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-white/10"
          aria-label="كبّر البوستر"
        >
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt="" className="h-full w-full object-cover" />
          )}
        </button>
        <button
          onClick={toggle}
          className="flex min-w-0 flex-1 items-center gap-4 text-right"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{movie.title}</p>
            <p className="text-sm text-gray-400">{movie.release_year ?? ""}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-lg font-medium tabular-nums">
            <Star size={16} className="fill-white text-white" />
            {movie.average_score != null ? Number(movie.average_score).toFixed(1) : "—"}
          </div>
          <ChevronDown
            size={18}
            className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <a
          href={`https://www.google.com/search?q=${encodeURIComponent(
            `${movie.title}${movie.release_year ? ` ${movie.release_year}` : ""} movie`,
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="liquid-glass flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-300 hover:text-white"
          aria-label="ابحث عن الفلم"
        >
          <Search size={15} />
        </a>
      </div>

      {open && (
        <div className="border-t border-white/10 p-3">
          {loading && <p className="text-sm text-gray-400">جاري التحميل...</p>}
          {ratings?.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-[1fr_auto] items-center gap-3 px-2 py-1.5 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2 text-gray-300">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${participantDotColor(r.participant_id)}`}
                />
                <span className="truncate">{r.participants.name}</span>
              </span>
              <span className="w-10 shrink-0 text-right tabular-nums font-medium">
                {Number(r.score).toFixed(1)}
              </span>
            </div>
          ))}

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="mt-2 flex items-center gap-1.5 px-2 py-1.5 text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            <Trash2 size={14} />
            {deleting ? "جاري الحذف..." : "حذف الفلم"}
          </button>
          {deleteError && (
            <p className="px-2 pb-1 text-xs text-red-400">{deleteError}</p>
          )}
        </div>
      )}

      {posterOpen && posterLarge && (
        <div
          onClick={() => setPosterOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <button
            onClick={() => setPosterOpen(false)}
            className="liquid-glass absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={posterLarge}
            alt={movie.title}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
