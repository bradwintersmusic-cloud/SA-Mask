import { getDirectory, getClassRoster, getUserEnrollment, invalidateEnrollmentCache } from "@/lib/studio-assistant/enrollment";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
    const query = new URL(request.url).searchParams;
    const classId = query.get("classId"), userId = query.get("userId");
    if ((classId && userId) || [classId, userId].some(value => value !== null && (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0)))
        return Response.json({ error: "Invalid selection." }, { status: 400 });
    try {
        if (query.get("refresh") === "1")
            invalidateEnrollmentCache();
        const data = classId ? await getClassRoster(Number(classId)) : userId ? await getUserEnrollment(Number(userId)) : await getDirectory();
        return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
    }
    catch {
        return Response.json({ error: "Enrollment data could not be loaded. Refresh to retry." }, { status: 502, headers: { "Cache-Control": "private, no-store" } });
    }
}
