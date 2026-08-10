"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useCurrentParticipant } from "@/hooks/useCurrentParticipant";
import { useParticipants } from "@/hooks/useParticipants";
import { storeParticipant } from "@/lib/participant";
import { NamePicker } from "@/components/NamePicker";
import { ShowSearch } from "@/components/ShowSearch";
import { ShowCard } from "@/components/ShowCard";
import type { ShowOverview, TmdbTvDetails } from "@/lib/types";

export default function ShowsPage() {
  const { participants } = useParticipants();
  const { participant, ready, refresh: refreshParticipant } =
    useCurrentParticipant();
  const [shows, setShows] = useState<ShowOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [filterId, setFilterId] = useState<string | null>(null);
  const [filteredShowIds, setFilteredShowIds] = useState<Set<string> | null>(
    null,
  );

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("show_overview")
      .select("*")
      .order("last_updated_at", { ascending: false, nullsFirst: false });
    setShows((data as ShowOverview[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    if (!filterId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilteredShowIds(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("show_entries")
      .select("show_id")
      .eq("participant_id", filterId)
      .then(({ data }) => {
        if (cancelled) return;
        setFilteredShowIds(new Set((data ?? []).map((e) => e.show_id as string)));
      });
    return () => {
      cancelled = true;
    };
  }, [filterId]);

  async function handlePick(show: TmdbTvDetails) {
    if (!participant) return;
    setAdding(true);
    setAddError(null);
    const { data: showId, error } = await supabase.rpc("add_show", {
      p_tmdb_id: show.tmdb_id,
      p_title: show.title,
      p_poster_path: show.poster_path,
      p_backdrop_path: show.backdrop_path,
      p_first_air_year: show.first_air_year,
      p_overview: show.overview,
      p_vote_average: show.vote_average,
      p_number_of_seasons: show.number_of_seasons,
      p_seasons: show.seasons,
    });
    if (error || !showId) {
      setAdding(false);
      setAddError(error?.message ?? "صار خطأ، حاول مرة ثانية");
      return;
    }
    await supabase.rpc("update_show_entry", {
      p_show_id: showId,
      p_participant_id: participant.id,
      p_rating: null,
      p_current_season: 1,
      p_current_episode: 1,
    });
    setAdding(false);
    setSearching(false);
    await load();
  }

  if (!ready) {
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

  const visibleShows = filteredShowIds
    ? shows.filter((s) => filteredShowIds.has(s.show_id))
    : shows;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pb-16 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="animate-blur-fade-up text-2xl font-medium">المسلسلات</h1>
        <button
          onClick={() => setSearching((v) => !v)}
          className="animate-blur-fade-up liquid-glass flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
        >
          {searching ? <X size={16} /> : <Plus size={16} />}
          {searching ? "إغلاق" : "أضف مسلسل"}
        </button>
      </div>

      <p className="text-sm text-gray-400">
        كل واحد يتابع مسلسلاته لحاله — شوف وين وصل الكل ورايهم فيه
      </p>

      {searching && (
        <div className="flex flex-col items-center gap-2">
          <ShowSearch onPick={handlePick} disabled={adding} />
          {addError && <p className="text-sm text-red-400">{addError}</p>}
        </div>
      )}

      {participants.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterId(null)}
            className={`liquid-glass rounded-full px-4 py-1.5 text-sm transition-colors ${
              filterId === null ? "bg-white text-black" : "text-gray-300"
            }`}
          >
            الكل
          </button>
          {participants.map((p) => (
            <button
              key={p.id}
              onClick={() => setFilterId(p.id)}
              className={`liquid-glass rounded-full px-4 py-1.5 text-sm transition-colors ${
                filterId === p.id ? "bg-white text-black" : "text-gray-300"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="text-gray-400">جاري التحميل...</p>}
      {!loading && shows.length === 0 && (
        <p className="text-gray-400">ما فيه مسلسلات بعد — أضف أول وحد!</p>
      )}
      {!loading && shows.length > 0 && visibleShows.length === 0 && (
        <p className="text-gray-400">
          {participants.find((p) => p.id === filterId)?.name} ما يتابع أي مسلسل بعد
        </p>
      )}

      <div className="flex flex-col gap-3">
        {visibleShows.map((show) => (
          <ShowCard
            key={show.show_id}
            show={show}
            participant={participant}
            onChanged={load}
          />
        ))}
      </div>
    </main>
  );
}
