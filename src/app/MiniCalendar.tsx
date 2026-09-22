"use client";
import Link from "next/link";
import { useState } from "react";
import { calendarLink } from "@/lib/calendar/query";
import styles from "./overview.module.css";
export function MiniCalendar({ today }: { today: string }) {
  const [month, setMonth] = useState(today.slice(0,7));
  const first = new Date(`${month}-01T12:00:00Z`);
  const monthLabel = first.toLocaleDateString("en-US", {month:"long",year:"numeric",timeZone:"UTC"});
  const days = new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
  function move(offset: number) { const next = new Date(first); next.setUTCMonth(next.getUTCMonth()+offset); if(next.getUTCFullYear()>=1900&&next.getUTCFullYear()<=9998)setMonth(next.toISOString().slice(0,7)); }
  return <section className={styles.month} aria-label="Quick schedule navigation">
    <div className={styles.sectionLabel}>Go to a day</div>
    <div className={styles.monthHeader}><h3 aria-live="polite">{monthLabel}</h3><div><button onClick={()=>move(-1)} aria-label="Previous month">‹</button><button onClick={()=>move(1)} aria-label="Next month">›</button></div></div>
    <div className={styles.monthGrid}>
      {["Su","Mo","Tu","We","Th","Fr","Sa"].map(day=><span className={styles.weekday} key={day}>{day}</span>)}
      {Array.from({length:first.getUTCDay()},(_,i)=><span key={`blank${i}`} />)}
      {Array.from({length:days},(_,i)=>{const date=`${month}-${String(i+1).padStart(2,"0")}`;return <Link key={date} href={calendarLink(date)} prefetch={false} aria-current={date===today?"date":undefined} aria-label={`Open schedule for ${date}`}>{i+1}</Link>;})}
    </div>
    <p className={styles.monthHint}>Select a date to open its studio schedule.</p>
  </section>;
}
