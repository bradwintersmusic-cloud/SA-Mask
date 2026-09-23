"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { facilities } from "@/config/facilities";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import type { CalendarSnapshot, StudioSession } from "@/lib/studio-assistant/types";
import { centralDate, centralDayRange, shiftDate, validDate, sessionDateTime } from "@/lib/calendar/time";
import { calculateTimelineBounds, timelineTicks } from "@/lib/calendar/operations-timeline";
import { usableSchedule, sessionLabel, onDay } from "@/lib/calendar/display";
import { loadCalendar } from "@/lib/calendar/browser-client";
import { ScheduleViewSwitch, type ScheduleView } from "./ScheduleViewSwitch";
import { TimelineDay } from "./TimelineDay";
import { SessionDetailsModal } from "./SessionDetailsModal";
import styles from "./operations-timeline.module.css";

export function TimelineView({ initialSnapshot, initialFacility, initialDate, onView }: {
  initialSnapshot: CalendarSnapshot; initialFacility: string; initialDate: string; onView: (view: ScheduleView, date: string) => void;
}) {
  const [date, setDate] = useState(initialDate);
  const [range, setRange] = useState<1 | 3>(1);
  const [facility, setFacility] = useState(facilities.find(f => String(f.studioAssistantId) === initialFacility)?.key ?? facilities[0].key);
  const initialIsDay = initialSnapshot.date === initialDate && Date.parse(initialSnapshot.end) === Date.parse(centralDayRange(initialSnapshot.date).end);
  const [snapshot, setSnapshot] = useState<CalendarSnapshot | null>(initialIsDay ? initialSnapshot : null);
  const [busy, setBusy] = useState(!initialIsDay);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<StudioSession | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);
  const initial = useRef(initialIsDay ? initialSnapshot : null);
  const dates = useMemo(() => Array.from({ length: range }, (_, i) => shiftDate(date, i)), [date, range]);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const request = new AbortController();
    if (revision === 0 && range === 1 && initial.current?.date === date) return () => request.abort();
    loadCalendar(date, request.signal, shiftDate(date, range - 1)).then(data => {
      if (!request.signal.aborted) { setSnapshot(data); setBusy(false); }
    }).catch(() => {
      if (!request.signal.aborted) { setError("Timeline could not be loaded. Refresh to retry."); setBusy(false); }
    });
    return () => request.abort();
  }, [date, range, revision]);
  function changePeriod(nextDate: string, nextRange: 1 | 3 = range) {
    if (!validDate(nextDate) || nextDate < "1900-01-01" || nextDate > "9998-12-28") { setError("Choose a valid timeline date."); return; }
    if (nextDate === date && nextRange === range) return;
    // Facility switches are purely local. Only a date/range change fetches both facilities.
    initial.current = null;
    setSnapshot(null); setBusy(true); setError(""); setSelected(null); setDate(nextDate); setRange(nextRange);
  }
  function refresh() { initial.current = null; setSnapshot(null); setBusy(true); setError(""); setSelected(null); setRevision(value => value + 1); }
  const allSessions = snapshot?.sessions.filter(s => onDay(s, snapshot.start, snapshot.end)) ?? [];
  const bounds = useMemo(() => calculateTimelineBounds(snapshot?.sessions ?? [], dates), [snapshot, dates]);
  const activeFacility = facilities.find(f => f.key === facility)!;
  const sessions = allSessions.filter(s => s.facilityId === activeFacility.studioAssistantId);
  const uncertain = sessions.filter(s => !usableSchedule(s));
  const timed = sessions.filter(usableSchedule);
  const ticks = timelineTicks(date, bounds);
  const liveCount = now === null ? 0 : timed.filter(s => Date.parse(s.start!) <= now && Date.parse(s.end!) > now).length;
  const nextSession = now === null ? undefined : [...timed].filter(s => Date.parse(s.start!) > now).sort((a,b) => Date.parse(a.start!) - Date.parse(b.start!))[0];
  return <>
    <PageHeader title="Schedule" description="Studio schedules · Central Time" action={<Button variant="secondary" disabled={busy} onClick={refresh}>{busy ? "Loading…" : "Refresh"}</Button>} />
    <div className={styles.workspace}>
      <ScheduleViewSwitch view="timeline" onView={view => onView(view, date)} />
      <section className={styles.console} aria-label="Timeline controls">
        <div className={styles.consoleTop}><div><span className="eyebrow">Facility operations</span><h2>Across the studios</h2><p>One shared clock. Every booking in view.</p></div><div className={styles.facilities} role="group" aria-label="Timeline facility">{facilities.map(f => <button key={f.key} aria-pressed={facility === f.key} onClick={() => { setFacility(f.key); setSelected(null); }}><span className={styles.indicator} />{f.name}</button>)}</div></div>
        <div className={styles.toolbar}><div className={styles.mode} role="group" aria-label="Timeline range">{([1,3] as const).map(value => <button key={value} aria-pressed={range === value} onClick={() => changePeriod(date,value)}>{value === 1 ? "Day" : "3-Day"}</button>)}</div><div className={styles.dateControls}><Button variant="secondary" aria-label={range === 1 ? "Previous day" : "Previous 3 days"} onClick={() => changePeriod(shiftDate(date,-range))}>←</Button><label><span className="sr-only">Timeline start date</span><input type="date" aria-label="Timeline start date" value={date} min="1900-01-01" max="9998-12-28" onChange={e => changePeriod(e.target.value)} /></label><Button variant="secondary" aria-label={range === 1 ? "Next day" : "Next 3 days"} onClick={() => changePeriod(shiftDate(date,range))}>→</Button><Button variant="secondary" onClick={() => changePeriod(centralDate())}>Today</Button></div></div>
      </section>
      {busy ? <div className={styles.empty} role="status">Loading the studio timeline…</div> : error ? <div className={styles.empty} role="alert">{error}</div> : snapshot && <>
        {snapshot.issues.map(issue => <p className={styles.warning} role="alert" key={issue.facilityId}><strong>{issue.facilityName}:</strong> {issue.message} Shared bounds use available data.</p>)}
        <div className={styles.summary}><div><span className="eyebrow">{activeFacility.name} / {range === 1 ? "Day" : "3 days"}</span><strong>{timed.length} bookings <span>· {liveCount} live now</span></strong></div><div className={styles.scale}><span>{ticks[0]?.label}{ticks[0]?.previousDay ? " (previous day)" : ""} — {ticks.at(-1)?.label}{ticks.at(-1)?.nextDay ? ` (+${ticks.at(-1)!.dayOffset} day${ticks.at(-1)!.dayOffset === 1 ? "" : "s"})` : ""}</span><small>Shared scale · Both facilities{range === 3 ? " · All three days" : ""}</small></div></div>
        {nextSession && <button className={styles.upNext} onClick={() => setSelected(nextSession)}><span className="eyebrow">Next in this period</span><strong>{sessionLabel(nextSession)}</strong><span>{sessionDateTime(nextSession.start)} · {nextSession.roomName} ↗</span></button>}
        {!timed.length ? <div className={styles.empty}><span className="eyebrow">{activeFacility.name}</span><h2>{snapshot.issues.some(i => i.facilityId === activeFacility.studioAssistantId) ? "Timeline unavailable or incomplete" : "No bookings for this period"}</h2><p>{uncertain.length ? "Some returned bookings need their schedule reviewed below." : "Choose another date or facility to explore the studio schedule."}</p></div> : dates.map(day => <TimelineDay key={day} date={day} sessions={sessions} bounds={bounds} now={now} onSelect={setSelected} />)}
        {uncertain.length > 0 && <section className={styles.review}><h2>Schedule needs review</h2><p>These bookings have missing or invalid times and cannot be placed on the grid.</p>{uncertain.map(s => <Button variant="secondary" key={s.key} onClick={() => setSelected(s)}>{sessionLabel(s)}</Button>)}</section>}
        <p className={styles.footnote}>America/Chicago · Proportional elapsed time · Overnight bookings continue past midnight. Carry-in bookings begin at the day boundary.</p>
      </>}
    </div>
    <SessionDetailsModal session={selected} onClose={() => setSelected(null)} />
  </>;
}
