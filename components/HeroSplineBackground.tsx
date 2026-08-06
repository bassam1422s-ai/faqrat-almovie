"use client";

import { useEffect, useState } from "react";
import Spline from "@splinetool/react-spline/next";
import type { Application } from "@splinetool/runtime";

const SCENE_URL = "https://prod.spline.design/eZicsZCspps0l5Zc/scene.splinecode";

// Applied to every object in the scene so the cloned cubes match the
// site's monochrome liquid-glass palette instead of Spline's defaults.
const CUBE_COLOR = "#e8e8ec";

// If the scene hasn't loaded within this window, give up on it rather
// than leave a heavy, half-loaded WebGL scene sitting on the page.
const LOAD_TIMEOUT_MS = 8000;

function recolorScene(spline: Application) {
  spline.getAllObjects().forEach((obj) => {
    try {
      obj.color = CUBE_COLOR;
    } catch {
      // Some object types (cameras, empties) don't support color — skip them.
    }
  });
}

export function HeroSplineBackground() {
  const [shouldMount, setShouldMount] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    // Skip the heavy 3D scene on small screens: it's purely decorative,
    // and phones (where the group actually uses this app) are where
    // WebGL/WASM overhead is most likely to cause trouble.
    if (!window.matchMedia("(min-width: 768px)").matches) return;

    // Let the page finish its first interactive paint before starting the
    // heavy download, so nav/clicks are never blocked waiting on it.
    const mountTimer = window.setTimeout(() => setShouldMount(true), 150);
    return () => window.clearTimeout(mountTimer);
  }, []);

  useEffect(() => {
    if (!shouldMount || loaded) return;
    const timer = window.setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [shouldMount, loaded]);

  if (!shouldMount || timedOut) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      <Spline
        scene={SCENE_URL}
        onLoad={(spline) => {
          recolorScene(spline);
          setLoaded(true);
        }}
      />
    </div>
  );
}
