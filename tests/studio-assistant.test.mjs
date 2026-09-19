import { test } from "node:test";
import assert from "node:assert/strict";
import { createAdapter } from "./adapter-harness.mjs";

test("undefined, false, and non-exact true flags block every mutation before any fetch", async () => {
  for (const flag of [undefined, "false", "TRUE", "1", "true "]) {
    let calls = 0;
    const api = createAdapter(
      () => {
        calls++;
        throw new Error("Network must never run");
      },
      {
        STUDIO_ASSISTANT_WRITES_ENABLED: flag,
        STUDIOASSISTANT_API_TOKEN: "synthetic-only",
      },
    );
    assert.equal(api.studioAssistantWritesEnabled(), false);
    assert.throws(
      () => api.assertStudioAssistantWritesEnabled(),
      /writes are disabled/,
    );
    for (const method of ["POST", "PATCH", "PUT", "DELETE"])
      await assert.rejects(
        api.studioAssistantMutation("/api/example", { method }),
        /writes are disabled/,
      );
    // Only guard checks: no mutation can progress to authentication or preflight.
    await assert.rejects(api.approveInternalRequest(1), /writes are disabled/);
    await assert.rejects(api.denyInternalRequest(1), /writes are disabled/);
    await assert.rejects(
      api.processInternalRequests("approve", [{ id: 1, facilityId: 7807 }]),
      /writes are disabled/,
    );
    assert.equal(calls, 0);
  }
});
test("the explicit flag can be recognized without running a write", () => {
  const api = createAdapter(
    () => {
      throw new Error("No fetch");
    },
    { STUDIO_ASSISTANT_WRITES_ENABLED: "true" },
  );
  assert.equal(api.studioAssistantWritesEnabled(), true);
  api.assertStudioAssistantWritesEnabled();
});
test("GET uses the server-side token and safe request options", async () => {
  let calls = 0;
  const api = createAdapter(async (url, options) => {
    calls++;
    assert.equal(options.method, "GET");
    assert.equal(options.headers.Authorization, "Bearer test-access-token");
    assert.equal(options.redirect, "error");
    assert.equal(options.cache, "no-store");
    assert.equal(url.pathname, "/api/example");
    return Response.json({ ok: true });
  });
  assert.equal((await api.studioAssistantFetch("/api/example")).ok, true);
  assert.equal(calls, 1);
});
test("unsafe paths and GET bodies fail before authentication or network", async () => {
  let calls = 0;
  const api = createAdapter(() => {
    calls++;
  });
  for (const path of [
    "https://other.example/api/data",
    "//other.example/api/data",
    "/api/../../outside",
    "/outside",
    "/api/data#fragment",
  ])
    await assert.rejects(api.studioAssistantFetch(path));
  await assert.rejects(api.studioAssistantFetch("/api/example", { body: {} }));
  assert.equal(calls, 0);
});
test("GET errors omit upstream secrets and validate JSON", async () => {
  const failed = createAdapter(
    async () => new Response("private upstream detail", { status: 401 }),
  );
  await assert.rejects(
    failed.studioAssistantFetch("/api/example"),
    (error) =>
      /HTTP 401/.test(error.message) && !error.message.includes("private"),
  );
  const malformed = createAdapter(async () => new Response("not-json"));
  await assert.rejects(
    malformed.studioAssistantFetch("/api/example"),
    /invalid JSON/,
  );
});

const authEnv = { STUDIOASSISTANT_API_TOKEN: "synthetic-only" };
test("concurrent initial reads share login, reuse token, and recover from failed login", async () => {
  let logins = 0;
  let fail = true;
  const api = createAdapter(async (url, options) => {
    if (String(url).endsWith("/api/auth/api-login")) {
      logins++;
      assert.equal(options.method, "POST");
      assert.equal(JSON.parse(options.body).apiToken, "synthetic-only");
      await new Promise(resolve => setTimeout(resolve, 5));
      return fail ? new Response(null, { status: 503 }) : Response.json({ accessToken: "cached" });
    }
    assert.equal(options.headers.Authorization, "Bearer cached");
    return Response.json({ ok: true });
  }, authEnv, false);
  const failed = await Promise.allSettled([api.studioAssistantFetch("/api/a"), api.studioAssistantFetch("/api/b")]);
  assert.ok(failed.every(result => result.status === "rejected"));
  assert.equal(logins, 1);
  fail = false;
  await Promise.all([api.studioAssistantFetch("/api/a"), api.studioAssistantFetch("/api/b")]);
  await api.studioAssistantFetch("/api/c");
  assert.equal(logins, 2);
});
test("concurrent 401s share replacement and a late stale 401 preserves it", async () => {
  let logins = 0;
  let releaseLate;
  const late = new Promise(resolve => { releaseLate = resolve; });
  const api = createAdapter(async (url, options) => {
    if (String(url).endsWith("/api/auth/api-login")) return Response.json({ accessToken: `token-${++logins}` });
    if (options.headers.Authorization === "Bearer token-1") {
      if (url.pathname === "/api/late") await late;
      return new Response(null, { status: 401 });
    }
    releaseLate();
    return Response.json({ ok: true });
  }, authEnv, false);
  await Promise.all([api.studioAssistantFetch("/api/late"), api.studioAssistantFetch("/api/a"), api.studioAssistantFetch("/api/b")]);
  assert.equal(logins, 2);
});
test("repeated 401 retries exactly once; 403 does not reauthenticate", async () => {
  for (const status of [401, 403]) {
    let logins = 0, reads = 0;
    const api = createAdapter(async url => {
      if (String(url).endsWith("/api/auth/api-login")) return Response.json({ accessToken: `token-${++logins}` });
      reads++;
      return new Response("sensitive response", { status });
    }, authEnv, false);
    await assert.rejects(api.studioAssistantFetch("/api/a"), error => error.message.includes(`HTTP ${status}`) && !error.message.includes("sensitive"));
    assert.equal(reads, status === 401 ? 2 : 1);
    assert.equal(logins, status === 401 ? 2 : 1);
  }
});
