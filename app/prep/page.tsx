"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ListChecks, Plus, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { tmdbImageUrl } from "@/lib/tmdb";
import { useCurrentParticipant } from "@/hooks/useCurrentParticipant";
import { useParticipants } from "@/hooks/useParticipants";
import { storeParticipant } from "@/lib/participant";
import { NamePicker } from "@/components/NamePicker";
import { MovieSearch } from "@/components/MovieSearch";
import type { PrepListOverview, TmdbMovieDetails } from "@/lib/types";

export default function PrepPage() {
  const { participants } = useParticipants();
  const { participant, ready, refresh: refreshParticipant } =
    useCurrentParticipant();
  const [lists, setLists] = useState<PrepListOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("prep_list_overview")
      .select("*")
      .order("title");
    setLists((data as PrepListOverview[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handlePick(movie: TmdbMovieDetails) {
    if (!participant) return;
    setAdding(true);
    setAddError(null);
    const { error } = await supabase.rpc("create_prep_list", {
      p_tmdb_id: movie.tmdb_id,
      p_title: movie.title,
      p_poster_path: movie.poster_path,
      p_backdrop_path: movie.backdrop_path,
      p_release_year: movie.release_year,
      p_created_by: participant.id,
    });
    setAdding(false);
    if (error) {
      setAddError(error.message);
      return;
    }
    setCreating(false);
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

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pb-16 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="animate-blur-fade-up text-2xl font-medium">
          فقرة التجهيز
        </h1>
        <button
          onClick={() => setCreating((v) => !v)}
          className="animate-blur-fade-up liquid-glass flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
        >
          {creating ? <X size={16} /> : <Plus size={16} />}
          {creating ? "إغلاق" : "قائمة جديدة"}
        </button>
      </div>

      <p className="text-sm text-gray-400">
        جهّزوا نفسكم لفلم قادم — سوّوا قائمة بأفلام لازم تشوفونها قبله، وكل
        وحدة تنشطب أول ما تنقيّمونها
      </p>

      {creating && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-gray-400">
            دوّر عن الفلم اللي بتتجهزون له
          </p>
          <MovieSearch onPick={handlePick} disabled={adding} />
          {addError && <p className="text-sm text-red-400">{addError}</p>}
        </div>
      )}

      {loading && <p className="text-gray-400">جاري التحميل...</p>}
      {!loading && lists.length === 0 && (
        <p className="text-gray-400">ما فيه قوائم بعد — سوّوا أول وحدة!</p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {lists.map((list) => (
          <PrepListCard key={list.prep_list_id} list={list} />
        ))}
      </div>
    </main>
  );
}

function PrepListCard({ list }: { list: PrepListOverview }) {
  const backdrop = tmdbImageUrl(list.backdrop_path, "w780");
  const poster = tmdbImageUrl(list.poster_path, "w500");
  const image = backdrop ?? poster;

  return (
    <Link
      href={`/prep/${list.prep_list_id}`}
      className="liquid-glass group relative flex aspect-[2/3] flex-col justify-end overflow-hidden rounded-2xl p-3"
    >
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      <div className="relative flex items-center gap-1.5 text-xs text-gray-300">
        <ListChecks size={13} />
        {list.done_count} من {list.item_count}
      </div>
      <p className="relative truncate text-sm font-medium">{list.title}</p>
    </Link>
  );
}
