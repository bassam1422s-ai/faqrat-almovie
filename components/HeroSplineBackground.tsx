"use client";

import Spline from "@splinetool/react-spline/next";
import type { Application } from "@splinetool/runtime";

const SCENE_URL = "https://prod.spline.design/eZicsZCspps0l5Zc/scene.splinecode";

// Applied to every object in the scene so the cloned cubes match the
// site's monochrome liquid-glass palette instead of Spline's defaults.
const CUBE_COLOR = "#e8e8ec";

function handleLoad(spline: Application) {
  spline.getAllObjects().forEach((obj) => {
    try {
      obj.color = CUBE_COLOR;
    } catch {
      // Some object types (cameras, empties) don't support color — skip them.
    }
  });
}

export function HeroSplineBackground() {
  return (
    <div className="absolute inset-0">
      <Spline scene={SCENE_URL} onLoad={handleLoad} />
    </div>
  );
}
