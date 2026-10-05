import { getRoomDisplayName } from "@/config/room-display";

export type ProjectType = "drag-and-drop" | "claimable" | "unknown";
export type AcademicClass = { id: number; code: string | null; name: string; snippet: string | null; created: string | null; lastBooking: string | null; createdBy: number | null };
export type AcademicProject = { id: number; name: string; code: string | null; classId: number | null; assigned: string | null; status: number | null; bookingType: string | null; type: ProjectType; shareIds: string[] };
export type AcademicShare = { id: string; facilityId: number; facilityName: string; projectId: number | null; name: string | null; code: string | null; snippet: string | null; created: string | null; expire: string | null; roomIds: number[]; customHours: boolean | null; autoBook: boolean | null; minSessionHours: number | null; maxSessionHours: number | null; availability: { day: string; available: boolean | null; start: string | null; end: string | null }[] };
export type AcademicSnapshot = { classes: AcademicClass[]; projects: AcademicProject[]; shares: AcademicShare[]; classesComplete: boolean; projectsComplete: boolean; sharesComplete: boolean; issues: string[] };
const record = (v: unknown): Record<string, unknown> | null => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null;
const text = (v: unknown) => typeof v === "string" && v.trim() ? v.trim() : null;
const number = (v: unknown): number | null => (typeof v === "number" || typeof v === "string" && v.trim() !== "") && Number.isFinite(Number(v)) ? Number(v) : null;
const id = (v: unknown) => { const n = number(v); return n !== null && Number.isSafeInteger(n) && n > 0 ? n : null; };
const flag = (v: unknown) => v === true || v === 1 || v === "1" ? true : v === false || v === 0 || v === "0" ? false : null;
const date = (v: unknown) => { const s = text(v); return s && Number.isFinite(Date.parse(s)) ? s : null; };
// start/end are record IDs, not evidence of a cursor protocol. Never invent pagination parameters.
export function academicCollection(raw: unknown) {
  const envelope = record(raw);
  if (envelope?.success === false) throw new Error("Academic request failed.");
  const data = envelope && "data" in envelope ? envelope.data : raw;
  const container = record(data);
  const source = container && "items" in container ? container.items : data;
  if (!source || typeof source !== "object") throw new Error("Invalid academic collection.");
  const entries = Array.isArray(source) ? source : Object.entries(source).filter(([key]) => !["total", "start", "end"].includes(key)).map(([, v]) => v);
  const rows = entries.map(row => { const r = record(row); if (!r || !(id(r.id) || text(r.id))) throw new Error("Invalid academic record."); return r; });
  const total = number(container?.total ?? envelope?.total);
  const unique = new Set(rows.map(row => String(row.id))).size === rows.length;
  return { rows, complete: total !== null && total === rows.length && unique, total };
}
export function normalizeAcademicClasses(raw: unknown) {
  const collection = academicCollection(raw);
  return { ...collection, items: collection.rows.map((r): AcademicClass => {
    const classId = id(r.id); if (!classId) throw new Error("Invalid class ID.");
    return { id: classId, name: text(r.name) ?? "Unnamed class", code: text(r.code), snippet: text(r.snippet), created: date(r.created), lastBooking: date(r.last_booking), createdBy: id(r.created_by) };
  }) };
}
export function normalizeAcademicProjects(raw: unknown) {
  const collection = academicCollection(raw);
  return { ...collection, items: collection.rows.map((r): AcademicProject => {
    const projectId = id(r.id); if (!projectId) throw new Error("Invalid project ID.");
    return { id: projectId, name: text(r.name) ?? "Unnamed project", code: text(r.code), classId: id(r.artist), assigned: date(r.assigned), status: number(r.status), bookingType: text(r.btype), type: "unknown", shareIds: [] };
  }) };
}
const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
export function normalizeAcademicShares(raw: unknown, facility: { studioAssistantId: number; name: string }) {
  const collection = academicCollection(raw);
  return { ...collection, items: collection.rows.map((r): AcademicShare => {
    if (number(r.org) !== facility.studioAssistantId) throw new Error("Share facility mismatch.");
    if (r.ctype === "p" && !id(r.content)) throw new Error("Invalid Share Project reference.");
    const details = record(r.details); const hours = record(r.hours); const days = record(r.days);
    return { id: String(r.id), facilityId: facility.studioAssistantId, facilityName: facility.name, projectId: r.ctype === "p" ? id(r.content) : null, name: text(details?.name), code: text(details?.code), snippet: text(r.snippet), created: date(r.created), expire: date(r.expire), roomIds: [...new Set((Array.isArray(r.room) ? r.room : []).map(id).filter((v): v is number => v !== null))], customHours: flag(r.use_custom_hours), autoBook: flag(r.auto_book), minSessionHours: number(r.min_sess), maxSessionHours: number(r.max_sess), availability: weekdays.map(day => ({ day: day[0].toUpperCase() + day.slice(1), available: flag(days?.[day]), start: text(record(hours?.[day])?.start), end: text(record(hours?.[day])?.end) })) };
  }) };
}
export function deriveProjectTypes(projects: AcademicProject[], shares: AcademicShare[], complete: boolean): AcademicProject[] {
  return projects.map(project => { const shareIds = shares.filter(share => share.projectId === project.id).map(share => share.id); return { ...project, shareIds, type: shareIds.length ? "drag-and-drop" : complete ? "claimable" : "unknown" }; });
}
export function createAcademicModel(data: AcademicSnapshot) {
  const classes = new Map(data.classes.map(c => [c.id, c]));
  const projects = new Map(data.projects.map(p => [p.id, p]));
  const shares = new Map(data.shares.map(s => [s.id, s]));
  const getSharesForProject = (id: number) => data.shares.filter(s => s.projectId === id);
  return { classes, projects, shares,
    getProjectsForClass: (id: number) => data.projects.filter(p => p.classId === id),
    getSharesForProject,
    getSharesForClass: (id: number) => data.shares.filter(s => s.projectId !== null && projects.get(s.projectId)?.classId === id),
    getClassForProject: (p: AcademicProject) => p.classId === null ? undefined : classes.get(p.classId),
    getProjectForShare: (s: AcademicShare) => s.projectId === null ? undefined : projects.get(s.projectId),
    getRoomsForShare: (id: string) => { const s = shares.get(id); return s?.roomIds.map(roomId => getRoomDisplayName({ facilityId: s.facilityId, roomId })) ?? []; },
    getProjectType: (id: number): ProjectType => projects.get(id)?.type ?? "unknown",
  };
}
export const projectTypeLabel = (type: ProjectType) => type === "drag-and-drop" ? "Drag and Drop" : type === "claimable" ? "Claimable" : "Unknown";
export const classLabel = (c: AcademicClass | undefined) => c ? [c.code, c.name].filter(Boolean).join(" · ") : "Class unavailable";
export const shareLabel = (s: AcademicShare) => s.name ?? s.snippet ?? s.code ?? "Unnamed Share";
export function friendlyClock(value: string | null) {
  const match = value?.match(/^(\d{1,2}):(\d{2})(?::00)?$/);
  if (!match || +match[1] > 23 || +match[2] > 59) return "Time unavailable";
  const hour = +match[1]; return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? "AM" : "PM"}`;
}
