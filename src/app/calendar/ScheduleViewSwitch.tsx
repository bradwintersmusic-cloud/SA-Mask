import styles from "./schedule-view-switch.module.css";

export type ScheduleView = "calendar" | "list" | "timeline";
export function ScheduleViewSwitch({ view, onView }: {
  view: ScheduleView;
  onView: (view: ScheduleView) => void;
}) {
  return <div className={styles.switcher} role="group" aria-label="Schedule view">
    {(["calendar", "list", "timeline"] as const).map(option => <button
      key={option}
      type="button"
      aria-pressed={view === option}
      onClick={() => { if (view !== option) onView(option); }}
    >{option === "calendar" ? "Schedule" : option === "list" ? "List" : "Timeline"}</button>)}
  </div>;
}
