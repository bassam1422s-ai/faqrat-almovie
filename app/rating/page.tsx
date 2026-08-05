"use client";

import { useState } from "react";
import { Calendar, Clock, Star } from "lucide-react";
import { useRoundRealtime } from "@/hooks/useRoundRealtime";
import { useParticipants } from "@/hooks/useParticipants";
import { useCurrentParticipant } from "@/hooks/useCurrentParticipant";
import { storeParticipant } from "@/lib/participant";
import { supabase } from "@/lib/supabaseClient";
import { NamePicker } from "@/components/NamePicker";
import { MovieSearch } from "@/components/MovieSearch";
import { RatingInput } from "@/components/RatingInput";
import { RoundStatusBanner } from "@/components/RoundStatusBanner";
import { RevealResults } from "@/components/RevealResults";
import { GlassButton } from "@/components/GlassButton";
import type { Movie, Participant, Rating, Round, TmdbMovieDetails } from "@/lib/types";

export default function RatingPage() {
  const { round, submittedIds, ratings, loading, refresh } = useRoundRealtime();
  const { participants } = useParticipants();
  const { participant, ready, refresh: refreshParticipant } =
    useCurrentParticipant();

  if (!ready || loading) {
    return <main className="flex flex-1 items-center justify-center" />;
  }

  if (!participant) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-16">
        <h1 className="animate-blur-fade-up text-2xl font-medium">مين أنت؟</h1>
        <NamePicker
          participants={participants}
          onSelect={(p) => {
            storeParticipant(p.id, p.name);
            refreshParticipant();
          }}
        />
      </main>
    );
  }

  return (
    <RoundView
      key={round?.id ?? "idle"}
      round={round}
      submittedIds={submittedIds}
      ratings={ratings}
      participants={participants}
      participant={participant}
      refresh={refresh}
    />
  );
}

function RoundView({
  round,
  submittedIds,
  ratings,
  participants,
  participant,
  refresh,
}: {
  round: Round | null;
  submittedIds: string[];
  ratings: Rating[];
  participants: Participant[];
  participant: { id: string; name: string };
  refresh: () => void;
}) {
  const [startingNew, setStartingNew] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [ratingValue, setRatingValue] = useState(7);
  const [submitting, setSubmitting] = useState(false);

  const hasSubmitted = submittedIds.includes(participant.id);

  async function startRound(movie: TmdbMovieDetails) {
    setStarting(true);
    setStartError(null);
    const { error } = await supabase.rpc("start_round", {
      p_tmdb_id: movie.tmdb_id,
      p_title: movie.title,
      p_poster_path: movie.poster_path,
      p_backdrop_path: movie.backdrop_path,
      p_release_year: movie.release_year,
      p_overview: movie.overview,
      p_vote_average: movie.vote_average,
      p_runtime_minutes: movie.runtime_minutes,
      p_started_by: participant.id,
    });
    setStarting(false);
    if (error) {
      setStartError(
        error.message.includes("ALREADY_OPEN")
          ? "في جولة تقييم مفتوحة الحين، حد ثاني بدأها للتو"
          : "صار خطأ، حاول مرة ثانية",
      );
      return;
    }
    refresh();
  }

  async function submitRating() {
    if (!round) return;
    setSubmitting(true);
    await supabase.rpc("submit_rating", {
      p_round_id: round.id,
      p_participant_id: participant.id,
      p_score: ratingValue,
    });
    setSubmitting(false);
    refresh();
  }

  async function forceReveal() {
    if (!round) return;
    await supabase.rpc("force_reveal_round", { p_round_id: round.id });
    refresh();
  }

  const showSearch = !round || startingNew;

  if (showSearch) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-16 text-center">
        <h1 className="animate-blur-fade-up text-3xl font-medium sm:text-5xl">
          ابدأ فقرة الليلة
        </h1>
        <p
          className="animate-blur-fade-up max-w-md text-gray-400"
          style={{ animationDelay: "100ms" }}
        >
          ابحث عن الفلم اللي بتشوفونه الليلة وابدأ التقييم
        </p>
        <div className="animate-blur-fade-up" style={{ animationDelay: "200ms" }}>
          <MovieSearch onPick={startRound} disabled={starting} />
        </div>
        {startError && <p className="text-sm text-red-400">{startError}</p>}
        {round?.status === "revealed" && (
          <button
            onClick={() => setStartingNew(false)}
            className="text-sm text-gray-400 hover:text-white"
          >
            رجوع للنتيجة الأخيرة
          </button>
        )}
      </main>
    );
  }

  if (round.status === "revealed") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-16">
        <MovieHero movie={round.movies} />
        <RevealResults ratings={ratings} onStartNew={() => setStartingNew(true)} />
      </main>
    );
  }

  if (hasSubmitted) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-16">
        <MovieHero movie={round.movies} />
        <RoundStatusBanner
          participants={participants}
          submittedIds={submittedIds}
          requiredCount={round.required_count}
          onForceReveal={forceReveal}
        />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-16">
      <MovieHero movie={round.movies} />
      <RatingInput value={ratingValue} onChange={setRatingValue} />
      <GlassButton solid onClick={submitRating} disabled={submitting}>
        أرسل تقييمك
      </GlassButton>
    </main>
  );
}

function MovieHero({ movie }: { movie: Movie }) {
  return (
    <div className="flex max-w-xl flex-col items-center gap-3 text-center">
      <div
        className="animate-blur-fade-up flex flex-wrap items-center justify-center gap-4 text-sm text-gray-300"
        style={{ animationDelay: "0ms" }}
      >
        {movie.vote_average != null && (
          <span className="flex items-center gap-1.5">
            <Star size={16} className="fill-white text-white" />
            {Number(movie.vote_average).toFixed(1)} TMDB
          </span>
        )}
        {movie.runtime_minutes != null && (
          <span className="flex items-center gap-1.5">
            <Clock size={16} />
            {movie.runtime_minutes} دقيقة
          </span>
        )}
        {movie.release_year != null && (
          <span className="flex items-center gap-1.5">
            <Calendar size={16} />
            {movie.release_year}
          </span>
        )}
      </div>
      <h1
        className="animate-blur-fade-up text-3xl font-medium sm:text-5xl"
        style={{ animationDelay: "100ms" }}
      >
        {movie.title}
      </h1>
      {movie.overview && (
        <p
          className="animate-blur-fade-up max-w-lg text-gray-400"
          style={{ animationDelay: "200ms" }}
        >
          {movie.overview}
        </p>
      )}
    </div>
  );
}
