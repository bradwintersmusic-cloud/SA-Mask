import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

// Run the real server adapter with isolated environment/fetch. No real credentials
// or network, and no mock mode is included in the application.
export function createAdapter(
  fetch,
  env = { STUDIOASSISTANT_API_TOKEN: "synthetic-only" },
  mockLogin = true,
) {
  const upstreamFetch = fetch;
  fetch = (url, options) => mockLogin && String(url).endsWith("/api/auth/api-login")
    ? Promise.resolve(Response.json({ accessToken: "test-access-token" }))
    : upstreamFetch(url, options);
  const modules = new Map();
  function load(filename) {
    const absolute = path.resolve(filename);
    if (modules.has(absolute)) return modules.get(absolute);
    const exports = {};
    modules.set(absolute, exports);
    const { outputText } = ts.transpileModule(
      fs.readFileSync(absolute, "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    );
    vm.runInNewContext(outputText, {
      exports,
      fetch,
      process: { env },
      URL,
      URLSearchParams,
      AbortSignal,
      require: (id) => {
        if (id === "server-only") return {};
        const target = id.startsWith("@/")
          ? path.join("src", id.slice(2))
          : path.resolve(path.dirname(absolute), id);
        return load(`${target}.ts`);
      },
    });
    return exports;
  }
  const overview = load("src/lib/overview/activity.ts");
  return Object.assign(
    {},
    overview,
    ...[
      "auth",
      "client",
      "write-safety",
      "request-normalization",
      "requests",
      "session-normalization",
      "sessions",
      "session-deletion",
      "enrollment",
    ].map((name) => load(`src/lib/studio-assistant/${name}.ts`)),
    ...["time", "display", "timeline", "operations-timeline", "query", "session-search", "duration"].map((name) =>
      load(`src/lib/calendar/${name}.ts`),
    ),
  );
}
