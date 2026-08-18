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
  -- Lets one person correct someone else's already-revealed rating (e.g. a
  -- fat-finger during the live vote) so it can be resubmitted. Not a real
  -- auth system — this whole app has none — just a courtesy gate so the
  -- button only shows up for whoever's meant to use it.
  is_admin   boolean not null default false,
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

-- One-off backfill helper: lets a script correct a movie's title (e.g. to
-- the English TMDB title) without a full round/rating RPC. Title only —
-- nothing else about the movie is touched.
create or replace function update_movie_title(p_movie_id uuid, p_title text) returns void as $$
begin
  update movies set title = p_title where id = p_movie_id;
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

-- Lets an admin clear one specific person's rating so they can resubmit
-- (e.g. they meant 7 not 9). Only on revealed rounds — same "no peeking at
-- an in-progress vote" guarantee as submit_late_rating/delete_round, so this
-- can't be used to erase someone's answer while a round is still open.
create or replace function admin_delete_rating(
  p_rating_id           uuid,
  p_admin_participant_id uuid
) returns void as $$
begin
  if not exists (select 1 from participants where id = p_admin_participant_id and is_admin) then
    raise exception 'NOT_ADMIN' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from ratings rt
    join rounds r on r.id = rt.round_id
    where rt.id = p_rating_id and r.status = 'revealed'
  ) then
    raise exception 'ROUND_NOT_REVEALED' using errcode = 'P0001';
  end if;

  delete from ratings where id = p_rating_id;
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
-- Movie cast — cached from TMDB (top-billed only, order < 15) whenever a
-- round starts, so the stats page can show "actors we've seen the most".
-- Populated client-side right after start_round succeeds (best-effort —
-- never blocks the rating flow if the TMDB call fails), plus a one-time
-- backfill script for movies logged before this existed.
-- ---------------------------------------------------------------------------

create table movie_cast (
  id            uuid primary key default gen_random_uuid(),
  movie_id      uuid not null references movies(id),
  actor_tmdb_id integer not null,
  actor_name    text not null,
  profile_path  text,
  popularity    numeric,
  cast_order    integer,
  unique (movie_id, actor_tmdb_id)
);

alter table movie_cast enable row level security;

create policy "movie_cast are publicly readable"
  on movie_cast for select using (true);

-- p_cast is a JSON array of {tmdb_id, name, profile_path, popularity, order}.
create or replace function add_movie_cast(p_movie_id uuid, p_cast jsonb) returns void as $$
begin
  insert into movie_cast (movie_id, actor_tmdb_id, actor_name, profile_path, popularity, cast_order)
  select
    p_movie_id,
    (c->>'tmdb_id')::integer,
    c->>'name',
    c->>'profile_path',
    (c->>'popularity')::numeric,
    (c->>'order')::integer
  from jsonb_array_elements(p_cast) as c
  on conflict (movie_id, actor_tmdb_id) do update
    set actor_name = excluded.actor_name,
        profile_path = excluded.profile_path,
        popularity = excluded.popularity,
        cast_order = excluded.cast_order;
end;
$$ language plpgsql security definer;

-- "Very famous" is inherently fuzzy — this uses a modest popularity floor
-- (TMDB's popularity score is noisy/time-sensitive, so the bar is low on
-- purpose) combined with movie_cast only ever storing top-billed roles
-- (order < 15) to begin with, which already excludes background/extra
-- credits. Adjust the "3" below if the results feel off.
create view top_actors as
select
  mc.actor_tmdb_id,
  mc.actor_name,
  max(mc.profile_path) as profile_path,
  max(mc.popularity) as popularity,
  count(distinct mc.movie_id) as movie_count
from movie_cast mc
join movies m on m.id = mc.movie_id
join rounds r on r.movie_id = m.id and r.status = 'revealed'
group by mc.actor_tmdb_id, mc.actor_name
having max(mc.popularity) >= 3
order by movie_count desc, popularity desc;

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
  -- Whoever added the show is the only one allowed to delete it entirely
  -- (delete_show below) — null for shows added before this column existed.
  added_by          uuid references participants(id),
  -- TMDB's average episode length in minutes. Used to estimate total time
  -- watched per person (current_episode * episode_run_time) — an estimate,
  -- since it's a show-wide average rather than a true per-episode runtime.
  episode_run_time  integer,
  created_at        timestamptz not null default now()
);

create table show_entries (
  id              uuid primary key default gen_random_uuid(),
  show_id         uuid not null references shows(id),
  participant_id  uuid not null references participants(id),
  rating          numeric(3,1) check (rating is null or (rating >= 1 and rating <= 10)),
  current_season  integer,
  current_episode integer,
  finished        boolean not null default false,
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
  p_seasons           jsonb default '[]'::jsonb,
  p_added_by          uuid default null,
  p_episode_run_time  integer default null
) returns uuid as $$
declare
  v_show_id uuid;
begin
  insert into shows (tmdb_id, title, poster_path, backdrop_path, first_air_year, overview, vote_average, number_of_seasons, seasons, added_by, episode_run_time)
  values (p_tmdb_id, p_title, p_poster_path, p_backdrop_path, p_first_air_year, p_overview, p_vote_average, p_number_of_seasons, p_seasons, p_added_by, p_episode_run_time)
  -- added_by is intentionally left out of the update clause below: if the
  -- show already exists, whoever added it first stays the owner.
  on conflict (tmdb_id) do update
    set title = excluded.title,
        poster_path = excluded.poster_path,
        backdrop_path = excluded.backdrop_path,
        first_air_year = excluded.first_air_year,
        overview = excluded.overview,
        vote_average = excluded.vote_average,
        number_of_seasons = excluded.number_of_seasons,
        seasons = excluded.seasons,
        episode_run_time = excluded.episode_run_time
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
  p_current_episode integer,
  p_finished        boolean default false
) returns void as $$
begin
  insert into show_entries (show_id, participant_id, rating, current_season, current_episode, finished)
  values (p_show_id, p_participant_id, p_rating, p_current_season, p_current_episode, p_finished)
  on conflict (show_id, participant_id) do update
    set rating = excluded.rating,
        current_season = excluded.current_season,
        current_episode = excluded.current_episode,
        finished = excluded.finished,
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

-- One-off backfill helper: sets a show's average episode runtime (minutes)
-- without touching anything else, for shows added before this column
-- existed.
create or replace function update_show_episode_run_time(p_show_id uuid, p_episode_run_time integer) returns void as $$
begin
  update shows set episode_run_time = p_episode_run_time where id = p_show_id;
end;
$$ language plpgsql security definer;

-- Deletes a show entirely (and everyone's tracking entries on it), but only
-- for whoever originally added it — prevents someone from wiping a show
-- other people are actively tracking.
create or replace function delete_show(
  p_show_id        uuid,
  p_participant_id uuid
) returns void as $$
begin
  if not exists (
    select 1 from shows where id = p_show_id and added_by = p_participant_id
  ) then
    raise exception 'NOT_OWNER' using errcode = 'P0001';
  end if;

  delete from show_entries where show_id = p_show_id;
  delete from shows where id = p_show_id;
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
  count(se.id) as tracker_count,
  max(se.updated_at) as last_updated_at,
  s.seasons,
  s.added_by
from shows s
left join show_entries se on se.show_id = s.id
group by s.id, s.title, s.poster_path, s.backdrop_path, s.first_air_year, s.number_of_seasons, s.seasons, s.added_by;

-- ---------------------------------------------------------------------------
-- Prep lists ("فقرة التجهيز") — a checklist of movies to watch before some
-- upcoming release (e.g. a stack of MCU movies before a new Avengers film).
-- A checklist item's "done" state is never stored directly — it's derived
-- live from whether that movie has a revealed round (movies/rounds), so
-- rating it anywhere in the app (including outside this checklist) ticks it
-- off automatically and it can never drift out of sync with the archive.
-- ---------------------------------------------------------------------------

create table prep_lists (
  id            uuid primary key default gen_random_uuid(),
  tmdb_id       integer,
  title         text not null,
  poster_path   text,
  backdrop_path text,
  release_year  integer,
  created_by    uuid references participants(id),
  created_at    timestamptz not null default now()
);

create table prep_items (
  id              uuid primary key default gen_random_uuid(),
  prep_list_id    uuid not null references prep_lists(id),
  tmdb_id         integer not null,
  title           text not null,
  poster_path     text,
  backdrop_path   text,
  release_year    integer,
  overview        text,
  vote_average    numeric(3,1),
  runtime_minutes integer,
  created_at      timestamptz not null default now(),
  unique (prep_list_id, tmdb_id)
);

alter table prep_lists enable row level security;
alter table prep_items enable row level security;

create policy "prep_lists are publicly readable"
  on prep_lists for select using (true);

create policy "prep_items are publicly readable"
  on prep_items for select using (true);

create or replace function create_prep_list(
  p_tmdb_id       integer,
  p_title         text,
  p_poster_path   text,
  p_backdrop_path text,
  p_release_year  integer,
  p_created_by    uuid
) returns uuid as $$
declare
  v_id uuid;
begin
  insert into prep_lists (tmdb_id, title, poster_path, backdrop_path, release_year, created_by)
  values (p_tmdb_id, p_title, p_poster_path, p_backdrop_path, p_release_year, p_created_by)
  returning id into v_id;

  return v_id;
end;
$$ language plpgsql security definer;

create or replace function add_prep_item(
  p_prep_list_id    uuid,
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
  v_id uuid;
begin
  insert into prep_items (prep_list_id, tmdb_id, title, poster_path, backdrop_path, release_year, overview, vote_average, runtime_minutes)
  values (p_prep_list_id, p_tmdb_id, p_title, p_poster_path, p_backdrop_path, p_release_year, p_overview, p_vote_average, p_runtime_minutes)
  on conflict (prep_list_id, tmdb_id) do update set title = excluded.title
  returning id into v_id;

  return v_id;
end;
$$ language plpgsql security definer;

-- Lets anyone remove a mis-added item from a checklist — same trust level
-- as delete_round in the archive, no per-item ownership.
create or replace function delete_prep_item(p_item_id uuid) returns void as $$
begin
  delete from prep_items where id = p_item_id;
end;
$$ language plpgsql security definer;

-- Only whoever created the checklist can delete the whole thing (same
-- ownership pattern as delete_show).
create or replace function delete_prep_list(p_prep_list_id uuid, p_participant_id uuid) returns void as $$
begin
  if not exists (
    select 1 from prep_lists where id = p_prep_list_id and created_by = p_participant_id
  ) then
    raise exception 'NOT_OWNER' using errcode = 'P0001';
  end if;

  delete from prep_items where prep_list_id = p_prep_list_id;
  delete from prep_lists where id = p_prep_list_id;
end;
$$ language plpgsql security definer;

create view prep_list_overview as
select
  pl.id as prep_list_id,
  pl.tmdb_id,
  pl.title,
  pl.poster_path,
  pl.backdrop_path,
  pl.release_year,
  pl.created_by,
  count(pi.id) as item_count,
  count(r.id) as done_count
from prep_lists pl
left join prep_items pi on pi.prep_list_id = pl.id
left join movies m on m.tmdb_id = pi.tmdb_id
left join rounds r on r.movie_id = m.id and r.status = 'revealed'
group by pl.id, pl.tmdb_id, pl.title, pl.poster_path, pl.backdrop_path, pl.release_year, pl.created_by;

create view prep_item_status as
select
  pi.id as item_id,
  pi.prep_list_id,
  pi.tmdb_id,
  pi.title,
  pi.poster_path,
  pi.backdrop_path,
  pi.release_year,
  pi.overview,
  pi.vote_average,
  pi.runtime_minutes,
  pi.created_at,
  r.id as round_id,
  (r.id is not null) as done
from prep_items pi
left join movies m on m.tmdb_id = pi.tmdb_id
left join rounds r on r.movie_id = m.id and r.status = 'revealed';

-- ---------------------------------------------------------------------------
-- Per-person watch stats for the stats page: total movie/show minutes,
-- shows tracked, and episodes watched. show_minutes is an estimate
-- (current_episode * the show's average episode_run_time from TMDB).
-- ---------------------------------------------------------------------------

create view participant_watch_stats as
select
  p.id as participant_id,
  p.name,
  coalesce(mv.movie_minutes, 0) as movie_minutes,
  coalesce(sh.shows_count, 0) as shows_count,
  coalesce(sh.episodes_count, 0) as episodes_count,
  coalesce(sh.show_minutes, 0) as show_minutes
from participants p
left join (
  select rt.participant_id, sum(m.runtime_minutes) as movie_minutes
  from ratings rt
  join rounds r on r.id = rt.round_id and r.status = 'revealed'
  join movies m on m.id = r.movie_id
  group by rt.participant_id
) mv on mv.participant_id = p.id
left join (
  select
    se.participant_id,
    count(distinct se.show_id) as shows_count,
    sum(coalesce(se.current_episode, 0)) as episodes_count,
    sum(coalesce(se.current_episode, 0) * coalesce(s.episode_run_time, 0)) as show_minutes
  from show_entries se
  join shows s on s.id = se.show_id
  group by se.participant_id
) sh on sh.participant_id = p.id;
