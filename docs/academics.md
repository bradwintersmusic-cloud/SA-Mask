# Read-only Academics

`/academics` is a dynamic server page, with a loading boundary and a client browsing workspace. Navigation includes Academics on desktop and the six-item mobile bar. Classes is the default tab. There are no actions, mutation routes, write flags, or calendar-block creation controls.

## Models and reads

`academic-model.ts` owns validation, normalization, relationship queries, room resolution, and Project classification. The server-only `academics.ts` service runs five aggregate reads concurrently through the existing authenticated GET client:

- `/api/school/7806/class`, via `classes.ts`, also reused by the existing enrollment adapter without changing its caching or normalization.
- `/api/studio/7807/project` and `/api/studio/7808/project`, derived from the centralized facility configuration.
- `/api/studio/7807/share` and `/api/studio/7808/share`, derived from the centralized facility configuration.

The Class organization comes from `config/school.ts`; Projects and Shares use facility organizations. Project results are combined by ID so overlapping facility responses do not duplicate lists or counts. Each facility is checked independently for completeness. Conflicting Class references for the same Project ID are surfaced and left unlinked rather than guessed. No per-Class, per-Project, or per-Share network calls are made.

Normalized Class fields: ID, code, name, snippet, created, lastBooking, createdBy. Project fields: ID, name, code, classId, assigned, status, bookingType, type, shareIds. Share fields: ID, facility ID/name, projectId, name/code/snippet, created/expire, roomIds, customHours, autoBook, minSessionHours/maxSessionHours, and seven normalized weekday availability entries.

Project `artist` is mapped only in the adapter to `classId`. A Share references a Project only when `ctype === "p"`, through `content`. Share → Class always traverses Project → Class. No names are used to infer associations. Malformed Project Share references fail that facility safely. Unresolved links remain visible without broken navigation buttons.

`createAcademicModel` provides Class/Project/Share indexes and getProjectsForClass, getSharesForProject, getSharesForClass, getRoomsForShare, getProjectType, getClassForProject, and getProjectForShare. Project type is derived after Share reads settle: one or more known Shares means Drag and Drop; no Shares with complete facility data means Claimable; no Shares with failed/unverified Share data means Unknown. Calendar blocks are never consulted. Known positive links remain valid during a partial failure.

## Browsing

Class cards show Project/Share counts and open in-page details with Back to Classes. Class details group associated Projects and Shares. Project modals show code, Class, type, assigned/status, and zero or more Share links with rooms. Share modals show relationships, facility, all rooms, dates, flags, hours, and duration limits. One discriminated modal state swaps between Project and Share dialogs. Return to Class closes the dialog, switches to Classes, and focuses the selected Class heading. Missing associations omit navigation buttons.

All three lists use case-insensitive partial field search, never JSON. Classes search code/name/snippet and sort alphabetically. Projects search name/code and associated Class name/code; sorts include Class A–Z/Z–A, Type, and Name. Shares search name/code/snippet, Project/Class fields, facility and resolved room names; sorts include Class, Studio, Name and Expiration.

The existing shared buttons, badges, inputs, select, segmented-control surface and native-dialog Modal are reused. Tabs implement arrow/Home/End navigation and roving focus. Project chips include text and distinguish Drag and Drop, Claimable and Unknown. Lists stack at mobile widths; modal content scrolls within the existing viewport-constrained modal. Styling uses the existing Dark, Light and Belmont tokens.

## API findings and limitations (October 3, 2026)

Observed authenticated response counts after the administrator clarified facility-specific Project reads: **57 Classes; 128 Projects from each facility; 8 34MSE Shares; 27 REM Shares**. Each count matched its response's `data.total`. Both facility Project responses contained the same 128 IDs with identical normalized fields, producing **128 unique Projects: 35 Drag and Drop and 93 Claimable**. All 128 Projects resolve to loaded Classes, and all 35 Shares resolve to loaded Projects; no completeness issues remain in this live snapshot. The school Project endpoint previously returned zero and is no longer used.

`data.items` is an ID-keyed object, with `total`, `start`, `end` alongside it. Start/end contain first/last record IDs, including composite Share IDs, not numeric offsets. Only item records are normalized. Completeness requires a nonmissing total matching the returned unique record count. A missing/mismatched total or duplicates produces a warning; partial Share data prevents negative Claimable classification. No supported continuation protocol was found in the existing code or responses, so no speculative pagination parameters were added. If a future response is truncated, loaded records remain browsable with an explicit completeness limitation.

Share `days` uses named weekdays with 0/1 flags; `hours` uses weekday objects with start/end clocks. Clocks are presented in 12-hour format. Missing flags/times remain unknown, unavailable days are labeled, and noncustom hours are not presented as an active custom override. **The administrator confirmed min_sess/max_sess are hours** during this implementation. Date metadata uses the existing Central Time formatter. Missing/invalid dates are not interpreted as perpetual access.

Rooms use the shared room-display helper, including REM Edit Bay B11–B14 aliases. Existing README-verified 34MSE names (10475 Columbia Studio A and 10476 Quonset Hut Studio) now serve as shared fallback names when source names are absent. No speculative room endpoint was called. 34MSE room IDs 10577–10582 observed in Shares have no verified names in the repository and remain visible using the shared `Studio #ID` fallback. Multiple rooms are preserved.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm test` (67 passing tests, including facility Project deduplication, failed/truncated responses, conflicting Class links, academic relationships and the existing suite)
- `npm run build`
- `npm run start -- --port 3001` and browser route load
- Corrected aggregate live reads: 57 Classes, 128 unique Projects, 35 Shares, all relationships resolved, no completeness issues.
- Live Class search/drill-in/back, Share room-alias search, studio sort, Share modal, missing-link handling, dates and duration units.
- Temporary synthetic preview (removed before final build): Class → Projects/Shares, Claimable with zero blocks, multiple Shares, Project → Share → Project, both Return to Class paths, Project search/Type sort, one active dialog, keyboard tab navigation.
- Dark, Light and Belmont visual review; 390px mobile review, modal scrolling and no document horizontal overflow.

Only authentication and GET reads touched production. No production data mutation occurred.

Main files: `src/app/academics/{page.tsx,loading.tsx,AcademicsWorkspace.tsx,academics.module.css}`, `src/lib/studio-assistant/{academics.ts,academic-model.ts,classes.ts}`, shared navigation/mobile grid/room-display configuration, the existing enrollment Class fetch call, and `tests/academics.test.mjs` with its adapter harness.
