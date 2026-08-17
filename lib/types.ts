export type Participant = {
  id: string;
  name: string;
  active: boolean;
};

export type Movie = {
  id: string;
  tmdb_id: number | null;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_year: number | null;
  overview: string | null;
  vote_average: number | null;
  runtime_minutes: number | null;
};

export type RoundStatus = "open" | "revealed";

export type Round = {
  id: string;
  movie_id: string;
  status: RoundStatus;
  started_by: string | null;
  required_count: number;
  submitted_count: number;
  created_at: string;
  revealed_at: string | null;
  movies: Movie;
};

export type Rating = {
  id: string;
  round_id: string;
  participant_id: string;
  score: number;
  submitted_at: string;
  participants: Participant;
};

export type TmdbSearchResult = {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_year: number | null;
  overview: string | null;
  vote_average: number | null;
};

export type TmdbMovieDetails = TmdbSearchResult & {
  runtime_minutes: number | null;
};

export type MovieAverage = {
  movie_id: string;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_year: number | null;
  round_id: string;
  revealed_at: string;
  average_score: number | null;
  rating_count: number;
  runtime_minutes: number | null;
};

export type ParticipantStats = {
  participant_id: string;
  name: string;
  ratings_given: number;
  average_score_given: number | null;
};

export type TmdbTvSearchResult = {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_year: number | null;
  overview: string | null;
  vote_average: number | null;
};

export type TmdbTvSeason = {
  season_number: number;
  name: string;
  episode_count: number;
};

export type TmdbTvDetails = TmdbTvSearchResult & {
  number_of_seasons: number | null;
  seasons: TmdbTvSeason[];
};

export type ShowOverview = {
  show_id: string;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_year: number | null;
  number_of_seasons: number | null;
  seasons: TmdbTvSeason[];
  tracker_count: number;
  last_updated_at: string | null;
  added_by: string | null;
};

export type ShowEntry = {
  id: string;
  show_id: string;
  participant_id: string;
  rating: number | null;
  current_season: number | null;
  current_episode: number | null;
  finished: boolean;
  updated_at: string;
  participants: Participant;
};

export type PrepListOverview = {
  prep_list_id: string;
  tmdb_id: number | null;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_year: number | null;
  created_by: string | null;
  item_count: number;
  done_count: number;
};

export type PrepItemStatus = {
  item_id: string;
  prep_list_id: string;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_year: number | null;
  overview: string | null;
  vote_average: number | null;
  runtime_minutes: number | null;
  created_at: string;
  round_id: string | null;
  done: boolean;
};
