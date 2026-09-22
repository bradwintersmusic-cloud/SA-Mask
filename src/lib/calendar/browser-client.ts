import type { CalendarSnapshot } from "@/lib/studio-assistant/types";
export async function loadCalendar(
  date: string,
  signal: AbortSignal,
  through: string = date,
): Promise<CalendarSnapshot> {
  const response = await fetch(
    `/api/calendar?${new URLSearchParams({ date, end: through })}`,
    { method: "GET", cache: "no-store", signal },
  );
  if (!response.ok)
    throw new Error(
      "Schedule could not be refreshed. Check the connection and try again.",
    );
  return response.json();
}
