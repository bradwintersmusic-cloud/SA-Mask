import { getSchoolUsers } from "@/lib/studio-assistant/enrollment";
export async function GET() {
    try {
        return Response.json(await getSchoolUsers(), { headers: { "Cache-Control": "private, no-store" } });
    }
    catch {
        return Response.json({ error: "School members could not be loaded." }, { status: 502, headers: { "Cache-Control": "private, no-store" } });
    }
}
