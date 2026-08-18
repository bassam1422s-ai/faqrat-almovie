import { supabase } from "./supabaseClient";

// Best-effort: caches a movie's top-billed cast for the "top actors" stat.
// Never throws — a failed TMDB call or RPC error here should never block
// the actual rating flow, since this is a nice-to-have insight, not core.
export async function syncMovieCast(tmdbId: number, movieId: string) {
  try {
    const res = await fetch(`/api/tmdb/movie/${tmdbId}/credits`);
    const data = await res.json();
    if (!data.cast) return;
    await supabase.rpc("add_movie_cast", {
      p_movie_id: movieId,
      p_cast: data.cast,
    });
  } catch {
    // ignore
  }
}
