import { test } from "node:test";
import assert from "node:assert/strict";
import { createAdapter } from "./adapter-harness.mjs";
const api = createAdapter(() => { throw Error("No network"); });
const plain = value => JSON.parse(JSON.stringify(value));
const defaults = { view: "timeline", facility: "rem", timelineRange: "day" };

test("REM aliases and custom order preserve raw names, IDs and unknown rooms", () => {
  const names = ["Studio A", "Studio B", "Studio C", "Studio D", "Classroom B25", "Restoration Studio", "Studio B11", "B12", "Studio B13", "B14", "Classroom B19"];
  const sessions = [...names, "Unknown Z", "Unknown A"].map((roomName, i) => ({ roomName, roomId: i + 1, facilityId: 7808, facilityName: "REM" }));
  const expected = names.map(name => /^(Studio )?B1[1-4]$/.test(name) ? `Edit Bay ${name.replace("Studio ", "")}` : name);
  assert.deepEqual(plain(api.groupStudios([...sessions].reverse()).map(room => room.name)), [...expected, "Unknown A", "Unknown Z"]);
  assert.equal(sessions[6].roomName, "Studio B11");
  assert.equal(sessions[6].roomId, 7);
  assert.equal(api.roomLabel({ facilityId: 7808, roomId: 10481, roomName: null }), "Edit Bay B11");
  assert.equal(api.roomLabel({ facilityId: 7808, roomId: 10484, roomName: "Studio B12" }), "Edit Bay B12");
  assert.equal(api.roomLabel({ facilityId: 7808, roomId: 10483, roomName: null }), "Edit Bay B13");
  assert.equal(api.roomLabel({ facilityId: 7808, roomId: 10480, roomName: null }), "Edit Bay B14");
  assert.equal(api.roomLabel({ facilityId: 7808, roomId: 10485, roomName: null }), "Studio D");
  assert.equal(api.roomLabel({ facilityId: 7808, roomId: 10487, roomName: null }), "Classroom B19");
  assert.equal(api.roomLabel({ facilityId: 7807, roomId: 10481, roomName: "Studio B11" }), "Studio B11");
  assert.equal(api.groupStudios([sessions[6]]).length, 1);
  assert.deepEqual(plain(api.groupStudios(sessions.map(s => ({ ...s, facilityId: 7807, facilityName: "34MSE" }))).map(r => r.name)), [...names, "Unknown Z", "Unknown A"].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})));
});

test("schedule storage validates fields independently and only retains view preferences", () => {
  for (const raw of [null, "bad JSON", "null", "[]", '"text"', '{"view":"bad","facility":"other","timelineRange":7}']) {
    assert.deepEqual(plain(api.resolveSchedulePreferences(raw)), defaults);
  }
  assert.deepEqual(plain(api.resolveSchedulePreferences('{"view":"list","facility":"34mse","timelineRange":"3-day","date":"2020-01-01","selected":[1],"hideClasses":false}')), { view: "list", facility: "34mse", timelineRange: "3-day" });
  assert.deepEqual(plain(api.resolveSchedulePreferences('{"view":"schedule","facility":"7807","timelineRange":"bad"}')), { view: "calendar", facility: "34mse", timelineRange: "day" });
});

test("valid URL preferences override storage and room links retain focused Schedule", () => {
  const raw = '{"view":"timeline","facility":"rem","timelineRange":"3-day"}';
  const url = api.querySchedulePreferences({ view: "list", facility: "34mse", timelineRange: "day" }, "all");
  assert.deepEqual(plain(api.resolveSchedulePreferences(raw, url)), { view: "list", facility: "34mse", timelineRange: "day" });
  assert.deepEqual(plain(api.querySchedulePreferences({}, "7807:10475")), { view: "calendar", facility: "34mse" });
  assert.deepEqual(plain(api.querySchedulePreferences({ view: ["list"], facility: "bad" }, "all")), {});
  assert.equal(api.resolveSchedulePreferences(raw, api.querySchedulePreferences({view:"schedule"},"all")).view, "calendar");
});
