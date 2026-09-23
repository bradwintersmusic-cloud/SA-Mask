import type { StudioSession } from "@/lib/studio-assistant/types";
import { onDay, usableSchedule } from "./display";
import { CALENDAR_TIMEZONE, centralDate, centralDayRange, centralHour } from "./time";

const MINUTE = 60_000;
export type TimelineBounds = { startMinutes: number; endMinutes: number; durationMinutes: number };
export type TimelineInterval = { session: StudioSession; start: number; end: number; lane: number };

// Elapsed minutes from IANA-resolved midnight preserve real duration even on DST days.
// Carry-in sessions start at midnight; the full outgoing duration is never clipped.
export function operationalIntervals(sessions: StudioSession[], date: string): TimelineInterval[] {
  const day = centralDayRange(date), origin = Date.parse(day.start);
  return sessions.filter(s => usableSchedule(s) && onDay(s, day.start, day.end))
    .map(session => ({ session, start: Math.max(0, (Date.parse(session.start!) - origin) / MINUTE), end: (Date.parse(session.end!) - origin) / MINUTE, lane: 0 }))
    .sort((a, b) => a.start - b.start || b.end - a.end || a.session.key.localeCompare(b.session.key));
}

export function calculateTimelineBounds(sessions: StudioSession[], dates: string[], padding = 60, minimum = 360): TimelineBounds {
  const intervals = dates.flatMap(date => operationalIntervals(sessions, date));
  if (!intervals.length) {
    const startMinutes = dates[0] ? (centralHour(dates[0], 9) - Date.parse(centralDayRange(dates[0]).start)) / MINUTE : 540;
    return { startMinutes, endMinutes: startMinutes + 720, durationMinutes: 720 };
  }
  let earliest = Infinity, latest = -Infinity;
  for (const interval of intervals) { earliest = Math.min(earliest, interval.start); latest = Math.max(latest, interval.end); }
  let start = Math.floor((earliest - padding) / 60) * 60;
  let end = Math.ceil((latest + padding) / 60) * 60;
  if (end - start < minimum) {
    start = Math.floor((start + end - minimum) / 120) * 60;
    end = Math.max(end, start + minimum);
  }
  return { startMinutes: start, endMinutes: end, durationMinutes: end - start };
}

export function assignOverlapLanes(intervals: TimelineInterval[]) {
  const ends: number[] = [];
  const blocks = [...intervals].sort((a, b) => a.start - b.start || b.end - a.end || a.session.key.localeCompare(b.session.key)).map(interval => {
    let lane = ends.findIndex(end => end <= interval.start);
    if (lane < 0) lane = ends.length;
    ends[lane] = interval.end;
    return { ...interval, lane };
  });
  return { blocks, lanes: Math.max(1, ends.length) };
}
export function timelinePosition(start: number, end: number, bounds: TimelineBounds) {
  return { offset: (start - bounds.startMinutes) / bounds.durationMinutes * 100, size: (end - start) / bounds.durationMinutes * 100 };
}
export function timelineInstant(date: string, minutes: number) {
  return Date.parse(centralDayRange(date).start) + minutes * MINUTE;
}
const tickFormat = new Intl.DateTimeFormat("en-US", { timeZone: CALENDAR_TIMEZONE, hour: "numeric", timeZoneName: "short" });
export function timelineTicks(date: string, bounds: TimelineBounds) {
  const ticks = [];
  for (let minutes = bounds.startMinutes; minutes <= bounds.endMinutes; minutes += 60) {
    const instant = timelineInstant(date, minutes);
    const localDate = centralDate(new Date(instant));
    const dayOffset = Math.round((Date.parse(`${localDate}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000);
    const midnight = instant === Date.parse(centralDayRange(localDate).start);
    ticks.push({ minutes, label: tickFormat.format(instant), midnight, dayOffset, nextDay: localDate > date, previousDay: localDate < date });
  }
  return ticks;
}
