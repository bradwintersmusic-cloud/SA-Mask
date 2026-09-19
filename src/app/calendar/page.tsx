import type { Metadata } from "next";
import { centralDate } from "@/lib/calendar/time";
import { getAllFacilityCalendars } from "@/lib/studio-assistant/sessions";
import { CalendarWorkspace } from "./CalendarWorkspace";
export const metadata: Metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";
export default async function CalendarPage() {
  return (
    <CalendarWorkspace
      initialSnapshot={await getAllFacilityCalendars(centralDate())}
    />
  );
}
