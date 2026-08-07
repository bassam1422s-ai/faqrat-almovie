export function WarriorHeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/hero/warrior.mp4"
        poster="/hero/warrior-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
      />
    </div>
  );
}
