import "server-only";
import type { Facility, InternalRequest } from "./types";
type RecordValue = Record<string, unknown>;
function record(value: unknown): RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as RecordValue)
    : {};
}
function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function id(value: unknown): number | null {
  const number =
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return typeof number === "number" &&
    Number.isSafeInteger(number) &&
    number > 0
    ? number
    : null;
}
function label(value: unknown): string | null {
  const object = record(value);
  return (
    text(value) ?? text(object.name) ?? text(object.label) ?? text(object.title)
  );
}
function date(value: unknown): string | null {
  // Require an explicit offset: timezone-less values must not shift with the host.
  if (
    typeof value !== "string" ||
    !/(Z|[+-]\d{2}:?\d{2})$/i.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    return null;
  return new Date(value).toISOString();
}
export function normalizeInternalRequests(
  payload: unknown,
  facility: Facility,
): InternalRequest[] {
  // Only explicit list shapes are accepted; unknown envelopes are not an empty queue.
  const envelope = record(payload);
  if (envelope.success === false)
    throw new Error("Studio Assistant rejected the request list read.");
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(envelope.data)
      ? envelope.data
      : null;
  if (!rows)
    throw new Error("Unrecognized Studio Assistant request list response.");
  const seen = new Set<number>();
  return rows.map((value) => {
    const row = record(value);
    const sessionId = id(row.id);
    if (!sessionId || seen.has(sessionId))
      throw new Error(
        "Request list contains an invalid or duplicate session ID.",
      );
    seen.add(sessionId);
    const stamp = record(row.stamp);
    const user = record(row.user);
    const artist = record(row.artist);
    const room = record(row.room);
    return {
      id: sessionId,
      facilityId: facility.studioAssistantId,
      facilityName: facility.name,
      roomId: id(room.id) ?? id(row.room),
      roomName: label(stamp.room) ?? label(row.room) ?? "Room not provided",
      requesterName:
        text(stamp.contact_name) ??
        label(row.user) ??
        label(row.artist) ??
        label(row.created_by) ??
        "Requester not provided",
      requesterEmail:
        text(stamp.contact_email) ??
        text(user.email) ??
        text(artist.email) ??
        null,
      start: date(row.start),
      end: date(row.end),
      projectId: id(record(row.project).id) ?? id(row.project),
      projectLabel: label(row.project),
      sessionLabel: text(row.snippet),
      serviceLabel: label(stamp.service) ?? label(row.service),
    };
  });
}
