import { Card } from "./Card";
import { Icon, type IconName } from "./Icon";
import { StatusBadge } from "./StatusBadge";
import styles from "./ui.module.css";
export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <Card className={styles.empty}>
      <div className={styles.emptyIcon}>
        <Icon name={icon} width="28" height="28" />
      </div>
      <StatusBadge>Coming in a future release</StatusBadge>
      <h2>{title}</h2>
      <p>{description}</p>
      <p className="eyebrow">Foundation preview · No live data</p>
    </Card>
  );
}
