"use client";

import Link from "next/link";
import { BarChart3, Clapperboard, LibraryBig, type LucideIcon } from "lucide-react";
import { useParticipants } from "@/hooks/useParticipants";
import { useCurrentParticipant } from "@/hooks/useCurrentParticipant";
import { useMovieAverages } from "@/hooks/useMovieAverages";
import { storeParticipant } from "@/lib/participant";
import { NamePicker } from "@/components/NamePicker";
import type { MovieAverage } from "@/lib/types";

const SECTIONS: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    href: "/rating",
    label: "فقرة التقييم",
    description: "اختر الفلم وابدأ التقييم",
    icon: Clapperboard,
  },
  {
    href: "/stats",
    label: "الإحصائيات",
    description: "معدلاتكم وأرقامكم",
    icon: BarChart3,
  },
  {
    href: "/archive",
    label: "الأرشيف",
    description: "كل الأفلام اللي شفتوها",
    icon: LibraryBig,
  },
];

function extremum(
  movies: MovieAverage[],
  key: "average_score" | "runtime_minutes",
  direction: "max" | "min",
): MovieAverage | null {
  const candidates = movies.filter((m) => m[key] != null);
  if (candidates.length === 0) return null;
  return candidates.reduce((best, m) => {
    const better =
      direction === "max"
        ? Number(m[key]) > Number(best[key])
        : Number(m[key]) < Number(best[key]);
    return better ? m : best;
  });
}

export default function Home() {
  const { participants } = useParticipants();
  const { participant, ready, refresh } = useCurrentParticipant();
  const { movies, loading: moviesLoading } = useMovieAverages();

  if (!ready) {
    return <main className="flex flex-1 items-center justify-center" />;
  }

  if (!participant) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-16">
        <h1 className="animate-blur-fade-up text-2xl font-medium">مين أنت؟</h1>
        <NamePicker
          participants={participants}
          onSelect={(p) => {
            storeParticipant(p.id, p.name);
            refresh();
          }}
        />
      </main>
    );
  }

  const highest = extremum(movies, "average_score", "max");
  const lowest = extremum(movies, "average_score", "min");
  const longest = extremum(movies, "runtime_minutes", "max");
  const shortest = extremum(movies, "runtime_minutes", "min");

  const quickStats: { label: string; title?: string; value: string }[] = [
    {
      label: "عدد الأفلام",
      value: moviesLoading ? "—" : String(movies.length),
    },
    {
      label: "أعلى تقييم",
      title: highest?.title,
      value: highest ? Number(highest.average_score).toFixed(1) : "—",
    },
    {
      label: "أقل تقييم",
      title: lowest?.title,
      value: lowest ? Number(lowest.average_score).toFixed(1) : "—",
    },
    {
      label: "أطول فلم",
      title: longest?.title,
      value: longest ? `${longest.runtime_minutes} د` : "—",
    },
    {
      label: "أقصر فلم",
      title: shortest?.title,
      value: shortest ? `${shortest.runtime_minutes} د` : "—",
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-8 px-4 pb-16 pt-8 text-center">
      <h1 className="animate-blur-fade-up text-4xl font-medium sm:text-5xl">
        فقرة الموفي
      </h1>

      <div className="grid w-full grid-cols-2 gap-3">
        {quickStats.map((s, i) => (
          <div
            key={s.label}
            className="animate-blur-fade-up liquid-glass flex min-h-[6.5rem] min-w-0 flex-col justify-center gap-1 rounded-xl px-4 py-3"
            style={{ animationDelay: `${80 + i * 60}ms` }}
          >
            <p className="text-xs text-gray-400">{s.label}</p>
            {s.title && (
              <p className="line-clamp-2 text-sm leading-snug font-medium">
                {s.title}
              </p>
            )}
            <p className="text-xl font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div
        className="animate-blur-fade-up"
        style={{ animationDelay: "400ms" }}
      >
        <p className="text-gray-400">أهلاً</p>
        <p className="text-2xl font-medium">{participant.name}</p>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        {SECTIONS.map(({ href, label, description, icon: Icon }, i) => (
          <Link
            key={href}
            href={href}
            className="animate-blur-fade-up liquid-glass flex flex-col items-center gap-3 rounded-2xl px-6 py-8 text-center hover:bg-white/5"
            style={{ animationDelay: `${460 + i * 80}ms` }}
          >
            <Icon size={28} />
            <span className="text-lg font-medium">{label}</span>
            <span className="text-sm text-gray-400">{description}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
