import type { StudioSession } from "./types";

export type BookingCategory = "class" | "maintenance" | "available" | "session";
type ClassificationInput = Pick<StudioSession, "isClass" | "serviceId" | "contactName">;

/** Uses the normalized Class relationship; categories are mutually exclusive. */
export function classifySession(session: ClassificationInput): BookingCategory {
  if (session.isClass) return "class";
  // The administrator confirmed service 27 is Maintenance. Labels may vary.
  if (session.serviceId === 27) return "maintenance";
  return typeof session.contactName === "string" && session.contactName.trim().length > 0
    ? "session" : "available";
}

export function countBookings(sessions: readonly ClassificationInput[]) {
  const counts = { session: 0, class: 0, maintenance: 0, available: 0 };
  for (const session of sessions) counts[classifySession(session)]++;
  return counts;
}

export function sessionCountLabel(sessions: readonly ClassificationInput[]) {
  const counts = countBookings(sessions);
  return `${counts.session} ${counts.session === 1 ? "session" : "sessions"} · ${counts.class} ${counts.class === 1 ? "class" : "classes"}`;
}
