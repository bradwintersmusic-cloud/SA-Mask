import type { IconName } from "@/components/ui/Icon";
export const navigation: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Overview", icon: "overview" },
  { href: "/requests", label: "Requests", icon: "requests" },
  { href: "/calendar", label: "Schedule", icon: "calendar" },
  { href: "/users", label: "Users", icon: "users" },
  { href: "/settings", label: "Settings", icon: "settings" },
];
