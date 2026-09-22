"use server";
import { revalidatePath } from "next/cache";
import { getAllInternalRequests, processInternalRequests } from "@/lib/studio-assistant/requests";
import type { BatchRequestResult } from "@/lib/studio-assistant/types";
export async function refreshRequests() {
  return getAllInternalRequests();
}
export async function updateRequests(action: unknown, selection: unknown): Promise<
  { data: BatchRequestResult; error?: never } | { error: string; data?: never }
> {
  try {
    const data = await processInternalRequests(action, selection);
    revalidatePath("/");
    revalidatePath("/requests");
    return { data };
  } catch {
    return { error: "Request update unavailable. Refresh and check request permissions before retrying." };
  }
}
