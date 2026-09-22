import "server-only";
import { facilities } from "@/config/facilities";
import { assertSessionDeleteEnabled } from "./write-safety";
import { studioAssistantMutation } from "./client";
export type SessionReference = {
    facilityId: number;
    sessionId: number;
};
export type SessionDeleteResult = SessionReference & {
    success: boolean;
    message: string;
};
function validate(reference: SessionReference) {
    if (!reference || !facilities.some(f => f.studioAssistantId === reference.facilityId) || !Number.isSafeInteger(reference.sessionId) || reference.sessionId <= 0)
        throw new Error("Invalid selected session reference.");
}
export async function deleteSession(facilityId: number, sessionId: number): Promise<SessionDeleteResult> {
    assertSessionDeleteEnabled();
    const reference = { facilityId, sessionId };
    validate(reference);
    const response = await studioAssistantMutation(`/api/studio/${facilityId}/session/${sessionId}`, { method: "DELETE" });
    if (!response || typeof response !== "object" || !("type" in response) || response.type !== "DELETED" || ("success" in response && response.success === false))
        throw new Error("Studio Assistant did not confirm deletion.");
    return { ...reference, success: true, message: "Deleted." };
}
export async function deleteSessions(references: SessionReference[]): Promise<SessionDeleteResult[]> {
    assertSessionDeleteEnabled();
    if (!Array.isArray(references))
        throw new Error("Explicit session references are required.");
    references.forEach(validate);
    const unique = [...new Map(references.map(ref => [`${ref.facilityId}:${ref.sessionId}`, { ...ref }])).values()];
    const results: SessionDeleteResult[] = new Array(unique.length);
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(3, unique.length) }, async () => {
        while (next < unique.length) {
            const index = next++, ref = unique[index];
            try {
                results[index] = await deleteSession(ref.facilityId, ref.sessionId);
            }
            catch {
                results[index] = { ...ref, success: false, message: "Deletion could not be confirmed. Refresh before retrying." };
            }
        }
    }));
    return results;
}
