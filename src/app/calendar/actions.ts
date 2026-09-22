"use server";
import { deleteSessions, type SessionReference } from "@/lib/studio-assistant/session-deletion";
export async function deleteSelectedSessions(references: SessionReference[]) {
    try {
        return { results: await deleteSessions(references) };
    }
    catch {
        return { error: "Session deletion could not be started. Refresh and check deletion permissions before retrying." };
    }
}
