import type { CSSProperties } from "react";
import type { StudioSession } from "@/lib/studio-assistant/types";
import { groupStudios, sessionLabel, sessionRange } from "@/lib/calendar/display";
import { centralDate, centralDayRange } from "@/lib/calendar/time";
import { assignOverlapLanes, operationalIntervals, timelinePosition, timelineTicks, type TimelineBounds } from "@/lib/calendar/operations-timeline";
import { CategoryChip } from "@/components/ui/CategoryChip";
import styles from "./operations-timeline.module.css";

export function TimelineDay({ date, sessions, bounds, now, onSelect }: {
  date: string; sessions: StudioSession[]; bounds: TimelineBounds; now: number | null; onSelect: (session: StudioSession) => void;
}) {
  const intervals = operationalIntervals(sessions, date);
  const studios = groupStudios(intervals.map(block => block.session));
  const ticks = timelineTicks(date, bounds);
  const nowMinutes = now === null ? null : (now - Date.parse(centralDayRange(date).start)) / 60_000;
  const showNow = now !== null && centralDate(new Date(now)) === date && nowMinutes! >= bounds.startMinutes && nowMinutes! <= bounds.endMinutes;
  const css = { "--hours": bounds.durationMinutes / 60, "--mobile-height": `${bounds.durationMinutes * 1.2}px` } as CSSProperties;
  const formattedDay = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "short", day: "numeric" }).format(new Date(`${date}T12:00:00Z`));
  const ruler = (mobile: boolean) => <div className={mobile ? styles.mobileRuler : styles.ruler} aria-hidden="true">{ticks.map(tick => <span key={tick.minutes} style={{ "--offset": `${timelinePosition(tick.minutes, tick.minutes, bounds).offset}%` } as CSSProperties} data-midnight={tick.midnight}>
    {tick.label.replace(/ (CDT|CST)$/, "")}<small>{tick.midnight ? "Midnight" : tick.nextDay ? `+${tick.dayOffset} day${tick.dayOffset === 1 ? "" : "s"}` : tick.previousDay ? "−1 day" : tick.label.slice(-3)}</small>
  </span>)}</div>;
  const guides = () => <>{ticks.map(tick => <i key={tick.minutes} className={tick.midnight ? styles.midnight : styles.guide} style={{ "--offset": `${timelinePosition(tick.minutes, tick.minutes, bounds).offset}%` } as CSSProperties} aria-hidden="true" />)}{showNow && <div className={styles.now} style={{ "--offset": `${timelinePosition(nowMinutes!, nowMinutes!, bounds).offset}%` } as CSSProperties}><span>Now</span></div>}</>;
  return <section className={styles.day} style={css} aria-label={`${formattedDay} timeline`}>
    <header className={styles.dayHeader}><div><span className="eyebrow">Operational day</span><h2>{formattedDay}</h2></div><span className={styles.dayCount}>{studios.length} studios · {intervals.length} bookings</span></header>
    {!studios.length ? <div className={styles.empty}>No timed bookings for this day.</div> : <div className={styles.canvasScroll}><div className={styles.canvas}>
      <div className={styles.rulerRow}><span className="eyebrow">Studios · CT</span>{ruler(false)}</div>
      {studios.map(studio => {
        const layout = assignOverlapLanes(intervals.filter(block => studio.sessions.includes(block.session)));
        const short = layout.blocks.filter(block => block.end - block.start < 60 || layout.lanes > 4);
        return <div key={studio.key} className={styles.studio} style={{ "--lanes": layout.lanes, "--row-height": `${layout.lanes * 96 + 16}px` } as CSSProperties}>
          <div className={styles.studioLabel}><span className={styles.mobileDay}>{formattedDay}</span><h3>{studio.name}</h3><span>{studio.sessions.length} bookings{layout.lanes > 1 ? ` · ${layout.lanes} overlap lanes` : ""}</span></div>
          <div className={styles.track}>{ruler(true)}{guides()}{layout.blocks.map(block => {
            const position = timelinePosition(block.start, block.end, bounds);
            const live = now !== null && Date.parse(block.session.start!) <= now && Date.parse(block.session.end!) > now;
            const label = `${block.session.isClass ? "Class. " : ""}${sessionLabel(block.session)}. ${block.session.contactName ?? ""}. ${sessionRange(block.session)}. Open details.`;
            return <button key={block.session.key} type="button" className={styles.booking} data-class={block.session.isClass} data-live={live} data-short={block.end - block.start < 30} onClick={() => onSelect(block.session)} title={label} aria-label={label} style={{ "--offset": `${position.offset}%`, "--size": `${position.size}%`, "--lane": block.lane } as CSSProperties}>
              <span className={styles.bookingTitle}>{block.session.isClass && <CategoryChip kind="class" />}<strong>{sessionLabel(block.session)}</strong></span>
              {(block.session.contactName || !block.session.isClass) && <span className={styles.contact}>{block.session.contactName ?? block.session.serviceName ?? "Studio booking"}</span>}
              <span className={styles.bookingTime}>{live && <b>Now · </b>}{sessionRange(block.session)}</span>
            </button>;
          })}</div>
          {short.length > 0 && <div className={styles.shortBookings}><span>{layout.lanes > 4 ? "Booking details" : "Short bookings"}</span>{short.map(({session}) => <button key={session.key} onClick={() => onSelect(session)}>{session.isClass && <CategoryChip kind="class" />}{sessionLabel(session)} · {sessionRange(session)}</button>)}</div>}
        </div>;
      })}
    </div></div>}
  </section>;
}
