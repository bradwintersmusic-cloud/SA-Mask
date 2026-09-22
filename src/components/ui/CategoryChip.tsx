import styles from "./category-chip.module.css";
export function CategoryChip({ kind }: { kind: "admin" | "teacher" | "class" }) {
  return <span className={`${styles.chip} ${styles[kind]}`}>{kind === "admin" ? "Admin" : kind === "teacher" ? "Teacher" : "Class"}</span>;
}
