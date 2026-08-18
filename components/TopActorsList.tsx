import { tmdbImageUrl } from "@/lib/tmdb";
import { GlassCard } from "./GlassCard";
import type { TopActor } from "@/lib/types";

export function TopActorsList({ actors }: { actors: TopActor[] }) {
  if (actors.length === 0) return null;

  return (
    <GlassCard className="animate-blur-fade-up">
      <p className="mb-4 text-lg font-medium">الممثلين اللي نشوفهم أكثر</p>
      <div className="flex gap-4 overflow-x-auto pb-1">
        {actors.map((actor) => {
          const photo = tmdbImageUrl(actor.profile_path, "w500");
          return (
            <div
              key={actor.actor_tmdb_id}
              className="flex w-20 shrink-0 flex-col items-center gap-2 text-center"
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-white/10">
                {photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <p className="line-clamp-2 text-xs font-medium leading-tight">
                {actor.actor_name}
              </p>
              <p className="text-xs text-gray-400">{actor.movie_count} أفلام</p>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
