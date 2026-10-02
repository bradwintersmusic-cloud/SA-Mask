import type { Metadata } from "next";
import { getRequestRenderSnapshot } from "@/lib/studio-assistant/request-render-snapshot";
import { internalRequestWritesEnabled } from "@/lib/studio-assistant/write-safety";
import { RequestsWorkspace } from "./RequestsWorkspace";
export const metadata: Metadata = { title: "Internal Requests" };
export const dynamic = "force-dynamic";
export default async function RequestsPage() {
  return <RequestsWorkspace writesEnabled={internalRequestWritesEnabled()} initialSnapshot={await getRequestRenderSnapshot()} />;
}
