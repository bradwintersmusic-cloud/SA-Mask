import { CategoryChip } from "@/components/ui/CategoryChip";
import type { StudioSession } from "@/lib/studio-assistant/types";
import {
  groupStudios,
  sessionLabel,
  sessionRange,
} from "@/lib/calendar/display";
import styles from "./calendar.module.css";
export function DailyList({
  sessions,
  onSelect,
  onStudio,
}: {
  sessions: StudioSession[];
  onSelect: (session: StudioSession) => void;
  onStudio?: (key: string) => void;
}) {
  const studios = groupStudios(sessions);
  const facilityNames = [
    ...new Set(studios.map((studio) => studio.facilityName)),
  ];
  return (
    <div className={styles.dailyList}>
      {facilityNames.map((facility) => (
        <section key={facility} className={styles.facility}>
          <h2>{facility}</h2>
          <div className={onStudio ? styles.studioGrid : styles.studioStack}>
            {studios
              .filter((studio) => studio.facilityName === facility)
              .map((studio) => (
                <section key={studio.key} className={styles.studioSection}>
                  <header>
                    <h3>{studio.name}</h3>
                    {onStudio && (
                      <button
                        type="button"
                        onClick={() => onStudio(studio.key)}
                      >
                        View timeline →
                      </button>
                    )}
                  </header>
                  <ul>
                    {studio.sessions.map((session) => (
                      <li key={session.key}>
                        <button
                          type="button"
                          className={styles.sessionRow}
                          onClick={() => onSelect(session)}
                        >
                          <span className={styles.time}>
                            {sessionRange(session)}
                          </span>
                          <span className={styles.rowBody}>
                            <strong>{sessionLabel(session)} {session.isClass && <CategoryChip kind="class" />}</strong>
                            {session.contactName && (
                              <span>{session.contactName}</span>
                            )}
                          </span>
                          <span aria-hidden="true">↗</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
