# SA-Mask → Equipment Manager: visual ecosystem reference

## 1. Visual identity

Modern, technical operational software with a polished studio/control-room influence: dense but readable, dimensional, tactile, and professional. Subtle glass, controlled gradients, and restrained glow give the workspace character without competing with the work.

Avoid a marketing-site composition, generic admin-template styling, gaming UI, extreme sci-fi HUD, excessive neon, giant empty whitespace, or completely flat utility software. The aim is a **sibling product with its own workflow design**.

**Basis:** current source inspected on October 22, 2026; this is a code-based reference, not a browser-rendered audit. Only Dark and Belmont are covered. Prefer **Schedule → Timeline → Dark** for the clearest expression of the finish. Current implementation takes precedence over older documentation.

Source map (paths relative to the repository root):

- Palette, typography, shared finish: `src/app/globals.css` and `src/app/layout.tsx`.
- Primary reference: `src/app/calendar/TimelineView.tsx`, `TimelineDay.tsx`, and `operations-timeline.module.css`.
- Overview: `src/app/TodayModule.tsx` and `overview.module.css`.
- Schedule / List: `src/app/calendar/CalendarWorkspace.tsx`, `DailyList.tsx`, and `calendar.module.css`. List is a Schedule view, not a separate navigation destination.
- Internal Requests, Users, Academics: their workspace components and CSS modules under `src/app/requests/`, `src/app/users/`, and `src/app/academics/`.
- Shell and controls: `src/components/layout/Navigation.tsx`, `layout.module.css`, and `src/components/ui/{ui,segmented-control,modal}.module.css`.

## 2. Core visual DNA

These ten traits matter more than matching individual components:

1. **A cool, grounded foundation:** near-black/navy in Dark; blue-gray and pale cool surfaces in Belmont.
2. **Visible surface layers:** workspace, panels, rows, and floating elements have distinct depth, without boxing every piece of content.
3. **A small, deliberate accent vocabulary:** warm sand/bronze against Dark; dominant Belmont Blue with restrained Belmont Red in Belmont.
4. **Tactile controls:** fine borders, slight gradients, top-edge highlights, soft shadows, and recessed pressed states.
5. **Inset segmented trays:** a quiet container holds a visibly raised selected option; the selection remains recognizable on hover.
6. **Compact operational composition:** nearby filters and actions, scannable records, and clear grouping rather than oversized whitespace.
7. **Sans-serif interface plus monospace detail:** human-readable content with technical timing, codes, counts, and small labels.
8. **Restrained geometry:** modest rounded controls and more generous panel corners; neither sharp HUD frames nor bubble-like cards.
9. **Selective atmosphere:** glass on shell chrome/action bars, subtle surface gradients, and small localized glows.
10. **An intentional responsive shell:** left sidebar on desktop, bottom tray on mobile, with content reorganized for the device.

## 3. Color palette

Actual base values from `globals.css`; gradients and color mixes build on them.

| Role / current variable | Dark | Belmont |
| --- | --- | --- |
| Background `--bg` | `#0D0E14` | `#D6DEEA` |
| Main surface `--surface-1` | `#151720` | `#FBFCFF` |
| Secondary surface `--surface-2` | `#1C202C` | `#EDF2F9` |
| Further surface contrast `--surface-3` | `#282E3D` | `#DFE7F3` |
| Border `--border` | `#293342` | `#B7C5DA` |
| Main accent `--accent` | `#D2B37D` | `#002469` |
| Filled-action base `--accent-strong` | `#876735` | `#002469` |
| Soft accent `--accent-soft` | `#2C2924` | `#E8EDF7` |
| Primary text `--text-primary` | `#EEECE7` | `#172741` |
| Secondary text `--text-secondary` | `#ADB8C9` | `#4F6079` |
| Muted text `--text-muted` | `#8A98AD` | `#63718A` |
| Secondary brand accent `--brand-secondary` | `#8AAFFF` | `#C9262D` |
| Success `--success` | `#80C9AB` | `#267257` |
| Warning `--warning` | `#E3BC78` | `#865B14` |
| Danger text / solid fill | `#FF9E9E` / `#AE293A` | `#A91E43` / `#A91E43` |

Dark's blue `#8AAFFF` is a secondary accent, **not an existing universal status/time token**. Timeline's current-time line uses `--accent`; live bookings use success; maintenance uses warning. Equipment Manager may use blue for operational information where appropriate, with theme-specific contrast choices.

Preserve the base palette and its character, while adding semantic colors for maintenance state, asset condition, criticality, overdue service, and work-order state. This is color guidance, not color law.

## 4. Typography

**Verified implementation:** `--font-ui` starts with **Inter**, followed by system sans-serif fallbacks. `--font-mono` is currently `"SFMono-Regular", Consolas, monospace`. No font loading declaration or bundled font asset was found in the inspected source/public files; Inter is named but is not guaranteed to render on every machine. **IBM Plex Mono is not currently configured.**

For the sibling product, Inter for headings, buttons, interface text, and content, plus **IBM Plex Mono as an intentional new monospace choice**, is compatible with the intended direction. Load the chosen fonts explicitly; do not describe IBM Plex Mono as an existing SA-Mask dependency.

Keep a simple hierarchy: prominent but compact page title → semibold section/record title → readable body → quieter metadata. Use mono selectively for IDs, timing, codes, counts, and small uppercase tracked labels. Do not turn paragraphs or entire forms into technical readouts.

## 5. General layout language

Desktop uses a compact left sidebar and a main workspace, with operational toolbars close to headings. Panels organize meaningful groups; dense rows and selective cards support scanning. Overview's integrated console, Users' search/detail split, and Academics' relational lists demonstrate that related pages can have different structures.

Mobile stacks content, wraps toolbars, and keeps actions touch-friendly. Equipment Manager should choose its own page templates for assets, queues, inspections, and dashboards.

## 6. Navigation

Retain a vertical desktop sidebar and mobile bottom navigation tray. Small outline icons sit with short labels. Active destinations combine a tinted/gradient fill, accent edge, fine border, and restrained depth; Belmont uses a blue selected fill with white text and a red accent line.

Navigation belongs to the same surface family as the workspace but is clearly separated by an edge. Small count badges use compact mono numerals, a tinted fill, and a subtle raised finish. The mobile tray has selective translucency, blur, and a soft upper shadow. Adapt dimensions, item counts, and overflow to equipment navigation needs.

## 7. Button language

Use Timeline's date controls, facility selector, and Day / 3-Day switch as the strongest reference. Buttons should feel compact, tactile, and deliberate: slight gradient, soft dimensional shadow, subtle top highlight, consistent border/corner treatment, and restrained glow. Preserve usable touch targets when the surrounding layout is dense.

| Category | Shared treatment |
| --- | --- |
| Primary | Filled accent-strong gradient with white text; bronze in Dark, deep blue in Belmont. |
| Secondary | Neutral raised surface gradient, fine border, strong readable text. |
| Ghost | Quiet transparent resting state; surface and border feedback on interaction. |
| Destructive | Dedicated danger palette, not merely the secondary brand color. |
| Success | Success-colored text and border over a soft semantic gradient; avoid loud green slabs everywhere. |
| Icon | Same finish and interaction vocabulary, compact footprint, accessible label and sufficient hit area. |
| Segmented / toggle | Recessed translucent tray, raised selected segment, clear selected text and edge; selection survives hover. |

Hover strengthens the edge and depth; ordinary buttons may lift slightly. Pressing returns them to an inset/recessed state. Segmented controls stay in place. Keyboard focus uses a clear accent outline; disabled controls lose emphasis and elevation. Size and spacing may vary for forms, tickets, and mobile actions. The finish and state clarity matter more than exact dimensions.

## 8. Surfaces / cards / panels

Think **background → main workspace → panel → card → active/floating element** as a perceptual hierarchy, not five mandatory nested boxes. Depth comes from neighboring surface tones, subtle gradient fills, tinted borders, soft shadows, and fine top-edge highlights. Inputs often feel recessed while actions feel raised.

No single card style is mandatory. Asset records, inspection panels, forms, and tickets may have distinct treatments within that hierarchy. Belmont uses pale surfaces against a richer blue-gray canvas; elevation need not mean a numerically darker surface token.

## 9. Glass / gradient / depth

Use restrained glass on selected chrome, small gradients within surfaces, soft shadows, mild glow at meaningful active elements, and slight tactile effects. Keep content legible over stable surfaces. Avoid excessive blur, universal glow, giant decorative gradients, heavy skeuomorphism, and neon UI. Dark can express these effects more strongly; Belmont translates them into crisp institutional edges and cool branded depth.

## 10. Dark theme

Start with `#0D0E14`, layered `#151720` / `#1C202C` / `#282E3D`, warm `#D2B37D` emphasis, and bronze `#876735` filled actions. Off-white `#EEECE7` text and blue-gray metadata provide contrast without stark white everywhere. Secondary blue `#8AAFFF` and subtle blue background atmosphere complement the warm accents.

Schedule → Timeline is the key example: an integrated console, inset switch trays, dimensional bookings, quiet grid lines, and selective active glow. Carry over its finish, not its booking-grid structure or exact status mappings.

## 11. Belmont theme

Belmont is a distinct cool, institutional expression: `#D6DEEA` canvas, near-white `#FBFCFF` panels, `#EDF2F9` supporting surfaces, and deep `#002469` branding. Selected navigation/segments use a blue gradient from `#244C91` toward Belmont Blue; white highlights and blue-tinted shadows give a premium operational feel.

`#C9262D` Belmont Red appears sparingly in accent lines, selected-edge details, brand rules, and faint atmosphere. **Red is a brand accent, not automatically destructive/error.** Current danger is separately defined as `#A91E43`. Preserve this distinction when introducing equipment semantics; Belmont requires its own surface contrast and effect balance, not just a Dark palette substitution.

## 12. Density / spacing

Favor compact controls, nearby related information, and clear visual groups. Separate content through tone, borders, and depth rather than huge gaps. Forms, inspection instructions, technician notes, and work-order screens may legitimately need more vertical breathing room. Preserve readability and task flow over matching SA-Mask's spacing.

## 13. Forms

Carry forward typography, theme colors, recessed fields, refined borders/corners, accent focus treatment, and consistent buttons. SA-Mask's current inputs are useful visual references, not a comprehensive form system. Asset creation, maintenance reports, technician updates, inspections, and multi-step workflows should receive purpose-built structures and validation patterns.

## 14. Maintenance tickets / work orders

**SA-Mask does not define the exact visual design for maintenance tickets.** Its maintenance booking category is not a work-order model. Create new patterns for assignment, technician notes, priority, criticality, service history, due dates, asset condition, and work-order cards. Connect them through typography, palette, surfaces, buttons, dimensionality, and navigation. This creative freedom is intentional.

## 15. Status / semantic color flexibility

New treatments are welcome for **Low / Normal / High / Critical; Open; In Progress; Waiting; Completed; Overdue; Offline; Maintenance; Retired; Draft**. Do not squeeze these into existing SA-Mask chips or reuse a color solely because it exists. Harmonize new semantic tones with each theme, distinguish brand from meaning, and pair color with readable labels or icons. Priority, condition, and workflow state may need separate visual channels.

## 16. Modals / overlays

Use a layered surface, refined border, stronger floating shadow, compact header, and the same action family. Current dialogs combine a panel gradient, top-edge highlight, tinted header, and darkened backdrop with modest blur. Preserve mobile-friendly width, scrollable content, clear focus, and accessible dismissal. Dimensions and interior layouts are free to follow the task.

## 17. Mobile philosophy

**Design mobile intentionally.** Current Timeline rotates horizontal time lanes into vertical tracks; Requests replaces its desktop table with cards; Overview moves attention content before activity; Users stacks its search/detail panels. These are examples of adaptation, not templates to copy.

Retain the bottom tray, stacked readable content, compact but touch-friendly actions, reduced horizontal complexity, and visual richness. Equipment workflows may introduce their own mobile inspection, scanning, capture, or technician-action patterns.

## 18. Creative freedom

**This is a visual reference, not a restrictive design system. Equipment Manager should feel like a sibling, not a duplicate.** New components are encouraged for asset detail pages, forms, maintenance tickets, dashboards, maintenance queues, work-order timelines, condition/criticality visualization, and technician workflows.

Anchor inventions to the font roles, Dark/Belmont base palettes, tactile button language, navigation model, restrained dimensional/glass/gradient character, and operational density. Let the work determine the screen structure.

## 19. Reusable starting tokens

Small seed palette, not a frozen token system. Names below are convenient aliases: `--surface` = current `--surface-1`, `--surface-raised` = `--surface-2`, `--text` = `--text-primary`, `--muted` = `--text-muted`. `--blue` is Dark's current secondary brand accent, not a prescribed status. Belmont brand aliases map to `--accent` and `--brand-secondary`.

```css
[data-theme="dark"] {
  --bg: #0d0e14;
  --surface: #151720;
  --surface-raised: #1c202c;
  --border: #293342;
  --accent: #d2b37d;
  --text: #eeece7;
  --muted: #8a98ad;
  --blue: #8aafff;
}
[data-theme="belmont"] {
  --bg: #d6deea;
  --surface: #fbfcff;
  --surface-raised: #edf2f9;
  --border: #b7c5da;
  --brand-blue: #002469;
  --brand-red: #c9262d;
  --accent: var(--brand-blue);
  --text: #172741;
  --muted: #63718a;
}
```

## 20. Small CSS example

One illustrative secondary button using the seed tokens: gradient + border + depth + restrained hover glow. This adapts the source's finish; it is not a required component or a complete interaction specification.

```css
.ecosystem-button {
  color: var(--text);
  background: linear-gradient(180deg, var(--surface-raised), var(--surface));
  border: 1px solid var(--border);
  border-radius: .4rem;
  padding: .6rem .9rem;
  font: inherit;
  font-weight: 600;
  box-shadow: inset 0 1px 0 #ffffff18, 0 2px 3px #00000018;
}
.ecosystem-button:enabled:hover {
  border-color: var(--accent);
  box-shadow: inset 0 1px 0 #ffffff18,
    0 3px 10px color-mix(in srgb, var(--accent) 14%, transparent);
}
.ecosystem-button:enabled:active { box-shadow: inset 0 2px 4px #00000024; }
.ecosystem-button:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
```

## 21. Ecosystem checklist

Does this feel like part of the same ecosystem?

- [ ] Are Inter and the chosen monospace face used consistently in their intended roles, with fonts actually loaded? (IBM Plex Mono is a proposed sibling choice.)
- [ ] Does Dark retain the near-black/navy foundation and warm emphasis?
- [ ] Does Belmont clearly express Belmont Blue and restrained Belmont Red over cool surfaces?
- [ ] Do buttons and segmented controls feel tactile and related to Timeline?
- [ ] Is desktop navigation sidebar-based and mobile navigation bottom-tray based?
- [ ] Are surfaces layered, with selective cards rather than mandatory boxes everywhere?
- [ ] Are gradients, glass, and glow restrained enough to support reading?
- [ ] Is the interface compact enough for operations while allowing comfortable forms?
- [ ] Are semantic states legible, theme-aware, and distinguishable beyond color?
- [ ] Has mobile been intentionally reorganized for the task?
- [ ] Does the page solve its own equipment workflow instead of copying SA-Mask unnecessarily?
