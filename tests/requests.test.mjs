import { test } from "node:test";
import assert from "node:assert/strict";
import { createAdapter } from "./adapter-harness.mjs";
const facility = { key: "34mse", name: "34MSE", studioAssistantId: 7807 };
test("request normalization still handles optional fields in read-only mode", () => {
  const api = createAdapter(() => {
    throw new Error("No fetch");
  });
  const rows = api.normalizeInternalRequests(
    [
      {
        id: 1,
        stamp: { contact_name: "Synthetic contact", room: "Synthetic room" },
        start: "2026-09-21T15:00:00-05:00",
      },
      { id: 2, user: 0, stamp: null },
    ],
    facility,
  );
  assert.equal(rows[0].requesterName, "Synthetic contact");
  assert.equal(rows[0].start, "2026-09-21T20:00:00.000Z");
  assert.equal(rows[1].start, null);
});
test("request queues use GET only and preserve successful facility on partial failure", async () => {
  const api = createAdapter(async (url, options) => {
    assert.equal(options.method, "GET");
    return url.pathname.includes("/7807/")
      ? Response.json([{ id: 1 }])
      : new Response(null, { status: 503 });
  });
  const result = await api.getAllInternalRequests();
  assert.equal(result.requests.length, 1);
  assert.equal(result.issues[0].facilityName, "REM");
});
