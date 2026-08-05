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

  const quickStats = [
    { label: "عدد الأفلام", value: moviesLoading ? "—" : String(movies.length) },
    {
      label: "أعلى تقييم",
      value: highest ? `${highest.title} · ${Number(highest.average_score).toFixed(1)}` : "—",
    },
    {
      label: "أقل تقييم",
      value: lowest ? `${lowest.title} · ${Number(lowest.average_score).toFixed(1)}` : "—",
    },
    {
      label: "أطول فلم",
      value: longest ? `${longest.title} · ${longest.runtime_minutes} د` : "—",
    },
    {
      label: "أقصر فلم",
      value: shortest ? `${shortest.title} · ${shortest.runtime_minutes} د` : "—",
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-8 px-4 pb-16 pt-8 text-center">
      <h1 className="animate-blur-fade-up text-4xl font-medium sm:text-5xl">
        فقرة الموفي
      </h1>

      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-5">
        {quickStats.map((s, i) => (
          <div
            key={s.label}
            className="animate-blur-fade-up liquid-glass min-w-0 rounded-xl px-3 py-3"
            style={{ animationDelay: `${80 + i * 60}ms` }}
          >
            <p className="truncate text-sm font-medium">{s.value}</p>
            <p className="mt-1 text-xs text-gray-400">{s.label}</p>
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
