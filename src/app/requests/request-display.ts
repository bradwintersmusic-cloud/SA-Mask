import type {
  InternalRequest,
  RequestReference,
} from "@/lib/studio-assistant/types";
export function requestKey(request: RequestReference) {
  return `${request.facilityId}:${request.id}`;
}
const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  month: "short",
  day: "numeric",
  year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});
export function requestDate(request: InternalRequest) {
  return request.start
    ? dateFormat.format(new Date(request.start))
    : "Date unavailable";
}
export function requestTime(request: InternalRequest) {
  if (!request.start) return "Time unavailable";
  const start = new Date(request.start);
  if (!request.end) return `${timeFormat.format(start)} · End unavailable`;
  const end = new Date(request.end);
  const endDay =
    dateFormat.format(start) === dateFormat.format(end)
      ? ""
      : `${dateFormat.format(end)} `;
  return `${timeFormat.format(start)} – ${endDay}${timeFormat.format(end)}`;
}
export function requestContext(request: InternalRequest) {
  return (
    [
      request.projectLabel ??
        (request.projectId ? `Project #${request.projectId}` : null),
      request.sessionLabel,
      request.serviceLabel,
    ]
      .filter(Boolean)
      .join(" · ") || "No context provided"
  );
}
