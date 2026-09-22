import "server-only";
import { assertInternalRequestWritesEnabled } from "./write-safety";
import { facilities } from "@/config/facilities";
import { studioAssistantFetch, studioAssistantMutation } from "./client";
import { normalizeInternalRequests } from "./request-normalization";
import type {
  BatchRequestResult,
  InternalRequest,
  RequestAction,
  RequestReference,
  RequestsSnapshot,
} from "./types";

function configuredFacility(facilityId: number) {
  const facility = facilities.find(
    (item) => item.studioAssistantId === facilityId,
  );
  if (!facility) throw new Error("Unknown facility.");
  return facility;
}
export async function getInternalRequests(
  facilityId: number,
): Promise<InternalRequest[]> {
  const facility = configuredFacility(facilityId);
  const data = await studioAssistantFetch(
    `/api/studio/${facility.studioAssistantId}/session/internal-requests`,
  );
  return normalizeInternalRequests(data, facility);
}
export async function getAllInternalRequests(): Promise<RequestsSnapshot> {
  const results = await Promise.allSettled(
    facilities.map((facility) =>
      getInternalRequests(facility.studioAssistantId),
    ),
  );
  const snapshot: RequestsSnapshot = {
    requests: [],
    issues: [],
    loadedAt: new Date().toISOString(),
  };
  results.forEach((result, index) => {
    const facility = facilities[index];
    if (result.status === "fulfilled") snapshot.requests.push(...result.value);
    else
      snapshot.issues.push({
        facilityId: facility.studioAssistantId,
        facilityName: facility.name,
        message: process.env.STUDIOASSISTANT_API_TOKEN?.trim()
          ? "Could not load the queue. Check the server credentials, API response, and connection, then refresh."
          : "Studio Assistant API token is missing. Configure it on the server.",
      });
  });
  snapshot.requests.sort(
    (a, b) =>
      (a.start ? Date.parse(a.start) : Infinity) -
        (b.start ? Date.parse(b.start) : Infinity) ||
      a.facilityId - b.facilityId ||
      a.id - b.id,
  );
  return snapshot;
}
async function updateInternalRequest(
  sessionId: number,
  action: RequestAction,
): Promise<void> {
  assertInternalRequestWritesEnabled();
  if (!Number.isSafeInteger(sessionId) || sessionId <= 0)
    throw new Error("Invalid session ID.");
  const endpoint =
    action === "approve"
      ? "confirm-internal-session"
      : "decline-internal-session";
  const expectedType = action === "approve" ? "CONFIRMED" : "DECLINED";
  const data = await studioAssistantMutation(
    `/api/functions/${endpoint}/${sessionId}`,
    { method: "POST" },
  );
  if (
    typeof data !== "object" ||
    !data ||
    !("success" in data) ||
    data.success !== true ||
    !("type" in data) ||
    data.type !== expectedType
  ) {
    throw new Error(
      "Studio Assistant did not confirm the requested update. Refresh before retrying.",
    );
  }
}
export async function approveInternalRequest(sessionId: number) {
  assertInternalRequestWritesEnabled();
  await updateInternalRequest(sessionId, "approve");
}
export async function denyInternalRequest(sessionId: number) {
  assertInternalRequestWritesEnabled();
  await updateInternalRequest(sessionId, "deny");
}

// This is the mutation boundary: never trust client-supplied session/facility IDs.
export async function processInternalRequests(
  action: unknown,
  selection: unknown,
): Promise<BatchRequestResult> {
  assertInternalRequestWritesEnabled();
  if (action !== "approve" && action !== "deny")
    throw new Error("Invalid request action.");
  if (!Array.isArray(selection) || !selection.length || selection.length > 100)
    throw new Error("Select between 1 and 100 requests.");
  const references: RequestReference[] = [];
  const seen = new Set<string>();
  for (const item of selection) {
    if (
      !item ||
      typeof item !== "object" ||
      !Number.isSafeInteger(item.id) ||
      item.id <= 0 ||
      !Number.isSafeInteger(item.facilityId)
    )
      throw new Error("Invalid request selection.");
    configuredFacility(item.facilityId);
    const key = `${item.facilityId}:${item.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      references.push({ id: item.id, facilityId: item.facilityId });
    }
  }
  const current = await getAllInternalRequests();
  const results: BatchRequestResult["results"] = [];
  // At most three upstream mutations in flight. Never automatically retry POSTs.
  for (let index = 0; index < references.length; index += 3) {
    const batch = await Promise.all(
      references.slice(index, index + 3).map(async (reference) => {
        const request = current.requests.find(
          (item) =>
            item.id === reference.id &&
            item.facilityId === reference.facilityId,
        );
        if (
          !request ||
          current.requests.filter((item) => item.id === reference.id).length !==
            1
        )
          return {
            ...reference,
            success: false,
            message:
              "Not in the current queue, or this facility could not be loaded. Refresh before retrying.",
          };
        try {
          if (action === "approve") await approveInternalRequest(reference.id);
          else await denyInternalRequest(reference.id);
          return {
            ...reference,
            success: true,
            message: action === "approve" ? "Approved" : "Denied",
          };
        } catch {
          // A lost response may mean a completed update. The refresh reconciles it.
          return {
            ...reference,
            success: false,
            message:
              "Update could not be confirmed. Review the refreshed queue before retrying.",
          };
        }
      }),
    );
    results.push(...batch);
  }
  return { action, results, snapshot: await getAllInternalRequests() };
}
