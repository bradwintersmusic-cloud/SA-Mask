// Local core models, not verified representations of upstream API responses.
export type Facility = { key: string; name: string; studioAssistantId: number };
export type StudioRoom = { id: number; name: string; facilityId: number };
export type StudioSession = {
  key: string;
  id: number | null;
  facilityId: number;
  facilityName: string;
  roomId: number | null;
  roomName: string | null;
  start: string | null;
  end: string | null;
  rawStart: string | null;
  rawEnd: string | null;
  timezone: string | null;
  contactName: string | null;
  contactEmail: string | null;
  projectId: number | null;
  projectName: string | null;
  projectCode: string | null;
  serviceName: string | null;
  bookingId: number | null;
  sessionType: string | null;
  bookingType: string | null;
  status: string | number | null;
  label: string | null;
  notes: string | null;
};
export type CalendarSnapshot = {
  date: string;
  start: string;
  end: string;
  sessions: StudioSession[];
  issues: { facilityId: number; facilityName: string; message: string }[];
};
export type InternalRequest = {
  id: number;
  facilityId: number;
  facilityName: string;
  roomId: number | null;
  roomName: string;
  requesterName: string;
  requesterEmail: string | null;
  start: string | null;
  end: string | null;
  projectId: number | null;
  projectLabel: string | null;
  sessionLabel: string | null;
  serviceLabel: string | null;
};
export type RequestReference = { id: number; facilityId: number };
export type RequestAction = "approve" | "deny";
export type RequestsSnapshot = {
  requests: InternalRequest[];
  issues: { facilityId: number; facilityName: string; message: string }[];
  loadedAt: string;
};
export type BatchRequestResult = {
  action: RequestAction;
  results: (RequestReference & { success: boolean; message: string })[];
  snapshot: RequestsSnapshot;
};
export type StudioUser = { id: number; name: string; email?: string };
export type StudioClass = { id: number; name: string; facilityId?: number };
