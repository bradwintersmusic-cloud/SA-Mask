"use client";
import { useRequestsSnapshot } from "@/components/requests/RequestsProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation } from "@/config/navigation";
import { Icon } from "@/components/ui/Icon";
import styles from "./layout.module.css";
export function Navigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const pendingCount = useRequestsSnapshot().snapshot.requests.length;
  return (
    <nav
      className={mobile ? styles.mobileNav : styles.navigation}
      aria-label={mobile ? "Mobile navigation" : "Main navigation"}
    >
      {navigation.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.href === "/requests" && pendingCount > 0 ? `Requests, ${pendingCount} pending ${pendingCount === 1 ? "request" : "requests"}` : undefined}
            aria-current={active ? "page" : undefined}
            className={`${styles.navLink} ${active ? styles.active : ""}`}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
            {item.href === "/requests" && pendingCount > 0 && (
              <span className={styles.requestBadge} aria-hidden="true">
                {pendingCount > 99 ? "99+" : pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
