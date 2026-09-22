import styles from "./schedule-view-switch.module.css";

type View = "calendar" | "list";
export function ScheduleViewSwitch({ view, onView }: {
  view: View;
  onView: (view: View) => void;
}) {
  return <div className={styles.switcher} role="group" aria-label="Schedule view">
    {(["calendar", "list"] as const).map(option => <button
      key={option}
      type="button"
      aria-pressed={view === option}
      onClick={() => { if (view !== option) onView(option); }}
    >{option === "calendar" ? "Schedule" : "List"}</button>)}
  </div>;
}
