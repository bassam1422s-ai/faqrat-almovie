"use client";

import { useState } from "react";
import { tmdbImageUrl } from "@/lib/tmdb";
import { supabase } from "@/lib/supabaseClient";
import { RatingInput } from "./RatingInput";
import type { MovieAverage } from "@/lib/types";

type Props = {
  movie: MovieAverage;
  participantId: string;
  onRated: (roundId: string) => void;
};

// Deliberately shows no score — average or individual — so rating late
// from the archive can't be biased by seeing everyone else's opinion first.
export function UnratedMovieCard({ movie, participantId, onRated }: Props) {
  const [rating, setRating] = useState(false);
  const [score, setScore] = useState(7);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.rpc("submit_late_rating", {
      p_round_id: movie.round_id,
      p_participant_id: participantId,
      p_score: score,
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    onRated(movie.round_id);
  }

  const poster = tmdbImageUrl(movie.poster_path, "w500");

  return (
    <div className="liquid-glass overflow-hidden rounded-2xl">
      <div className="flex w-full items-center gap-4 p-3 text-right">
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
        {!rating && (
          <button
            onClick={() => setRating(true)}
            className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-200"
          >
            قيّم الفلم
          </button>
        )}
      </div>

      {rating && (
        <div className="flex flex-col items-center gap-3 border-t border-white/10 p-4">
          <RatingInput value={score} onChange={setScore} />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-200 disabled:opacity-50"
          >
            {submitting ? "جاري الإرسال..." : "أرسل تقييمك"}
          </button>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
