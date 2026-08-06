export function LiquidHeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="liquid-blob liquid-blob-a absolute -left-1/3 top-[-15%] h-[70vmax] w-[70vmax] rounded-full bg-[radial-gradient(circle_at_center,rgba(88,28,135,0.55),transparent_65%)] blur-[90px]" />
      <div className="liquid-blob liquid-blob-b absolute -right-1/3 top-[10%] h-[60vmax] w-[60vmax] rounded-full bg-[radial-gradient(circle_at_center,rgba(30,58,138,0.5),transparent_65%)] blur-[100px]" />
      <div className="liquid-blob liquid-blob-c absolute bottom-[-25%] left-1/4 h-[65vmax] w-[65vmax] rounded-full bg-[radial-gradient(circle_at_center,rgba(76,29,149,0.45),transparent_65%)] blur-[100px]" />
    </div>
  );
}
