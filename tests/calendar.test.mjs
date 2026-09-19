import { test } from "node:test";
import assert from "node:assert/strict";
import { createAdapter } from "./adapter-harness.mjs";
const facility = { key: "34mse", name: "34MSE", studioAssistantId: 7807 };
const local = () =>
  createAdapter(() => {
    throw new Error("Unexpected fetch");
  });
const payload = (items) => ({ data: { items } });
const session = (id, start, end, extra = {}) => ({ id, start, end, ...extra });
test("Central day boundaries cover winter, summer, and DST transitions", () => {
  const api = local();
  for (const [date, start, end, hours] of [
    ["2026-01-15", "2026-01-15T06:00:00.000Z", "2026-01-16T06:00:00.000Z", 24],
    ["2026-07-15", "2026-07-15T05:00:00.000Z", "2026-07-16T05:00:00.000Z", 24],
    ["2026-03-08", "2026-03-08T06:00:00.000Z", "2026-03-09T05:00:00.000Z", 23],
    ["2026-11-01", "2026-11-01T05:00:00.000Z", "2026-11-02T06:00:00.000Z", 25],
  ]) {
    const range = api.centralDayRange(date);
    assert.equal(range.start, start);
    assert.equal(range.end, end);
    assert.equal((Date.parse(end) - Date.parse(start)) / 3600000, hours);
  }
  assert.equal(api.centralDate(new Date("2026-09-20T04:30:00Z")), "2026-09-19");
  assert.equal(api.validDate("2026-02-30"), false);
  assert.equal(api.shiftDate("2026-12-31", 1), "2027-01-01");
});
test("normalization preserves admin, claimable, missing-contact, zero-status, and unknown-type sessions", () => {
  const api = local();
  const sessions = api.normalizeCalendar(
    payload({
      one: session(
        1,
        "2026-09-19T23:00:00-05:00",
        "2026-09-20T02:00:00-05:00",
        {
          room: 42,
          booking: null,
          user: 0,
          agent: 0,
          project: 0,
          type: "unfamiliar",
          btype: 0,
          status: 0,
          stamp: {
            room: "Synthetic Studio",
            artist: "Admin hold",
            contactName: "Synthetic person",
            sessionNotes: "<b>plain text</b>",
          },
        },
      ),
      two: { id: 2, stamp: null },
      three: { id: null, start: "bad", end: "bad" },
    }),
    facility,
  );
  assert.equal(sessions.length, 3);
  assert.equal(sessions[0].label, "Admin hold");
  assert.equal(sessions[0].roomId, 42);
  assert.equal(sessions[0].status, 0);
  assert.equal(sessions[0].bookingType, "0");
  assert.equal(sessions[0].contactName, "Synthetic person");
  assert.equal(sessions[1].start, null);
  assert.equal(sessions[2].id, null);
  assert.equal(sessions[0].notes, "<b>plain text</b>");
  assert.throws(() => api.normalizeCalendar({ data: {} }, facility));
  assert.equal(api.normalizeCalendar(payload({}), facility).length, 0);
});
test("calendar reads both known facilities through GET and returns partial results", async () => {
  const calls = [];
  const api = createAdapter(async (url, options) => {
    assert.equal(options.method, "GET");
    calls.push(url);
    return url.pathname.includes("/7807/")
      ? Response.json(payload({ a: { id: 1 } }))
      : new Response(null, { status: 503 });
  });
  const result = await api.getAllFacilityCalendars("2026-03-08");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].searchParams.get("start"), "2026-03-08T06:00:00.000Z");
  assert.equal(calls[0].searchParams.get("end"), "2026-03-09T05:00:00.000Z");
  assert.equal(result.sessions.length, 1);
  assert.equal(result.issues[0].facilityName, "REM");
});
test("day matching includes overnight overlaps, excludes exact end boundary, and retains uncertain dates", () => {
  const api = local();
  const range = api.centralDayRange("2026-09-19");
  const rows = api.normalizeCalendar(
    payload([
      session(1, "2026-09-19T04:00:00Z", "2026-09-19T06:00:00Z"),
      session(2, "2026-09-20T05:00:00Z", "2026-09-20T06:00:00Z"),
      session(3, null, null),
    ]),
    facility,
  );
  assert.equal(api.onDay(rows[0], range.start, range.end), true);
  assert.equal(api.onDay(rows[1], range.start, range.end), false);
  assert.equal(api.onDay(rows[2], range.start, range.end), true);
});
test("timeline expands for late sessions and allocates overlap lanes including short events", () => {
  const api = local();
  const rows = api.normalizeCalendar(
    payload([
      session(1, "2026-09-19T10:00:00-05:00", "2026-09-19T12:00:00-05:00"),
      session(2, "2026-09-19T11:00:00-05:00", "2026-09-19T11:10:00-05:00"),
      session(3, "2026-09-19T23:30:00-05:00", "2026-09-20T01:00:00-05:00"),
    ]),
    facility,
  );
  const layout = api.layoutTimeline(rows, "2026-09-19");
  assert.equal(layout.end, Date.parse("2026-09-20T05:00:00Z"));
  assert.equal(layout.blocks[0].columns, 2);
  assert.notEqual(layout.blocks[0].lane, layout.blocks[1].lane);
  assert.ok(layout.blocks[1].height >= 44);
  assert.equal(layout.blocks.length, 3);
});
