# AEGIS v4.1 — UI/UX audit, redesign and validation report

Branch: `review/v4.1` · Date: 2026-11-15 · Scope: presentation and interaction only.
Domain types (`contracts/types.ts`), reducer actions and guards, engines, validation,
persistence/migration and simulator behaviour are unchanged. Persisted `Section` ids
are unchanged, so saved v2–v4 state still restores.

## 1. What was reviewed

Every screen reachable on this branch, in all three role contexts (Astronaut, Crew Medical
Officer, Mission Overview) and both data workspaces (observed, synthetic):
shell/navigation, Dashboard, Crew Health / My Health, Events & Alerts (alerts, medical
encounters, mission events), Daily Assessments (typing, reaction, procedure), Human
Performance Assessment, Visual Assessment, Physical Performance, Anatomy, Sensor
Integration, Spacecraft, Mission Simulation, Research & Sources, storage-recovery banner.
The review also covered forms, tables, charts, empty states, feedback, keyboard use and
responsive behaviour.

**Not present on `review/v4.1`** (the brief mentions them, so they are listed here to
avoid implying they were redesigned): preventive plans/adherence, inventory operations,
knowledge search/assistant, profile management, mission configuration, rule
configuration, baseline acceptance. `MissionState.resources` exists in the contract but
has no UI on this branch; none was added, because adding capabilities is out of scope.

## 2. Findings

Impact key: **N** navigation · **C** comprehension · **T** task completion · **S** operational safety.

| # | Problem and location | Why it creates friction | Principle | Impact | Redesign |
|---|---|---|---|---|---|
| 1 | Flat list of 12 numbered nav items (`01`–`12`); numbers carry no meaning | Users must scan and remember 12 peers with no grouping by task | Recognition over recall; information hierarchy | N | Four labelled groups: **Health**, **Record data**, **Mission**, **Reference**, plus Overview. Icons replace numbers |
| 2 | Four overlapping "assessment" names: *Daily Assessments*, *Human Performance Assessment*, *Visual Assessment*, *Physical Performance* | Users cannot predict which page does what; *assessment* also suggests clinical evaluation | Match between system and real world; consistency | N, C | Task names: **Cognitive Tests**, **Integrated Review**, **Eye Observation**, **Movement Check**. *Anatomy* → **Body Systems**, *Sensor Integration* → **Sensors & Exams** |
| 3 | Page H1s were slogans ("A clear view of crew health.", "Explain, act, follow up.", "A reproducible mission.") and differed from nav labels | No confirmation of location after navigating | Visibility of system status; consistency | N, C | Every H1 equals its nav label; breadcrumb *Role / Group / Page* in the topbar |
| 4 | Observed vs synthetic was shown only by a small topbar badge in the same colour as everything else | Real entries could be made while believing the workspace was the simulation, or the reverse | Visibility of system status; error prevention | **S** | Persistent full-width **workspace banner** on every page: teal + round mark for observed; violet hatched band + diamond mark for synthetic, plus mission clock state and a left rule on the content area. Origin badges use the same text + shape on every record |
| 5 | Dashboard showed hard-coded "Connected" status dots ("Foundation readiness") | Status indicators did not reflect state, so they claimed things the system had not checked | Visibility of system status (truthfulness) | C, S | Overview built only from real data: new alerts, open cases, latest observation, record counts. A note says that few records do not mean good health |
| 6 | In CMO/mission contexts the crew member could be changed only on Crew Health, yet Alerts, Integrated Review, Body Systems, Sensors and Cognitive Tests all act on the selection | Users acted on the wrong subject or had to leave the page to switch | User control; recognition over recall | T, S | Global **Crew member** selector in the topbar context group. It keeps the current page by re-dispatching `navigate` after the existing `crew/select`. The astronaut context shows *Subject: <self> (you)* and no selector, as before |
| 7 | Action feedback (`notice`) appeared at the top of the page; the main forms sit low on long pages | Users did not see "saved" or "Not saved: …" messages | Visibility of system status; error recovery | T | Toast anchored bottom-right. Successes use `role=status` and auto-dismiss after 8 s. Rejections use `role=alert`, critical styling, and stay until dismissed |
| 8 | Raw enums and ISO strings everywhere (`resting_heart_rate`, `under_review`, `observed / manual / valid`, `2026-11-14T08:03:00.000Z`) | High reading cost; technical identifiers look like errors | Match with real world; cognitive load | C | Display-label layer (`format.ts`) for metrics, sources, origins, quality and statuses; consistent `<time>` with the full UTC value in a tooltip. Stored values are unchanged |
| 9 | Disclaimers and method notes had the same visual weight as data (`sample-note` on every panel) | Important values got lost; the warnings themselves were ignored | Aesthetic & minimalist design; progressive disclosure | C | Three tiers: (a) **safety labels always visible** as badges (Demonstration only, Experimental, Synthetic, Missing). (b) Short muted notes. (c) Method/scoring/limitation detail in **Disclosure** panels. No safety statement was removed |
| 10 | Alert level was a neutral grey badge; status, demo flag and next step had equal weight; evidence was raw UUIDs | The most important item (what to check next) was hard to find | Information hierarchy; visibility | C, S | Alert card: severity badge (icon + text + left rule), New/Acknowledged badge, demo badge, **Next check** callout, evidence and sources in a disclosure. New items sort first, with a New/All filter and a nav badge such as "Alerts & Cases, 1 new" |
| 11 | Case status was text only ("Case: under review"); the prerequisites for resolution were hidden until an error | Users did not know why *Resolve* failed or what came next | Visibility of status; error prevention | T | 3-step progress (Open → Under review → Resolved), a link from each alert to its case, and inline hints: a completed follow-up is required; resolution is CMO-only |
| 12 | Observation form: seven fields in one flat column; optional provenance fields looked required; the note field came after them | Slow entry; unclear what affects baseline qualification | Progressive disclosure; form design | T | Indicator + value first (value hint states the entry range is *not* a health range), then note, then a **Measurement context** fieldset explaining it is needed for qualified baselines. Errors are shown inline (`role=alert`, `aria-invalid`). The form is sticky beside the record on wide screens |
| 13 | Native `window.confirm()` for scenario reset and for replacing incompatible storage | Blocking browser dialogs, inconsistent with the UI, and opaque about consequences | Consistency; user control | T | Inline confirmation blocks with a consequence callout and *Reset and load* / *Cancel*. Inputs lock while confirming |
| 14 | Mission Overview repeated the full spacecraft cutaway on the Dashboard and on Spacecraft | Duplicated entry points and a long page | Minimalist design | N | Overview shows a compact compartment table (occupants + review flag) and simulation status, each with a link to its page. The cutaway lives only on Spacecraft |
| 15 | On narrow screens, all 12 nav buttons wrapped above the content | Content pushed below the fold on phones | Responsive design | N | Off-canvas drawer below 920 px (menu button, scrim, Esc, closes on navigate). Context controls stack; tables scroll inside their own focusable region |
| 16 | Navigation items silently appeared or disappeared by role | Users wondered where Spacecraft/Simulator went | Visibility; help users recognise | N | A sidebar hint explains that Spacecraft and Simulator live in Mission Overview. Visibility rules come from `navigation.ts`, which mirrors the reducer guards |
| 17 | Charts: bare polyline, two numbers and "Time →" | No readable axis; hard to compare | Data-ink, legibility | C | Gridlines, min/mid/max ticks, start/end timestamps, point markers, and a caption naming metric, unit and gaps. The accessible text alternative is kept |
| 18 | Body-system and test toggles styled as generic buttons | Selection state hard to see | Clear affordances | C | Segmented control with `aria-pressed` styling |
| 19 | Tables: no header contrast; only one table was keyboard-scrollable | Hard to scan; keyboard users could not scroll some tables | Accessibility | C | Sticky header row, row hover, tabular numerals, and every wide table wrapped in a labelled focusable region |

## 3. Information architecture

```
Overview                      what needs attention, latest readings, common tasks
Health
  My Health / Crew Health     readings, trend + table, observation form, histories
  Alerts & Cases              detections → acknowledge → case review/follow-up/resolve
  Integrated Review           latest results vs individual compatible baselines
  Body Systems                same records grouped by body system
Record data
  Cognitive Tests             typing · reaction · procedure input
  Eye Observation   [Camera]  optional, observed workspace only
  Movement Check    [Camera]  optional, observed workspace only
  Sensors & Exams             manual examination reports · synthetic demo adapters
Mission  (Mission Overview context only)
  Spacecraft                  compartments, crew positions, cabin readings
  Simulator                   playback, speed, advance, scenario + seed
Reference
  Research & Sources          rule register, sources, limitations
```

Context is always visible in the topbar (*Viewing as* role · *Data* workspace ·
*Crew member* / *Subject*) and below it in the workspace banner. Cross-links put the next
logical step near the information it acts on: Overview tiles → Alerts/Health; Integrated
Review *Add evidence* → Health, Cognitive Tests, Eye Observation, Sensors, Alerts; alert →
related case; Sensors → Integrated Review.

## 4. Preserved behaviour and safety constraints

- All 12 section ids, reducer guards (`spacecraft`/`simulation` mission-only,
  `visual`/`physical` not in mission) and role restrictions (astronaut sees only self;
  resolution requires CMO) are unchanged. The nav derives from the same rules.
- Observed and synthetic records are still separated by the reducer. The UI only makes
  the active workspace more visible.
- Every `demonstrationOnly` item still shows a visible label; experimental camera
  results still carry *Experimental*; missing values still render as *No data* /
  *Unavailable*, never 0. No thresholds, rules, recommendations or diagnoses were added.
- Camera remains opt-in, on-device and unstored; all other features work without it.
- No new dependency, remote API or contract change.

## 5. Validation

| Check | Command / method | Result |
|---|---|---|
| Lint | `npm run lint` (`--max-warnings 0`) | Pass |
| Type check | `npm run typecheck` (`tsc -b`) | Pass |
| Unit/integration tests | `npm run test` | **109 / 109 pass** (14 files). The baseline before the redesign was 104 / 104 |
| Production build | `npm run build` | Pass |
| Browser e2e (Chrome, dev server) | Scripted DOM interaction in a real tab | Pass, see below |

Existing tests changed only where labels were renamed (nav names, *Integrated Review*
heading, status labels now sentence case) and where `window.confirm` became the inline
*Reset and load* step. All assertions about behaviour, storage contents and provenance
are unchanged. New `src/app/Shell.test.tsx` covers nav grouping per role, the workspace
banner, subject switching that stays on the page, cancel/confirm of a scenario reset, and
the alert count in the nav and Overview.

Browser workflows verified in Chrome at 1707 px and in a 400 px viewport:
1. Every page in astronaut and mission contexts renders; H1 = nav label = breadcrumb leaf.
   No horizontal page overflow at either width (wide tables scroll in their own region).
2. Astronaut: save observation → success toast (`role=status`) → tile shows the value.
3. Mission: Simulator → sleep-disruption → *Load scenario* → *Reset and load* → advance
   3 min → nav badge "1" → Alerts & Cases shows *Recovery indicators changed* and its case
   → Acknowledge disables.
4. CMO, synthetic: Begin review → record a completed follow-up → Resolve → progress shows
   *Resolved*.
5. 400 px: drawer hidden by default, opens with the menu button, closes on navigation.
   Skip link becomes visible on focus. Focus ring renders on nav items.
6. No console errors or warnings during these flows.
7. Token contrast computed for all text/tone colours on all surfaces: minimum 5.63:1 (AA).

**Not verified:** screenshots could not be captured (the browser extension's screenshot
call timed out), so the visual appearance was checked through computed styles and
layout geometry rather than by eye. Camera sessions were exercised only through the
existing mocked tests, not with a real webcam. Screen-reader output was not tested with
an actual screen reader.

## 6. Known limitations / follow-ups

- No light theme; the palette is dark-only, as before.
- Cognitive tests are still stacked on one page. Tabs were rejected because switching
  tabs during a running timed test would silently cancel it.
- Evidence still references observation ids. Linking each id to its record would need a
  record-detail view, which does not exist yet.
