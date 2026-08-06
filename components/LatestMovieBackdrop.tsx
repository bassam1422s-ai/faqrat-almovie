"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { tmdbImageUrl } from "@/lib/tmdb";

export function LatestMovieBackdrop() {
  const [backdropPath, setBackdropPath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from("rounds")
        .select("movies(backdrop_path)")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      const movie = data?.movies as unknown as {
        backdrop_path: string | null;
      } | null;
      setBackdropPath(movie?.backdrop_path ?? null);
    }

    load();

    const channel = supabase
      .channel("backdrop-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rounds" },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const imageUrl = tmdbImageUrl(backdropPath, "original");
  if (!imageUrl) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt=""
      className="h-full w-full object-cover opacity-60 transition-opacity duration-1000"
    />
  );
}
