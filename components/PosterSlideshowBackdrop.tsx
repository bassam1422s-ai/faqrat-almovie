"use client";

import { useEffect, useRef, useState } from "react";
import { useMovieAverages } from "@/hooks/useMovieAverages";
import { tmdbImageUrl } from "@/lib/tmdb";

const SLIDE_MS = 7000;

export function PosterSlideshowBackdrop() {
  const { movies } = useMovieAverages();
  const urls = movies
    .map((m) => tmdbImageUrl(m.backdrop_path ?? m.poster_path, "original"))
    .filter((u): u is string => Boolean(u));

  const [layerSrcs, setLayerSrcs] = useState<[string | null, string | null]>([
    null,
    null,
  ]);
  const [activeLayer, setActiveLayer] = useState<0 | 1>(0);
  const indexRef = useRef(0);

  useEffect(() => {
    if (urls.length < 2) return;
    const id = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % urls.length;
      const nextUrl = urls[indexRef.current];
      setActiveLayer((prevActive) => {
        const nextActive = prevActive === 0 ? 1 : 0;
        setLayerSrcs((prevLayers) => {
          const updated: [string | null, string | null] = [...prevLayers];
          updated[nextActive] = nextUrl;
          return updated;
        });
        return nextActive;
      });
    }, SLIDE_MS);
    return () => clearInterval(id);
  }, [urls]);

  const displaySrcs: [string | null, string | null] = [
    layerSrcs[0] ?? urls[0] ?? null,
    layerSrcs[1],
  ];

  return (
    <>
      {[0, 1].map((i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={displaySrcs[i] ?? undefined}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1500ms] ${
            displaySrcs[i] && activeLayer === i ? "opacity-60" : "opacity-0"
          }`}
        />
      ))}
    </>
  );
}
