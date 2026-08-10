-- فقرة الموفي — Initial schema
-- Run this whole file once in the Supabase SQL Editor (Project → SQL Editor → New query → paste → Run).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table participants (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table movies (
  id             uuid primary key default gen_random_uuid(),
  tmdb_id        integer unique,
  title          text not null,
  poster_path    text,
  backdrop_path  text,
  release_year   integer,
  overview       text,
  vote_average   numeric(3,1),
  runtime_minutes integer,
  created_at     timestamptz not null default now()
);

create table rounds (
  id              uuid primary key default gen_random_uuid(),
  movie_id        uuid not null references movies(id),
  status          text not null default 'open' check (status in ('open', 'revealed')),
  started_by      uuid references participants(id),
  required_count  integer not null,
  submitted_count integer not null default 0,
  created_at      timestamptz not null default now(),
  revealed_at     timestamptz
);

-- Only one open round at a time.
create unique index one_open_round on rounds ((status)) where status = 'open';

create table ratings (
  id             uuid primary key default gen_random_uuid(),
  round_id       uuid not null references rounds(id),
  participant_id uuid not null references participants(id),
  score          numeric(3,1) not null check (score >= 1 and score <= 10),
  submitted_at   timestamptz not null default now(),
  unique (round_id, participant_id)
);

-- Lets the waiting screen show "who has submitted" (checkmarks only) before
-- reveal, without exposing anyone's score. Views run with the definer's
-- privileges by default in Postgres, so this intentionally bypasses the
-- ratings RLS policy below for these two columns only.
create view round_submissions as
select round_id, participant_id from ratings;

-- ---------------------------------------------------------------------------
-- Reveal trigger: flips rounds.status to 'revealed' the instant everyone has
-- submitted. Runs inside the same transaction as the insert, so concurrent
-- submissions can't race past the required_count.
-- ---------------------------------------------------------------------------

create or replace function handle_new_rating() returns trigger as $$
begin
  -- Scoped to status = 'open' so a late rating submitted after reveal (see
  -- submit_late_rating below) doesn't re-bump submitted_count/revealed_at.
  update rounds
     set submitted_count = submitted_count + 1,
         status = case
           when submitted_count + 1 >= required_count then 'revealed'
           else status
         end,
         revealed_at = case
           when submitted_count + 1 >= required_count then now()
           else revealed_at
         end
   where id = new.round_id
     and status = 'open';
  return new;
end;
$$ language plpgsql security definer;

create trigger on_rating_inserted
  after insert on ratings
  for each row execute function handle_new_rating();

-- ---------------------------------------------------------------------------
-- RPC functions (called from the browser via supabase-js .rpc())
-- ---------------------------------------------------------------------------

create or replace function start_round(
  p_tmdb_id       integer,
  p_title         text,
  p_poster_path   text,
  p_backdrop_path text,
  p_release_year  integer,
  p_overview      text,
  p_vote_average  numeric,
  p_runtime_minutes integer,
  p_started_by    uuid
) returns uuid as $$
declare
  v_movie_id uuid;
  v_round_id uuid;
  v_required integer;
begin
  if exists (select 1 from rounds where status = 'open') then
    raise exception 'ALREADY_OPEN' using errcode = 'P0001';
  end if;

  insert into movies (tmdb_id, title, poster_path, backdrop_path, release_year, overview, vote_average, runtime_minutes)
  values (p_tmdb_id, p_title, p_poster_path, p_backdrop_path, p_release_year, p_overview, p_vote_average, p_runtime_minutes)
  on conflict (tmdb_id) do update
    set title = excluded.title,
        poster_path = excluded.poster_path,
        backdrop_path = excluded.backdrop_path,
        release_year = excluded.release_year,
        overview = excluded.overview,
        vote_average = excluded.vote_average,
        runtime_minutes = excluded.runtime_minutes
  returning id into v_movie_id;

  select count(*) into v_required from participants where active;

  insert into rounds (movie_id, started_by, required_count)
  values (v_movie_id, p_started_by, v_required)
  returning id into v_round_id;

  return v_round_id;
end;
$$ language plpgsql security definer;

create or replace function submit_rating(
  p_round_id       uuid,
  p_participant_id uuid,
  p_score          numeric
) returns void as $$
begin
  if not exists (select 1 from rounds where id = p_round_id and status = 'open') then
    raise exception 'ROUND_NOT_OPEN' using errcode = 'P0001';
  end if;

  insert into ratings (round_id, participant_id, score)
  values (p_round_id, p_participant_id, p_score)
  on conflict (round_id, participant_id) do update set score = excluded.score;
end;
$$ language plpgsql security definer;

create or replace function force_reveal_round(p_round_id uuid) returns void as $$
begin
  update rounds
     set status = 'revealed',
         revealed_at = now()
   where id = p_round_id and status = 'open';
end;
$$ language plpgsql security definer;

-- Lets the archive delete a mistakenly-logged movie (e.g. picked the wrong
-- TMDB result). Only touches revealed rounds so it can't be used to cancel
-- an in-progress vote.
create or replace function delete_round(p_round_id uuid) returns void as $$
begin
  delete from ratings where round_id = p_round_id;
  delete from rounds where id = p_round_id and status = 'revealed';
end;
$$ language plpgsql security definer;

-- Lets anyone abort an open round they started by mistake (e.g. picked the
-- wrong movie), instead of being forced to complete a rating round with no
-- way out. Only touches open rounds — a revealed round is real history and
-- should go through delete_round in the archive instead.
create or replace function cancel_round(p_round_id uuid) returns void as $$
begin
  delete from ratings where round_id = p_round_id;
  delete from rounds where id = p_round_id and status = 'open';
end;
$$ language plpgsql security definer;

-- Lets someone who missed the live round (forgot their phone, wasn't there)
-- add their score afterwards from the archive. Only allowed on revealed
-- rounds, and only once per participant — the handle_new_rating trigger is
-- scoped to status = 'open' so this can't re-trigger a reveal or bump
-- revealed_at.
create or replace function submit_late_rating(
  p_round_id       uuid,
  p_participant_id uuid,
  p_score          numeric
) returns void as $$
begin
  if not exists (select 1 from rounds where id = p_round_id and status = 'revealed') then
    raise exception 'ROUND_NOT_REVEALED' using errcode = 'P0001';
  end if;

  if exists (select 1 from ratings where round_id = p_round_id and participant_id = p_participant_id) then
    raise exception 'ALREADY_RATED' using errcode = 'P0001';
  end if;

  insert into ratings (round_id, participant_id, score)
  values (p_round_id, p_participant_id, p_score);
end;
$$ language plpgsql security definer;

-- Bulk-logs a movie the group already watched before using the app, with no
-- ratings attached — it shows up as "unrated" for everyone (movie_averages
-- below is a left join, so zero ratings just means a null average) until
-- people rate it via submit_late_rating from the archive. Idempotent: if the
-- movie already has a round, returns the existing one instead of duplicating.
create or replace function import_watched_movie(
  p_tmdb_id         integer,
  p_title           text,
  p_poster_path     text,
  p_backdrop_path   text,
  p_release_year    integer,
  p_overview        text,
  p_vote_average    numeric,
  p_runtime_minutes integer
) returns uuid as $$
declare
  v_movie_id uuid;
  v_round_id uuid;
  v_required integer;
begin
  insert into movies (tmdb_id, title, poster_path, backdrop_path, release_year, overview, vote_average, runtime_minutes)
  values (p_tmdb_id, p_title, p_poster_path, p_backdrop_path, p_release_year, p_overview, p_vote_average, p_runtime_minutes)
  on conflict (tmdb_id) do update
    set title = excluded.title,
        poster_path = excluded.poster_path,
        backdrop_path = excluded.backdrop_path,
        release_year = excluded.release_year,
        overview = excluded.overview,
        vote_average = excluded.vote_average,
        runtime_minutes = excluded.runtime_minutes
  returning id into v_movie_id;

  select id into v_round_id from rounds where movie_id = v_movie_id limit 1;
  if v_round_id is not null then
    return v_round_id;
  end if;

  select count(*) into v_required from participants where active;

  insert into rounds (movie_id, status, required_count, revealed_at)
  values (v_movie_id, 'revealed', v_required, now())
  returning id into v_round_id;

  return v_round_id;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- Stats views
-- ---------------------------------------------------------------------------

create view movie_averages as
select
  m.id as movie_id,
  m.title,
  m.poster_path,
  m.backdrop_path,
  m.release_year,
  r.id as round_id,
  r.revealed_at,
  avg(rt.score) as average_score,
  count(rt.id) as rating_count,
  m.runtime_minutes
from movies m
join rounds r on r.movie_id = m.id and r.status = 'revealed'
left join ratings rt on rt.round_id = r.id
group by m.id, m.title, m.poster_path, m.backdrop_path, m.release_year, r.id, r.revealed_at, m.runtime_minutes;

create view participant_stats as
select
  p.id as participant_id,
  p.name,
  count(rt.id) as ratings_given,
  avg(rt.score) as average_score_given
from participants p
left join ratings rt on rt.participant_id = p.id
join rounds r on r.id = rt.round_id and r.status = 'revealed'
group by p.id, p.name;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- participants / movies / rounds are fully public (nothing sensitive).
-- ratings are only readable once the parent round is revealed, so no one can
-- peek at scores mid-round via the network tab.
-- ---------------------------------------------------------------------------

alter table participants enable row level security;
alter table movies enable row level security;
alter table rounds enable row level security;
alter table ratings enable row level security;

create policy "participants are publicly readable"
  on participants for select using (true);

create policy "movies are publicly readable"
  on movies for select using (true);

create policy "rounds are publicly readable"
  on rounds for select using (true);

create policy "ratings are readable only after reveal"
  on ratings for select
  using (exists (select 1 from rounds r where r.id = ratings.round_id and r.status = 'revealed'));

-- No direct INSERT/UPDATE policies are granted on any table: all writes go
-- through the SECURITY DEFINER RPC functions above, which enforce the rules
-- (one open round, valid score range, no re-incrementing on edits, etc).

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table rounds;

-- ---------------------------------------------------------------------------
-- Shows — separate from the movie-night flow: everyone follows their own
-- shows individually (no synchronized reveal), and just wants to see who's
-- watching what, their opinion so far, and where they've each gotten to.
-- ---------------------------------------------------------------------------

create table shows (
  id                uuid primary key default gen_random_uuid(),
  tmdb_id           integer unique not null,
  title             text not null,
  poster_path       text,
  backdrop_path     text,
  first_air_year    integer,
  overview          text,
  vote_average      numeric(3,1),
  number_of_seasons integer,
  -- Cached from TMDB: [{ season_number, name, episode_count }, ...]. Lets the
  -- progress editor offer a real "season X, episode Y of N" picker instead of
  -- an unbounded number input, without re-hitting TMDB on every edit.
  seasons           jsonb not null default '[]'::jsonb,
  created_at        timestamptz not null default now()
);

create table show_entries (
  id              uuid primary key default gen_random_uuid(),
  show_id         uuid not null references shows(id),
  participant_id  uuid not null references participants(id),
  rating          numeric(3,1) check (rating is null or (rating >= 1 and rating <= 10)),
  current_season  integer,
  current_episode integer,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (show_id, participant_id)
);

alter table shows enable row level security;
alter table show_entries enable row level security;

create policy "shows are publicly readable"
  on shows for select using (true);

create policy "show_entries are publicly readable"
  on show_entries for select using (true);

-- Ensures a show exists (cached from TMDB) and returns its id. Called once
-- when someone searches up a new show to follow; a show already followed by
-- someone else just gets its cached metadata refreshed, not duplicated.
create or replace function add_show(
  p_tmdb_id           integer,
  p_title             text,
  p_poster_path       text,
  p_backdrop_path     text,
  p_first_air_year    integer,
  p_overview          text,
  p_vote_average      numeric,
  p_number_of_seasons integer,
  p_seasons           jsonb default '[]'::jsonb
) returns uuid as $$
declare
  v_show_id uuid;
begin
  insert into shows (tmdb_id, title, poster_path, backdrop_path, first_air_year, overview, vote_average, number_of_seasons, seasons)
  values (p_tmdb_id, p_title, p_poster_path, p_backdrop_path, p_first_air_year, p_overview, p_vote_average, p_number_of_seasons, p_seasons)
  on conflict (tmdb_id) do update
    set title = excluded.title,
        poster_path = excluded.poster_path,
        backdrop_path = excluded.backdrop_path,
        first_air_year = excluded.first_air_year,
        overview = excluded.overview,
        vote_average = excluded.vote_average,
        number_of_seasons = excluded.number_of_seasons,
        seasons = excluded.seasons
  returning id into v_show_id;

  return v_show_id;
end;
$$ language plpgsql security definer;

-- Sets (or updates) one participant's own rating/progress on a show. Used
-- both for "I'm now following this too" and for updating where you're at.
create or replace function update_show_entry(
  p_show_id         uuid,
  p_participant_id  uuid,
  p_rating          numeric,
  p_current_season  integer,
  p_current_episode integer
) returns void as $$
begin
  insert into show_entries (show_id, participant_id, rating, current_season, current_episode)
  values (p_show_id, p_participant_id, p_rating, p_current_season, p_current_episode)
  on conflict (show_id, participant_id) do update
    set rating = excluded.rating,
        current_season = excluded.current_season,
        current_episode = excluded.current_episode,
        updated_at = now();
end;
$$ language plpgsql security definer;

-- Lets someone stop tracking a show they added by mistake or dropped —
-- only ever touches their own entry, never anyone else's.
create or replace function delete_show_entry(
  p_show_id        uuid,
  p_participant_id uuid
) returns void as $$
begin
  delete from show_entries
   where show_id = p_show_id and participant_id = p_participant_id;
end;
$$ language plpgsql security definer;

-- One row per show with a tracker count, so the /shows list can render
-- without pulling every participant's entry up front (those load on expand,
-- same pattern as the movie archive).
create view show_overview as
select
  s.id as show_id,
  s.title,
  s.poster_path,
  s.backdrop_path,
  s.first_air_year,
  s.number_of_seasons,
  s.seasons,
  count(se.id) as tracker_count,
  max(se.updated_at) as last_updated_at
from shows s
left join show_entries se on se.show_id = s.id
group by s.id, s.title, s.poster_path, s.backdrop_path, s.first_air_year, s.number_of_seasons, s.seasons;
