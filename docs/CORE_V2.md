# AEGIS Core v2 — implemented behavior

This document supersedes the foundation-only status in INTEGRATION.md and the
earlier five-developer allocation. One developer now implements all modules.
The existing React shell, navigation, reusable components, Context/reducer and
Tailwind design system are retained. Contract proposal: draft PR #1.

## User contexts and separation

The default is Astronaut Mode → My Health → Observed records, bound to crew-01
(a fictional local identity). There is no ordinary astronaut crew picker.
Selectors redact other crew profiles, observations, assessments and encounters;
reducer guards reject cross-subject changes. Mission controls are unavailable in
personal/medical modes. Mission Overview always reads synthetic mission data.

Crew Medical Officer Mode supports selecting crew, reviewing cases and explicitly
resolving cases. The demo context switch is NOT authentication or authorization.
Everything is on one browser/device; developer tools/localStorage are not a trust
boundary. Use non-sensitive test data only. Deployment with real medical records
requires trusted identity, authorization, audit and data protection outside this
client-only prototype.

`personal` (observed inputs and actual interactions) and `mission` (synthetic
scenario) are separate branches in the ONE application store. Switching scope is
explicit and visible. Resetting a scenario does not reset observed records.
Live assessments can only be run/saved in Observed records. Their subject and
scope are fixed for the session; switching page/context cancels the component.

## One mission orchestrator

AppProvider owns the only mission interval. Each second it dispatches elapsed
time × selected speed. The reducer calls simulator.step, then health evaluation,
then clinical synchronization, then publishes a single state snapshot. Manual
observations and completed assessments also trigger evaluation. No feature view
owns a mission timer. Local requestAnimationFrame loops only measure an active
assessment and are cleaned up on stop/unmount. Hidden tabs cancel assessments.

Simulation uses a seed/time/channel hash. Sampling occurs at virtual minute
boundaries, independently of how elapsed time is partitioned. Normal, sleep,
CO₂ and telemetry-only radiation scenarios are implemented. Crew positions and
activities follow a compact schedule. Histories are compressed synthetic test
records, not days of physiological prediction. step() does not emit alerts.
The observation window and generated routine events are bounded; observed
records and clinical actions are not silently trimmed.

## Health and decisions

Manual input covers HR, resting HR, blood-pressure components, sleep, fatigue,
mood, stress, symptoms, exercise duration and recorded bone-density examinations.
Units and broad entry bounds are explicit. These bounds validate form input;
they are not clinical reference intervals. Missing numeric values require null
and quality=missing. Source, quality, origin and time remain visible.

Trend charts have a time-based x axis, units and a table of exact readings.
Synthetic baselines come from fixtures. Observed baselines are descriptive means
of the first three valid same-unit readings; they are not diagnosed normality.

Rules are pure, documented and explicitly demonstrationOnly:

- DEMO-RECOVERY-01: last 3 sleep records <6 h and latest fatigue ≥7/10.
  If at least four same-origin reaction sessions exist, optionally report latest
  mean >120% of the first-three-session mean. Missing/invalid readings cannot
  satisfy the rule. Synthetic and observed records are never pooled.
- DEMO-ENV-01: latest compartment CO₂ ≥2000 ppm plus symptom records from two
  occupants within ±2 virtual minutes. Evidence in each personal alert contains
  only that person's symptoms and the compartment reading. This establishes
  co-occurrence, not causality. The 2000 ppm value is not a flight limit.

Alerts include evidence IDs, explanation, next checks and research links. Stable
IDs preserve acknowledgement. Detection history is retained even after the
current data no longer meet a condition; it is labelled as history. A stable
rule/subject case is reused within a scenario, not treated as a new episode on
every tick. Recurrence/episode modeling remains future work.

Encounter lifecycle: open → under_review → resolved. Acknowledgement does not
change encounter status. Follow-up notes have independent completed flags and
optional measurement links. Resolution requires under_review plus at least one
completed follow-up and explicit medical-context action. Resolved cases are
read-only. None of these states constitutes diagnosis or proof of recovery.

## Actual assessment definitions

Typing: 30 seconds, fixed English reference, local textarea only. Start focuses
the field. Time expiry saves metrics; Stop discards an incomplete session.
Paste/drop disabled, no global keyboard listener, raw text never persisted.
Gross WPM = final Unicode character count / 5 / elapsed minutes (fixed 0.5 min).
Final positional accuracy = matching final characters / final characters ×100;
empty input gives 0% task accuracy. Errors are final mismatched/excess characters,
not all transient mistakes; omitted suffix is not counted as a typed error.
Corrections count non-repeated Backspace/Delete presses, including no-op presses.
Inter-key timing covers non-repeated printable keydown events, excludes shortcuts,
and is measured only in the active field. No diagnostic inference is made.

Reaction: PVT-inspired, not a validated NASA PVT. Demo 30 s, extended 180 s.
Random waits 1200–3499 ms using browser crypto randomness. Premature button
responses restart a wait; valid responses <1500 ms enter the mean/median;
unanswered stimuli after 1500 ms are misses. An unfinished final trial is omitted.
No valid responses → mean/median null. Browser display scheduling and device/input
latency are limitations. User keyboard activation is confined to the test button.

Numeric procedure: separate fictional reference-input check (12 mL and 24 demo
units). All numeric attempts, matches/mismatches and elapsed times are recorded.
Repeated errors suggest reviewing or pausing; they never prove impairment. It
does not operate equipment or provide a real treatment procedure.

## Persistence and research

localStorage key aegis.core.v2, schema version 2. Zod validates the complete tree,
provenance separation and subject references before save/restore. Restoring always
returns to own observed health and pauses the mission. Incompatible/corrupt bytes
are retained unchanged, auto-save is blocked, and explicit recovery is shown.
Quota errors show a persistent warning with retry rather than silently reporting
success. Live assessment drafts are not persisted; completed results are.
Persistent data is not encrypted. Multi-tab conflict resolution and backup import
are not implemented. Closing the browser during a task loses that incomplete task.
Recovery export is scoped to the current subject/workspace outside Medical Officer
Mode. Raw incompatible data cannot be safely filtered, so its recovery download is
available only in the explicitly labelled Medical Officer demo context.

Research registry: src/health/sources.ts, visible in Research & Sources. Each entry
records what was reviewed, motivation, limitations, data availability and review
date. Full-text/abstract/metadata/unavailable describe the extent actually reviewed;
listed PDFs were not automatically treated as read. No datasets were imported,
and no research source validates AEGIS thresholds or measured test performance.

## Demo sequence

1. Start in My Health with missing observed data. Enter sleep duration and fatigue.
2. Switch the clearly labelled demo context to Mission Overview → Mission Simulation.
3. Select Sleep disruption, seed 42, Load scenario; confirm synthetic-only reset.
4. Advance 3 virtual minutes (or Resume at 60×/300×). Open Events & Alerts.
5. Inspect recovery evidence, Acknowledge, Begin review, record a follow-up.
6. Open Spacecraft and select Mira to inspect synthetic trends and history.
7. Switch to Medical Officer → Synthetic mission preview → Events & Alerts;
   resolve the case after reviewing the completed follow-up.
8. Return to Astronaut → Observed → Daily Assessments; perform typing/reaction
   tests and the numeric input check. These results are actual local interactions.
9. Refresh. Personal observations/results and synthetic case/progress are retained;
   the mission is paused and the default view is own observed health.
10. Mission Overview → Cabin environment incident → advance 3 minutes. Inspect
    two personal alerts and the living-compartment context. No causal diagnosis.

## Remaining scope

P0 workflow is implemented; this is still a research demonstration. Advanced 3D,
detailed anatomy, camera exercise tracking, voice/facial analysis, predictive
physiological models, external hardware, PWA cold offline loading, real identity
and authorization, clinically approved protocols, calibrated psychometrics and
production medical validation are not implemented. Radiation and resources are
synthetic telemetry/inventory context only.
