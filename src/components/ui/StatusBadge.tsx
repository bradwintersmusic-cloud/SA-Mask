import type { ReactNode } from "react";
import styles from "./ui.module.css";
export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning" | "error";
}) {
  return (
    <span
      className={`${styles.badge} ${tone === "neutral" ? "" : styles[tone]}`}
    >
      {children}
    </span>
  );
}
