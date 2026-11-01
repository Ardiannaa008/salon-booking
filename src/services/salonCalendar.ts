// Salon opening rules. Dates and hours are always in the salon's own timezone.

const OPENING_HOUR = 9;
const CLOSING_HOUR = 17;
const SUNDAY = 0;
export const MAX_DAYS_AHEAD = 60;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function isOpenOn(date: string): boolean {
  return toUtcDate(date).getUTCDay() !== SUNDAY;
}

export function slotHours(): number[] {
  const hours: number[] = [];
  for (let hour = OPENING_HOUR; hour < CLOSING_HOUR; hour++) {
    hours.push(hour);
  }
  return hours;
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(toUtcDate(date));
}

export function salonNow(now: Date, timeZone: string): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return { date: `${part('year')}-${part('month')}-${part('day')}`, hour: Number(part('hour')) };
}

export function isSlotInPast(date: string, hour: number, now: { date: string; hour: number }): boolean {
  return date < now.date || (date === now.date && hour <= now.hour);
}

export function isTooFarAhead(date: string, now: { date: string }): boolean {
  return toUtcDate(date).getTime() - toUtcDate(now.date).getTime() > MAX_DAYS_AHEAD * MS_PER_DAY;
}
