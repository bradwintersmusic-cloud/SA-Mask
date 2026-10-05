import type { Metadata } from "next";
import { getAcademics } from "@/lib/studio-assistant/academics";
import { AcademicsWorkspace } from "./AcademicsWorkspace";
export const metadata: Metadata = { title: "Academics" };
export const dynamic = "force-dynamic";
export default async function Page() { return <AcademicsWorkspace data={await getAcademics()} />; }
