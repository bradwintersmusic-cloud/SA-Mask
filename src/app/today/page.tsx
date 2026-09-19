import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
export const metadata: Metadata = { title: "Today" };
export default function Page() {
  return (
    <>
      <PageHeader
        title="Today"
        description="A focused view of the day ahead."
      />
      <EmptyState
        icon="today"
        title="Your day will start here."
        description="Today’s events and session details will appear here. No live schedules are connected in this foundation preview."
      />
    </>
  );
}
