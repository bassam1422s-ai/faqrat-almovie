"use client";

import { usePathname } from "next/navigation";
import { HeroBackground } from "./HeroBackground";
import { LatestMovieBackdrop } from "./LatestMovieBackdrop";
import { PosterSlideshowBackdrop } from "./PosterSlideshowBackdrop";

export function CinematicBackdrop() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-black">
      {pathname === "/" && <HeroBackground />}
      {pathname === "/rating" && <LatestMovieBackdrop />}
      {(pathname === "/archive" || pathname === "/stats") && (
        <PosterSlideshowBackdrop />
      )}
      <div className="backdrop-bottom-mask absolute inset-0 backdrop-blur-xl" />
    </div>
  );
}
