"use client";
import { facilities } from "@/config/facilities";
import { readSchedulePreferences, saveSchedulePreferences, type SchedulePreferences } from "@/lib/calendar/preferences";
import { sessionCountLabel } from "@/lib/studio-assistant/session-classification";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
import { TimelineView } from "./TimelineView";
import { ScheduleViewSwitch, type ScheduleView } from "./ScheduleViewSwitch";
import { CalendarControls } from "./CalendarControls";
import { SessionManager } from "./SessionManager";
import { DailyList } from "./DailyList";
import { DayTimeline } from "./DayTimeline";
import { SessionDetailsModal } from "./SessionDetailsModal";
import styles from "./calendar.module.css";
type WorkspaceProps = {
  initialSnapshot: CalendarSnapshot;
  deleteEnabled: boolean;
  initialFacility?: string;
  initialStudio?: string;
  explicitPreferences?: Partial<SchedulePreferences>;
};
const subscribeReady = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
export function CalendarWorkspace(props: WorkspaceProps) {
  const ready = useSyncExternalStore(subscribeReady, clientReady, serverReady);
  // Mount the workspace only after storage can be read, avoiding mismatches and
  // loading a default Timeline range before the saved range has been resolved.
  if (!ready) return <p role="status">Loading schedule preferences…</p>;
  return <ResolvedWorkspace {...props} />;
}
function ResolvedWorkspace({ initialSnapshot, deleteEnabled, initialFacility = "all", initialStudio = "all", explicitPreferences = {} }: WorkspaceProps) {
  const [preferences, setPreferences] = useState(() => readSchedulePreferences({
    ...(initialFacility !== "all" ? { facility: initialFacility } : {}),
    ...(initialStudio !== "all" ? { view: "calendar" as const } : {}),
    ...explicitPreferences,
  }));
  function updatePreferences(patch: Partial<SchedulePreferences>) {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    saveSchedulePreferences(next);
  }
  const view = preferences.view;
  const facility = facilities.find(item => item.key === preferences.facility)?.studioAssistantId.toString() ?? "all";
  function setView(view: ScheduleView) { updatePreferences({ view }); }
  function setFacility(id: string) {
    setStudio("all");
    updatePreferences({ facility: facilities.find(item => String(item.studioAssistantId) === id)?.key ?? "all" });
  }
  const [snapshot, setSnapshot] = useState<CalendarSnapshot | null>(
    initialSnapshot,
  );
  const [date, setDate] = useState(initialSnapshot.date);
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
  if (view === "timeline") return <TimelineView initialDate={date} initialSnapshot={snapshot ?? initialSnapshot} initialFacility={facility} initialRange={preferences.timelineRange === "3-day" ? 3 : 1} onFacilityChange={setFacility} onRangeChange={range => updatePreferences({ timelineRange: range === 3 ? "3-day" : "day" })} onView={(next, day) => { if (day !== date) void refresh(day).then(() => setView(next)); else setView(next); }} />;
  if (view === "list") return <SessionManager deleteEnabled={deleteEnabled} initialSnapshot={snapshot ?? initialSnapshot} initialFacility={facility} initialStudio={studio} onFacilityChange={setFacility} onTimeline={(day, next = "calendar") => { if (next === "timeline") void refresh(day).then(() => setView(next)); else { setView(next); void refresh(day); } }} />;
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
                {sessionCountLabel(visible)}
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
