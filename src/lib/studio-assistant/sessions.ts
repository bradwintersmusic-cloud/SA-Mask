import "server-only";
import { facilities } from "@/config/facilities";
import { centralDayRange } from "@/lib/calendar/time";
import { studioAssistantFetch } from "./client";
import { normalizeCalendar } from "./session-normalization";
import type { CalendarSnapshot } from "./types";
export async function getCalendar(
  facilityId: number,
  start: string,
  end: string,
) {
  const facility = facilities.find(
    (item) => item.studioAssistantId === facilityId,
  );
  if (!facility) throw new Error("Unknown facility.");
  const duration = Date.parse(end) - Date.parse(start);
  if (!Number.isFinite(duration) || duration <= 0 || duration > 26 * 3_600_000)
    throw new Error("Invalid day range.");
  const query = new URLSearchParams({ start, end });
  return normalizeCalendar(
    await studioAssistantFetch(
      `/api/studio/${facilityId}/session/calendar?${query}`,
      { method: "GET" },
    ),
    facility,
  );
}
export async function getAllFacilityCalendars(
  date: string,
): Promise<CalendarSnapshot> {
  const range = centralDayRange(date);
  const snapshot: CalendarSnapshot = {
    date,
    ...range,
    sessions: [],
    issues: [],
  };
  const results = await Promise.allSettled(
    facilities.map((facility) =>
      getCalendar(facility.studioAssistantId, range.start, range.end),
    ),
  );
  results.forEach((result, index) => {
    const facility = facilities[index];
    if (result.status === "fulfilled") snapshot.sessions.push(...result.value);
    else
      snapshot.issues.push({
        facilityId: facility.studioAssistantId,
        facilityName: facility.name,
        message: process.env.STUDIOASSISTANT_API_TOKEN?.trim()
          ? "Calendar could not be loaded. Check access, response format, and connection, then refresh."
          : "Studio Assistant API token is missing. Configure it on the server.",
      });
  });
  snapshot.sessions.sort(
    (a, b) =>
      (a.start ? Date.parse(a.start) : Infinity) -
        (b.start ? Date.parse(b.start) : Infinity) ||
      a.key.localeCompare(b.key),
  );
  return snapshot;
}
