import { PageHeader } from "@/components/layout/PageHeader";
export default function Loading() {
  return (
    <>
      <PageHeader
        title="Calendar"
        description="Studio schedules · Central Time"
      />
      <p role="status">Loading facility calendars…</p>
    </>
  );
}
