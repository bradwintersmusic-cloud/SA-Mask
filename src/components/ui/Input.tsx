import type { InputHTMLAttributes } from "react";
import styles from "./ui.module.css";
export function Input({
  label,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={styles.field}>
      {label}
      <input className={`${styles.control} ${className}`} {...props} />
    </label>
  );
}
