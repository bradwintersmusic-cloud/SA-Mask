import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppearanceSettings } from "./AppearanceSettings";
export const metadata: Metadata = { title: "Settings" };
export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Workspace appearance and preferences."
      />
      <AppearanceSettings />
    </>
  );
}
