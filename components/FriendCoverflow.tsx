"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

type Slide = {
  image?: { src?: string; alt?: string };
  title?: string;
};

type Transition = {
  duration?: number;
  delay?: number;
  ease?: number[] | string;
};

type Props = {
  slides?: Slide[];
  cardWidth?: number;
  cardHeight?: number;
  radius?: number;
  tilt?: number;
  sideTilt?: number;
  gap?: number;
  opacity?: number;
  transition?: Transition;
  autoplay?: boolean;
  autoplayDirection?: "leftToRight" | "rightToLeft";
  showTitle?: boolean;
  titleColor?: string;
};

// Fixed internals (not exposed as props).
const PERSPECTIVE = 1600;
const SCALE_STEP = 0.16;
const MAX_VISIBLE = 2;
// In a preserve-3d context, paint order follows 3D position rather than
// z-index, so the centre card is pushed nearest the viewer and neighbours
// fall back behind it.
const DEPTH = 240;

function cssTransition(t?: Transition): { dur: number; ease: string } {
  const dur = typeof t?.duration === "number" ? t.duration : 0.6;
  let ease = "cubic-bezier(0.22, 1, 0.36, 1)";
  const e = t?.ease;
  if (Array.isArray(e) && e.length === 4) {
    ease = `cubic-bezier(${e[0]}, ${e[1]}, ${e[2]}, ${e[3]})`;
  } else if (typeof e === "string") {
    const map: Record<string, string> = {
      linear: "linear",
      easeIn: "ease-in",
      easeOut: "ease-out",
      easeInOut: "ease-in-out",
    };
    ease = map[e] || "ease";
  }
  return { dur, ease };
}

/**
 * A 3D coverflow: the active card sits upright in the spotlight while its
 * neighbours tilt back in perspective. Click any card to bring it to centre.
 */
export function FriendCoverflow({
  slides = [],
  cardWidth = 220,
  cardHeight = 280,
  radius = 5,
  tilt = -21,
  sideTilt = 8,
  gap = 9,
  opacity = 60,
  transition = {
    duration: 0.6,
    delay: 1.95,
    ease: [0.22, 1, 0.36, 1],
  },
  autoplay = true,
  autoplayDirection = "rightToLeft",
  showTitle = false,
  titleColor = "#ffffff",
}: Props) {
  const list = slides.length ? slides : [];
  const n = list.length;
  const [active, setActive] = useState(0);
  // Clamped on read (rather than synced via effect) in case the slide
  // count ever shrinks below the current index.
  const safeActive = n > 0 ? Math.max(0, Math.min(n - 1, active)) : 0;

  const moveDur = typeof transition.duration === "number" ? transition.duration : 0.6;
  const lockRef = useRef(false);
  const lock = useCallback(() => {
    lockRef.current = true;
    window.setTimeout(() => {
      lockRef.current = false;
    }, Math.max(50, moveDur * 1000));
  }, [moveDur]);

  const step = useCallback(
    (dir: number) => {
      if (lockRef.current || n === 0) return;
      lock();
      setActive((a) => (((a + dir) % n) + n) % n);
    },
    [n, lock],
  );

  const handleCardClick = useCallback(
    (i: number) => {
      if (autoplay || lockRef.current) return;
      lock();
      setActive((a) => (i === a ? (a + 1) % n : i));
    },
    [autoplay, n, lock],
  );

  const delay = typeof transition.delay === "number" ? transition.delay : 2.5;
  useEffect(() => {
    if (!autoplay || n < 2) return;
    const ms = Math.max(0.3, delay) * 1000;
    const dir = autoplayDirection === "leftToRight" ? -1 : 1;
    const id = window.setInterval(() => step(dir), ms);
    return () => window.clearInterval(id);
  }, [autoplay, autoplayDirection, delay, n, step]);

  const { dur, ease } = cssTransition(transition);
  const transitionCss = `transform ${dur}s ${ease}, opacity ${dur}s ${ease}`;

  const effectiveRadius =
    (Math.max(0, Math.min(20, radius)) / 20) * (Math.min(cardWidth, cardHeight) / 2);
  const dim = 1 - Math.max(0, Math.min(100, opacity)) / 100;

  if (n === 0) return null;

  return (
    <div
      className="relative flex w-full items-center justify-center overflow-hidden outline-none"
      style={{
        minHeight: cardHeight + 40,
        perspective: `${PERSPECTIVE}px`,
      }}
    >
      <div
        style={{
          position: "relative",
          width: cardWidth,
          height: cardHeight,
          transformStyle: "preserve-3d",
        }}
      >
        {list.map((slide, i) => {
          let rel = i - safeActive;
          if (rel > n / 2) rel -= n;
          if (rel < -n / 2) rel += n;
          const ax = Math.abs(rel);
          const visible = ax <= MAX_VISIBLE;
          const isActive = rel === 0;
          const sc = Math.max(0.4, 1 - ax * SCALE_STEP);
          const tx = rel * (gap * 30);
          const tz = -ax * DEPTH;
          const ry = -rel * tilt;
          const rz = rel * sideTilt;
          const src = slide.image?.src || "";

          const cardStyle: CSSProperties = {
            position: "absolute",
            left: "50%",
            top: "50%",
            width: cardWidth,
            height: cardHeight,
            borderRadius: effectiveRadius,
            overflow: "hidden",
            transformStyle: "preserve-3d",
            transformOrigin: "center center",
            transform: `translate(-50%, -50%) translateX(${tx}px) translateZ(${tz}px) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${sc})`,
            transition: transitionCss,
            opacity: visible ? 1 : 0,
            cursor: autoplay || isActive ? "default" : "pointer",
            pointerEvents: visible && !autoplay ? "auto" : "none",
            backgroundColor: "#1a1a1a",
          };

          return (
            <div
              key={i}
              style={cardStyle}
              onClick={() => handleCardClick(i)}
              aria-label={slide.title}
              aria-hidden={!visible}
            >
              {src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={slide.image?.alt || slide.title || ""}
                  draggable={false}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    userSelect: "none",
                  }}
                />
              )}

              {showTitle && slide.title && (
                <>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.7) 100%)",
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: 16,
                      right: 16,
                      bottom: 16,
                      pointerEvents: "none",
                    }}
                  >
                    <span
                      style={{
                        color: titleColor,
                        fontSize: 18,
                        fontWeight: 700,
                        lineHeight: "1.2em",
                        whiteSpace: "pre-line",
                        textShadow: "0 2px 10px rgba(0,0,0,0.4)",
                      }}
                    >
                      {slide.title}
                    </span>
                  </div>
                </>
              )}

              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "#000000",
                  opacity: isActive ? 0 : dim,
                  transition: `opacity ${dur}s ${ease}`,
                  pointerEvents: "none",
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
