import test from "node:test";
import assert from "node:assert/strict";
import { createAdapter } from "./adapter-harness.mjs";
const adapter = createAdapter(() => {
  throw new Error("No network allowed");
});
test("inclusive Central ranges handle both DST transitions", () => {
  const spring = adapter.centralDateRange("2026-03-07", "2026-03-09");
  assert.equal(
    (Date.parse(spring.end) - Date.parse(spring.start)) / 3600000,
    71,
  );
  const fall = adapter.centralDateRange("2026-10-31", "2026-11-02");
  assert.equal((Date.parse(fall.end) - Date.parse(fall.start)) / 3600000, 73);
  assert.throws(() => adapter.centralDateRange("2026-09-20", "2026-09-19"));
});
test("composed filters use identity, unique email fallback, and partial text", () => {
  const base = {
    key: "one",
    id: 1,
    facilityId: 7807,
    roomId: 12,
    start: "2026-09-19T14:00:00Z",
    end: "2026-09-19T15:00:00Z",
    userId: 42,
    contactName: "Same Name",
    contactEmail: "a@example.test",
    projectName: "Great Project",
  };
  const rows = [
    base,
    { ...base, key: "two", userId: 43 },
    { ...base, key: "three", userId: null },
    { ...base, key: "four", facilityId: 7808 },
  ];
  const filters = {
    ...adapter.centralDateRange("2026-09-19", "2026-09-19"),
    facility: "7807",
    studio: "7807:12",
    user: { id: 42, email: "A@example.test" },
    query: "PROJ",
    uniqueUserEmail: true,
  };
  assert.deepEqual(
    Array.from(adapter.filterSessions(rows, filters), (r) => r.key),
    ["one", "three"],
  );
  assert.deepEqual(
    Array.from(
      adapter.filterSessions(rows, { ...filters, uniqueUserEmail: false }),
      (r) => r.key,
    ),
    ["one"],
  );
  assert.equal(
    adapter.filterSessions(rows, {
      ...filters,
      user: null,
      facility: "all",
      studio: "all",
      query: "",
    }).length,
    4,
  );
});
test("delete guard blocks before authentication or network", async () => {
  let calls = 0;
  const blocked = createAdapter(
    () => {
      calls++;
      throw new Error("Network forbidden");
    },
    { STUDIO_ASSISTANT_WRITES_ENABLED: "false" },
    false,
  );
  await assert.rejects(blocked.deleteSession(7807, 1));
  await assert.rejects(
    blocked.deleteSessions([{ facilityId: 7807, sessionId: 1 }]),
  );
  assert.equal(calls, 0);
});
test("date groups retain uncertain schedules and include overnight overlap once", () => {
  const rows = [
    { key: "late", start: "2026-09-20T02:00:00Z" },
    { key: "overnight", start: "2026-09-19T03:00:00Z" },
    { key: "unknown", start: null },
  ];
  const groups = adapter.groupSessionDates(rows, "2026-09-19");
  assert.deepEqual(
    Array.from(groups, ([day, items]) => [
      day,
      Array.from(items, (item) => item.key),
    ]),
    [
      ["2026-09-19", ["overnight", "late"]],
      ["Schedule needs review", ["unknown"]],
    ],
  );
});
