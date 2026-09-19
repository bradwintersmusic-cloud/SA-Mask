import type { ButtonHTMLAttributes } from "react";
import styles from "./ui.module.css";
type Variant = "primary" | "secondary" | "danger" | "ghost";
export function buttonClass(variant: Variant = "primary") {
  return `${styles.button} ${styles[variant]}`;
}
export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={`${buttonClass(variant)} ${className}`}
      {...props}
    />
  );
}
