import { test } from "node:test";
import assert from "node:assert/strict";
import { createAdapter } from "./adapter-harness.mjs";
const api = createAdapter(() => { throw new Error("Classification must not fetch"); });
const booking = (extra = {}) => ({ isClass: false, serviceId: 1, serviceName: "Recording", contactName: "Person", ...extra });

test("classification precedence covers claimed, unclaimed, whitespace and authoritative service IDs", () => {
  for (const [extra, category] of [
    [{ isClass: true }, "class"],
    [{ isClass: true, contactName: null }, "class"],
    [{ isClass: true, serviceId: 27, serviceName: "Maintenance" }, "class"],
    [{ serviceId: 27, serviceName: null }, "maintenance"],
    [{ serviceId: 27, serviceName: "Equipment care", contactName: null }, "maintenance"],
    [{}, "session"],
    [{ contactName: null }, "available"],
    [{ contactName: undefined }, "available"],
    [{ contactName: " \t\n " }, "available"],
    [{ serviceName: "Maintenance" }, "session"],
    [{ serviceId: null, serviceName: "Maintenance", contactName: null }, "available"],
    [{ serviceName: "Maintenance consultation" }, "session"],
    [{ serviceName: null }, "session"],
  ]) assert.equal(api.classifySession(booking(extra)), category);
});

test("mixed normalized data yields 10 sessions and 4 classes without dropping records", () => {
  const records = [
    ...Array.from({length: 10}, () => ({ service: 1, stamp: { contact_name: "Person", service: "Recording" } })),
    ...Array.from({length: 4}, () => ({ service: { id: 29 }, stamp: { service: "Instruction" } })),
    ...Array.from({length: 2}, () => ({ service: 27, stamp: { service: "Maintenance" } })),
    ...Array.from({length: 3}, () => ({ service: 1, stamp: { contact_name: "  " } })),
  ].map((row, i) => ({ ...row, id: i + 1, room: 42, start: "2026-09-29T15:00:00Z", end: "2026-09-29T16:00:00Z" }));
  const sessions = api.normalizeCalendar({ data: { items: records } }, { name: "Test", studioAssistantId: 7807 });
  assert.equal(sessions.length, 19);
  assert.equal(JSON.stringify(api.countBookings(sessions)), JSON.stringify({ session: 10, class: 4, maintenance: 2, available: 3 }));
  assert.equal(api.sessionCountLabel(sessions), "10 sessions · 4 classes");
  const activity = api.todayActivity({ sessions, ...api.centralDayRange("2026-09-29") });
  assert.equal(activity.counts.session, 10);
  assert.equal(activity.counts.class, 4);
  assert.equal(activity.maxCount, 10);
  assert.equal(activity.rooms[0].sessions.length, 19);
});

test("normalization preserves Maintenance service IDs from scalar and relationship values", () => {
  for (const service of [27, "27", { id: 27 }, { id: "27", name: "Equipment care" }]) {
    const [session] = api.normalizeCalendar({ data: { items: [{ service }] } }, { name: "Test", studioAssistantId: 7807 });
    assert.equal(session.serviceId, 27);
    assert.equal(session.isClass, false);
    assert.equal(api.classifySession(session), "maintenance");
  }
});
