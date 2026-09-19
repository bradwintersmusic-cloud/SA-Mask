import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { buttonClass } from "@/components/ui/Button";
export default function NotFound() {
  return (
    <>
      <PageHeader
        title="Page not found"
        description="This destination is not part of the workspace."
      />
      <Link href="/" className={buttonClass("secondary")}>
        Back to overview
      </Link>
    </>
  );
}
