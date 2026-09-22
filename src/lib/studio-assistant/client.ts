import "server-only";
import { assertMutationAllowed } from "./write-safety";
import { getAccessToken, invalidateAccessToken, STUDIO_ASSISTANT_BASE_URL } from "./auth";
type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};
// Reads and mutations have explicit entry points. Authentication has its own pathway.
export function studioAssistantFetch(path: string, options: Omit<RequestOptions, "method"> & { method?: "GET" } = {}): Promise<unknown> {
  return executeRequest(path, { ...options, method: "GET" });
}

export async function studioAssistantMutation(path: string, options: RequestOptions): Promise<unknown> {
  assertMutationAllowed(path, options.method, options.body);
  return executeRequest(path, options);
}

// The caller validates unknown JSON in the appropriate domain service.
async function executeRequest(
  path: string,
  options: RequestOptions = {},
): Promise<unknown> {
  const method = options.method ?? "GET";
  const url = new URL(path, STUDIO_ASSISTANT_BASE_URL);
  if (
    !path.startsWith("/api/") ||
    url.origin !== STUDIO_ASSISTANT_BASE_URL ||
    !url.pathname.startsWith("/api/") ||
    url.username ||
    url.password ||
    url.hash
  ) {
    throw new Error(
      "Studio Assistant requests must use a relative /api/ path on the configured host.",
    );
  }
  if (method === "GET" && options.body !== undefined)
    throw new Error("Studio Assistant GET requests cannot include a body.");
  const body =
    options.body === undefined ? undefined : JSON.stringify(options.body);
  let accessToken = await getAccessToken();
  async function send(): Promise<Response> {
    try {
      return await fetch(url, {
        method,
        body,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        cache: "no-store",
        redirect: "error",
        signal: options.signal ?? AbortSignal.timeout(15_000),
      });
    } catch {
      throw new Error(
        "Studio Assistant request could not connect, was cancelled, or timed out.",
      );
    }
  }
  let response = await send();
  if (response.status === 401) {
    invalidateAccessToken(accessToken);
    // Never replay a production mutation automatically.
    if (method === "GET") {
      await response.body?.cancel();
      accessToken = await getAccessToken();
      response = await send();
      if (response.status === 401) {
        invalidateAccessToken(accessToken);
        throw new Error("Studio Assistant authentication failed after one retry (HTTP 401).");
      }
    }
  }
  if (!response.ok)
    throw new Error(
      `Studio Assistant request failed (HTTP ${response.status}).`,
    );
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Studio Assistant returned invalid JSON.");
  }
}
