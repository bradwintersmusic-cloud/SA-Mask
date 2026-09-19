import type { Metadata } from "next";
import { getAllInternalRequests } from "@/lib/studio-assistant/requests";
import { RequestsWorkspace } from "./RequestsWorkspace";
export const metadata: Metadata = { title: "Internal Requests" };
export const dynamic = "force-dynamic";
export default async function RequestsPage() {
  return <RequestsWorkspace initialSnapshot={await getAllInternalRequests()} />;
}
