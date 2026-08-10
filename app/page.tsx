"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Clapperboard,
  LibraryBig,
  Tv,
  type LucideIcon,
} from "lucide-react";
import { useParticipants } from "@/hooks/useParticipants";
import { useCurrentParticipant } from "@/hooks/useCurrentParticipant";
import { useMovieAverages } from "@/hooks/useMovieAverages";
import { storeParticipant } from "@/lib/participant";
import { NamePicker } from "@/components/NamePicker";
import { ShinyText } from "@/components/ShinyText";
import { FriendCoverflow } from "@/components/FriendCoverflow";
import type { MovieAverage } from "@/lib/types";

const FRIEND_PHOTOS = Array.from({ length: 21 }, (_, i) => ({
  image: { src: `/cameos/${i + 1}.jpg` },
}));

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
  {
    href: "/shows",
    label: "المسلسلات",
    description: "مسلسلات كل واحد ووين وصل",
    icon: Tv,
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

  const ratingRow = [
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
  ];

  const runtimeRow = [
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
      <div className="flex flex-col items-center gap-4 pt-4 sm:pt-8">
        <h1 className="animate-blur-fade-up text-5xl leading-[0.85] font-medium tracking-tighter sm:text-6xl md:text-7xl">
          <span className="block text-white">فقرة</span>
          <span className="block">
            <ShinyText>الموفي</ShinyText>
          </span>
        </h1>
        <Link
          href="/rating"
          className="animate-fade-up group mt-2 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black shadow-xl shadow-black/50 transition-colors hover:bg-gray-200 md:px-8 md:py-4"
          style={{ animationDelay: "160ms" }}
        >
          ابدأ فقرة التقييم
          <ArrowLeft
            size={18}
            className="transition-transform group-hover:-translate-x-1"
          />
        </Link>
      </div>

      <div className="flex w-full flex-col items-center gap-3">
        <div
          className="animate-blur-fade-up liquid-glass w-full rounded-2xl px-6 py-5 text-center"
          style={{ animationDelay: "240ms" }}
        >
          <p className="text-sm text-gray-400">عدد الأفلام</p>
          <p className="mt-1 text-4xl font-semibold tabular-nums">
            {moviesLoading ? "—" : movies.length}
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-3">
          {ratingRow.map((s, i) => (
            <StatTile key={s.label} stat={s} delayMs={300 + i * 60} />
          ))}
        </div>

        <div className="grid w-full grid-cols-2 gap-3">
          {runtimeRow.map((s, i) => (
            <StatTile key={s.label} stat={s} delayMs={420 + i * 60} />
          ))}
        </div>
      </div>

      <div
        className="animate-blur-fade-up"
        style={{ animationDelay: "560ms" }}
      >
        <p className="text-gray-400">أهلاً</p>
        <p className="text-2xl font-medium">{participant.name}</p>
      </div>

      <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
        {SECTIONS.map(({ href, label, description, icon: Icon }, i) => (
          <Link
            key={href}
            href={href}
            className="animate-blur-fade-up liquid-glass flex flex-col items-center gap-3 rounded-2xl px-6 py-8 text-center hover:bg-white/5"
            style={{ animationDelay: `${620 + i * 80}ms` }}
          >
            <Icon size={28} />
            <span className="text-lg font-medium">{label}</span>
            <span className="text-sm text-gray-400">{description}</span>
          </Link>
        ))}
      </div>

      <div
        className="animate-blur-fade-up w-full"
        style={{ animationDelay: "700ms" }}
      >
        <FriendCoverflow slides={FRIEND_PHOTOS} />
      </div>
    </main>
  );
}

function StatTile({
  stat,
  delayMs,
}: {
  stat: { label: string; title?: string; value: string };
  delayMs: number;
}) {
  return (
    <div
      className="animate-blur-fade-up liquid-glass flex min-h-[6.5rem] min-w-0 flex-col justify-center gap-1 rounded-xl px-4 py-3"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <p className="text-xs text-gray-400">{stat.label}</p>
      {stat.title && (
        <p className="line-clamp-2 text-sm leading-snug font-medium">
          {stat.title}
        </p>
      )}
      <p className="text-xl font-semibold tabular-nums">{stat.value}</p>
    </div>
  );
}
