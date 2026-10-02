import type { RequestsSnapshot } from "./types";

export function mergeRequestsSnapshot(previous: RequestsSnapshot, next: RequestsSnapshot): RequestsSnapshot {
  if (next === previous || next.loadedAt < previous.loadedAt) return previous;
  // Keep the last known queue for facilities whose refresh failed.
  return {
    ...next,
    requests: [...next.requests, ...previous.requests.filter(request =>
      next.issues.some(issue => issue.facilityId === request.facilityId),
    )],
  };
}
