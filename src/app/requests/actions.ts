"use server";
import { getAllInternalRequests } from "@/lib/studio-assistant/requests";
import type { BatchRequestResult } from "@/lib/studio-assistant/types";
export async function refreshRequests() {
  return getAllInternalRequests();
}
// Mutation architecture stays in the adapter, but the UI boundary is dormant.
export async function updateRequests(
  ..._input: unknown[]
): Promise<
  { data: BatchRequestResult; error?: never } | { error: string; data?: never }
> {
  void _input;
  return { error: "Production is read only. Request actions are disabled." };
}
