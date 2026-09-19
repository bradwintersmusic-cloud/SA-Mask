import type { SelectHTMLAttributes } from "react";
import styles from "./ui.module.css";
export function Select({
  label,
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className={styles.field}>
      {label}
      <select className={`${styles.control} ${className}`} {...props}>
        {children}
      </select>
    </label>
  );
}
