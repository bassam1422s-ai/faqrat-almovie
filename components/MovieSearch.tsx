"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { tmdbImageUrl } from "@/lib/tmdb";
import type { TmdbMovieDetails, TmdbSearchResult } from "@/lib/types";

type Props = {
  onPick: (movie: TmdbMovieDetails) => void;
  disabled?: boolean;
};

export function MovieSearch({ onPick, disabled }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [pickingId, setPickingId] = useState<number | null>(null);
  const debouncedQuery = useDebounce(query, 350);
  const abortRef = useRef<AbortController | null>(null);

  const trimmedQuery = debouncedQuery.trim();

  useEffect(() => {
    if (trimmedQuery.length < 2) return;

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for the fetch started right below
    setSearching(true);
    fetch(`/api/tmdb/search?q=${encodeURIComponent(trimmedQuery)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => setResults(data.results ?? []))
      .catch(() => {})
      .finally(() => setSearching(false));

    return () => controller.abort();
  }, [trimmedQuery]);

  const visibleResults = trimmedQuery.length < 2 ? [] : results;

  async function pick(result: TmdbSearchResult) {
    setPickingId(result.tmdb_id);
    try {
      const res = await fetch(`/api/tmdb/movie/${result.tmdb_id}`);
      const data = await res.json();
      if (data.movie) onPick(data.movie as TmdbMovieDetails);
    } finally {
      setPickingId(null);
    }
  }

  return (
    <div className="w-full max-w-xl">
      <div className="liquid-glass flex items-center gap-3 rounded-full px-5 py-3">
        <Search size={18} className="shrink-0 text-gray-300" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
          placeholder="ابحث عن اسم الفلم..."
          className="w-full bg-transparent text-white placeholder:text-gray-500 focus:outline-none"
        />
      </div>

      {(visibleResults.length > 0 || searching) && (
        <div className="liquid-glass mt-3 max-h-96 overflow-y-auto rounded-2xl p-2">
          {searching && (
            <p className="px-3 py-2 text-sm text-gray-400">جاري البحث...</p>
          )}
          {visibleResults.map((r) => (
            <button
              key={r.tmdb_id}
              onClick={() => pick(r)}
              disabled={pickingId !== null}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-right hover:bg-white/5 disabled:opacity-50"
            >
              <div className="h-16 w-11 shrink-0 overflow-hidden rounded-md bg-white/10">
                {r.poster_path && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tmdbImageUrl(r.poster_path, "w500") ?? undefined}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{r.title}</p>
                <p className="text-sm text-gray-400">{r.release_year ?? ""}</p>
              </div>
              {pickingId === r.tmdb_id && (
                <span className="ms-auto text-xs text-gray-400">جاري البدء...</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
