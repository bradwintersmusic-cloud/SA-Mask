import { PageHeader } from "@/components/layout/PageHeader";
export default function Loading() {
  return (
    <>
      <PageHeader
        title="Internal Requests"
        description="Review pending requests across your facilities."
      />
      <p role="status">Loading internal requests…</p>
    </>
  );
}
