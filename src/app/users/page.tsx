import type { Metadata } from "next";
import { getDirectory } from "@/lib/studio-assistant/enrollment";
import { UsersWorkspace } from "./UsersWorkspace";
export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";
export default async function Page() { return <UsersWorkspace initial={await getDirectory()}/>; }
