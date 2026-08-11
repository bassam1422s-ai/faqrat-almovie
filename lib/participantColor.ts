const DOT_COLORS = [
  "bg-rose-400",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-sky-400",
  "bg-violet-400",
  "bg-fuchsia-400",
  "bg-teal-400",
  "bg-orange-400",
];

// Deterministic hash so the same person always gets the same dot color
// across the whole app (archive ratings, show trackers, ...), not just
// within one list render.
export function participantDotColor(participantId: string): string {
  let hash = 0;
  for (let i = 0; i < participantId.length; i++) {
    hash = (hash * 31 + participantId.charCodeAt(i)) >>> 0;
  }
  return DOT_COLORS[hash % DOT_COLORS.length];
}
