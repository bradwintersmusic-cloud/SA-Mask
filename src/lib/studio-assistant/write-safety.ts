import "server-only";
export function studioAssistantWritesEnabled(): boolean {
  return process.env.STUDIO_ASSISTANT_WRITES_ENABLED === "true";
}
export function assertStudioAssistantWritesEnabled(): void {
  if (!studioAssistantWritesEnabled()) throw new Error("Studio Assistant writes are disabled.");
}
export function internalRequestWritesEnabled(): boolean {
  return studioAssistantWritesEnabled() && process.env.STUDIO_ASSISTANT_INTERNAL_REQUEST_WRITES_ENABLED === "true";
}
export function assertInternalRequestWritesEnabled(): void {
  assertStudioAssistantWritesEnabled();
  if (!internalRequestWritesEnabled()) throw new Error("Internal Request writes are disabled.");
}
export function sessionDeleteEnabled(): boolean {
  return studioAssistantWritesEnabled() && process.env.STUDIO_ASSISTANT_SESSION_DELETE_ENABLED === "true";
}
export function assertSessionDeleteEnabled(): void {
  assertStudioAssistantWritesEnabled();
  if (process.env.STUDIO_ASSISTANT_SESSION_DELETE_ENABLED !== "true") throw new Error("Session deletion writes are disabled.");
}
export function enrollmentWritesEnabled(): boolean {
  return studioAssistantWritesEnabled() && process.env.STUDIO_ASSISTANT_ENROLLMENT_WRITES_ENABLED === "true";
}
export function assertEnrollmentWritesEnabled(): void {
  assertStudioAssistantWritesEnabled();
  if (process.env.STUDIO_ASSISTANT_ENROLLMENT_WRITES_ENABLED !== "true") throw new Error("Enrollment writes are disabled.");
}
// Fail closed at the shared transport too: a new endpoint never inherits permission.
export function assertMutationAllowed(path: string, method?: string, body?: unknown): void {
  assertStudioAssistantWritesEnabled();
  if (method === "POST" && /^\/api\/functions\/(confirm|decline)-internal-session\/[1-9]\d*$/.test(path) && body === undefined) {
    assertInternalRequestWritesEnabled();
  } else if (method === "DELETE" && /^\/api\/studio\/[1-9]\d*\/session\/[1-9]\d*$/.test(path) && body === undefined) {
    assertSessionDeleteEnabled();
  } else if (method === "POST" && /^\/api\/class\/[1-9]\d*\/member$/.test(path)) {
    assertEnrollmentWritesEnabled();
  } else if (method === "DELETE" && /^\/api\/class\/[1-9]\d*\/member\/[1-9]\d*$/.test(path) && body === undefined) {
    assertEnrollmentWritesEnabled();
  } else throw new Error("This Studio Assistant mutation is not enabled.");
}
