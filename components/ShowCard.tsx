"use client";

import { useState } from "react";
import { Check, ChevronDown, Pencil, Tv, Trash2 } from "lucide-react";
import { tmdbImageUrl } from "@/lib/tmdb";
import { participantDotColor } from "@/lib/participantColor";
import { supabase } from "@/lib/supabaseClient";
import { RatingInput } from "./RatingInput";
import type { ShowEntry, ShowOverview } from "@/lib/types";

type Props = {
  show: ShowOverview;
  participant: { id: string; name: string } | null;
  onChanged: () => void;
};

export function ShowCard({ show, participant, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ShowEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [hasRating, setHasRating] = useState(false);
  const [rating, setRating] = useState(7);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadEntries() {
    setLoading(true);
    const { data } = await supabase
      .from("show_entries")
      .select("*, participants(*)")
      .eq("show_id", show.show_id)
      .order("updated_at", { ascending: false });
    setEntries((data as unknown as ShowEntry[]) ?? []);
    setLoading(false);
  }

  async function toggle() {
    if (!open && entries === null) await loadEntries();
    setOpen((v) => !v);
  }

  const myEntry = entries?.find((e) => e.participant_id === participant?.id);

  const seasons = show.seasons ?? [];
  const seasonOptions =
    seasons.length > 0
      ? seasons.map((s) => s.season_number)
      : Array.from(
          { length: show.number_of_seasons ?? 1 },
          (_, i) => i + 1,
        );
  const episodeCount = seasons.find((s) => s.season_number === season)
    ?.episode_count;
  const episodeOptions = Array.from(
    { length: episodeCount ?? 24 },
    (_, i) => i + 1,
  );

  function startEditing() {
    const initialSeason = myEntry?.current_season ?? 1;
    setSeason(initialSeason);
    setEpisode(myEntry?.current_episode ?? 1);
    setHasRating(myEntry?.rating != null);
    setRating(myEntry?.rating ?? 7);
    setFinished(myEntry?.finished ?? false);
    setError(null);
    setEditing(true);
  }

  function handleSeasonChange(next: number) {
    setSeason(next);
    const nextCount = seasons.find((s) => s.season_number === next)
      ?.episode_count;
    if (nextCount && episode > nextCount) setEpisode(1);
  }

  async function handleSave() {
    if (!participant) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase.rpc("update_show_entry", {
      p_show_id: show.show_id,
      p_participant_id: participant.id,
      p_rating: hasRating ? rating : null,
      p_current_season: season,
      p_current_episode: episode,
      p_finished: finished,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEditing(false);
    await loadEntries();
    onChanged();
  }

  async function handleRemove() {
    if (!participant) return;
    if (!window.confirm("متأكد إنك تبي توقف متابعة هذا المسلسل؟")) return;
    setSaving(true);
    const { error } = await supabase.rpc("delete_show_entry", {
      p_show_id: show.show_id,
      p_participant_id: participant.id,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEditing(false);
    await loadEntries();
    onChanged();
  }

  async function handleDeleteShow() {
    if (!participant) return;
    if (
      !window.confirm(
        `متأكد إنك تبي تحذف "${show.title}" بالكامل؟ بينحذف عند الكل، مو بس عندك.`,
      )
    )
      return;
    setDeleting(true);
    const { error } = await supabase.rpc("delete_show", {
      p_show_id: show.show_id,
      p_participant_id: participant.id,
    });
    setDeleting(false);
    if (error) {
      setError(error.message);
      return;
    }
    onChanged();
  }

  const poster = tmdbImageUrl(show.poster_path, "w500");

  return (
    <div className="liquid-glass overflow-hidden rounded-2xl">
      <button
        onClick={toggle}
        className="flex w-full items-center gap-4 p-3 text-right"
      >
        <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-white/10">
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{show.title}</p>
          <p className="text-sm text-gray-400">{show.first_air_year ?? ""}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-sm text-gray-300">
          <Tv size={14} />
          {show.tracker_count}
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-white/10 p-3">
          {loading && <p className="text-sm text-gray-400">جاري التحميل...</p>}

          {entries?.length === 0 && !loading && (
            <p className="px-2 py-1.5 text-sm text-gray-400">محد يتابعه بعد</p>
          )}

          {entries?.map((e) => (
            <div
              key={e.id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-2 py-1.5 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2 text-gray-300">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${participantDotColor(e.participant_id)}`}
                />
                <span className="truncate">{e.participants.name}</span>
              </span>
              <span className="whitespace-nowrap text-gray-400">
                {e.finished ? (
                  <span className="flex items-center gap-1 text-white">
                    <Check size={14} className="check-draw" />
                    خلصه
                  </span>
                ) : e.current_season != null && e.current_episode != null ? (
                  (() => {
                    const total = seasons.find(
                      (s) => s.season_number === e.current_season,
                    )?.episode_count;
                    return `الموسم ${e.current_season} · الحلقة ${e.current_episode}${total ? ` من ${total}` : ""}`;
                  })()
                ) : (
                  "لسا ما بدأ"
                )}
              </span>
              <span className="w-10 shrink-0 text-right tabular-nums font-medium">
                {e.rating != null ? Number(e.rating).toFixed(1) : "—"}
              </span>
            </div>
          ))}

          {participant && !loading && !editing && (
            <div className="mt-2 flex items-center justify-between">
              <button
                onClick={startEditing}
                className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-gray-300 hover:text-white"
              >
                <Pencil size={14} />
                {myEntry ? "عدّل متابعتي" : "أنا أتابعه بعد"}
              </button>
              {show.added_by === participant.id && (
                <button
                  onClick={handleDeleteShow}
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  {deleting ? "جاري الحذف..." : "احذف المسلسل"}
                </button>
              )}
            </div>
          )}

          {editing && (
            <div className="mt-2 flex flex-col items-center gap-4 rounded-xl bg-white/5 p-4">
              <button
                onClick={() => setFinished((v) => !v)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition-colors ${
                  finished
                    ? "bg-white text-black"
                    : "liquid-glass text-gray-300"
                }`}
              >
                <Check size={14} />
                خلصت المسلسل
              </button>

              {!finished && (
                <div className="flex items-center gap-3">
                  <label className="flex flex-col items-center gap-1 text-xs text-gray-400">
                    الموسم
                    <select
                      value={season}
                      onChange={(e) =>
                        handleSeasonChange(Number(e.target.value))
                      }
                      className="liquid-glass w-20 rounded-full px-2 py-1.5 text-center tabular-nums focus:outline-none"
                    >
                      {seasonOptions.map((s) => (
                        <option key={s} value={s} className="bg-black">
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col items-center gap-1 text-xs text-gray-400">
                    الحلقة
                    <select
                      value={episode}
                      onChange={(e) => setEpisode(Number(e.target.value))}
                      className="liquid-glass w-20 rounded-full px-2 py-1.5 text-center tabular-nums focus:outline-none"
                    >
                      {episodeOptions.map((e) => (
                        <option key={e} value={e} className="bg-black">
                          {e}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {hasRating ? (
                <RatingInput value={rating} onChange={setRating} />
              ) : (
                <button
                  onClick={() => setHasRating(true)}
                  className="text-sm text-gray-400 underline-offset-4 hover:text-white hover:underline"
                >
                  + أضف تقييم
                </button>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-200 disabled:opacity-50"
                >
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  إلغاء
                </button>
                {myEntry && (
                  <button
                    onClick={handleRemove}
                    disabled={saving}
                    className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    وقف المتابعة
                  </button>
                )}
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          )}
          {error && !editing && (
            <p className="mt-2 px-2 text-xs text-red-400">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
