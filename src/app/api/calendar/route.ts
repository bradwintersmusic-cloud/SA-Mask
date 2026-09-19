import { getAllFacilityCalendars } from "@/lib/studio-assistant/sessions";
import { validDate } from "@/lib/calendar/time";
export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!validDate(date))
    return Response.json({ error: "Choose a valid date." }, { status: 400 });
  try {
    return Response.json(await getAllFacilityCalendars(date), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json(
      { error: "Calendar could not be loaded. Please refresh." },
      { status: 502, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
