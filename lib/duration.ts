const HOUR = 60;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

function unitWord(n: number, singular: string, dual: string, plural: string) {
  if (n === 1) return singular;
  if (n === 2) return dual;
  return `${n} ${plural}`;
}

type Unit = {
  minutes: number;
  singular: string;
  dual: string;
  plural: string;
};

const UNITS: Unit[] = [
  { minutes: YEAR, singular: "سنة", dual: "سنتين", plural: "سنوات" },
  { minutes: MONTH, singular: "شهر", dual: "شهرين", plural: "أشهر" },
  { minutes: DAY, singular: "يوم", dual: "يومين", plural: "أيام" },
  { minutes: HOUR, singular: "ساعة", dual: "ساعتين", plural: "ساعات" },
  { minutes: 1, singular: "دقيقة", dual: "دقيقتين", plural: "دقائق" },
];

// Escalates to the largest sensible unit (minutes → hours → days → months
// → years) and shows a second, smaller unit alongside it for real
// precision — "5 أيام و4 ساعات" instead of a single rounded "5 أيام" that
// silently drops ~4 hours.
export function formatDuration(totalMinutes: number): string {
  const total = Math.round(Math.max(0, totalMinutes));
  if (total === 0) return "٠ دقيقة";

  const primaryIndex = UNITS.findIndex((u) => total >= u.minutes);
  const primary = UNITS[primaryIndex];
  let primaryCount = Math.floor(total / primary.minutes);
  const remainder = total - primaryCount * primary.minutes;

  const secondary = UNITS[primaryIndex + 1];
  let secondaryCount = secondary ? Math.round(remainder / secondary.minutes) : 0;

  // Rounding the secondary unit can spill over into a whole extra primary
  // unit (e.g. 23.98 hours rounding to "24 ساعة") — carry it instead.
  if (secondary && secondaryCount * secondary.minutes >= primary.minutes) {
    primaryCount += 1;
    secondaryCount = 0;
  }

  const parts = [unitWord(primaryCount, primary.singular, primary.dual, primary.plural)];
  if (secondary && secondaryCount > 0) {
    parts.push(
      unitWord(secondaryCount, secondary.singular, secondary.dual, secondary.plural),
    );
  }

  return parts.join(" و");
}
