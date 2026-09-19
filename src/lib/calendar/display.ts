import type { StudioSession } from "@/lib/studio-assistant/types";
import { centralDate, sessionTime } from "./time";
export function sessionLabel(session: StudioSession) {
  return (
    session.label ?? (session.id ? `Session #${session.id}` : "Session details")
  );
}
export function roomKey(session: StudioSession) {
  return `${session.facilityId}:${session.roomId ?? session.roomName ?? "unspecified"}`;
}
export function roomLabel(session: StudioSession) {
  return (
    session.roomName ??
    (session.roomId ? `Studio #${session.roomId}` : "Studio not provided")
  );
}
export function sessionRange(session: StudioSession) {
  if (!session.start || !session.end) return "Schedule incomplete";
  const overnight =
    centralDate(new Date(session.start)) !== centralDate(new Date(session.end));
  return `${sessionTime(session.start)} – ${overnight ? centralDate(new Date(session.end)) + " " : ""}${sessionTime(session.end)}`;
}
export function usableSchedule(session: StudioSession) {
  return (
    !!session.start &&
    !!session.end &&
    Date.parse(session.end) > Date.parse(session.start)
  );
}
export function onDay(session: StudioSession, start: string, end: string) {
  if (!usableSchedule(session)) return true; // Keep uncertain records visible for inspection.
  return (
    Date.parse(session.start!) < Date.parse(end) &&
    Date.parse(session.end!) > Date.parse(start)
  );
}
export function groupStudios(sessions: StudioSession[]) {
  const rooms = new Map<
    string,
    {
      key: string;
      name: string;
      facilityId: number;
      facilityName: string;
      sessions: StudioSession[];
    }
  >();
  for (const session of sessions) {
    const key = roomKey(session);
    if (!rooms.has(key))
      rooms.set(key, {
        key,
        name: roomLabel(session),
        facilityId: session.facilityId,
        facilityName: session.facilityName,
        sessions: [],
      });
    rooms.get(key)!.sessions.push(session);
  }
  return [...rooms.values()].sort(
    (a, b) =>
      a.facilityName.localeCompare(b.facilityName, undefined, {
        numeric: true,
      }) || a.name.localeCompare(b.name, undefined, { numeric: true }),
  );
}
