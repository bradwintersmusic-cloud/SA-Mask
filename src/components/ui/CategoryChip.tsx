import styles from "./category-chip.module.css";
export function CategoryChip({ kind }: { kind: "admin" | "teacher" | "class" | "maintenance" }) {
  return <span className={`${styles.chip} ${styles[kind]}`}>{kind === "admin" ? "Admin" : kind === "teacher" ? "Teacher" : kind === "maintenance" ? "Maintenance" : "Class"}</span>;
}
