export const CALENDAR_TIMEZONE = "America/Chicago";
const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CALENDAR_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
export function centralDate(value: Date = new Date()): string {
  const parts = partsFormatter.formatToParts(value);
  const part = (type: string) =>
    parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function validDate(date: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(`${date}T00:00:00Z`)) &&
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date
  );
}
export function shiftDate(date: string, days: number): string {
  if (!validDate(date)) throw new Error("Invalid calendar date.");
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function centralHour(date: string, hour: number): number {
  if (!validDate(date)) throw new Error("Invalid calendar date.");
  const target = Date.parse(`${date}T00:00:00Z`) + hour * 3_600_000;
  let candidate = target;
  // Resolve local civil time using IANA offsets, never a fixed UTC subtraction.
  // Calendar uses only unambiguous midnight and baseline 08:00/22:00 boundaries.
  for (let index = 0; index < 4; index++) {
    const parts = partsFormatter.formatToParts(new Date(candidate));
    const number = (type: string) =>
      Number(parts.find((item) => item.type === type)!.value);
    const wall = Date.UTC(
      number("year"),
      number("month") - 1,
      number("day"),
      number("hour"),
      number("minute"),
      number("second"),
    );
    candidate += target - wall;
  }
  return candidate;
}
export function centralDayRange(date: string) {
  return {
    start: new Date(centralHour(date, 0)).toISOString(),
    end: new Date(centralHour(shiftDate(date, 1), 0)).toISOString(),
  };
}
const clock = new Intl.DateTimeFormat("en-US", {
  timeZone: CALENDAR_TIMEZONE,
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});
const full = new Intl.DateTimeFormat("en-US", {
  timeZone: CALENDAR_TIMEZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});
export function sessionTime(value: string | null) {
  return value ? clock.format(new Date(value)) : "Time unavailable";
}
export function sessionDateTime(value: string | null) {
  return value ? full.format(new Date(value)) : null;
}
