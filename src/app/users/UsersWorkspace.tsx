"use client";
import { useEffect, useRef, useState } from "react";
import { ClassActions } from "./ClassActions";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import type { Directory, StudioUser, ClassRoster, UserEnrollment } from "@/lib/studio-assistant/enrollment-types";
import styles from "./users.module.css";
const userLabel = (user: StudioUser) => user.name ?? user.username ?? user.email ?? `Member #${user.id}`;
function matches(values: (string | null)[], query: string) { return values.some(value => value?.toLowerCase().includes(query.trim().toLowerCase())); }
function userMatches(user: StudioUser, query: string) { return matches([user.name, user.email, user.username, user.code], query); }
async function read<T>(query: string, signal?: AbortSignal): Promise<T> {
    const response = await fetch(`/api/users${query}`, { cache: "no-store", signal });
    if (!response.ok)
        throw new Error("Enrollment data could not be loaded. Refresh to retry.");
    return response.json();
}
export function UsersWorkspace({ initial }: {
    initial: Directory;
}) {
    const [directory, setDirectory] = useState(initial);
    const [mode, setMode] = useState<"users" | "classes">("users");
    const [query, setQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState<number | null>(null);
    const [selectedClass, setSelectedClass] = useState<number | null>(null);
    const [enrollment, setEnrollment] = useState<UserEnrollment | null>(null);
    const [roster, setRoster] = useState<ClassRoster | null>(null);
    const [rosterQuery, setRosterQuery] = useState("");
    const [addQuery, setAddQuery] = useState("");
    const [candidate, setCandidate] = useState<StudioUser | null>(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [revision, setRevision] = useState(0);
    const [error, setError] = useState("");
    const refreshController = useRef<AbortController | null>(null);
    useEffect(() => () => refreshController.current?.abort(), []);
    function prepareSelection() {
        setEnrollment(null);
        setRoster(null);
        setError("");
        setCandidate(null);
        setAddQuery("");
        setRosterQuery("");
        setLoading(true);
    }
    useEffect(() => {
        const controller = new AbortController();
        const id = mode === "users" ? selectedUser : selectedClass;
        if (!id || refreshing)
            return () => controller.abort();
        read<UserEnrollment | ClassRoster>(`?${mode === "users" ? "userId" : "classId"}=${id}`, controller.signal)
            .then(data => { if (!controller.signal.aborted) {
            if ("userId" in data)
                setEnrollment(data);
            else
                setRoster(data);
        } })
            .catch(() => { if (!controller.signal.aborted)
            setError("Enrollment data could not be loaded. Refresh to retry."); })
            .finally(() => { if (!controller.signal.aborted)
            setLoading(false); });
        return () => controller.abort();
    }, [mode, selectedUser, selectedClass, revision, refreshing]);
    async function refresh() {
        refreshController.current?.abort();
        const controller = new AbortController();
        refreshController.current = controller;
        prepareSelection();
        setRefreshing(true);
        try {
            const data = await read<Directory>("?refresh=1", controller.signal);
            if (!controller.signal.aborted) {
                setDirectory(data);
                if (!data.users.some(u => u.id === selectedUser))
                    setSelectedUser(null);
                if (!data.classes.some(c => c.id === selectedClass))
                    setSelectedClass(null);
                setRevision(value => value + 1);
            }
        }
        catch {
            if (!controller.signal.aborted)
                setError("Directory refresh failed. Previously loaded directory is still shown.");
        }
        finally {
            if (!controller.signal.aborted) {
                setRefreshing(false);
                setLoading(false);
            }
        }
    }
    const user = directory.users.find(u => u.id === selectedUser);
    const cls = directory.classes.find(c => c.id === selectedClass);
    const userResults = query.trim() ? directory.users.filter(u => userMatches(u, query)) : [];
    const classResults = directory.classes.filter(c => matches([c.name, c.code, c.snippet], query));
    const visibleRoster = roster?.users.filter(u => userMatches(u, rosterQuery)) ?? [];
    const addResults = addQuery.trim() && roster ? directory.users.filter(u => !roster.users.some(r => r.id === u.id) && userMatches(u, addQuery)) : [];
    return <>
    <PageHeader title="User Management" description="Belmont Students · People and course enrollment"/>
    <div className={styles.toolbar}><div role="group" aria-label="User management mode"><Button variant={mode === "users" ? "primary" : "secondary"} aria-pressed={mode === "users"} onClick={() => { if (mode !== "users") {
        prepareSelection();
        setMode("users");
        setQuery("");
    } }}>Users</Button><Button variant={mode === "classes" ? "primary" : "secondary"} aria-pressed={mode === "classes"} onClick={() => { if (mode !== "classes") {
        prepareSelection();
        setMode("classes");
        setQuery("");
    } }}>Classes</Button></div><Button variant="secondary" onClick={refresh} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh"}</Button></div>
    {directory.issues.map(issue => <p role="alert" key={issue}>{issue}</p>)}
    {error && <p role="alert">{error}</p>}
    <div className={styles.layout}>
      <section className={styles.panel} aria-label={mode === "users" ? "Find a user" : "Find a class"}>
        <label className={styles.field}>{mode === "users" ? "Search users" : "Search classes"}<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={mode === "users" ? "Name, email, username, or Belmont ID" : "Class name, code, or description"}/></label>
        {mode === "users" ? <>
          {!query.trim() ? <p>Search by name, email, username, or Belmont ID.</p> : <><p className={styles.muted}>{userResults.length} matches{userResults.length > 50 ? " · Showing first 50; refine your search" : ""}</p>{userResults.slice(0, 50).map(u => <button className={styles.selection} aria-pressed={u.id === selectedUser} key={u.id} onClick={() => { if (selectedUser !== u.id) {
            prepareSelection();
            setSelectedUser(u.id);
        } }}><strong>{userLabel(u)}</strong><span>{u.email ?? u.code}</span></button>)}{!userResults.length && <p>No users match your search.</p>}</>}
        </> : <><p className={styles.muted}>{classResults.length} classes</p>{classResults.map(c => <button className={styles.selection} aria-pressed={c.id === selectedClass} key={c.id} onClick={() => { if (selectedClass !== c.id) {
            prepareSelection();
            setSelectedClass(c.id);
        } }}><strong>{c.name ?? c.code ?? `Class #${c.id}`}</strong>{c.code && <span>{c.code}</span>}</button>)}{!classResults.length && directory.classesLoaded && <p>No classes match your search.</p>}</>}
      </section>
      <section className={styles.panel} aria-label="Enrollment details" aria-busy={loading || refreshing}>
        {mode === "users" && user ? <>
          <h2>{userLabel(user)}</h2><div className={styles.identity}>{user.email && <p>{user.email}</p>}{user.username && <p>Username: {user.username}</p>}{user.code && <p>Belmont ID: {user.code}</p>}<p className={styles.muted}>Member #{user.id}</p></div>
          <h3>Course enrollment</h3><p className={styles.muted}>Read only · Enrollment changes disabled</p>
          {loading && <p role="status">Checking class rosters… First load may take a moment.</p>}
          {enrollment && <>{enrollment.failedClassIds.length > 0 && <p role="alert">{enrollment.failedClassIds.length} class rosters unavailable. Unknown enrollment is not treated as unenrolled.</p>}{!enrollment.failedClassIds.length && !enrollment.classes.some(c => c.state === "enrolled") && <p>This user is not enrolled in any classes.</p>}{enrollment.classes.map(e => { const course = directory.classes.find(c => c.id === e.classId); return <div className={styles.row} key={e.classId}><div><strong>{course?.name ?? course?.code ?? `Class #${e.classId}`}</strong><span>{e.state === "enrolled" ? "Enrolled" : e.state === "unknown" ? "Enrollment unavailable" : "Not enrolled"}</span></div><Button variant="secondary" disabled title="Enrollment changes disabled">{e.state === "enrolled" ? "Remove" : "Add"}</Button></div>; })}</>}
        </> : mode === "classes" && cls ? <>
          <h2>{cls.name ?? cls.code ?? `Class #${cls.id}`}</h2>{cls.code && <p>{cls.code}</p>}{cls.snippet && <p className={styles.muted}>{cls.snippet}</p>}
          <p className={styles.muted}>Read only · Enrollment changes disabled</p>
          {loading && <p role="status">Loading class roster…</p>}
          {roster && <><ClassActions key={cls.id} course={cls} roster={roster} /><h3>{roster.users.length} enrolled students</h3><label className={styles.field}>Search this roster<input type="search" value={rosterQuery} onChange={e => setRosterQuery(e.target.value)}/></label>{rosterQuery && <p>{visibleRoster.length} matching students</p>}{visibleRoster.map(u => <div className={styles.row} key={u.id}><div><strong>{userLabel(u)}</strong>{u.email && <span>{u.email}</span>}{u.code && <span>{u.code}</span>}</div><Button variant="secondary" disabled title="Removal endpoint unconfirmed; changes disabled">Remove</Button></div>)}{!roster.users.length ? <p>No students are currently enrolled in this class.</p> : !visibleRoster.length && <p>No students match your search.</p>}
          <h3>Add an existing school member</h3><label className={styles.field}>Search users to add<input type="search" value={addQuery} onChange={e => { setAddQuery(e.target.value); setCandidate(null); }}/></label>{addResults.slice(0, 10).map(u => <button className={styles.selection} key={u.id} onClick={() => setCandidate(u)} aria-pressed={candidate?.id === u.id}><strong>{userLabel(u)}</strong><span>{u.email}</span></button>)}{addQuery && !addResults.length && <p>No eligible users match your search.</p>}{addResults.length > 10 && <p>Showing first 10 matches. Refine your search.</p>}{candidate && <p>Prepared: {userLabel(candidate)} → {cls.name ?? cls.code}</p>}<Button disabled title="Production enrollment changes are disabled">Add Student</Button><p className={styles.muted}>Nothing is submitted. Removal also awaits a confirmed API route.</p></>}
        </> : <p>Select {mode === "users" ? "a user to inspect their enrollment" : "a class to view its roster"}.</p>}
      </section>
    </div>
  </>;
}
