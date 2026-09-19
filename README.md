# SA-Mask · Studio Assistant Admin

Local Studio Assistant operations dashboard. Calendar and its Daily List share normalized read-only session data; Internal Requests can be viewed but actions are disabled. User Management supports live user/class search and read-only enrollment. Calendar editing, Today live data, enrollment changes, database storage, and deployment remain out of scope.

## Setup and server-side authentication

1. Copy `.env.example` to `.env.local`.
2. Add the long-lived `STUDIOASSISTANT_API_TOKEN` on the server. Never paste tokens into client code or the example file.
3. Run `npm install`, then `npm run dev`.
4. Open http://127.0.0.1:3000.

Node.js 22.13+ or 24. Scripts bind to loopback. No dashboard authentication is included, so this is a local workspace.

Authentication uses the dedicated `POST /api/auth/api-login` endpoint and is allowed independently of the production write flag. All production data access during this phase is GET-only. The first read lazily authenticates; the bearer token stays in server memory and is reused until rejected. A shared in-flight promise coalesces concurrent logins and is cleared after success or failure. Tokens are never stored in browser storage, cookies, or files. Restarting the server clears the cache.

On HTTP 401, reads invalidate only the rejected cached token, authenticate again, and retry the original GET once. A late 401 cannot evict a newer token. A second 401 throws a safe authentication error; other statuses do not trigger login. Mutations are never automatically replayed. There are no refresh timers or assumed expiration periods. The former pre-issued bearer environment variable is no longer used.

`.env.local` is Git-ignored. `.env.example` contains blank credentials and `STUDIO_ASSISTANT_WRITES_ENABLED=false`. Do not enable writes during this phase.

## Read-only enforcement

`src/lib/studio-assistant/write-safety.ts` implements `assertStudioAssistantWritesEnabled()`. Missing, false, or anything other than the exact string `true` throws **before fetch**. The client exposes a GET-only `studioAssistantFetch` read pathway and an explicitly guarded `studioAssistantMutation` pathway. Individual and batch request mutations also guard before authentication or preflight reads. Dedicated authentication does not require the write guard.

The Requests server-action boundary always returns a read-only error, and Approve/Deny controls are disabled. This UI remains read-only even if an environment flag is changed; re-enabling the mutation feature is a separate future code change. The shell labels this workspace “Production · Read Only.” No session mutation controls exist.

Tests replace all network access with local functions. The only mutation-helper invocations are assertions that disabled guards reject with **zero fetch calls**. There are no mutation-success tests or live verification scripts in the test suite.

## Calendar data flow

- `/calendar` loads a selected Central Time day (today initially) at request time.
- `sessions.ts` computes the day boundaries and reads the two configured facilities with `GET /api/studio/{id}/session/calendar?start=...&end=...`. `Promise.allSettled` preserves the successful facility if another fails.
- `session-normalization.ts` accepts `data.items` as an array or object-keyed collection. It creates stable record keys and normalized labels, contacts, rooms, projects, service, IDs, notes, timestamps, and type/status metadata.
- No record is removed for null booking, user/agent/project zero, absent contacts, or unfamiliar type/status. Missing IDs and invalid dates remain represented. A malformed envelope or non-object entry fails that facility explicitly instead of hiding bad data.
- Timestamp strings with explicit UTC/offset suffixes are normalized. Unparseable or timezone-less timestamps remain available as raw strings in Details and appear in “Schedule needs review” rather than receiving a guessed time.
- Calendar and List use the same in-memory snapshot and filters. Changing view/facility/studio causes **no upstream calls**. Date changes and manual Refresh call the local `/api/calendar` GET route, which delegates to the same server adapter. Overlapping local reads are cancelled/ignored; polling is absent.
- Correctly timed sessions are included when they overlap the selected day (`start < dayEnd && end > dayStart`), including cross-midnight sessions. Unknown schedules remain visible. No other session-type filtering occurs.

## Views and time handling

Calendar starts with a compact all-studios summary. “View timeline” or the Studio filter opens a single studio’s vertical day timeline; a single discovered studio opens its timeline directly. List groups facility → studio → chronological session. Studio names sort naturally. Both views open the same read-only Session Details modal.

Room IDs and names come from returned `room` / `stamp.room` data. The selector does not guess resource endpoints or invent empty studios. Rooms absent from the returned day may not appear. Unknown rooms stay in an explicit “Studio not provided” group.

All display uses `America/Chicago` via Intl. Local midnight boundaries are resolved using timezone offsets, so DST days are 23 or 25 hours. The timeline measures elapsed time: spring skips the missing hour; fall shows both repeated hours with CDT/CST labels. The baseline is 8 AM–10 PM and expands to include earlier/later returned sessions, clipped only at selected-day boundaries. Overlap groups use side-by-side lanes, including minimum tap heights for short sessions. Dynamic timeline coordinates are the intentional use of inline styles.

The modal shows only available fields. Notes are escaped text, never injected HTML. Class/course relationships are not inferred from project or type codes without a verified API contract. Original type/status values remain secondary metadata.

## Main files

```text
src/app/calendar/                 Controls, workspace, Daily List, timeline, details modal
src/app/api/calendar/route.ts     Local no-store GET boundary
src/lib/calendar/                 Shared date, grouping, layout, browser GET helpers
src/lib/studio-assistant/         Server-only auth, write guard, services, normalization
src/config/facilities.ts          Central facility IDs
src/app/requests/                 Read-only Requests UI and dormant action boundary
src/components/layout/           Read-only shell indicator
```

## Checks and discovery status

- `npm run lint`
- `npm run typecheck`
- `npm test` — local guard, read, normalization, DST, day-boundary, and overlap checks
- `npm run build`

No production-data mutations were executed. Local tests cover cached authentication, simultaneous initial reads, concurrent and delayed stale-token 401s, one-retry limits, failed-login recovery, safe errors, and guards rejecting before fetch. Calendar/List UI and mobile behavior were previously checked with isolated synthetic responses; these are not production discoveries.

Live adapter verification succeeded on 2026-09-19: one `POST /api/auth/api-login` (HTTP 200) was shared by concurrent calendar GETs for 34MSE and REM (both HTTP 200). No production-data mutation was executed. The first sandboxed attempt could not connect; the authorized network check succeeded. Credentials remain in the ignored `.env.local`; `.env.example` contains no credential.

Returned data for the selected Central day:

| Facility | Sessions returned | Rooms discovered |
| --- | --- | --- |
| 34MSE (7807) | 25 | 10475 — Columbia Studio A; 10476 — Quonset Hut Studio |
| REM (7808) | 19 | 10477 — Studio A; 10478 — Studio B; 10486 — Classroom B25; 10479 — Restoration Studio; 10482 — Studio C |

34MSE returned session types `s`, `b`, `i`, booking types `s`, `e`, and statuses `2`, `3`, `0`. REM returned types `i`, `b`, booking type `e`, and statuses `3`, `2`. These codes are preserved without guessing their meaning. Seven 34MSE records lacked normalized contact names; none were filtered out. All returned records had room IDs and valid normalized start/end timestamps. These counts describe endpoint results, not guaranteed day-filtered UI counts. No contact details, notes, credentials, or full response payloads were logged or persisted by verification.

The live check verifies the adapter and authentication contract. Browser interactions were previously checked using isolated synthetic responses; a live-data browser review remains separate. No production authentication failure was forced.

## Tooling note

ESLint 9 remains pinned for compatibility with the installed Next.js React lint plugins; npm reports its deprecation. No calendar or state-management library was added.

## User Management

`/users` has Users and Classes modes. Members are searchable locally by case-insensitive partial name, email, username, or Belmont ID; the initial view renders instructions rather than 942 cards, and searches display at most 50 results. Selecting a user shows identity and enrollment for all known classes. Classes search supports code, name, and snippet. Selecting a class loads its alphabetically sorted roster, total count, roster search, and a candidate picker for existing school members who are not already enrolled. Add/Remove buttons are disabled; selecting a candidate does not submit anything.

The centralized school is `src/config/school.ts`. `src/lib/studio-assistant/enrollment.ts` normalizes the success/data collection envelope, preserves missing optional fields, and derives user → class membership using matching numeric user IDs. Normalized fields alone reach the browser. Unknown/malformed records fail explicitly rather than silently dropping data. No semester/status filtering is inferred.

School members, classes, individual rosters, and the derived index use a server-only five-minute in-memory cache with shared in-flight promises. The index is built lazily on first user selection, with at most three roster reads in flight: up to 57 roster GETs for a cold index, fewer when rosters are cached. Classes mode needs just its selected roster. A failed roster marks that class's enrollment unknown, never unenrolled. Refresh clears the directory/roster/index caches, reloads the directory, and reloads the current selection. Refreshing a selected user rebuilds the index; refreshing a selected class loads only that roster. No polling, database, browser storage, or external cache was added.

The dormant `addClassMember` service guards before authentication or fetch and uses the confirmed POST route with email/uname. No UI/server action invokes it. `removeClassMember` guards and then throws an explicit unresolved-endpoint error even if writes are enabled. It contains no speculative DELETE URL. Production writes remain disabled; no enrollment POST, DELETE, PATCH, or PUT was executed. Authentication login was the only production POST used.

### Live discovery — September 19, 2026

- School members: **942**. Classes: **57**.
- Class creation timestamps span May 2024–September 2026. Older definitions are present, but historical/inactive status cannot be inferred from creation dates. No obvious current/active-semester field was returned; all classes are retained.
- School member, class, and roster responses use a success/type/message/data envelope. Roster records add fields such as org, uname, and slog; the UI receives only identity fields.
- All **1,317** entries across 57 rosters matched school member IDs, with **zero conflicting emails** for those IDs. Numeric IDs are therefore used for enrollment matching.
- No missing school-member names/emails/usernames and no duplicate normalized school-member emails were observed. Five repeated names demonstrate why names are not relationship keys. **43** members lacked a code. One class lacked a code; none lacked a name.
- One empty class: **8866**. No failed roster GETs were observed.
- Initial discovery read two sample rosters. The live user view then built the bounded 57-class index; subsequent class/summary reads used the cache while valid. A class-mode Refresh verified fresh directory and selected-roster retrieval. No artificial production auth failures were triggered.

Verification: lint, TypeScript, 18 isolated tests, production build; live browser name/email/username/code searches, user enrollment, class search/selection, 31-member sample roster, roster filtering, prepared-but-disabled Add, disabled Remove, refresh, and a 390px mobile layout without horizontal overflow. Main files: `src/app/users/`, `src/app/api/users/route.ts`, `src/lib/studio-assistant/enrollment.ts`, `enrollment-types.ts`, `src/config/school.ts`, and `tests/enrollment.test.mjs`.

Next: review the read-only workflow with the administrator. Capture authoritative removal-route documentation before implementing any removal network call; enrollment writes remain out of scope.

## Class email and batch confirmation

Selected-class actions always use the complete loaded roster, independent of roster search. **Email Class** opens a preview before any mail application can launch. Recipients are trimmed, validated for basic email shape/unsafe delimiters, and deduplicated case-insensitively; missing or malformed addresses are excluded without inventing replacements. The preview shows actual valid recipient count, BCC addresses in a scrollable list, and the actual class name (or code) as subject. `encodeURIComponent` encodes BCC and subject independently. There is no To recipient, prefilled body, email API, or send capability.

Copy Mailto Link uses the clipboard without opening Mail. The expandable link inspector also permits manual inspection/copy; clipboard failures show a useful message. Open Draft in Mail launches that same URL only after the explicit preview action. The administrator reviews and sends manually in their chosen mail client. Links longer than 2,000 characters show a practical client-compatibility warning and are never truncated; this is a caution threshold, not a universal mail-client limit.

**Remove All Students** opens a destructive confirmation using the real full roster count. Its final action stays disabled while production writes are disabled and the individual removal endpoint is unconfirmed, including after acknowledgement. No local roster changes or success results are fabricated. `removeAllClassMembers` is a guarded, explicitly unavailable service boundary with future per-user success/failure result types. Once the individual endpoint is authoritatively confirmed and writes deliberately enabled, implement three-worker individual removals with independent settled results; do not infer a bulk endpoint. No removal URL is currently present.

### Required standard for every multi-record mutation

All current and future multi-record Studio Assistant mutations must present `BatchConfirmationModal` before execution. Normal batch actions (including Requests approve/deny) require explicit Cancel/Confirm with the count and description. Destructive actions additionally require a labeled acknowledgement checkbox; the final action is disabled until acknowledged. No typed course-name confirmation is required. Mount a new modal per operation so acknowledgement cannot carry over. During processing, confirmation and cancellation are disabled. A blocked reason prevents confirmation regardless of acknowledgement. Confirmation is a UI safety layer and never replaces the server-side write guard.

Requests approve/deny now use this shared component and remain blocked in read-only mode. Future batch session deletion must use destructive confirmation, but no session-deletion feature was implemented.

Verification for this enhancement: lint, typecheck, 21 isolated tests, build, and live preview using the 31-member AET 4480 roster. Verified BCC-only URL, actual subject/count, Copy feedback, scrollable mobile preview, full roster despite a filtered display, disabled destructive action before/after acknowledgement, acknowledgement reset on reopening, and Escape dismissal. No email client was launched, no email was sent, and no production-data mutation was executed. Draft launching is implemented but OS/mail-client behavior was intentionally not exercised. Production writes remain false. Copy was verified by pasting into a local-only search field and comparing the result with the generated URL; the link inspector independently confirmed BCC count and subject.

Main additions: `src/app/users/ClassActions.tsx`, `src/lib/email/class-email.ts`, `src/components/ui/BatchConfirmationModal.tsx`, associated styles, and `tests/class-email.test.mjs`.
