"use client";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import type {
  CalendarSnapshot,
  StudioSession,
} from "@/lib/studio-assistant/types";
import {
  groupStudios,
  onDay,
  roomKey,
  usableSchedule,
} from "@/lib/calendar/display";
import { validDate } from "@/lib/calendar/time";
import { loadCalendar } from "@/lib/calendar/browser-client";
import { ScheduleViewSwitch } from "./ScheduleViewSwitch";
import { CalendarControls } from "./CalendarControls";
import { SessionManager } from "./SessionManager";
import { DailyList } from "./DailyList";
import { DayTimeline } from "./DayTimeline";
import { SessionDetailsModal } from "./SessionDetailsModal";
import styles from "./calendar.module.css";
export function CalendarWorkspace({
  initialSnapshot,
  initialFacility = "all",
  initialStudio = "all",
}: {
  initialSnapshot: CalendarSnapshot;
  initialFacility?: string;
  initialStudio?: string;
}) {
  const [snapshot, setSnapshot] = useState<CalendarSnapshot | null>(
    initialSnapshot,
  );
  const [date, setDate] = useState(initialSnapshot.date);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [facility, setFacility] = useState(initialFacility);
  const [studio, setStudio] = useState(initialStudio);
  const [selected, setSelected] = useState<StudioSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function refresh(nextDate = date) {
    if (!validDate(nextDate)) {
      setError("Choose a valid schedule date.");
      return;
    }
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError(null);
    setDate(nextDate);
    setSelected(null);
    try {
      const next = await loadCalendar(nextDate, request.signal);
      if (!request.signal.aborted) {
        setSnapshot(next);
        setStudio((previous) =>
          next.sessions.some((session) => roomKey(session) === previous)
            ? previous
            : "all",
        );
      }
    } catch {
      if (!request.signal.aborted) {
        setSnapshot(null);
        setError(
          "Schedule could not be loaded. Check the connection and refresh.",
        );
      }
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  }
  const sessions =
    snapshot?.sessions.filter((session) =>
      onDay(session, snapshot.start, snapshot.end),
    ) ?? [];
  const byFacility = sessions.filter(
    (session) => facility === "all" || String(session.facilityId) === facility,
  );
  const studios = groupStudios(byFacility);
  const visible = byFacility.filter(
    (session) => studio === "all" || roomKey(session) === studio,
  );
  const unplaced = visible.filter((session) => !usableSchedule(session));
  const detailed = studio !== "all" || studios.length === 1;
  const relevantIssues =
    snapshot?.issues.filter(
      (issue) => facility === "all" || String(issue.facilityId) === facility,
    ) ?? [];
  if (view === "list") return <SessionManager initialSnapshot={snapshot ?? initialSnapshot} initialFacility={facility} initialStudio={studio} onTimeline={(day) => { setView("calendar"); void refresh(day); }} />;
  return (
    <>
      <PageHeader
        title="Schedule"
        description="Studio schedules · Central Time"
        action={
          <Button variant="secondary" disabled={busy} onClick={() => refresh()}>
            {busy ? "Loading…" : "Refresh"}
          </Button>
        }
      />
      <div className={styles.workspace}>
        <ScheduleViewSwitch view={view} onView={setView} />
        <CalendarControls
          date={date}
          onDate={(value) => refresh(value)}
          facility={facility}
          onFacility={(value) => {
            setFacility(value);
            setStudio("all");
          }}
          studio={studio}
          onStudio={setStudio}
          rooms={studios}
          busy={busy}
        />
        {studio !== "all" && <div><Button variant="secondary" onClick={() => { setFacility("all"); setStudio("all"); }}>← Return to Schedule</Button></div>}
        <p className={styles.hint}>
          Studios are discovered from this response. Rooms with no returned
          sessions may not be listed.
        </p>
        {busy ? (
          <p role="status" className={styles.empty}>
            Loading facility schedules…
          </p>
        ) : (
          <>
            {error && (
              <p role="alert" className={styles.warning}>
                {error}
              </p>
            )}
            {snapshot?.issues.map((issue) => (
              <p role="alert" className={styles.warning} key={issue.facilityId}>
                <strong>{issue.facilityName}:</strong> {issue.message}
              </p>
            ))}
            {snapshot && (
              <p className={styles.hint}>
                {visible.length} matching{" "}
                {visible.length === 1 ? "session" : "sessions"}
                {snapshot.issues.length ? " · Partial or unavailable data" : ""}
              </p>
            )}
            {!visible.length && snapshot && (
              <div className={styles.empty}>
                <h2>
                  {relevantIssues.length
                    ? "Schedule unavailable or incomplete"
                    : "No sessions"}
                </h2>
                <p>
                  {relevantIssues.length
                    ? "Resolve the access error and refresh. Unavailable facilities are not counted as empty."
                    : "No sessions match the selected date and filters."}
                </p>
              </div>
            )}
            {visible.length > 0 &&
              (detailed ? (
                <>
                  <h2>
                    {
                      studios.find(
                        (item) =>
                          item.key ===
                          (studio === "all" ? studios[0]?.key : studio),
                      )?.name
                    }
                  </h2>
                  <DayTimeline
                    sessions={visible}
                    date={date}
                    onSelect={setSelected}
                  />
                  {unplaced.length > 0 && (
                    <section>
                      <h2>Schedule needs review</h2>
                      <p className={styles.hint}>
                        These returned sessions have missing or invalid times
                        and cannot be positioned on the timeline.
                      </p>
                      <DailyList sessions={unplaced} onSelect={setSelected} />
                    </section>
                  )}
                </>
              ) : (
                <>
                  <p className={styles.hint}>
                    All studios summary. Select “View timeline” for a
                    time-scaled studio day.
                  </p>
                  <DailyList
                    sessions={visible}
                    onSelect={setSelected}
                    onStudio={setStudio}
                  />
                </>
              ))}
          </>
        )}
      </div>
      <SessionDetailsModal
        session={selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
