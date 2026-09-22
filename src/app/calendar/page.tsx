import type { Metadata } from "next";
import { calendarQueryDate, calendarQueryFilters, type CalendarQuery } from "@/lib/calendar/query";
import { getAllFacilityCalendars } from "@/lib/studio-assistant/sessions";
import { sessionDeleteEnabled } from "@/lib/studio-assistant/write-safety";
import { CalendarWorkspace } from "./CalendarWorkspace";
export const metadata: Metadata = { title: "Schedule" };
export const dynamic = "force-dynamic";
export default async function CalendarPage({ searchParams }: { searchParams: Promise<CalendarQuery> }) {
  const query = await searchParams;
  const snapshot = await getAllFacilityCalendars(calendarQueryDate(query));
  const filters = calendarQueryFilters(query, snapshot);
  return <CalendarWorkspace deleteEnabled={sessionDeleteEnabled()} key={`${snapshot.date}:${filters.facility}:${filters.studio}`} initialSnapshot={snapshot} initialFacility={filters.facility} initialStudio={filters.studio} />;
}
