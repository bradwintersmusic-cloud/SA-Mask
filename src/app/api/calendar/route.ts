import { getAllFacilityCalendars } from "@/lib/studio-assistant/sessions";
import { centralDateRange } from "@/lib/calendar/time";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const date = params.get("date") ?? "";
  const through = params.get("end") ?? date;
  try { centralDateRange(date, through); }
  catch { return Response.json({ error: "Choose a valid date range." }, { status: 400 }); }
  try {
    return Response.json(await getAllFacilityCalendars(date, through), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json(
      { error: "Schedule could not be loaded. Please refresh." },
      { status: 502, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
