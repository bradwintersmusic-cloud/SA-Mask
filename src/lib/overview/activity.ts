import type { CalendarSnapshot } from "@/lib/studio-assistant/types";
import { groupStudios, onDay, usableSchedule } from "@/lib/calendar/display";
export function todayActivity(snapshot: CalendarSnapshot | null) {
  const sessions = snapshot?.sessions.filter(session => onDay(session, snapshot.start, snapshot.end)) ?? [];
  const rooms = groupStudios(sessions);
  return { sessions, rooms, studioCount: rooms.filter(room => room.sessions[0].roomId !== null || room.sessions[0].roomName !== null).length, uncertainCount: sessions.filter(session => !usableSchedule(session)).length, maxCount: Math.max(1, ...rooms.map(room => room.sessions.length)) };
}
