import { Button } from "@/components/ui/Button";
import { facilities } from "@/config/facilities";
import { centralDate, shiftDate } from "@/lib/calendar/time";
import styles from "./calendar.module.css";
type Props = {
  date: string;
  onDate: (date: string) => void;
  view: "calendar" | "list";
  onView: (view: "calendar" | "list") => void;
  facility: string;
  onFacility: (id: string) => void;
  studio: string;
  onStudio: (key: string) => void;
  rooms: { key: string; name: string; facilityName: string }[];
  busy: boolean;
};
export function CalendarControls(props: Props) {
  return (
    <div className={styles.controls}>
      <div
        className={styles.viewToggle}
        role="group"
        aria-label="Calendar view"
      >
        {(["calendar", "list"] as const).map((view) => (
          <button
            key={view}
            type="button"
            aria-pressed={props.view === view}
            onClick={() => props.onView(view)}
          >
            {view === "calendar" ? "Calendar" : "List"}
          </button>
        ))}
      </div>
      <Button
        className={styles.todayButton}
        variant="secondary"
        disabled={props.busy}
        onClick={() => props.onDate(centralDate())}
      >
        Today
      </Button>
      <div className={styles.dateControls}>
        <Button
          variant="secondary"
          aria-label="Previous day"
          disabled={props.busy}
          onClick={() => props.onDate(shiftDate(props.date, -1))}
        >
          ←
        </Button>
        <label>
          <span className="sr-only">Selected date</span>
          <input
            type="date"
            value={props.date}
            disabled={props.busy}
            onChange={(event) => {
              if (event.target.value) props.onDate(event.target.value);
            }}
          />
        </label>
        <Button
          variant="secondary"
          aria-label="Next day"
          disabled={props.busy}
          onClick={() => props.onDate(shiftDate(props.date, 1))}
        >
          →
        </Button>
      </div>
      <div className={styles.filters}>
        <label>
          Facility
          <select
            value={props.facility}
            onChange={(event) => props.onFacility(event.target.value)}
          >
            <option value="all">All Facilities</option>
            {facilities.map((facility) => (
              <option key={facility.key} value={facility.studioAssistantId}>
                {facility.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Studio
          <select
            value={props.studio}
            onChange={(event) => props.onStudio(event.target.value)}
          >
            <option value="all">All Studios</option>
            {props.rooms.map((room) => (
              <option key={room.key} value={room.key}>
                {room.facilityName} · {room.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
