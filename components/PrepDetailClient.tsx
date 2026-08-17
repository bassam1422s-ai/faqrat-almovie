"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { tmdbImageUrl } from "@/lib/tmdb";
import { useCurrentParticipant } from "@/hooks/useCurrentParticipant";
import { useParticipants } from "@/hooks/useParticipants";
import { storeParticipant } from "@/lib/participant";
import { NamePicker } from "@/components/NamePicker";
import { MovieSearch } from "@/components/MovieSearch";
import type {
  PrepItemStatus,
  PrepListOverview,
  TmdbMovieDetails,
} from "@/lib/types";

export function PrepDetailClient({ prepListId }: { prepListId: string }) {
  const { participants } = useParticipants();
  const { participant, ready, refresh: refreshParticipant } =
    useCurrentParticipant();
  const router = useRouter();

  const [list, setList] = useState<PrepListOverview | null>(null);
  const [items, setItems] = useState<PrepItemStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const [{ data: listData }, { data: itemsData }] = await Promise.all([
      supabase
        .from("prep_list_overview")
        .select("*")
        .eq("prep_list_id", prepListId)
        .maybeSingle(),
      supabase
        .from("prep_item_status")
        .select("*")
        .eq("prep_list_id", prepListId)
        .order("created_at", { ascending: true }),
    ]);
    setList((listData as PrepListOverview) ?? null);
    setItems((itemsData as PrepItemStatus[]) ?? []);
    setLoading(false);
  }, [prepListId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleAddItem(movie: TmdbMovieDetails) {
    setAddingItem(true);
    setAddError(null);
    const { error } = await supabase.rpc("add_prep_item", {
      p_prep_list_id: prepListId,
      p_tmdb_id: movie.tmdb_id,
      p_title: movie.title,
      p_poster_path: movie.poster_path,
      p_backdrop_path: movie.backdrop_path,
      p_release_year: movie.release_year,
      p_overview: movie.overview,
      p_vote_average: movie.vote_average,
      p_runtime_minutes: movie.runtime_minutes,
    });
    setAddingItem(false);
    if (error) {
      setAddError(error.message);
      return;
    }
    setAdding(false);
    await load();
  }

  async function handleRemoveItem(itemId: string) {
    if (!window.confirm("متأكد إنك تبي تشيل هذا الفلم من القائمة؟")) return;
    await supabase.rpc("delete_prep_item", { p_item_id: itemId });
    await load();
  }

  async function handleStartRating(item: PrepItemStatus) {
    if (!participant) return;
    setStartingId(item.item_id);
    setStartError(null);
    const { error } = await supabase.rpc("start_round", {
      p_tmdb_id: item.tmdb_id,
      p_title: item.title,
      p_poster_path: item.poster_path,
      p_backdrop_path: item.backdrop_path,
      p_release_year: item.release_year,
      p_overview: item.overview,
      p_vote_average: item.vote_average,
      p_runtime_minutes: item.runtime_minutes,
      p_started_by: participant.id,
    });
    setStartingId(null);
    if (error) {
      setStartError(
        error.message.includes("ALREADY_OPEN")
          ? "في جولة تقييم مفتوحة الحين، خلصوها أول"
          : "صار خطأ، حاول مرة ثانية",
      );
      return;
    }
    router.push("/rating");
  }

  async function handleDeleteList() {
    if (!participant || !list) return;
    if (
      !window.confirm(
        `متأكد إنك تبي تحذف قائمة "${list.title}" بالكامل؟`,
      )
    )
      return;
    setDeleting(true);
    const { error } = await supabase.rpc("delete_prep_list", {
      p_prep_list_id: prepListId,
      p_participant_id: participant.id,
    });
    setDeleting(false);
    if (error) return;
    router.push("/prep");
  }

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

  if (!list) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-16 text-center">
        <p className="text-gray-400">القائمة مو موجودة</p>
        <Link href="/prep" className="text-sm text-gray-300 hover:text-white">
          رجوع لفقرة التجهيز
        </Link>
      </main>
    );
  }

  const poster = tmdbImageUrl(list.poster_path, "w500");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pb-16 pt-4">
      <Link
        href="/prep"
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white"
      >
        <ArrowRight size={14} />
        فقرة التجهيز
      </Link>

      <div className="liquid-glass flex items-center gap-4 rounded-2xl p-4">
        <div className="h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-white/10">
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-medium">{list.title}</p>
          <p className="text-sm text-gray-400">
            {list.done_count} من {list.item_count} تمت مشاهدتها
          </p>
        </div>
        {list.created_by === participant.id && (
          <button
            onClick={handleDeleteList}
            disabled={deleting}
            className="flex shrink-0 items-center gap-1 text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">الأفلام اللي لازم تشوفونها</p>
        <button
          onClick={() => setAdding((v) => !v)}
          className="liquid-glass flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
        >
          {adding ? <X size={16} /> : <Plus size={16} />}
          {adding ? "إغلاق" : "أضف فلم"}
        </button>
      </div>

      {adding && (
        <div className="flex flex-col items-center gap-2">
          <MovieSearch onPick={handleAddItem} disabled={addingItem} />
          {addError && <p className="text-sm text-red-400">{addError}</p>}
        </div>
      )}

      {items.length === 0 && (
        <p className="text-gray-400">ما فيه أفلام بالقائمة بعد — ضيفوا أول وحد!</p>
      )}

      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const itemPoster = tmdbImageUrl(item.poster_path, "w500");
          return (
            <div
              key={item.item_id}
              className="liquid-glass flex items-center gap-4 rounded-2xl p-3"
            >
              <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-white/10">
                {itemPoster && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={itemPoster}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate font-medium ${item.done ? "text-gray-500 line-through" : ""}`}
                >
                  {item.title}
                </p>
                <p className="text-sm text-gray-400">
                  {item.release_year ?? ""}
                </p>
              </div>
              {item.done ? (
                <span className="flex shrink-0 items-center gap-1 text-sm text-white">
                  <Check size={16} className="check-draw" />
                  تمت
                </span>
              ) : (
                <button
                  onClick={() => handleStartRating(item)}
                  disabled={startingId !== null}
                  className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-200 disabled:opacity-50"
                >
                  {startingId === item.item_id
                    ? "جاري البدء..."
                    : "ابدأ التقييم"}
                </button>
              )}
              {!item.done && (
                <button
                  onClick={() => handleRemoveItem(item.item_id)}
                  className="shrink-0 text-gray-500 hover:text-red-400"
                  aria-label="شيل من القائمة"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {startError && <p className="text-sm text-red-400">{startError}</p>}
    </main>
  );
}
