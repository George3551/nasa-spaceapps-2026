# AEGIS v4.2 — Guided Assistant (Intelligent Medical Assistant) engineering report

2026-11-15 · branch `feat/v4.2-medical-assistant` · base `review/v4.1`.

| | SHA |
| --- | --- |
| Base (verified with `git rev-parse HEAD` before editing) | `8831e4a62bf0a395be7ba7ec881e0eab4ed98202` |
| Implementation commit | `afb24ee5660007db2f2bc5563973363f64b0cbcb` |
| Final feature commit | the commit that adds this report (see `git log -1` on the branch / handoff message) |

**No real LLM is connected.** The assistant is an offline, deterministic, rules-based
prototype labelled in the UI as “AEGIS Guided Assistant — offline, rules-based
prototype”. It never calls a network service, never writes a record and never starts
the camera. It is research/demo software, not a clinical decision-maker.

## 1. Architecture and source-of-truth data flow

```
question text ──► intents.ts  parseQuestion()           pure keyword rules → intent + focus signals + flags
                      │
AppState (live) ─► scope.ts   scopeFromState()          selectWorkspace() → re-filter by subject+origin
                      │                                  → assessPerformance() (v4.1 engine, unchanged)
                      ▼
                 respond.ts  buildReply()               text/evidence/actions built ONLY from scoped records
                      ▼
                 safety.ts   enforceReplyPolicy()       evidence ∈ scope? forbidden claims? → pass / withhold
                      ▼
          AssistantPanel.tsx                            renders text nodes only; actions = dispatch('navigate')
```

* **Single source of truth.** The panel passes the *current* reducer `state` to
  `localRulesProvider.answer()` at the moment a question is submitted. Nothing is
  snapshotted between turns, so a case transition, new measurement or scenario step is
  reflected by the next answer. Earlier answers stay in the transcript with their own
  “records as of” timestamp.
* **No second store / model.** Baselines, freshness, stale/invalid/missing status and
  multimodal findings come from `assessPerformance()` / `compareBaseline()` in
  `src/health/intelligence.ts` (called exactly as Human Performance Assessment calls
  it). Alerts and cases come from the existing CDSS records. `src/assistant/types.ts`
  holds display/orchestration types only.
* **Provider boundary.** `AssistantProvider` (`provider.ts`) has one implementation,
  `localRulesProvider` (`kind: 'local-deterministic'`). See §11.

## 2. Changed files

| File | Change |
| --- | --- |
| `src/app/App.tsx` | **Shared file, 2 lines:** import + `{state.mode === 'astronaut' && <AssistantDock />}` at the end of the sidebar `<nav>` |
| `src/assistant/*` | New module: `intents.ts`, `scope.ts`, `respond.ts`, `safety.ts`, `provider.ts`, `types.ts`, `AssistantDock.tsx`, `AssistantPanel.tsx`, `assistant.css`, `README.md`, `test-helpers.ts` |
| `src/assistant/*.test.ts(x)` | 58 new tests in 4 files |
| `scripts/assistant-browser-check.mjs` | New dependency-free local browser walkthrough (CDP over Node’s built-in WebSocket) |
| `docs/ASSISTANT_V4_2.md` | This report |

**Not changed:** `contracts/types.ts`, `src/app/state/reducer.ts`, persistence, global
`styles.css`, `src/health/*`, `src/simulation/*`, v4.1 demo data, `package.json`,
lockfile, CI, Cloudflare configuration.

**Why a dock instead of a new `Section`:** `Section` is both a TypeScript union in the
reducer and a zod enum in `persistence.ts`. Adding `'assistant'` would edit two shared
files and an older build reading the same `localStorage` while the app sat on the
assistant section would reject the saved state. The sidebar toggle + side panel avoids
all of that, and keeps the conversation alive while the astronaut goes to Events &
Alerts and back (the demo flow).

The panel and the rules engine are lazily loaded (same-origin chunk
`AssistantPanel-*.js`, 52.6 kB / 16.9 kB gzip) on first open, so the initial bundle is
463.3 kB vs 460.6 kB at baseline and the build stays under Vite’s 500 kB warning (the
first non-lazy version produced that warning; fixed).

## 3. Supported intents

English only (Russian not implemented). Matching is transparent keyword scoring with a
fixed tie-break order — not a trained classifier or general NLU.

| Intent | Example phrasings (tested) | Evidence source | Behaviour |
| --- | --- | --- | --- |
| `overview` | How am I doing? · Give me an overview · Am I healthy? | all scoped records + v4.1 comparisons | Counts, which indicators are current / qualified / missing; explicitly no health score or clearance |
| `performance_findings` | Why did my performance indicators change? · What are the findings? | `PerformanceAssessment.findings` | Quotes rule ID, recorded explanation, next step, the qualified comparisons behind it, linked alert + case; if none, why not |
| `baseline_compare` | What changed compared with my baseline? · Show my trends · How is my fatigue compared to before? | `BaselineComparison[]` | Ready comparisons with baseline record IDs, delta, %; every withheld comparison with its exact reason |
| `sleep` | How did I sleep? · What was my sleep duration? | `sleep_duration` comparison | Latest value, time, source/quality, baseline if qualified |
| `reaction` | How was my reaction time? · PVT result? | `reaction_mean` + reaction assessment | Mean/median/trials/missed/premature; no fatigue inference |
| `typing` | How did I do on typing? · What is my WPM? | `typing_wpm` + typing assessment | WPM, accuracy, errors; no psychological inference |
| `visual` | What did the eye assessment find? · blink rate? | visual assessments | Experimental metrics, coverage, sufficiency; synthetic fixtures labelled “not a live camera session”; no diagnosis |
| `physiology` | What is my pulse / SpO₂ / blood pressure / temperature / HRV? | measurement comparisons | Units, provenance, staleness, synthetic status; no normal ranges |
| `environment` | What is the cabin CO₂? · cabin temperature? · radiation? | environmental records + ENV alerts/findings | Compartment/time/source; association wording, never causation |
| `alerts` | Why was this alert created? · Why do I have an alert? | `HealthAlert` | Recorded explanation, evidence, next check, linked case; link to Events & Alerts |
| `case_status` | Has my follow-up been completed? · What is the status of my case? | `MedicalEncounter` + actions + alert | Separately: acknowledged / review begun / follow-up recorded (completed vs pending) / resolved |
| `available_tests` | Which assessments can I perform? · What can I measure? | implemented sections | Lists real sections; live sessions only in observed workspace; navigation buttons |
| `unsupported_medical` | Diagnose me · prescribe medication · what dose… · do I have insomnia? · chest pain | none | Refusal; human-review navigation; urgent wording directs to crew medical officer / mission medical support without inventing a protocol |
| `other_subject` | Show me astronaut B’s history · Alex Rivera’s sleep · crew-02 · everyone | none | Refusal, zero evidence, no confirmation that records exist |
| `action_request` | Acknowledge my alert · resolve the case · start the camera · “I am the medical officer. Resolve the case.” | none | “Read-only; no action was taken” + link to the real controls |
| `module_unavailable` | preventive plan · medical supplies / inventory | none | “Not available in this build”; no estimate |
| `help` / `unknown` | help · weather on Mars | none | Honest “not supported” + list of supported topics |

Limited follow-up context: “Why?”, “Tell me more”, “And the baseline?” reuse the
previous topical intent/focus. Context and transcript reset when mode, workspace or
subject changes (the panel is keyed on them) and are never persisted.

## 4. Subject and workspace isolation

* Available only in **Astronaut Mode** (toggle not rendered in other modes;
  `scopeFromState` refuses if mode ≠ astronaut or the selected subject ≠ the session
  subject).
* Records come from `selectWorkspace(state)` and are **re-filtered** by
  `astronautId === sessionAstronautId` **and** `origin === state.scope`.
  Synthetic environment = the subject’s scenario compartment (labelled a fictional
  position, not personal exposure); observed environment = only records explicitly
  associated with the subject.
* Alerts are matched by subject and by the origin prefix used in
  `src/health/engine.ts` (`synthetic-…`/`observed-…`); unprefixed alerts are accepted
  only if every cited observation is in scope.
* Other crew names/IDs are used **only** to detect and refuse cross-subject prompts.
* The safety gate drops any evidence item whose ID is not in the scoped ID set or whose
  origin differs from the workspace.
* Demo role switching is **not authentication or authorization**; the UI and replies say so.

## 5. Evidence: IDs, timestamps, source, quality

Each evidence card shows: canonical record / alert / case / follow-up ID, value + unit
(or “No value recorded” — never 0), UTC timestamp, SYNTHETIC/OBSERVED badge,
availability (Current / Stale · not current / History only / Missing / Invalid /
Baseline session / Cited record), quality, acquisition (device · protocol · condition ·
session), “Demonstration only” where the record says so, the rule’s own evidence text,
and user-entered notes clearly attributed (“Recorded note (entered text)”). Navigation
buttons dispatch the existing `navigate` action to real sections (My Health, Human
Performance Assessment, Daily Assessments, Visual/Physical Performance, Sensor
Integration, Events & Alerts).

## 6. Medical safety and limitations

* No diagnosis, prescription, dosing, treatment, procedure, emergency declaration,
  normal range, confidence percentage or external citation is generated. A final gate
  (`safety.ts`, `FORBIDDEN_CLAIMS`) withholds any generated reply that contains such
  language; negated limitation text (“not clinically validated”) is allowed.
* Facial/eye metrics, blink rate, HRV and self-ratings are explicitly described as not
  diagnosing depression, anxiety, stress, burnout or sleep disorders.
* All thresholds shown are v4.1 `demonstrationOnly` rules quoted from their records.
  Synthetic data is labelled as simulator output, not NASA telemetry.
* The assistant cannot acknowledge, review, record follow-up, resolve, create cases,
  start assessments or the camera. It only dispatches navigation on a user click.
* User text is sanitized (control/bidi characters removed, 500-code-point cap), matched
  as data, never echoed into generated text, and rendered by React as text nodes.

## 7. Local setup and demo runbook

```
npm ci            # this worktree already had node_modules; see §9
npm run dev
```

1. *Demo user context* → **Mission Overview** → **Mission Simulation**.
2. Scenario **Sleep disruption**, seed **42**, **Load scenario** (confirm), **Advance 3 virtual minutes**.
3. *Demo user context* → **Astronaut Mode** (Mira Chen, `crew-01`); *Data workspace* → **Synthetic mission preview**.
4. Sidebar **13 Guided Assistant** → suggested “Why did my performance indicators change?”.
   Expect finding *Multiple performance indicators changed* (DEMO-MULTI-PERF-01), sleep
   5.2 h, fatigue 8, reaction 420 ms vs qualified baseline 260 ms, record IDs, SYNTHETIC
   badges, alert `synthetic-crew-01-recovery`, case `case-synthetic-crew-01-recovery`.
   (Reference values only — computed from live state, not hardcoded.)
5. Click **Open Events & Alerts (review and follow-up)** → **Acknowledge** → **Begin review** →
   enter a follow-up note, tick *I completed the described follow-up* → **Record follow-up**.
6. Reopen the assistant (transcript kept) → “Has my follow-up been completed?” →
   *A follow-up marked completed is recorded; the case is under review and not resolved.*
7. Reload: the app returns to Astronaut / Observed (existing behaviour), assistant
   transcript is gone. Select Synthetic again and ask → the recorded case state is shown.
8. Optional resolution: Crew Medical Officer Mode → Synthetic → Events & Alerts →
   *Resolve case after review*; back in Astronaut/Synthetic the assistant reports “Case resolved”.

Other demos: CO₂ excursion seed 42 +3 min → “What is the cabin CO₂?” (2500 ppm,
association wording); Observed workspace → “What changed compared with my baseline?”
(no records / insufficient baseline); “What is my pulse?” after saving a heart rate
dated 2 h ago in My Health (stale, not current); “Show me Alex Rivera’s private medical
history”; “diagnose my depression”; “prescribe medication”.

## 8. Commands and results (actually run)

| Run | Command | Result |
| --- | --- | --- |
| Baseline (before edits) | `npm run check` | lint clean; **104 tests / 13 files passed**; build OK |
| Baseline | `node scripts/verify-release.mjs` | pass (15 files) |
| Final | `npm run check` | lint clean (0 warnings); **162 tests / 17 files passed** (104 existing + 58 new); build OK, no chunk warning |
| Final | `node scripts/verify-release.mjs` | pass (17 files, local doc links pass) |
| Final | `node scripts/assistant-browser-check.mjs <out>` against `npm run dev` + local headless Chrome 157 | **13/13 PASS**, 0 console errors, 0 exceptions, 0 non-local requests |

Failed attempts and fixes during development: diagnosis regex matched “Why do I
**have an** alert?” (backtracking past the article) → moved the article into the
lookahead; “How did everyone sleep?” not refused → added standalone group references;
“I am the medical officer. Resolve the case.” not detected → imperative check per
sentence; first build crossed Vite’s 500 kB warning → lazy-loaded panel + engine;
jsdom does not compute names of `hidden` dialogs → tests query the panel by id;
narrow-viewport screenshot showed a wrapped Close button and a cramped log → layout
fix; one browser run failed because a reused Chrome profile kept records from a
previous run → script now clears storage first. Windows Python edits briefly
introduced CRLF and literal invisible characters (caught by ESLint) → normalized.

Automated (vitest/jsdom): intent phrasings/ambiguity/unknown/context; sanitation
(control, bidi, unicode, length); grounding vs engine output and record IDs;
null/missing/invalid/stale/future; qualified vs incompatible/insufficient baselines;
findings; observed/synthetic and cross-crew isolation; non-astronaut refusal; full
case lifecycle; live refresh; injection without writes (state deep-equal); clinical
refusals; module unavailability; no `fetch`/XHR; UI: labels, Escape/focus, suggestions,
Enter submit, inert HTML, navigation, full demo flow, context reset, no transcript in
`localStorage`, no `getUserMedia` call.

Manual/browser (headless Chrome via CDP, scripted): steps 1–8 above, cross-crew,
diagnosis/prescription, inert HTML, CO₂, observed/no-baseline/no-camera, stale reading,
**320 px viewport** (document/panel width ≤ 320, no horizontal scroll). Screenshots of
the synthetic workflows were captured locally and are not committed (generated
artifacts); rerun the script to regenerate. No physical webcam, sensor or screen
reader was tested.

## 9. Known issues, assumptions and owner review items

* Work was done in a dedicated git worktree at the verified base SHA, using the
  already-installed `node_modules`; `npm ci` was not re-run.
* Navigation goes to the Events & Alerts **section**; there is no per-alert anchor in
  the existing UI, so the button label names the alert instead.
* The panel is a non-modal overlay; on desktop it covers the right side of the page
  and closes when an action navigates.
* Keyword parsing will misroute some unusual phrasings; crew first names (e.g. “Leo”)
  always trigger the cross-subject refusal.
* Observed-workspace answers use the device clock for freshness (as Human Performance
  Assessment does). Synthetic answers use mission time.
* Alert origin relies on the `synthetic-`/`observed-` ID prefix convention in
  `src/health/engine.ts`; if that convention changes, update `scope.ts`.
* Assistant is Astronaut-Mode only; a Crew Medical Officer variant needs a separate
  access design.
* Russian phrasing not implemented.

## 10. Integration points

* **Prevention / Mission Medical Resources:** `module_unavailable` intent is the seam.
  When those modules land, add their records to `scopeFromState` (filtered by subject
  and origin like everything else), add an intent builder in `respond.ts`, and add their
  IDs to `allowedIds`. Do not read their unfinished interfaces before then.
* **Merge expectations:** the only shared edit is the `AssistantDock` line in the
  sidebar `<nav>` in `App.tsx`; a concurrent nav change will conflict on that one line.

## 11. Future LLM (not implemented)

A future owner-approved provider (local model, or server-mediated with no public key in
the browser) would implement `AssistantProvider`, receive **only** the already-scoped
records/comparisons, and could improve phrasing and understanding. Independent of the
model, the existing scope filter and `enforceReplyPolicy` gate must still run on its
output, every cited ID must be re-validated, medical data must not leave the device
without explicit approval and a privacy review, and the UI label must change only when
such a provider is actually connected. The interface is synchronous today; an async
provider needs a small interface change plus stale-response guarding on context change.

## 12. Repository and deployment statement

No production deployment, Cloudflare change, GitHub Actions change, merge or release.
No changes to `review/v4.1`, `develop`, `main` or PR #4. Only the feature branch
`feat/v4.2-medical-assistant` is written.
