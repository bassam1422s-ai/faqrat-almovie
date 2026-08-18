const HOUR = 60;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

function withUnit(n: number, singular: string, dual: string, plural: string) {
  const rounded = Math.round(n);
  if (rounded === 1) return singular;
  if (rounded === 2) return dual;
  return `${rounded} ${plural}`;
}

// Escalates the display unit as the total grows — minutes, then hours,
// days, months, years — instead of ever showing an unwieldy raw minute
// count for someone's cumulative watch time.
export function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, totalMinutes);

  if (minutes < HOUR) {
    return withUnit(minutes, "دقيقة", "دقيقتين", "دقائق");
  }
  if (minutes < DAY) {
    return withUnit(minutes / HOUR, "ساعة", "ساعتين", "ساعات");
  }
  if (minutes < MONTH) {
    return withUnit(minutes / DAY, "يوم", "يومين", "أيام");
  }
  if (minutes < YEAR) {
    return withUnit(minutes / MONTH, "شهر", "شهرين", "أشهر");
  }
  return withUnit(minutes / YEAR, "سنة", "سنتين", "سنوات");
}
