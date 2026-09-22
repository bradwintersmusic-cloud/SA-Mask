import type { StudioSession } from "@/lib/studio-assistant/types";
import type { StudioUser } from "@/lib/studio-assistant/enrollment-types";
import { onDay, roomKey } from "./display";
import { centralDate } from "./time";
export function memberMatches(user: StudioUser, query: string) {
    const term = query.trim().toLowerCase();
    return [user.name, user.email, user.username, user.code].some(value => value?.toLowerCase().includes(term));
}
export function filterSessions(sessions: StudioSession[], filters: {
    start: string;
    end: string;
    facility: string;
    studio: string;
    user: StudioUser | null;
    query: string;
    uniqueUserEmail: boolean;
    hideClasses?: boolean;
}) {
    const term = filters.query.trim().toLowerCase();
    return sessions.filter(session => (!filters.hideClasses || !session.isClass) && onDay(session, filters.start, filters.end)
        && (filters.facility === "all" || String(session.facilityId) === filters.facility)
        && (filters.studio === "all" || roomKey(session) === filters.studio)
        && (!filters.user || (session.userId ? session.userId === filters.user.id : filters.uniqueUserEmail && !!filters.user.email && session.contactEmail?.trim().toLowerCase() === filters.user.email.trim().toLowerCase()))
        && (!term || [session.contactName, session.contactEmail, session.projectName, session.projectCode, session.serviceName, session.label, session.roomName, session.facilityName, session.notes].some(value => value?.toLowerCase().includes(term))));
}
export function sessionReferenceKey(session: StudioSession) { return session.id ? `${session.facilityId}:${session.id}` : null; }
export function groupSessionDates(sessions: StudioSession[], from: string) {
    const groups = new Map<string, StudioSession[]>();
    for (const session of sessions) {
        const date = session.start ? centralDate(new Date(session.start)) : "Schedule needs review";
        // Overnight overlaps that started before the range appear once, on its first day.
        const day = date < from ? from : date;
        if (!groups.has(day))
            groups.set(day, []);
        groups.get(day)!.push(session);
    }
    for (const group of groups.values())
        group.sort((a, b) => (a.start ?? "9999").localeCompare(b.start ?? "9999"));
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}
