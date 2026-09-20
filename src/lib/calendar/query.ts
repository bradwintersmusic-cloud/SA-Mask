import { facilities } from "@/config/facilities";
import type { CalendarSnapshot } from "@/lib/studio-assistant/types";
import { centralDate, validDate } from "./time";
import { onDay, roomKey } from "./display";
export type CalendarQuery = Record<string, string | string[] | undefined>;
export function calendarQueryDate(query: CalendarQuery, today = centralDate()) {
  return typeof query.date === "string" && validDate(query.date) && query.date >= "1900-01-01" && query.date <= "9998-12-31" ? query.date : today;
}
export function calendarQueryFilters(query: CalendarQuery, snapshot: CalendarSnapshot) {
  const facility = facilities.find(item => item.key === query.facility || String(item.studioAssistantId) === query.facility);
  const rows = snapshot.sessions.filter(session => onDay(session, snapshot.start, snapshot.end) && (!facility || session.facilityId === facility.studioAssistantId));
  const room = typeof query.room === "string" && /^\d+$/.test(query.room) ? rows.find(session => String(session.roomId) === query.room) : undefined;
  return { facility: facility ? String(facility.studioAssistantId) : "all", studio: room ? roomKey(room) : "all" };
}
export function calendarLink(date: string, facilityId?: number, roomId?: number | null) {
  const query = new URLSearchParams({ date });
  const facility = facilities.find(item => item.studioAssistantId === facilityId);
  if (facility) query.set("facility", facility.key);
  if (facility && roomId) query.set("room", String(roomId));
  return `/calendar?${query}`;
}
