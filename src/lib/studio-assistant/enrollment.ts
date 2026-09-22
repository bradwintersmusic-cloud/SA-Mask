import "server-only";
import { school } from "@/config/school";
import { studioAssistantFetch, studioAssistantMutation } from "./client";
import { assertEnrollmentWritesEnabled } from "./write-safety";
import type { StudioUser, StudioClass, Directory, ClassRoster, UserEnrollment, ClassMember } from "./enrollment-types";
const TTL = 5 * 60000;
type Entry = {
    expires: number;
    promise: Promise<unknown>;
};
const cache = new Map<string, Entry>();
function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const existing = cache.get(key);
    if (existing && existing.expires > Date.now())
        return existing.promise as Promise<T>;
    const entry: Entry = { expires: Infinity, promise: Promise.resolve() };
    entry.promise = load().then(value => { entry.expires = Date.now() + TTL; return value; }).catch(error => { if (cache.get(key) === entry)
        cache.delete(key); throw error; });
    cache.set(key, entry);
    return entry.promise as Promise<T>;
}
export function invalidateEnrollmentCache() { cache.clear(); }
function items(raw: unknown): Record<string, unknown>[] {
    if (!raw || typeof raw !== "object")
        throw new Error("Invalid directory response.");
    if (!Array.isArray(raw) && "success" in raw && raw.success === false)
        throw new Error("Directory request failed.");
    let data: unknown = !Array.isArray(raw) && "data" in raw ? raw.data : raw;
    if (data && typeof data === "object" && "items" in data)
        data = data.items;
    if (!data || typeof data !== "object")
        throw new Error("Invalid directory collection.");
    const rows = Array.isArray(data) ? data : Object.values(data);
    if (rows.some(row => !row || typeof row !== "object" || !Number.isSafeInteger(row.id) || row.id <= 0))
        throw new Error("Invalid directory record ID.");
    return rows;
}
const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const compare = (a: string | null, b: string | null) => (a ?? "").localeCompare(b ?? "", undefined, { numeric: true, sensitivity: "base" });
export function normalizeUsers(raw: unknown): StudioUser[] {
    return items(raw).map(row => ({ id: row.id as number, name: text(row.name), email: text(row.email), username: text(row.username), code: text(row.code) })).sort((a, b) => compare(a.name, b.name) || compare(a.email, b.email));
}
export function normalizeClassMembers(raw: unknown): ClassMember[] {
    const permissions = new Map(items(raw).map(row => [row.id, row.prm]));
    const rank = { admin: 0, teacher: 1, student: 2, unknown: 3 };
    // Confirmed by the administrator: prm 2=Admin, 1=Teacher, 0=Student.
    return normalizeUsers(raw).map((user): ClassMember => ({ ...user, role: permissions.get(user.id) === 2 ? "admin" : permissions.get(user.id) === 1 ? "teacher" : permissions.get(user.id) === 0 ? "student" : "unknown" }))
      .sort((a, b) => rank[a.role] - rank[b.role] || compare(a.name ?? a.username ?? a.email, b.name ?? b.username ?? b.email) || a.id - b.id);
}
export function normalizeClasses(raw: unknown): StudioClass[] {
    return items(raw).map(row => ({ id: row.id as number, name: text(row.name), code: text(row.code), snippet: text(row.snippet) })).sort((a, b) => compare(a.code, b.code) || compare(a.name, b.name));
}
export const getSchoolUsers = () => cached("users", async () => normalizeUsers(await studioAssistantFetch(`/api/school/${school.id}/member`)));
export const getSchoolClasses = () => cached("classes", async () => normalizeClasses(await studioAssistantFetch(`/api/school/${school.id}/class`)));
export async function getDirectory(): Promise<Directory> {
    const [users, classes] = await Promise.allSettled([getSchoolUsers(), getSchoolClasses()]);
    return { users: users.status === "fulfilled" ? users.value : [], classes: classes.status === "fulfilled" ? classes.value : [], usersLoaded: users.status === "fulfilled", classesLoaded: classes.status === "fulfilled", issues: [...(users.status === "rejected" ? ["School members could not be loaded."] : []), ...(classes.status === "rejected" ? ["Classes could not be loaded."] : [])] };
}
export async function getClassRoster(classId: number): Promise<ClassRoster> {
    if (!(await getSchoolClasses()).some(cls => cls.id === classId))
        throw new Error("Unknown school class.");
    return cached(`roster:${classId}`, async () => ({ classId, users: normalizeClassMembers(await studioAssistantFetch(`/api/class/${classId}/member`)) }));
}
async function enrollmentIndex() {
    return cached("index", async () => {
        const classes = await getSchoolClasses();
        const membership = new Map<number, Set<number>>();
        const failedClassIds: number[] = [];
        let next = 0;
        await Promise.all(Array.from({ length: Math.min(3, classes.length) }, async () => {
            while (next < classes.length) {
                const cls = classes[next++];
                try {
                    for (const user of (await getClassRoster(cls.id)).users) {
                        if (!membership.has(user.id))
                            membership.set(user.id, new Set());
                        membership.get(user.id)!.add(cls.id);
                    }
                }
                catch {
                    failedClassIds.push(cls.id);
                }
            }
        }));
        return { classes, membership, failedClassIds };
    });
}
export async function getUserEnrollment(userId: number): Promise<UserEnrollment> {
    if (!(await getSchoolUsers()).some(user => user.id === userId))
        throw new Error("Unknown school member.");
    const index = await enrollmentIndex();
    return { userId, failedClassIds: index.failedClassIds, classes: index.classes.map(cls => ({ classId: cls.id, state: index.failedClassIds.includes(cls.id) ? "unknown" : index.membership.get(userId)?.has(cls.id) ? "enrolled" : "not-enrolled" })) };
}
function positiveId(value: number) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error("Invalid enrollment identifier.");
}
function confirmed(response: unknown, type?: string) {
    if (!response || typeof response !== "object" || !("success" in response) || response.success !== true || (type && (!("type" in response) || response.type !== type)))
        throw new Error("Studio Assistant did not confirm the enrollment update. Refresh before retrying.");
}
export async function addClassMember(classId: number, user: StudioUser): Promise<void> {
    assertEnrollmentWritesEnabled();
    positiveId(classId); positiveId(user.id);
    if (!(await getSchoolClasses()).some(cls => cls.id === classId)) throw new Error("Unknown school class.");
    const member = (await getSchoolUsers()).find(member => member.id === user.id);
    if (!member?.email) throw new Error("A school member email is required.");
    try {
        confirmed(await studioAssistantMutation(`/api/class/${classId}/member`, { method: "POST", body: { email: member.email, uname: member.name ?? member.username ?? "" } }));
    } finally { invalidateEnrollmentCache(); }
}
async function deleteMember(classId: number, userId: number): Promise<void> {
    assertEnrollmentWritesEnabled();
    positiveId(classId); positiveId(userId);
    try { confirmed(await studioAssistantMutation(`/api/class/${classId}/member/${userId}`, { method: "DELETE" }), "DELETED"); }
    finally { invalidateEnrollmentCache(); }
}
export async function removeClassMember(classId: number, userId: number): Promise<void> {
    assertEnrollmentWritesEnabled();
    positiveId(classId); positiveId(userId);
    invalidateEnrollmentCache();
    const roster = await getClassRoster(classId);
    if (!roster.users.some(user => user.id === userId)) throw new Error("Member is not in the current class roster.");
    await deleteMember(classId, userId);
}
export type RemovalBatchResult = {
    removedUserIds: number[];
    failures: { userId: number; message: string }[];
};
export async function removeAllClassMembers(classId: number, selectedIds: number[]): Promise<RemovalBatchResult> {
    assertEnrollmentWritesEnabled();
    positiveId(classId);
    if (!Array.isArray(selectedIds) || !selectedIds.length) throw new Error("Explicit student selection is required.");
    selectedIds.forEach(positiveId);
    const ids = [...new Set(selectedIds)];
    invalidateEnrollmentCache();
    const roster = await getClassRoster(classId);
    const students = new Set(roster.users.filter(member => member.role === "student").map(member => member.id));
    const result: RemovalBatchResult = { removedUserIds: [], failures: [] };
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(3, ids.length) }, async () => {
        while (next < ids.length) {
            const userId = ids[next++];
            if (!students.has(userId)) { result.failures.push({ userId, message: "Not a confirmed student in the current roster; skipped." }); continue; }
            try { await deleteMember(classId, userId); result.removedUserIds.push(userId); }
            catch { result.failures.push({ userId, message: "Removal could not be confirmed. Refresh before retrying." }); }
        }
    }));
    return result;
}
