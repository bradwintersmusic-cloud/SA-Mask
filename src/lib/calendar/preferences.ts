import { facilities } from "@/config/facilities";
import type { CalendarQuery } from "./query";

export const schedulePreferencesKey = "sa-mask.schedule.preferences";
export type SchedulePreferences = {
  view: "calendar" | "list" | "timeline";
  facility: string;
  timelineRange: "day" | "3-day";
};
export const defaultSchedulePreferences: SchedulePreferences = {
  view: "timeline", facility: "rem", timelineRange: "day",
};
export function schedulePreferenceValues(value: unknown): Partial<SchedulePreferences> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const result: Partial<SchedulePreferences> = {};
  if (input.view === "schedule" || input.view === "calendar") result.view = "calendar";
  else if (input.view === "list" || input.view === "timeline") result.view = input.view;
  const facility = facilities.find(item => item.key === input.facility || String(item.studioAssistantId) === input.facility);
  if (facility) result.facility = facility.key;
  else if (input.facility === "all") result.facility = "all";
  if (input.timelineRange === "day" || input.timelineRange === "3-day") result.timelineRange = input.timelineRange;
  return result;
}
export function resolveSchedulePreferences(raw: string | null, explicit: Partial<SchedulePreferences> = {}): SchedulePreferences {
  let saved: unknown;
  try { saved = raw ? JSON.parse(raw) : null; } catch { saved = null; }
  return { ...defaultSchedulePreferences, ...schedulePreferenceValues(saved), ...schedulePreferenceValues(explicit) };
}
export function querySchedulePreferences(query: CalendarQuery, studio: string): Partial<SchedulePreferences> {
  const preferences = schedulePreferenceValues(query);
  // Existing Overview studio links must continue opening the focused studio schedule.
  if (studio !== "all") {
    if (!preferences.view) preferences.view = "calendar";
    if (!preferences.facility) preferences.facility = facilities.find(item => String(item.studioAssistantId) === studio.split(":")[0])?.key;
  }
  return preferences;
}
export function readSchedulePreferences(explicit: Partial<SchedulePreferences>) {
  let raw: string | null = null;
  try { raw = window.localStorage.getItem(schedulePreferencesKey); } catch { /* Storage may be blocked. */ }
  return resolveSchedulePreferences(raw, explicit);
}
export function saveSchedulePreferences(preferences: SchedulePreferences) {
  try {
    window.localStorage.setItem(schedulePreferencesKey, JSON.stringify({
      view: preferences.view === "calendar" ? "schedule" : preferences.view,
      facility: preferences.facility,
      timelineRange: preferences.timelineRange,
    }));
  } catch { /* View changes still work for this visit. */ }
}
