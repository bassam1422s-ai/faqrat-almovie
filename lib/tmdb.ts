import type {
  TmdbMovieDetails,
  TmdbSearchResult,
  TmdbTvDetails,
  TmdbTvSearchResult,
} from "./types";

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

// Movie titles are always kept in English (regardless of the film's original
// language) while overview/etc stay in Arabic — a second en-US request just
// for the title, merged by tmdb_id into the Arabic-language result.
async function fetchEnglishTitles(
  url: URL,
  signal?: AbortSignal,
): Promise<Map<number, string>> {
  const enUrl = new URL(url);
  enUrl.searchParams.set("language", "en-US");
  const res = await fetch(enUrl, { headers: authHeaders(), signal });
  if (!res.ok) return new Map();
  const data: { results?: TmdbApiSearchItem[] } & Partial<TmdbApiSearchItem> =
    await res.json();
  const items = data.results ?? (data.id != null ? [data as TmdbApiSearchItem] : []);
  return new Map(items.map((item) => [item.id, item.title]));
}

export async function searchMovies(
  query: string,
  signal?: AbortSignal,
): Promise<TmdbSearchResult[]> {
  const url = new URL(`${TMDB_API_BASE}/search/movie`);
  url.searchParams.set("query", query);
  url.searchParams.set("language", "ar");
  url.searchParams.set("include_adult", "false");

  const [res, englishTitles] = await Promise.all([
    fetch(url, { headers: authHeaders(), signal }),
    fetchEnglishTitles(url, signal),
  ]);
  if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`);
  const data: { results: TmdbApiSearchItem[] } = await res.json();

  return data.results.slice(0, 12).map((item) => ({
    tmdb_id: item.id,
    title: englishTitles.get(item.id) ?? item.title,
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

  const [res, englishTitles] = await Promise.all([
    fetch(url, { headers: authHeaders() }),
    fetchEnglishTitles(url),
  ]);
  if (!res.ok) throw new Error(`TMDB details failed: ${res.status}`);
  const item: TmdbApiSearchItem & { runtime: number | null } =
    await res.json();

  return {
    tmdb_id: item.id,
    title: englishTitles.get(item.id) ?? item.title,
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    release_year: yearFromDate(item.release_date),
    overview: item.overview,
    vote_average: item.vote_average,
    runtime_minutes: item.runtime,
  };
}

type TmdbApiTvItem = {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string | null;
  overview: string | null;
  vote_average: number | null;
};

export async function searchShows(
  query: string,
  signal?: AbortSignal,
): Promise<TmdbTvSearchResult[]> {
  const url = new URL(`${TMDB_API_BASE}/search/tv`);
  url.searchParams.set("query", query);
  url.searchParams.set("language", "ar");
  url.searchParams.set("include_adult", "false");

  const res = await fetch(url, { headers: authHeaders(), signal });
  if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`);
  const data: { results: TmdbApiTvItem[] } = await res.json();

  return data.results.slice(0, 12).map((item) => ({
    tmdb_id: item.id,
    title: item.name,
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    first_air_year: yearFromDate(item.first_air_date),
    overview: item.overview,
    vote_average: item.vote_average,
  }));
}

type TmdbApiSeason = {
  season_number: number;
  name: string;
  episode_count: number;
};

export async function getShowDetails(tmdbId: number): Promise<TmdbTvDetails> {
  const url = new URL(`${TMDB_API_BASE}/tv/${tmdbId}`);
  url.searchParams.set("language", "ar");

  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`TMDB details failed: ${res.status}`);
  const item: TmdbApiTvItem & {
    number_of_seasons: number | null;
    seasons: TmdbApiSeason[] | null;
  } = await res.json();

  return {
    tmdb_id: item.id,
    title: item.name,
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    first_air_year: yearFromDate(item.first_air_date),
    overview: item.overview,
    vote_average: item.vote_average,
    number_of_seasons: item.number_of_seasons,
    seasons: (item.seasons ?? [])
      .filter((s) => s.season_number > 0)
      .sort((a, b) => a.season_number - b.season_number)
      .map((s) => ({
        season_number: s.season_number,
        name: s.name,
        episode_count: s.episode_count,
      })),
  };
}

export function tmdbImageUrl(
  path: string | null,
  size: "w500" | "w780" | "original" = "w500",
): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
