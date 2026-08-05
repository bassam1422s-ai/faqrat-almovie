import type { TmdbMovieDetails, TmdbSearchResult } from "./types";

const TMDB_API_BASE = "https://api.themoviedb.org/3";

function authHeaders(): HeadersInit {
  const token = process.env.TMDB_API_KEY;
  if (!token) {
    throw new Error("TMDB_API_KEY is not set");
  }
  return {
    Authorization: `Bearer ${token}`,
    accept: "application/json",
  };
}

function yearFromDate(date: string | undefined | null): number | null {
  if (!date) return null;
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

type TmdbApiSearchItem = {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  overview: string | null;
  vote_average: number | null;
};

export async function searchMovies(
  query: string,
  signal?: AbortSignal,
): Promise<TmdbSearchResult[]> {
  const url = new URL(`${TMDB_API_BASE}/search/movie`);
  url.searchParams.set("query", query);
  url.searchParams.set("language", "ar");
  url.searchParams.set("include_adult", "false");

  const res = await fetch(url, { headers: authHeaders(), signal });
  if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`);
  const data: { results: TmdbApiSearchItem[] } = await res.json();

  return data.results.slice(0, 12).map((item) => ({
    tmdb_id: item.id,
    title: item.title,
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    release_year: yearFromDate(item.release_date),
    overview: item.overview,
    vote_average: item.vote_average,
  }));
}

export async function getMovieDetails(
  tmdbId: number,
): Promise<TmdbMovieDetails> {
  const url = new URL(`${TMDB_API_BASE}/movie/${tmdbId}`);
  url.searchParams.set("language", "ar");

  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`TMDB details failed: ${res.status}`);
  const item: TmdbApiSearchItem & { runtime: number | null } =
    await res.json();

  return {
    tmdb_id: item.id,
    title: item.title,
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    release_year: yearFromDate(item.release_date),
    overview: item.overview,
    vote_average: item.vote_average,
    runtime_minutes: item.runtime,
  };
}

export function tmdbImageUrl(
  path: string | null,
  size: "w500" | "w780" | "original" = "w500",
): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
