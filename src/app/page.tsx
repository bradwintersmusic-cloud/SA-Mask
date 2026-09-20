import { centralDate } from "@/lib/calendar/time";
import { getAllFacilityCalendars } from "@/lib/studio-assistant/sessions";
import { getAllInternalRequests } from "@/lib/studio-assistant/requests";
import { TodayModule } from "./TodayModule";
export const dynamic = "force-dynamic";
export default async function OverviewPage() {
  const today = centralDate();
  const [calendar, requests] = await Promise.allSettled([getAllFacilityCalendars(today), getAllInternalRequests()]);
  return <TodayModule today={today} calendar={calendar.status === "fulfilled" ? calendar.value : null} requests={requests.status === "fulfilled" ? requests.value : null} />;
}
