"use client";

import { useState } from "react";
import { ChevronDown, Star, Trash2 } from "lucide-react";
import { tmdbImageUrl } from "@/lib/tmdb";
import { useCurrentParticipant } from "@/hooks/useCurrentParticipant";
import { RatingInput } from "./RatingInput";
import type { MovieAverage, Rating } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  movie: MovieAverage;
  rank: number;
  onDeleted: (roundId: string) => void;
  onRated: () => void;
};

export function MovieCard({ movie, rank, onDeleted, onRated }: Props) {
  const { participant } = useCurrentParticipant();
  const [open, setOpen] = useState(false);
  const [ratings, setRatings] = useState<Rating[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [lateScore, setLateScore] = useState(7);
  const [submittingLate, setSubmittingLate] = useState(false);
  const [lateError, setLateError] = useState<string | null>(null);

  async function loadRatings() {
    setLoading(true);
    const { data } = await supabase
      .from("ratings")
      .select("*, participants(*)")
      .eq("round_id", movie.round_id)
      .order("score", { ascending: false });
    setRatings((data as unknown as Rating[]) ?? []);
    setLoading(false);
  }

  async function toggle() {
    if (!open && ratings === null) await loadRatings();
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

  async function handleLateSubmit() {
    if (!participant) return;
    setSubmittingLate(true);
    setLateError(null);
    const { error } = await supabase.rpc("submit_late_rating", {
      p_round_id: movie.round_id,
      p_participant_id: participant.id,
      p_score: lateScore,
    });
    setSubmittingLate(false);
    if (error) {
      setLateError(error.message);
      return;
    }
    await loadRatings();
    onRated();
  }

  const poster = tmdbImageUrl(movie.poster_path, "w500");
  const myRating = ratings?.find((r) => r.participant_id === participant?.id);

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

          {participant && !loading && !myRating && (
            <div className="mt-3 flex flex-col items-center gap-3 rounded-xl bg-white/5 px-3 py-4">
              <p className="text-sm text-gray-300">
                ما قيّمت هذا الفلم — فاتك يوم شفتوه؟
              </p>
              <RatingInput value={lateScore} onChange={setLateScore} />
              <button
                onClick={handleLateSubmit}
                disabled={submittingLate}
                className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-200 disabled:opacity-50"
              >
                {submittingLate ? "جاري الإرسال..." : "قيّم الفلم"}
              </button>
              {lateError && (
                <p className="text-xs text-red-400">{lateError}</p>
              )}
            </div>
          )}

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
    </div>
  );
}
