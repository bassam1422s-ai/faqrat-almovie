// Rough polygon around the warrior's cape/sash in /public/hero/warrior.jpg
// (percentages of the image), so only that region gets the wind ripple.
const CAPE_CLIP_PATH =
  "polygon(45% 23%, 65% 27%, 60% 32%, 43% 33%, 42% 43%, 41% 54%, 40% 64%, 35% 67%, 33% 57%, 33% 43%, 33% 33%, 34% 28%)";

export function WarriorHeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero/warrior.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "50% 15%" }}
      />

      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <filter id="capeWind" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.015 0.035"
              numOctaves="2"
              seed="7"
              result="turbulence"
            >
              <animate
                attributeName="baseFrequency"
                values="0.012 0.03;0.02 0.045;0.012 0.03"
                dur="7s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="turbulence"
              scale="18"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero/warrior.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          objectPosition: "50% 15%",
          clipPath: CAPE_CLIP_PATH,
          filter: "url(#capeWind)",
        }}
      />

      <div className="liquid-silk liquid-silk-a" />
      <div className="liquid-silk liquid-silk-b" />
    </div>
  );
}
