import { CategoryChip } from "@/components/ui/CategoryChip";
import type { StudioSession } from "@/lib/studio-assistant/types";
import { layoutTimeline } from "@/lib/calendar/timeline";
import { sessionTime } from "@/lib/calendar/time";
import { sessionLabel, sessionRange } from "@/lib/calendar/display";
import styles from "./calendar.module.css";
export function DayTimeline({
  sessions,
  date,
  onSelect,
}: {
  sessions: StudioSession[];
  date: string;
  onSelect: (session: StudioSession) => void;
}) {
  const layout = layoutTimeline(sessions, date);
  return (
    <div className={styles.timelineScroll}>
      <div
        className={styles.timeline}
        style={{ height: layout.height + 24 }}
        aria-label="Studio day timeline"
      >
        {layout.ticks.map((tick) => (
          <div
            key={tick}
            className={styles.tick}
            style={{
              top: ((tick - layout.start) / 60_000) * layout.pixelsPerMinute,
            }}
          >
            <span>{sessionTime(new Date(tick).toISOString())}</span>
            <i />
          </div>
        ))}
        <div className={styles.track}>
          {layout.blocks.map((block) => (
            <button
              key={block.session.key}
              type="button"
              className={styles.sessionBlock}
              style={{
                top: block.top,
                height: block.height,
                left: `calc(${(block.lane / block.columns) * 100}% + 2px)`,
                width: `calc(${100 / block.columns}% - 4px)`,
              }}
              onClick={() => onSelect(block.session)}
              aria-label={`${block.session.isClass ? "Class, " : ""}${sessionLabel(block.session)}${block.session.contactName ? `, ${block.session.contactName}` : ""}, ${sessionRange(block.session)}. Open details.`}
            >
              <strong>{block.session.isClass && <CategoryChip kind="class" />} {sessionLabel(block.session)}</strong>
              {block.height >= 80 && block.session.contactName && (
                <span>{block.session.contactName}</span>
              )}
              <small>{sessionRange(block.session)}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
