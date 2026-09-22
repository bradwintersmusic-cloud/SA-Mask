"use client";
import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { facilities } from "@/config/facilities";
import { calendarLink } from "@/lib/calendar/query";
import { sessionDateTime } from "@/lib/calendar/time";
import { todayActivity } from "@/lib/overview/activity";
import type { CalendarSnapshot, RequestsSnapshot } from "@/lib/studio-assistant/types";
import { MiniCalendar } from "./MiniCalendar";
import styles from "./overview.module.css";
export function TodayModule({today,calendar,requests}:{today:string;calendar:CalendarSnapshot|null;requests:RequestsSnapshot|null}) {
  const router = useRouter();
  const [busy,startTransition] = useTransition();
  const activity = todayActivity(calendar);
  const partial = !calendar || calendar.issues.length>0;
  const requestPartial = !requests || requests.issues.length>0;
  const count = requests?.requests.length ?? 0;
  const dateLabel = new Date(`${today}T12:00:00Z`).toLocaleDateString("en-US",{weekday:"short",day:"numeric",month:"short",timeZone:"UTC"});
  return <>
    <header className={styles.pageHeader}><h1>Overview</h1><span>Studio operations</span></header>
    <section className={styles.console} aria-labelledby="today-title" aria-busy={busy}>
      <header className={styles.todayHeader}>
        <div><p className={styles.date}>{dateLabel} <span> / Central Time</span></p><h2 id="today-title">Today<span className={styles.statusDot} aria-hidden="true" /></h2>
        <p className={styles.summary}>{!calendar || (calendar.issues.length===facilities.length&&!activity.sessions.length) ? "Session activity unavailable" : <><strong>{activity.sessions.length}</strong> {partial?"loaded ":""}sessions across <strong>{activity.studioCount}</strong> studios</>}</p>
        {partial && <p className={styles.notice}>Partial or unavailable activity · {calendar?.issues.map(issue=>issue.facilityName).join(", ") || "Both facilities"}</p>}
        {activity.uncertainCount>0&&<p className={styles.notice}>{activity.uncertainCount} returned sessions have uncertain times; retained for review.</p>}</div>
        <div className={styles.headerActions}><Button variant="secondary" disabled={busy} onClick={()=>startTransition(()=>router.refresh())}>{busy?"Refreshing…":"Refresh"}</Button><Link href={calendarLink(today)} prefetch={false}>Open day schedule <span aria-hidden="true">↗</span></Link></div>
      </header>
      <div className={styles.content}>
        <section className={styles.activity} aria-labelledby="activity-heading">
          <div className={styles.sectionHeading}><h3 id="activity-heading">Studio activity</h3><span>Sessions / studio</span></div>
          {facilities.map(facility=>{
            const rooms=activity.rooms.filter(room=>room.facilityId===facility.studioAssistantId);
            const failed=!calendar||calendar.issues.some(issue=>issue.facilityId===facility.studioAssistantId);
            const total=rooms.reduce((sum,room)=>sum+room.sessions.length,0);
            return <section className={styles.facility} key={facility.key} aria-label={`${facility.name} activity`}><div className={styles.facilityHeading}><h4>{facility.name}</h4><span>{failed?"Unavailable":`${total} sessions`}</span></div>
              {rooms.map(room=><Link className={styles.studioRow} key={room.key} prefetch={false} href={calendarLink(today,facility.studioAssistantId,room.sessions[0].roomId)} aria-label={`${facility.name}, ${room.name}, ${room.sessions.length} sessions. Open schedule.`}><div><span>{room.name}</span><div className={styles.rail} aria-hidden="true"><i style={{width:`${room.sessions.length/activity.maxCount*100}%`}} /></div></div><strong>{room.sessions.length}</strong><span className={styles.arrow} aria-hidden="true">↗</span></Link>)}
              {!rooms.length&&<p className={styles.quiet}>{failed?"Could not load this facility. Refresh to retry.":"No sessions today."}</p>}
            </section>;
          })}
          <p className={styles.activityHint}>Activity rails compare session counts with today’s busiest studio.</p>
        </section>
        <section className={`${styles.attention} ${count?styles.hasRequests:""}`} aria-labelledby="attention-heading">
          <div className={styles.sectionLabel}>Attention queue · All dates</div>
          <h3 id="attention-heading">{count ? <><span className={styles.attentionDot} aria-hidden="true" />{count} {requestPartial?"loaded ":""}Internal {count === 1 ? "Request" : "Requests"}</> : requestPartial ? "Requests unavailable" : "No Internal Requests"}</h3>
          {requestPartial&&<p role="status" className={styles.notice}>Queue incomplete · {requests?.issues.map(issue=>issue.facilityName).join(", ")||"Both facilities"}. Refresh to retry.</p>}
          {!count&&!requestPartial&&<p className={styles.quiet}>Nothing waiting in the request queue.</p>}
          <div className={styles.requestList}>{requests?.requests.slice(0,3).map(request=><Link href="/requests" prefetch={false} key={`${request.facilityId}:${request.id}`}><strong>{request.requesterName}</strong><span>{request.facilityName} · {request.roomName}</span>{request.start&&<small>{sessionDateTime(request.start)}</small>}</Link>)}</div>
          <Link className={styles.allRequests} href="/requests" prefetch={false}>View all requests <span aria-hidden="true">→</span></Link>
        </section>
        <MiniCalendar key={today} today={today}/>
      </div>
      <footer className={styles.consoleFooter}><span>Studio Assistant · Live source</span><span>Production</span></footer>
    </section>
  </>;
}
