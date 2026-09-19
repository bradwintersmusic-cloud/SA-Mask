import type { ReactNode } from "react";
import styles from "./layout.module.css";
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.pageHeader}>
      <div>
        <p className="eyebrow">Studio operations</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className={styles.headerAction}>{action}</div>}
    </div>
  );
}
