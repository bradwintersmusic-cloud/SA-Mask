"use client";
import { useEffect, useRef, useState } from "react";
import { CategoryChip } from "@/components/ui/CategoryChip";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { BatchConfirmationModal } from "@/components/ui/BatchConfirmationModal";
import type { CalendarSnapshot, StudioSession } from "@/lib/studio-assistant/types";
import type { StudioUser } from "@/lib/studio-assistant/enrollment-types";
import { facilities } from "@/config/facilities";
import { centralDate, centralDateRange } from "@/lib/calendar/time";
import { loadCalendar } from "@/lib/calendar/browser-client";
import { groupStudios, roomKey, sessionLabel, sessionRange } from "@/lib/calendar/display";
import { filterSessions, groupSessionDates, memberMatches, sessionReferenceKey } from "@/lib/calendar/session-search";
import { ScheduleViewSwitch } from "./ScheduleViewSwitch";
import { SessionDetailsModal } from "./SessionDetailsModal";
import { deleteSelectedSessions } from "./actions";
import styles from "./session-manager.module.css";
export function SessionManager({ initialSnapshot, initialFacility, initialStudio, onTimeline, deleteEnabled }: {
    initialSnapshot: CalendarSnapshot;
    deleteEnabled: boolean;
    initialFacility: string;
    initialStudio: string;
    onTimeline: (day: string) => void;
}) {
    const [snapshot, setSnapshot] = useState(initialSnapshot);
    const [from, setFrom] = useState(initialSnapshot.date);
    const [through, setThrough] = useState(initialSnapshot.date);
    const [applied, setApplied] = useState([initialSnapshot.date, initialSnapshot.date]);
    const [facility, setFacility] = useState(initialFacility);
    const [studio, setStudio] = useState(initialStudio);
    const [members, setMembers] = useState<StudioUser[]>([]);
    const [memberStatus, setMemberStatus] = useState("Loading school members…");
    const [memberQuery, setMemberQuery] = useState("");
    const [user, setUser] = useState<StudioUser | null>(null);
    const [query, setQuery] = useState("");
    const [hideClasses, setHideClasses] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [preview, setPreview] = useState<StudioSession[] | null>(null);
    const [detail, setDetail] = useState<StudioSession | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [resultMessage, setResultMessage] = useState("");
    const [deleting, setDeleting] = useState(false);
    const deletionLock = useRef(false);
    const controller = useRef<AbortController | null>(null);
    useEffect(() => {
        const request = new AbortController();
        fetch("/api/calendar/members", { signal: request.signal }).then(async (response) => {
            if (!response.ok)
                throw new Error();
            const data: StudioUser[] = await response.json();
            if (!request.signal.aborted) {
                setMembers(data);
                setMemberStatus("");
            }
        }).catch(() => { if (!request.signal.aborted)
            setMemberStatus("School members unavailable. Refresh the page to retry; other filters remain available."); });
        return () => { request.abort(); controller.current?.abort(); };
    }, []);
    function clearSelection() { setSelected(new Set()); setPreview(null); }
    async function refresh(start = from, end = through) {
        clearSelection();
        try {
            centralDateRange(start, end);
        }
        catch {
            setError("Choose valid dates with the end on or after the start.");
            return;
        }
        controller.current?.abort();
        const request = new AbortController();
        controller.current = request;
        setBusy(true);
        setError("");
        setDetail(null);
        try {
            const data = await loadCalendar(start, request.signal, end);
            if (!request.signal.aborted) {
                setSnapshot(data);
                setStudio(previous => previous === "all" || data.sessions.some(session => roomKey(session) === previous) ? previous : "all");
                setApplied([start, end]);
            }
        }
        catch {
            if (!request.signal.aborted)
                setError("Sessions could not be loaded. Refresh to retry.");
        }
        finally {
            if (!request.signal.aborted)
                setBusy(false);
        }
    }
    // Capture exact confirmed records; never infer targets from filters.
    async function confirmDeletion() {
        if (!deleteEnabled || !preview?.length || deletionLock.current)
            return;
        const records = [...preview];
        deletionLock.current = true;
        setDeleting(true);
        setResultMessage("");
        try {
            const outcome = await deleteSelectedSessions(records.map(session => ({ facilityId: session.facilityId, sessionId: session.id! })));
            if (outcome.error) {
                setResultMessage(outcome.error);
                setPreview(null);
                await refresh();
                return;
            }
            const results = outcome.results ?? [];
            const failures = results.filter(result => !result.success);
            setResultMessage(`${results.filter(result => result.success).length} sessions deleted. ${failures.length} could not be deleted.${failures.length ? " Failed session IDs: " + failures.map(result => `${result.facilityId}:${result.sessionId}`).join(", ") : ""}`);
            await refresh();
        }
        catch {
            setResultMessage("Deletion could not be confirmed. Refresh before retrying.");
            await refresh();
        }
        finally {
            deletionLock.current = false;
            setDeleting(false);
        }
    }
    const dirty = from !== applied[0] || through !== applied[1];
    const uniqueUserEmail = !!user?.email && members.filter(member => member.email?.trim().toLowerCase() === user.email?.trim().toLowerCase()).length === 1;
    const visible = busy || dirty || error ? [] : filterSessions(snapshot.sessions, { start: snapshot.start, end: snapshot.end, facility, studio, user, query, uniqueUserEmail, hideClasses });
    const rooms = groupStudios(snapshot.sessions.filter(session => facility === "all" || String(session.facilityId) === facility));
    const identities = new Map<string, number>();
    for (const session of snapshot.sessions) {
        const key = sessionReferenceKey(session);
        if (key)
            identities.set(key, (identities.get(key) ?? 0) + 1);
    }
    const selectable = visible.filter(session => { const key = sessionReferenceKey(session); return !!key && identities.get(key) === 1; });
    const allSelected = selectable.length > 0 && selectable.every(session => selected.has(session.key));
    function clearFilters() {
        const today = centralDate();
        setFrom(today);
        setThrough(today);
        setFacility("all");
        setStudio("all");
        setUser(null);
        setMemberQuery("");
        setQuery("");
        setHideClasses(true);
        void refresh(today, today);
    }
    return <>
    <PageHeader title="Schedule" description="Studio schedules · Central Time" action={<Button variant="secondary" disabled={busy || deleting} onClick={() => refresh()}>Refresh</Button>}/>
    <div className={styles.workspace} inert={deleting}>
      <div className={styles.toolbar}><ScheduleViewSwitch view="list" onView={() => onTimeline(applied[0])} />{!deleteEnabled && <span>Session deletion disabled</span>}</div>
      <section className={styles.filters} aria-label="Session filters">
        <label>Start date<input type="date" value={from} onChange={event => { clearSelection(); setError(""); setFrom(event.target.value); }}/></label>
        <label>End date<input type="date" value={through} onChange={event => { clearSelection(); setError(""); setThrough(event.target.value); }}/></label>
        <Button variant="secondary" disabled={busy} onClick={() => refresh()}>Apply dates</Button>
        <Button variant="ghost" disabled={busy} onClick={() => { const today = centralDate(); setFrom(today); setThrough(today); void refresh(today, today); }}>Today</Button>
        <label>Facility<select value={facility} onChange={event => { clearSelection(); setFacility(event.target.value); setStudio("all"); }}><option value="all">All facilities</option>{facilities.map(item => <option key={item.key} value={item.studioAssistantId}>{item.name}</option>)}</select></label>
        <label>Studio<select value={studio} onChange={event => { clearSelection(); setStudio(event.target.value); }}><option value="all">All studios</option>{rooms.map(room => <option key={room.key} value={room.key}>{room.facilityName} · {room.name}</option>)}</select></label>
        <label>Search sessions<input type="search" value={query} placeholder="Contact, project, service, studio, notes…" onChange={event => { clearSelection(); setQuery(event.target.value); }}/></label>
        <div className={styles.member}><label>School user<input type="search" value={memberQuery} placeholder="Name or email" onChange={event => { clearSelection(); setUser(null); setMemberQuery(event.target.value); }}/></label>
          {memberStatus && <p role="status">{memberStatus}</p>}
          {user ? <p>Filtering by {user.name ?? user.email ?? `User #${user.id}`} <button onClick={() => { clearSelection(); setUser(null); setMemberQuery(""); }}>Clear user</button></p> : memberQuery.trim() && <div className={styles.matches} aria-label="Matching school users">{members.filter(member => memberMatches(member, memberQuery)).slice(0, 12).map(member => <button key={member.id} onClick={() => { clearSelection(); setUser(member); setMemberQuery(member.name ?? member.email ?? String(member.id)); }}>{member.name ?? `User #${member.id}`}<small>{member.email ?? member.username ?? "Email not provided"}</small></button>)}{!memberStatus && !members.some(member => memberMatches(member, memberQuery)) && <p>No matching school users.</p>}<small>Up to 12 matches. Refine your search to find another user.</small></div>}
        </div>
        <label className={styles.hideClasses}><input type="checkbox" checked={hideClasses} onChange={event => { clearSelection(); setHideClasses(event.target.checked); }} />Hide Classes</label>
        <Button variant="ghost" onClick={clearFilters}>Clear Filters</Button>
      </section>
      <p className={styles.hint}>Dates are inclusive in Central time. Studios reflect returned sessions. User matching uses member IDs, with unique exact email as a fallback; records without a reliable match remain visible when no user is selected.</p>
      {resultMessage && <p role="status">{resultMessage}</p>}
      {error && <p role="alert">{error}</p>}
      {snapshot.issues.map(issue => <p role="alert" key={issue.facilityId}>{issue.facilityName}: {issue.message}</p>)}
      {busy ? <p role="status">Loading sessions…</p> : dirty ? <p role="status">Apply dates to load this range.</p> : <>
        <div className={styles.toolbar}>
          <label><input type="checkbox" aria-label="Select all displayed sessions" checked={allSelected} disabled={!selectable.length} ref={node => { if (node)
            node.indeterminate = selected.size > 0 && !allSelected; }} onChange={() => setSelected(allSelected ? new Set() : new Set(selectable.map(session => session.key)))}/> Select All</label>
          <span>{visible.length} matching · {selected.size} selected{snapshot.issues.length ? " · Partial or unavailable data" : ""}</span><Button variant="ghost" disabled={!selected.size} onClick={clearSelection}>Clear selection</Button><Button variant="danger" disabled={!deleteEnabled || deleting || !selected.size} onClick={() => setPreview(visible.filter(session => selected.has(session.key)))}>Delete Selected ({selected.size})</Button>
        </div>
        {visible.length !== selectable.length && <p>Sessions with missing or duplicate identifiers can be inspected but cannot be selected for deletion.</p>}
        {!visible.length && <p className={styles.empty}>{snapshot.issues.length ? "Data unavailable or incomplete. Resolve the reported errors and refresh." : "No sessions match these filters."}</p>}
        {groupSessionDates(visible, from).map(([day, sessions]) => <section key={day} className={styles.day}><h2>{day}</h2>{[...new Set(sessions.map(session => session.facilityId))].sort().map(facilityId => <section key={facilityId}><h3>{sessions.find(session => session.facilityId === facilityId)?.facilityName}</h3>{groupStudios(sessions.filter(session => session.facilityId === facilityId)).map(room => <section key={room.key} className={styles.room}><h4>{room.name} <small>· {room.sessions.length}</small></h4>{room.sessions.map(session => <div className={styles.row} key={session.key}><label className={styles.selectTarget}><input type="checkbox" aria-label={`Select ${sessionLabel(session)} · ${session.contactName ?? "Contact not provided"} · ${room.name} · ${day} · ${sessionRange(session)}`} checked={selected.has(session.key)} disabled={!selectable.includes(session)} onChange={event => { const next = new Set(selected); if (event.target.checked)
            next.add(session.key);
        else
            next.delete(session.key); setSelected(next); }}/></label><button className={styles.session} onClick={() => setDetail(session)}><strong>{sessionLabel(session)} {session.isClass && <CategoryChip kind="class" />}</strong><span>{sessionRange(session)}</span><span>{session.contactName ?? "Contact not provided"} · {session.projectName ?? session.serviceName ?? "Project not provided"}</span></button></div>)}</section>)}</section>)}</section>)}
      </>}
    </div>
    <SessionDetailsModal session={detail} onClose={() => setDetail(null)}/>
    {preview && <BatchConfirmationModal title="Delete selected sessions?" description="Review the exact sessions selected for this action." affectedCount={preview.length} loading={deleting} onConfirm={confirmDeletion} actionLabel="Delete sessions" destructive acknowledgement="I understand these sessions would be permanently deleted." blockedReason={deleteEnabled ? undefined : "Session deletion disabled. No sessions will be changed."} onCancel={() => setPreview(null)}>
      <div className={styles.preview}>{preview.map(session => <div key={session.key}><strong>{sessionLabel(session)} {session.isClass && <CategoryChip kind="class" />}</strong><p>{session.start ? centralDate(new Date(session.start)) : "Date not provided"} · {sessionRange(session)}</p><p>{session.facilityName} · {session.roomName ?? "Studio not provided"} · {session.contactName ?? "Contact not provided"}</p><small>Session #{session.id}</small></div>)}</div>
    </BatchConfirmationModal>}
  </>;
}
