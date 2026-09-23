# SA-Mask · Studio Assistant Admin

Local Studio Assistant operations dashboard. Calendar and its Daily List share normalized read-only session data; Internal Requests support approval and denial through explicitly enabled capability flags. User Management supports live user/class search and enrollment management. Overview combines live Today activity and the request queue. Calendar editing, database storage, and deployment remain out of scope.

## Setup and server-side authentication

1. Copy `.env.example` to `.env.local`.
2. Add the long-lived `STUDIOASSISTANT_API_TOKEN` on the server. Never paste tokens into client code or the example file.
3. Run `npm install`, then `npm run dev`.
4. Open http://127.0.0.1:3000.

Node.js 22.13+ or 24. Scripts bind to loopback. No dashboard authentication is included, so this is a local workspace.

Authentication uses the dedicated `POST /api/auth/api-login` endpoint and is allowed independently of the production write flag. Internal Request approvals/denials and enrollment add/remove are the enabled production-data writes. The first read lazily authenticates; the bearer token stays in server memory and is reused until rejected. A shared in-flight promise coalesces concurrent logins and is cleared after success or failure. Tokens are never stored in browser storage, cookies, or files. Restarting the server clears the cache.

On HTTP 401, reads invalidate only the rejected cached token, authenticate again, and retry the original GET once. A late 401 cannot evict a newer token. A second 401 throws a safe authentication error; other statuses do not trigger login. Mutations are never automatically replayed. There are no refresh timers or assumed expiration periods. The former pre-issued bearer environment variable is no longer used.

`.env.local` remains Git-ignored. Only these feature flags were updated; unrelated values and credentials are preserved:

```dotenv
STUDIO_ASSISTANT_WRITES_ENABLED=true
STUDIO_ASSISTANT_INTERNAL_REQUEST_WRITES_ENABLED=true
STUDIO_ASSISTANT_SESSION_DELETE_ENABLED=true
STUDIO_ASSISTANT_ENROLLMENT_WRITES_ENABLED=true
```

## Capability permissions

`write-safety.ts` requires the master switch AND the relevant capability to equal the exact string `true`. Missing flags deny access. Domain helpers guard before authentication, reads or mutations; the shared mutation transport also checks the exact endpoint/method against its capability. Unknown mutations fail closed. Authentication, token caching and GET retry behavior are unchanged.

Internal Requests offer direct per-item approve/deny buttons with synchronous duplicate-submission protection and row loading/errors. Batch actions require explicit confirmation, revalidate selections against current queues, and process at most three requests concurrently. Both paths use the same single-request services and refresh real pending data afterward. Success requires the existing `success: true` and `CONFIRMED`/`DECLINED` response contract. Failed operations remain actionable with safe feedback; interrupted responses are never automatically replayed. Overview remains navigation-only and refreshes its own queue data.

Session deletion and enrollment each have their own enabled capability. Their UI restrictions are contextual; global read-only labels have been removed. No deletion or enrollment endpoint was executed. Request success/failure and batch concurrency are tested with isolated synthetic fetch responses, never arbitrary live approvals/denials.

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

`/users` has Users and Classes modes. Members are searchable locally by case-insensitive partial name, email, username, or Belmont ID; the initial view renders instructions rather than 942 cards, and searches display at most 50 results. Selecting a user shows identity and enrollment for all known classes. Classes search supports code, name, and snippet. Selecting a class loads its alphabetically sorted roster, total count, roster search, and a candidate picker for existing school members who are not already enrolled. Add/Remove controls use guarded server actions; selecting a candidate alone does not submit anything.

The centralized school is `src/config/school.ts`. `src/lib/studio-assistant/enrollment.ts` normalizes the success/data collection envelope, preserves missing optional fields, and derives user → class membership using matching numeric user IDs. Normalized fields alone reach the browser. Unknown/malformed records fail explicitly rather than silently dropping data. No semester/status filtering is inferred.

School members, classes, individual rosters, and the derived index use a server-only five-minute in-memory cache with shared in-flight promises. The index is built lazily on first user selection, with at most three roster reads in flight: up to 57 roster GETs for a cold index, fewer when rosters are cached. Classes mode needs just its selected roster. A failed roster marks that class's enrollment unknown, never unenrolled. Refresh clears the directory/roster/index caches, reloads the directory, and reloads the current selection. Refreshing a selected user rebuilds the index; refreshing a selected class loads only that roster. No polling, database, browser storage, or external cache was added.

`addClassMember` and `removeClassMember` are guarded enrollment services wired to User Management server actions. The confirmed DELETE route is `/api/class/{classId}/member/{userId}` with no payload. No enrollment mutation was executed during implementation.

### Live discovery — September 19, 2026

- School members: **942**. Classes: **57**.
- Class creation timestamps span May 2024–September 2026. Older definitions are present, but historical/inactive status cannot be inferred from creation dates. No obvious current/active-semester field was returned; all classes are retained.
- School member, class, and roster responses use a success/type/message/data envelope. Roster records add fields such as org, uname, and slog; the UI receives only identity fields.
- All **1,317** entries across 57 rosters matched school member IDs, with **zero conflicting emails** for those IDs. Numeric IDs are therefore used for enrollment matching.
- No missing school-member names/emails/usernames and no duplicate normalized school-member emails were observed. Five repeated names demonstrate why names are not relationship keys. **43** members lacked a code. One class lacked a code; none lacked a name.
- One empty class: **8866**. No failed roster GETs were observed.
- Initial discovery read two sample rosters. The live user view then built the bounded 57-class index; subsequent class/summary reads used the cache while valid. A class-mode Refresh verified fresh directory and selected-roster retrieval. No artificial production auth failures were triggered.

Verification: lint, TypeScript, 18 isolated tests, production build; live browser name/email/username/code searches, user enrollment, class search/selection, 31-member sample roster, roster filtering, prepared-but-disabled Add, disabled Remove, refresh, and a 390px mobile layout without horizontal overflow. Main files: `src/app/users/`, `src/app/api/users/route.ts`, `src/lib/studio-assistant/enrollment.ts`, `enrollment-types.ts`, `src/config/school.ts`, and `tests/enrollment.test.mjs`.

Next: review the read-only workflow with the administrator. The confirmed individual removal route is documented below; the administrator will test enrollment mutations manually.

## Class email and batch confirmation

Selected-class actions always use the complete loaded roster, independent of roster search. **Email Class** opens a preview before any mail application can launch. Recipients are trimmed, validated for basic email shape/unsafe delimiters, and deduplicated case-insensitively; missing or malformed addresses are excluded without inventing replacements. The preview shows actual valid recipient count, BCC addresses in a scrollable list, and the actual class name (or code) as subject. `encodeURIComponent` encodes BCC and subject independently. There is no To recipient, prefilled body, email API, or send capability.

Copy Mailto Link uses the clipboard without opening Mail. The expandable link inspector also permits manual inspection/copy; clipboard failures show a useful message. Open Draft in Mail launches that same URL only after the explicit preview action. The administrator reviews and sends manually in their chosen mail client. Links longer than 2,000 characters show a practical client-compatibility warning and are never truncated; this is a caution threshold, not a universal mail-client limit.

**Remove All Students** opens a destructive confirmation for the exact recognized Student IDs, excluding Admin, Teacher, and Unknown members. The enabled service rechecks a fresh roster, uses three workers with individual DELETE calls, and reports per-member failures. No bulk endpoint is assumed, and no removal was executed during this pass.

### Required standard for every multi-record mutation

All current and future multi-record Studio Assistant mutations must present `BatchConfirmationModal` before execution. Normal batch actions (including Requests approve/deny) require explicit Cancel/Confirm with the count and description. Destructive actions additionally require a labeled acknowledgement checkbox; the final action is disabled until acknowledged. No typed course-name confirmation is required. Mount a new modal per operation so acknowledgement cannot carry over. During processing, confirmation and cancellation are disabled. A blocked reason prevents confirmation regardless of acknowledgement. Confirmation is a UI safety layer and never replaces the server-side write guard.

Batch request approve/deny uses this shared confirmation component. Individual quick actions execute directly. Session deletion uses destructive confirmation with required acknowledgement.

Verification for this enhancement: lint, typecheck, 21 isolated tests, build, and live preview using the 31-member AET 4480 roster. Verified BCC-only URL, actual subject/count, Copy feedback, scrollable mobile preview, full roster despite a filtered display, disabled destructive action before/after acknowledgement, acknowledgement reset on reopening, and Escape dismissal. No email client was launched, no email was sent, and no production-data mutation was executed. Draft launching is implemented but OS/mail-client behavior was intentionally not exercised. This earlier verification ran with writes disabled; current capabilities are documented above. Copy was verified by pasting into a local-only search field and comparing the result with the generated URL; the link inspector independently confirmed BCC count and subject.

Main additions: `src/app/users/ClassActions.tsx`, `src/lib/email/class-email.ts`, `src/components/ui/BatchConfirmationModal.tsx`, associated styles, and `tests/class-email.test.mjs`.

## Operational Overview

Overview now contains one Today module: Central Time date/summary, facility → studio activity with proportional session-count rails, an all-dates attention queue (up to three request previews), and a compact navigation-only month calendar. Desktop uses asymmetric primary/secondary columns. Mobile orders summary → requests → activity → calendar, with full-width rows and comfortable calendar targets. Dark uses restrained gold within the existing navy surfaces; Light uses blue accents; Belmont retains its blue/red shell. No global theme or typography system was replaced.

The server page calls the existing calendar and Requests services in parallel. Calendar sessions are filtered using the same selected-day overlap logic as Calendar; overnight sessions count if they overlap today in America/Chicago. Uncertain schedules remain represented with an explicit review note. Session totals sum the displayed studio groups; studio count excludes groups with no known room identity. Failed facilities are marked unavailable, never treated as empty. Each data source can fail independently without removing the other source or calendar navigation. Manual Refresh reloads both via the server; no polling was added.

Studio rows generate `/calendar?date=YYYY-MM-DD&facility=<configured-key>&room=<returned-ID>`. Calendar awaits Next.js searchParams, validates the date and configured facility, and resolves the room only from that day's normalized, facility-matching sessions. Malformed dates fall back to Central today; unknown/mismatched rooms fall back to All Studios. Room-free deep links retain the selected facility. Rooms absent from the requested day's returned data cannot be preselected. Date URLs are bounded to years 1900–9998 for safe next-day calculations.

Mini-calendar month arrows only update local month state. Days are ordinary accessible links; today uses `aria-current="date"`. There are no monthly data reads, dots, density indicators, or heatmaps. Calendar links disable prefetch so rendering a month does not eagerly load every day. Request previews and View All link to `/requests`; no new request-selection protocol was introduced.

The Today placeholder and old Overview shortcut/configuration-only layout were replaced. Today was removed from shared desktop/mobile navigation; `/today` redirects to `/` to preserve bookmarks. Users, Calendar, Requests, and Settings remain available.

Live review on September 19, 2026 showed **24 overlapping sessions across six studios**, with **13 at 34MSE** and **11 at REM**. This differs from raw endpoint result counts because returned sessions outside the selected Central day are excluded consistently with Calendar. The attention queue included a September 22 request, as intended. These are verification observations, not hard-coded UI values.

Verification: lint, typecheck, 26 isolated tests, build; live day/room deep links, malformed date and mismatched room fallback, month navigation and exact-date selection, Today redirect, Dark/Light/Belmont desktop review, and 390px mobile review without horizontal overflow. Isolated rendering tests cover zero requests, unavailable sessions, unavailable requests, partial facilities, and future request dates. No production failure was deliberately induced. Authentication and GET reads only; production writes remain disabled.

Main files: `src/app/page.tsx`, `TodayModule.tsx`, `MiniCalendar.tsx`, `overview.module.css`, `loading.tsx`, `src/lib/overview/activity.ts`, `src/lib/calendar/query.ts`, Calendar page/workspace initialization, shared navigation, and `src/app/today/page.tsx`.

### Calendar List session management

List defaults to the Calendar's selected day and facility/studio context. Start/end dates are inclusive in `America/Chicago`, using the existing DST-aware boundaries. Apply dates fetches only that window through the shared Calendar service. Today resets the dates; Clear Filters resets everything to Central Today. Timeline remains single-day. Existing Calendar deep links remain supported; List filter URL persistence is not implemented.

Facility, studio, selected school user, and case-insensitive partial text filters compose locally. The member picker reuses the five-minute school-member cache without loading class rosters or making requests per keystroke. Read-only inspection found 17 positive session `user` IDs across both facilities, all matching school members and agreeing with available email. That real field is normalized as `userId`; an absent ID can fall back to exact email only when unique in the directory. Names are never treated as identifiers. Unassociated sessions remain visible without a user filter.

Results group by Central date, facility, studio and start time. Overnight overlaps appear once; incomplete records remain inspectable. Selection clears on filter edits, date changes, refresh, and leaving List. Select All selects only displayed records with unambiguous IDs. Missing/duplicate IDs are visible but ineligible for deletion. The preview captures exact records rather than reinterpreting a query.

Session deletion is enabled behind both the global write flag and its capability flag. The destructive confirmation requires acknowledgement and captures exact selected facility/session IDs. The existing adapter sends `DELETE /api/studio/{facilityId}/session/{sessionId}` with no body, checks the guard before authentication/network, and requires a `DELETED` response. Batches use at most three workers, report independent failures by ID, clear selection, and refresh actual data. There is no optimistic removal or simulated success. Single-row selection uses the same confirmation. No real DELETE request was executed during implementation; live execution is reserved for manual testing.

### Enrollment activation, roles, and Class visibility

Enrollment is now enabled through the master and enrollment flags. Server actions resolve school members/classes and call guarded `POST /api/class/{classId}/member` with `{email, uname}`, or `DELETE /api/class/{classId}/member/{userId}` without a body. Add requires an explicit success response; remove additionally requires `type: "DELETED"`. Responses are awaited before refreshing the selected view. All enrollment caches, including the derived user index, are invalidated. No automatic write retries or optimistic deletion are used.

A GET-only inspection of class 8796 returned 77 members with numeric `prm` codes. The administrator confirmed **2 = Admin, 1 = Teacher, 0 = Student**. Roster normalization preserves these roles; missing/unrecognized codes are Unknown. Display order is Admin → Teacher → Student → Unknown, alphabetically within each group. Compact Admin/Teacher chips identify instructional members. School-directory searching and Email Class behavior are unchanged.

Remove All Students captures the exact student IDs shown in its destructive confirmation, independent of roster search. On future execution the server reads a fresh roster and only removes captured IDs still classified Student. Admins, Teachers, Unknown roles, missing members, and new students outside the confirmed selection are excluded. Three workers issue individual removals and report partial failures by member ID. The affected count is the confirmed student count.

The administrator confirmed **session service ID 29 = Class**. Classification uses that ID, never a course name, session title, or artist/course association: regular student bookings can also reference a course. One shared Class chip appears in Schedule summaries, timeline blocks, and List rows without changing timeline geometry.

List defaults to **Hide Classes on**. The filter composes with every existing filter and search; toggling it clears selection/confirmation. Counts and Select All derive only from the visible results. Clear Filters restores this safe default. Explicitly selected visible Class sessions may be deleted through the destructive confirmation; the preview retains their Class chip.

Verification for this pass uses static/code checks, pure local normalization/filter tests, and read-only UI inspection. No enrollment POST, enrollment DELETE, session DELETE, or other production mutation was executed. Enrollment response handling is wired for the administrator's later targeted manual testing.

### Facility Timeline

Schedule now includes a third **Timeline** view, alongside the unchanged Schedule and List workflows. `TimelineView` reuses normalized `CalendarSnapshot` data and the existing `/api/calendar?date=…&end=…` range reader. Day starts with the existing snapshot; date/range changes load both facilities together. Switching facilities does not fetch. Refresh is explicit; only the local clock updates once per minute. There is no new dependency, adapter, polling endpoint, or write path.

`operations-timeline.ts` computes one shared range over both facilities and every displayed day. Bounds round outward to whole hours with one hour of padding; the minimum window is **six hours**, expanded around the bookings. With no timed bookings, the baseline is **9 AM–9 PM**. Gaps within the range remain uncompressed. Day navigation moves one day; 3-Day navigation moves three. Days stack vertically, and only studios with timed bookings on that day render. Invalid schedules remain available in a separate review section instead of being silently omitted.

Timeline follows Schedule's half-open interval inclusion: a booking appears on each operational day it overlaps; an exact midnight end does not appear on the next day. Carry-in bookings start visually at midnight, while outgoing bookings retain their complete end, even beyond midnight. Thus an overnight booking can appear in adjacent day sections, and a range's unique booking count can be lower than the sum of its day counts. Full original dates/times remain in the reusable Session Details modal.

Coordinates are **elapsed minutes from America/Chicago midnight**, resolved with the existing IANA-aware utilities. This preserves true durations through 23- and 25-hour DST days. All days share identical minute bounds and pixels per elapsed hour; their civil-time ruler labels intentionally differ across a DST transition. Repeated hours show CDT/CST, skipped hours are not invented. Midnight has a dashed marker. The current-time line appears in today's grid when within its bounds; active bookings show Now and a restrained accent.

`TimelineDay` assigns deterministic, reusable overlap lanes per studio. Desktop uses horizontal time; at **760px and below**, time becomes vertical with parallel overlap lanes and sticky studio/day context. Unusually long shared ranges may scroll horizontally on desktop; mobile uses page scrolling. Bookings under one hour (and studios with more than four overlap lanes) retain exact scale and also receive separate 44px details controls. All booking buttons have full accessible names/native titles and reuse Session Details. Class chips use the existing normalized `isClass` state and shared component.

The feature uses existing theme tokens for inset grids, raised booking surfaces, edge highlights, restrained gradients, and focus/hover states in Dark, Light, and Belmont. Its view/range/facility state is local; existing Schedule route/deep links remain unchanged. Partial facility failures are reported explicitly, with shared bounds based on available data. Source API omissions cannot be reconstructed locally; no production mutations are performed by this view or its verification.
