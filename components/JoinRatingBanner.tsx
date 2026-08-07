"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export function JoinRatingBanner() {
  const pathname = usePathname();
  const [openMovieTitle, setOpenMovieTitle] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from("rounds")
        .select("status, movies(title)")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (data?.status === "open") {
        const movie = data.movies as unknown as { title: string } | null;
        setOpenMovieTitle(movie?.title ?? "");
      } else {
        setOpenMovieTitle(null);
      }
    }

    load();

    const channel = supabase
      .channel("join-banner-rounds")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rounds" },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  if (openMovieTitle === null || pathname === "/rating") return null;

  return (
    <Link
      href="/rating"
      className="animate-slide-up-pop shine-button fixed inset-x-4 z-30 mx-auto flex max-w-sm items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black shadow-2xl shadow-black/40 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <Clapperboard size={18} className="animate-pulse" />
      <span>
        {openMovieTitle ? `انضم لتقييم "${openMovieTitle}"` : "انضموا للتقييم الحين"}
      </span>
    </Link>
  );
}
