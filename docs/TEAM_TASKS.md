# Work allocation — five parallel streams

**Organizational update (Core v2):** the user assigned all software implementation
to one developer. The other team members research, review and prepare materials.
The workstreams below are historical module boundaries, not active ownership
restrictions for that developer. See CORE_V2.md for the implemented integration.

## Member 1: integrator / technical lead

**Own:** `src/app/`, application scaffold, package/lockfile, integration tests, deployment. **Branch:** `chore/integration`.

**Acceptance:** one command starts app; source types compile; route/view switch works; core simulation → data store → alert → UI is integrated; deployment URL opens on a different machine; all media/data credits accessible.

## Member 2: spacecraft mission view / UX

**Own:** `src/mission/`. **Branch:** `feat/mission-ui`.

Build interactive 2.5D cutaway with 5-6 schematic compartments and 3 crew indicators, deterministic positions tied to simulation clock, highlighted environment alert, click-through to astronaut-centric profile. Never claim diagram is actual Starship interior. Optional 3D enhancement only after working 2.5D.

**Acceptance:** select compartment → view occupancy and sensor summary; select crew → emits astronaut selection event; simulation update changes crew locations without reload.

## Member 3: astronaut health / medical evidence

**Own:** `src/health/`. **Branch:** `feat/health-engine`.

Build core astronaut dashboard: measurements, baselines, trend chart, sleep/stress self-report, alerts with explanatory factors, source/missing-data badges; credible evidence mapping. Implement explainable and demo-labelled rule engine for predefined scenarios. Never make medical diagnosis or automatic treatment recommendation.

**Acceptance:** selected astronaut has timeline; a test alert shows triggering observations, timestamp, level, recommended verification step, and provenance; missing metrics do NOT imply 'healthy'.

## Member 4: simulated crew/ship telemetry

**Own:** `src/simulation/`. **Branch:** `feat/simulation`.

Build seeded deterministic `MissionState`, configurable virtual clock, crew locations, scheduled routines, simulated sensors, 4 executable scripts (normal day, sleep disruption, CO2 excursion, radiation event). Export initial state, `step()`, `runScenario()`, reset, pause, speed. Keep all synthetic data clearly marked. No attempt to model validated human physiology from simple arbitrary formulas.

**Acceptance:** same seed + actions reproduce same event sequence; pause stops updates; reset returns to initial state; scenario triggers appropriate measurement/event records.

## Member 5: optional vision + body overview

**Own:** `src/vision/` and (coordinate with UI) `src/anatomy/`. **Branch:** `feat/vision-anatomy`.

Build camera opt-in movement tracker in a contained modal; support demo with real webcam, toggle permission and stop tracks; generate exercise counts/pose confidence as activity metrics. Provide a human-system diagram with explanation badges sourced from health module. Fallback mode uses synthetic exercise event if camera not allowed. No face recognition, monitoring adherence, injury/diagnosis claims, video persistence.

**Acceptance:** camera permission denial does not break app; stop camera releases device; on successful movement session, sends typed `ActivityRecord`; body display shows observed vs inferred vs unknown labels.

## Cross-team deadlines / gating milestones

1. **Integration first:** lead bootstraps app and publishes working `main` (no parallel scaffold by others).
2. **Contracts freeze:** all inspect `contracts/types.ts`; propose changes via PR, not private assumptions.
3. **Vertical slice:** simulated metric → personal dashboard → rationale + action → mission alert overlay.
4. **Feature PRs:** all mainline modules compile before polish.
5. **Demo freeze:** no risky changes during final testing and submission period.

If behind schedule, **keep** core astronaut health dashboard and 2 scenarios (sleep, environment); **defer** 3D, body anatomy, and camera enhancements before cutting the central medical workflow.
