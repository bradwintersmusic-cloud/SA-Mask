import "server-only";
export function studioAssistantWritesEnabled(): boolean {
  return process.env.STUDIO_ASSISTANT_WRITES_ENABLED === "true";
}
export function assertStudioAssistantWritesEnabled(): void {
  if (!studioAssistantWritesEnabled())
    throw new Error("Studio Assistant writes are disabled.");
}
