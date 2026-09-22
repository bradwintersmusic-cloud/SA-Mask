import "server-only";
import type { Facility, StudioSession } from "./types";
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function code(value: unknown): string | null {
  return (
    text(value) ??
    (typeof value === "number" && Number.isFinite(value) ? String(value) : null)
  );
}
function id(value: unknown): number | null {
  const result =
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return typeof result === "number" &&
    Number.isSafeInteger(result) &&
    result > 0
    ? result
    : null;
}
function name(value: unknown): string | null {
  const item = record(value);
  return text(value) ?? text(item.name) ?? text(item.label) ?? text(item.title);
}
function instant(value: unknown): string | null {
  return typeof value === "string" &&
    /(Z|[+-]\d{2}:?\d{2})$/i.test(value) &&
    Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString()
    : null;
}
export function normalizeCalendar(
  payload: unknown,
  facility: Facility,
): StudioSession[] {
  const envelope = record(payload);
  const items = record(envelope.data).items;
  if (envelope.success === false || !items || typeof items !== "object")
    throw new Error("Unrecognized Studio Assistant calendar envelope.");
  // Preserve every object entry, including admin/claimable sessions and null relationships.
  return Object.entries(items).map(([sourceKey, value]) => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("Calendar contains a non-object item.");
    const row = record(value);
    const stamp = record(row.stamp);
    const project = record(row.project);
    const room = record(row.room);
    const user = record(row.user);
    const projectName = name(stamp.project) ?? name(row.project);
    const serviceName = name(stamp.service) ?? name(row.service);
    return {
      key: `${facility.studioAssistantId}:${sourceKey}`,
      id: id(row.id),
      facilityId: facility.studioAssistantId,
      facilityName: facility.name,
      roomId: id(row.room) ?? id(room.id),
      roomName: name(stamp.room) ?? name(row.room),
      start: instant(row.start),
      end: instant(row.end),
      rawStart: code(row.start),
      rawEnd: code(row.end),
      timezone: text(row.timezone),
      userId: id(row.user) ?? id(user.id),
      contactName:
        text(stamp.contact_name) ?? text(stamp.contactName) ?? name(row.user),
      contactEmail:
        text(stamp.contact_email) ??
        text(stamp.contactEmail) ??
        text(user.email),
      projectId: id(row.project) ?? id(project.id),
      projectName,
      projectCode: code(stamp.project_code) ?? code(project.code),
      serviceName,
      // The administrator confirmed service 29 is the instructional Class service.
      isClass: (id(row.service) ?? id(record(row.service).id)) === 29,
      bookingId: id(row.booking) ?? id(record(row.booking).id),
      sessionType: code(row.type),
      bookingType: code(row.btype),
      status:
        typeof row.status === "number" && Number.isFinite(row.status)
          ? row.status
          : text(row.status),
      label:
        projectName ?? name(stamp.artist) ?? text(row.snippet) ?? serviceName,
      notes: text(stamp.sessionNotes),
    };
  });
}
