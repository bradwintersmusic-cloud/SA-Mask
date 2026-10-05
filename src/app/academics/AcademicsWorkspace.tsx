"use client";
import { useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { sessionDateTime } from "@/lib/calendar/time";
import { classLabel, createAcademicModel, friendlyClock, projectTypeLabel, shareLabel, type AcademicProject, type AcademicShare, type AcademicSnapshot } from "@/lib/studio-assistant/academic-model";
import segments from "@/components/ui/segmented-control.module.css";
import styles from "./academics.module.css";
const tabs = ["Classes", "Projects", "Shares"] as const;
type Tab = typeof tabs[number];
type Detail = { kind: "project"; id: number } | { kind: "share"; id: string } | null;
const compare = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
const matches = (query: string, values: (string | null | undefined)[]) => values.some(v => v?.toLowerCase().includes(query.trim().toLowerCase()));
const dateLabel = (value: string | null) => value ? sessionDateTime(value) ?? "Not provided" : "Not provided";
const boolLabel = (value: boolean | null) => value === null ? "Not provided" : value ? "Yes" : "No";
function TypeChip({ project }: { project: AcademicProject }) { return <StatusBadge tone={project.type === "drag-and-drop" ? "accent" : project.type === "claimable" ? "success" : "neutral"}>{projectTypeLabel(project.type)}</StatusBadge>; }
function Facts({ rows }: { rows: [string, ReactNode][] }) { return <dl className={styles.facts}>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>; }
export function AcademicsWorkspace({ data }: { data: AcademicSnapshot }) {
  const router = useRouter(); const [refreshing, startTransition] = useTransition();
  const model = useMemo(() => createAcademicModel(data), [data]);
  const [tab, setTab] = useState<Tab>("Classes"); const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [queries, setQueries] = useState<Record<Tab, string>>({ Classes: "", Projects: "", Shares: "" });
  const [projectSort, setProjectSort] = useState("class"); const [shareSort, setShareSort] = useState("class");
  const [detail, setDetail] = useState<Detail>(null); const heading = useRef<HTMLHeadingElement>(null);
  const cls = selectedClass === null ? undefined : model.classes.get(selectedClass);
  const project = detail?.kind === "project" ? model.projects.get(detail.id) : undefined;
  const share = detail?.kind === "share" ? model.shares.get(detail.id) : undefined;
  const modalProject = project ?? (share ? model.getProjectForShare(share) : undefined);
  const modalClass = modalProject ? model.getClassForProject(modalProject) : undefined;
  const projectClass = (p: AcademicProject) => classLabel(model.getClassForProject(p));
  const shareClass = (s: AcademicShare) => { const p = model.getProjectForShare(s); return p ? projectClass(p) : "Class unavailable"; };
  const rooms = (s: AcademicShare) => model.getRoomsForShare(s.id).join(" · ") || "Rooms not provided";
  const query = queries[tab];
  const classes = data.classes.filter(c => matches(query, [c.code, c.name, c.snippet])).sort((a, b) => compare(classLabel(a), classLabel(b)));
  const projects = data.projects.filter(p => { const c = model.getClassForProject(p); return matches(query, [p.name, p.code, c?.name, c?.code]); }).sort((a, b) => (projectSort === "class" ? compare(projectClass(a), projectClass(b)) : projectSort === "class-desc" ? compare(projectClass(b), projectClass(a)) : projectSort === "type" ? compare(projectTypeLabel(a.type), projectTypeLabel(b.type)) : 0) || compare(a.name, b.name) || a.id - b.id);
  const shares = data.shares.filter(s => { const p = model.getProjectForShare(s); const c = p ? model.getClassForProject(p) : undefined; return matches(query, [s.name, s.code, s.snippet, p?.name, p?.code, c?.name, c?.code, rooms(s), s.facilityName]); }).sort((a, b) => (shareSort === "class" ? compare(shareClass(a), shareClass(b)) : shareSort === "studio" ? compare(rooms(a), rooms(b)) : shareSort === "expiration" ? compare(a.expire ?? "9999", b.expire ?? "9999") : 0) || compare(shareLabel(a), shareLabel(b)) || compare(a.id, b.id));
  function openClass(id: number | null) { setDetail(null); setSelectedClass(id); setTab("Classes"); requestAnimationFrame(() => heading.current?.focus()); }
  const projectRows = (items: AcademicProject[]) => <ul className={styles.list}>{items.map(p => <li key={p.id}><button className={styles.row} onClick={() => setDetail({ kind: "project", id: p.id })}><span className={styles.rowMain}><strong>{p.name}</strong><span className={styles.meta}>{p.code ?? "No code"} <span aria-hidden="true">·</span> {projectClass(p)}</span></span><span className={styles.rowEnd}><TypeChip project={p}/><span className={styles.meta}>{p.shareIds.length} {data.sharesComplete ? "Shares" : "loaded Shares"}</span></span><span aria-hidden="true">↗</span></button></li>)}</ul>;
  const shareRows = (items: AcademicShare[]) => <ul className={styles.list}>{items.map(s => <li key={s.id}><button className={styles.row} onClick={() => setDetail({ kind: "share", id: s.id })}><span className={styles.rowMain}><strong>{shareLabel(s)}</strong><span className={styles.meta}>{s.code ? `${s.code} · ` : ""}{model.getProjectForShare(s)?.name ?? "Project unavailable"} {model.getProjectForShare(s) && <TypeChip project={model.getProjectForShare(s)!}/>} <span aria-hidden="true">→</span> {shareClass(s)}</span><span className={styles.meta}>{s.facilityName} <span aria-hidden="true">→</span> {rooms(s)}</span></span><span aria-hidden="true">↗</span></button></li>)}</ul>;
  const empty = (complete: boolean, label: string) => <p className={styles.empty}>{complete ? `No ${label} to display.` : `${label[0].toUpperCase() + label.slice(1)} are unavailable or incomplete. Showing loaded records only.`}</p>;
  const count = tab === "Classes" ? classes.length : tab === "Projects" ? projects.length : shares.length;
  const complete = tab === "Classes" ? data.classesComplete : tab === "Projects" ? data.projectsComplete : data.sharesComplete;
  return <>
    <PageHeader title="Academics" description="Classes, Projects, and Shares that govern academic studio access." action={<Button variant="secondary" disabled={refreshing} onClick={() => startTransition(() => router.refresh())}>{refreshing ? "Refreshing…" : "Refresh"}</Button>}/>
    <div className={styles.workspace} aria-busy={refreshing}>
      <div className={styles.intro}><span>Class <span aria-hidden="true">→</span> Project <span aria-hidden="true">→</span> Share <span aria-hidden="true">→</span> Studio</span><StatusBadge>Read only</StatusBadge></div>
      {data.issues.length > 0 && <aside className={styles.notice} aria-label="Data availability"><strong>Some relationships are unavailable</strong><ul>{data.issues.map(issue => <li key={issue}>{issue}</li>)}</ul>{!data.sharesComplete && <p>Projects without a loaded Share show Unknown until all Share data is verified.</p>}</aside>}
      <div className={`${segments.switcher} ${styles.tabs}`} role="tablist" aria-label="Academic views">{tabs.map((name, index) => <button key={name} id={`tab-${name}`} role="tab" aria-selected={tab === name} aria-controls={`panel-${name}`} tabIndex={tab === name ? 0 : -1} onClick={() => setTab(name)} onKeyDown={event => { const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null; if (next !== null) { event.preventDefault(); setTab(tabs[next]); document.getElementById(`tab-${tabs[next]}`)?.focus(); } }}>{name}</button>)}</div>
      <section id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className={styles.panel}>
        {tab === "Classes" && cls ? <>
          <Button variant="ghost" onClick={() => openClass(null)}>← Back to Classes</Button>
          <div className={styles.classHeader}><p className="eyebrow">Class · {cls.code ?? "No code"}</p><h2 ref={heading} tabIndex={-1}>{cls.name}</h2>{cls.snippet && <p>{cls.snippet}</p>}<div className={styles.meta}>{cls.created && `Created ${dateLabel(cls.created)}`}{cls.lastBooking && ` · Last booking ${dateLabel(cls.lastBooking)}`}</div></div>
          <div className={styles.relationship}><section><h3>Projects <span>{model.getProjectsForClass(cls.id).length}{!data.projectsComplete && "+"}</span></h3>{model.getProjectsForClass(cls.id).length ? projectRows(model.getProjectsForClass(cls.id)) : empty(data.projectsComplete, "associated Projects")}</section><section><h3>Shares <span>{model.getSharesForClass(cls.id).length}{(!data.projectsComplete || !data.sharesComplete) && "+"}</span></h3><p className={styles.meta}>Studio access through this Class’s Projects.</p>{model.getSharesForClass(cls.id).length ? shareRows(model.getSharesForClass(cls.id)) : empty(data.projectsComplete && data.sharesComplete, "associated Shares")}</section></div>
        </> : <>
          <div className={styles.toolbar}><Input label={`Search ${tab}`} type="search" placeholder={tab === "Classes" ? "Code, name, or description" : tab === "Projects" ? "Project or Class" : "Share, Project, Class, or studio"} value={query} onChange={e => setQueries({ ...queries, [tab]: e.target.value })}/>{tab === "Projects" && <Select label="Sort Projects" value={projectSort} onChange={e => setProjectSort(e.target.value)}><option value="class">Class A–Z</option><option value="class-desc">Class Z–A</option><option value="type">Type</option><option value="name">Project Name A–Z</option></Select>}{tab === "Shares" && <Select label="Sort Shares" value={shareSort} onChange={e => setShareSort(e.target.value)}><option value="class">Class A–Z</option><option value="studio">Studio A–Z</option><option value="name">Share Name A–Z</option><option value="expiration">Expiration</option></Select>}</div>
          <h2 ref={heading} tabIndex={-1} className={styles.listHeading}>{tab} <span>{count}{!complete && " loaded"}</span></h2>
          {tab === "Classes" && <ul className={styles.list}>{classes.map(c => <li key={c.id}><button className={styles.row} onClick={() => openClass(c.id)}><span className={styles.rowMain}><span className={styles.code}>{c.code ?? "Class"}</span><strong>{c.name}</strong>{c.snippet && <span className={styles.meta}>{c.snippet}</span>}</span><span className={styles.rowEnd}><span className={styles.meta}>{model.getProjectsForClass(c.id).length} {data.projectsComplete ? "Projects" : "loaded Projects"}</span><span className={styles.meta}>{model.getSharesForClass(c.id).length} {data.projectsComplete && data.sharesComplete ? "Shares" : "linked Shares loaded"}</span></span><span aria-hidden="true">→</span></button></li>)}</ul>}
          {tab === "Projects" && projectRows(projects)}{tab === "Shares" && shareRows(shares)}{count === 0 && empty(complete, query ? `matching ${tab}` : tab)}
        </>}
      </section>
    </div>
    <Modal key={detail ? `${detail.kind}-${detail.id}` : "closed"} open={!!detail} onClose={() => setDetail(null)} title={project?.name ?? (share ? shareLabel(share) : "Details")}>
      {project && <>
        <div className={styles.intro}><TypeChip project={project}/><span className={styles.code}>{project.code}</span></div>
        <Facts rows={[["Class", projectClass(project)], ["Assigned", dateLabel(project.assigned)], ["Status", project.status === null ? "Not provided" : `Status ${project.status}`], ["Linked Shares", `${project.shareIds.length}${data.sharesComplete ? "" : " loaded (incomplete)"}`]]}/>
        <h3>Studio access</h3>{project.shareIds.length ? <ul className={styles.linked}>{model.getSharesForProject(project.id).map(s => <li key={s.id}><div><strong>{shareLabel(s)}</strong><p className={styles.meta}>{s.facilityName} → {rooms(s)}</p></div><Button variant="secondary" onClick={() => setDetail({ kind: "share", id: s.id })}>View Share{project.shareIds.length > 1 ? `: ${shareLabel(s)}` : ""}</Button></li>)}</ul> : <p className={styles.meta}>{data.sharesComplete ? "No associated Shares. This Project is Claimable even when no claimable calendar blocks exist." : "Share data is incomplete. Studio access cannot yet be determined."}</p>}
      </>}
      {share && <>
        {share.snippet && share.snippet !== share.name && <p>{share.snippet}</p>}
        <Facts rows={[["Code", share.code ?? "Not provided"], ["Project", modalProject ? <span>{modalProject.name} <TypeChip project={modalProject}/></span> : "Project unavailable"], ["Class", shareClass(share)], ["Facility", share.facilityName], ["Studios", rooms(share)], ["Created", dateLabel(share.created)], ["Expires", dateLabel(share.expire)], ["Auto book", boolLabel(share.autoBook)], ["Custom hours", boolLabel(share.customHours)], ["Minimum session", share.minSessionHours === null ? "Not provided" : `${share.minSessionHours} ${share.minSessionHours === 1 ? "hour" : "hours"}`], ["Maximum session", share.maxSessionHours === null ? "Not provided" : `${share.maxSessionHours} ${share.maxSessionHours === 1 ? "hour" : "hours"}`]]}/>
        <h3>Availability</h3>{share.customHours !== true && <p className={styles.meta}>{share.customHours === false ? "Facility hours apply. Returned hours below are reference values, not a custom override." : "Custom-hours setting is unavailable."}</p>}
        <dl className={styles.hours}>{share.availability.map(day => <div key={day.day}><dt>{day.day}</dt><dd>{day.available === false ? "Unavailable" : day.available === null ? "Availability not provided" : day.start && day.end ? `${friendlyClock(day.start)} – ${friendlyClock(day.end)}` : "Available · hours not provided"}</dd></div>)}</dl>
      </>}
      <div className={styles.actions}>{modalClass && <Button variant="secondary" onClick={() => openClass(modalClass.id)}>Return to Class</Button>}{share && modalProject && <Button variant="secondary" onClick={() => setDetail({ kind: "project", id: modalProject.id })}>View Project</Button>}<Button variant="ghost" onClick={() => setDetail(null)}>Close</Button></div>
    </Modal>
  </>;
}
