import "server-only";
export const STUDIO_ASSISTANT_BASE_URL = "https://app.studioassistant.io";
let cachedToken: string | null = null;
let loginPromise: Promise<string> | null = null;

// A late 401 for an older token must not evict a newer replacement.
export function invalidateAccessToken(rejectedToken: string): void {
  if (cachedToken === rejectedToken) cachedToken = null;
}

export async function getAccessToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  if (!loginPromise) {
    loginPromise = authenticate().then((token) => {
      cachedToken = token;
      return token;
    }).finally(() => {
      loginPromise = null;
    });
  }
  return loginPromise;
}

// Dedicated authentication pathway: this POST does not mutate production data.
async function authenticate(): Promise<string> {
  const apiToken = process.env.STUDIOASSISTANT_API_TOKEN?.trim();
  if (!apiToken)
    throw new Error(
      "Studio Assistant API token is missing. Set STUDIOASSISTANT_API_TOKEN in .env.local.",
    );
  let response: Response;
  try {
    response = await fetch(`${STUDIO_ASSISTANT_BASE_URL}/api/auth/api-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ apiToken }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error(
      "Studio Assistant authentication could not connect or timed out.",
    );
  }
  // Never include upstream response bodies, headers, or tokens in errors.
  if (!response.ok)
    throw new Error(
      `Studio Assistant authentication failed (HTTP ${response.status}). Check the server API token.`,
    );
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error("Studio Assistant authentication returned invalid JSON.");
  }
  // Validate the accessToken contract without exposing the response body.
  if (
    typeof data !== "object" ||
    data === null ||
    !("accessToken" in data) ||
    typeof data.accessToken !== "string" ||
    !data.accessToken.trim() ||
    /\s/.test(data.accessToken)
  ) {
    throw new Error(
      "Studio Assistant authentication response must contain a non-empty accessToken string.",
    );
  }
  return data.accessToken;
}
