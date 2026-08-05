"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { MovieAverage } from "@/lib/types";

export function useMovieAverages() {
  const [movies, setMovies] = useState<MovieAverage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from("movie_averages")
        .select("*")
        .order("revealed_at", { ascending: false });
      if (!cancelled) {
        setMovies((data as MovieAverage[]) ?? []);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { movies, loading };
}
