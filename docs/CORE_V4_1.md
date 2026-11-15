# AEGIS v4.1 — local engineering report and demonstration

2026-11-15. Local development on `develop`, starting at
`2ab370c7acc4c4450ca25a1089f6c726091d48c7`. The owner explicitly authorized this
implementation and local commits. **No push, deployment or PR #4 merge.**
Production remains frozen at `034fcdb76863ce0f861230a66b55f188c68a03d5`.
The existing RC1/team testing documents describe that separate public release;
they have been preserved, not replaced by v4.1 results.

## Implemented architecture

The existing React shell, Context/reducer, mission clock and personal/synthetic
workspaces remain. There is no second medical store, backend, new dependency or
paid service. Astronaut Mode still opens My Health and restricts ordinary views to
the fictional signed-in subject. Demo role switching remains **not authentication**.

1. Canonical `SensorAdapter.read(SensorRequest): Promise<SensorBatch>` declares ID,
   category, cadence and origin. `src/sensors/adapters.ts` supplies three deterministic
   synthetic adapters. The mission clock uses their pure fixture generator for
   continuous sampling; the Sensor Integration buttons exercise the async adapter
   boundary. No independent timer, background monitoring or physical connection.
2. `src/sensors/ingestion.ts` validates units, finite/missing values, source/origin,
   acquisition context, duplicate IDs and requested subject/device. A single
   `sensors/ingest` reducer action commits a batch atomically. Identical replays are
   idempotent; conflicting IDs, inaccessible subjects and collisions with existing
   CV/cognitive records are rejected. This is an in-process integration boundary,
   not a public unauthenticated ingestion endpoint.
3. Records enter the existing mission or personal arrays. Numeric laboratory data
   uses HealthMeasurement plus named analyte; ECG/ultrasound use ExaminationRecord
   reports. Environmental observations use the existing environmental schema, with
   explicit subject association required in observed history. Unknown means null
   with missing quality, never zero. No waveform/image uploads or interpretations.
4. `src/health/intelligence.ts` derives a read-only assessment from canonical records:
   physiology, sleep, self-reported fatigue/stress/mood, typing, reaction, visual
   geometry and physical performance. ECG/ultrasound are available contextual source
   reports, not automatically interpreted numerical performance signals.
5. Human Performance Assessment reuses Panel, tables, navigation and styles. It
   displays latest usable values, quality, origin/source, individual comparisons,
   baseline record IDs, conditions, historical values/trend, missing/stale/invalid
   states, findings and links to existing assessments and Events & Alerts.
6. New findings enter the existing CDSS. When the corresponding legacy scenario
   alert exists, its explanation/evidence is enriched and its case is reused.
   Otherwise a review alert/case is created. Acknowledgement/review/follow-up/
   resolution remain user-controlled; a numerical change is never automatically
   an emergency, diagnosis, treatment or resolved case.

## Data and compatibility

Canonical additions and compatibility effects are proposed in
[CONTRACTS_V4_1.md](CONTRACTS_V4_1.md). A remote contract PR is intentionally deferred
because the owner prohibited pushing. No parallel domain types were created.

Every acquisition includes declared device, protocol/statistic, conditions and
session ID, in addition to subject, timestamp, unit, quality, source and origin.
Manual observations, cognitive sessions and optional camera sessions now capture
conditions. Manual physiological/report entry supports declared device/protocol;
unknown fields remain unknown. Self-report defaults describe manual entry, not a
wearable. Camera/browser identifiers describe the local acquisition route; they
do not prove the same physical hardware or calibration across visits.

Persistence writes version 4 to `aegis.core.v4`, reads v4 → v3 → v2, defaults new
arrays empty and retains old v2/v3 bytes. Old records are not relabelled, fabricated
or overwritten by adapters. Corrupt storage still requires explicit recovery;
quota errors still preserve previous stored bytes. Restore returns to own observed
My Health and pauses the mission. Storage remains browser-local and unencrypted;
only non-sensitive demonstration data belongs here. It is not a clinical archive.

Synthetic mission sampling retains bounded histories (3,600 numeric, 4,800
environmental, 1,000 assessment records); personal records/cases are not trimmed
by that sampling. Longer-term retention and high-volume storage are future work.

## Sensor coverage

| Adapter / entry | Supported records | Cadence |
| --- | --- | --- |
| Synthetic physiological | HR, systolic/diastolic BP, temperature °C, SpO₂ %, illustrative HRV ms, sleep h, activity minutes | Additional packets; mission physiology every virtual minute |
| Synthetic medical | ECG report, ultrasound report, glucose mmol/L, explicitly missing hemoglobin g/L | Periodic packet |
| Synthetic environmental | CO₂ ppm, cabin temperature °C, pressure kPa, radiation observation mSv | Additional packet; existing mission sampler every virtual minute |
| Observed manual examination | Existing ECG/ultrasound report or named laboratory value, date, conditions, device/protocol, missing result | Periodic manual entry |
| Existing observed workflows | Self-reports/manual numerical measurements, typing, reaction, procedure, optional CV/physical results | User initiated |

Adapter values are engineering fixtures, **not physiological simulations** or
clinically validated models. Synthetic visual summaries are explicitly simulator
fixtures; they never imply a live camera observation. Radiation records are not
summed into personal exposure or health risk. No actual medical device is connected.

## Qualified baseline and demonstration rules

Baselines use the median of the **first three earlier distinct compatible sessions
within 30 days**, excluding the current session and duplicate timestamps. This is
an explicit engineering choice, not a statistical/clinical validation protocol.
Matching requires subject, signal/analyte, unit, source, origin, declared device,
protocol and conditions. Unknown conditions/device/protocol withhold qualification.
No silent unit conversion, observed/synthetic mixing or pooling across sources.
Declared labels are not proof of clinical comparability or calibrated hardware.

Current data must be within an engineering freshness window: 30 minutes for most
performance/physiology, 24 hours for sleep, 7 days for laboratory/bone-density
metrics. Future entries are excluded. Missing/invalid latest entries block reuse
of a previous usable value as current evidence. Fewer than three compatible prior
sessions gives insufficient baseline, never fabricated history. Zero baseline has
an absolute difference but no percentage change. Historical records and excluded
contexts remain visible. Legacy My Health summary averages are labelled unqualified;
the old optional reaction alert comparison now uses qualified baselines too.

| Rule | Transparent trigger | Result and limits |
| --- | --- | --- |
| DEMO-MULTI-PERF-01 | Sleep −20% or more, fatigue +2 points or more, and reaction +20% or more **or** typing −20% or more, each against a ready individual baseline. Fatigue/performance within 15 min; sleep within 24 h. | Explain those records and differences. Available recent HR and eyelid measurements are descriptive context only; they do not trigger psychological or fatigue diagnoses. |
| DEMO-MULTI-ENV-01 | Same-compartment CO₂ +50% or more against a compatible baseline; own available symptom record within 2 min, no older than 30 min. Observed environment requires explicit subject association. | Explain temporal/location association; never claim environmental causation of a disease or absorbed exposure. Other astronauts’ medical evidence is not disclosed. |

These cutoffs, session counts and time windows are **demonstrationOnly** and visible
in Human Performance Assessment and Research & Sources. They are not NASA flight
limits, clinical thresholds, diagnostic accuracy or validated questionnaires.
No universal stress score, depression/anxiety diagnosis, emotion classification,
face recognition or video-derived health diagnosis is implemented.
Missing CV does not block the assessment or other workflows. Stress/mood/HRV are
displayed with provenance, not combined into an invented psychological score.

Existing DEMO-RECOVERY-01 and DEMO-ENV-01 are retained as labelled legacy scenario
rules. Observed environmental associations use explicitly associated records via
the new rule, rather than inferring actual exposure from fictional ship positions.
Research references remain background only; the two new source entries identify
locally authored fixtures/protocols, not published scientific validation.

## Reproducible local demonstration

Run `npm ci` if dependencies are not installed, then `npm run dev`. Use the printed
localhost URL. Production continues to show frozen RC1, not these local features.

### Acquisition without mixing workspaces

1. Start in Astronaut Mode → My Health. Open **Sensor Integration**.
2. Read the no-hardware notice. In Observed records the demo buttons are absent.
3. Click **Use synthetic workspace for sensor demonstration**.
4. Click **Acquire physiological demo packet**, **Acquire medical demo packet**,
   **Acquire environmental demo packet**. Numeric/report/missing data retain
   simulator/synthetic labels; no personal observed record is created.
5. Open **Human Performance Assessment**. Expand a trend/conditions row. A packet
   from a different adapter/protocol is not silently pooled with mission history.
6. Switch **Data workspace → Observed records**. Sensor Integration lets you record
   an ECG/ultrasound report or lab value from a non-sensitive test report. Fill in
   conditions, device/protocol and examination date when known. Save and refresh;
   find the report in My Health medical history and Human Performance Assessment.

### A — Sleep disruption: GATHER → EVALUATE → EXPLAIN → ACT → FOLLOW-UP

1. **Demo user context → Mission Overview**, then **Mission Simulation**.
2. Scenario **Sleep disruption**, seed **42**, **Load scenario**, confirm reset.
   Only synthetic history is reset; own observed records remain intact.
3. **Advance 3 virtual minutes**. Leave the mission paused for a reproducible view.
   Generated prehistory is synthetic (minutes stand in for sessions, not real days).
4. Open **Human Performance Assessment** for Mira Chen. Sleep changes to 5.2 h,
   fatigue to 8/10 and reaction mean to 420 ms versus the generated 260 ms baseline.
   Additional synthetic HR/eyelid summaries appear as descriptive context.
5. Read **Multiple performance indicators changed**, evidence IDs, baseline sources,
   percentage differences and demonstration limitations. No diagnosis is produced.
6. **Events & Alerts → Acknowledge → Begin review**. Enter a test follow-up note,
   select **I completed the described follow-up**, click **Record follow-up**.
7. Switch **Crew Medical Officer Mode**, set **Data workspace → Synthetic mission
   preview**, open **Events & Alerts**, click **Resolve case after review**.
8. Refresh: return to own observed My Health; synthetic case progress remains saved.

### B — Environment and crew observations

1. Mission Overview → Mission Simulation → **CO₂ excursion**, seed 42, Load scenario,
   confirm; **Advance 3 virtual minutes**.
2. Human Performance Assessment for Mira shows **Environment and own observation
   overlap**: CO₂ 2500 ppm versus 600 ppm generated baseline, plus own symptom entry.
   The explanation explicitly withholds causation/disease inference.
3. Spacecraft → Living quarters: inspect synthetic environmental indicators and
   crew placement. Select Mira to return to her synthetic profile.
4. Events & Alerts contains existing environmental review cases. Acknowledge, begin
   review and record follow-up for a case; resolve through Medical Officer Mode as
   above. No automatic clinical action is taken.
5. Astronaut Mode → Synthetic mission preview shows only the astronaut’s own medical
   records/evidence; other crew medical details are not exposed through this view.

### Observed baseline exercise

Use non-sensitive test entries only. In My Health, record at least three earlier
same-metric self-reports with distinct timestamps/sessions and declared matching
conditions. Add a current comparable record. For physiological values also declare
the same device and protocol/statistic. Human Performance Assessment displays the
median and delta, or the explicit reason comparison is unavailable. Do not enter
synthetic numbers into observed history as if they were actual measurements.
Typing/reaction tests and camera assessments record their actual session metadata;
do not fabricate their histories to force a finding.

## Validation results

Local validation on 2026-11-15:

| Check | Actual outcome |
| --- | --- |
| `npm run check` | Passed: ESLint with zero warnings, 104 tests across 13 files, TypeScript and Vite production build. The previous 61 tests are retained; the persistence-version assertion now expects v4. |
| `npm run build` separately | Passed; 150 modules. Main JS approximately 460.60 kB, gzip 138.19 kB; MediaPipe remains a separate lazy bundle. |
| `node scripts/verify-release.mjs` | Passed: 15 build files, six model/WASM assets, same-origin entry assets, manifest integrity, header policy files, Pages size limits and local documentation links. Largest asset 11,453,626 bytes. |
| Local Chrome: acquisition | All three demo adapters, explicit synthetic scope, own-subject isolation, ECG and laboratory manual entry, medical history and refresh/persistence passed. |
| Local Chrome: scenarios/CDSS | Both new multimodal explanations, legacy alert integration, acknowledgement, begin review, completed follow-up and medical-officer resolution passed. Clock advancement, spacecraft selection and restoration passed. |
| Local Chrome: cognitive | Real 30-second typing and 30-second reaction sessions completed via browser interaction, with saved declared conditions; procedure mistakes/correction and refresh passed. These automated interaction times are not human performance measurements. |
| Local Chrome: CV | Virtual device only: both local MediaPipe/WASM models initialized and processed no-face/no-pose frames; missing results saved/restored, conditions retained, physical activity linked, Stop/navigation released tracks. All 13 captured CV requests were same-origin. |
| Local Chrome: camera denied | Passed in an isolated context without auto-grant flags: denial alert, retry availability and all five anatomy-system routes worked without CV. |
| Local Chrome: layout | My Health/Human Performance at 1366/390/320 px and anatomy at 820 px passed page-overflow checks. Final HPA table uses readable horizontal scrolling; Sensor Integration form passed at 320 px. Screenshots inspected locally. |
| Runtime/console | No application page exceptions in tested workflows or failed network requests in acquisition checks. MediaPipe emits SDK warnings and its INFO XNNPACK CPU-delegate creation message through console.error; this is recorded, not reported as a clean CV console. |

Test coverage includes adapter determinism/identity, units/nulls/analytes, atomicity,
conflicting/idempotent replays, existing-record preservation, personal/synthetic
separation, unknown contexts, distinct sessions, median/current exclusion,
incompatible units/source/protocol, stale/future/expired history, timestamp-offset ordering/deduplication, zero baselines,
latest missing data, typing alternative and observed-workspace unit-test fixtures,
both scenario findings, own-only environment evidence, migration and UI persistence.
The numerical CV algorithms and bundled model assets have not been changed.

Problems corrected during this work: the older optional reaction comparison and
Daily Assessments baseline display did not qualify acquisition conditions; both
now use the shared comparator. Early narrow-screen HPA tables compressed words
too far; a labelled scroll region/minimum table width corrected readability.
Type-check/test issues found during implementation were corrected before the
successful final checks. The first denial attempt used auto-grant camera flags,
so it was repeated successfully in an isolated context; that initial timeout is
not counted as a denial test pass or an application defect.

Ignored local evidence remains under `output/playwright/v41-*` and the local CLI
scripts under `.aegis-scaffold/`. These contain test fixtures/screenshots, not
participant video, and are not committed or deployed. Physical webcam/medical
hardware validation and public v4.1 deployment were **not performed**.

## Changed-file map

- `contracts/types.ts`: canonical acquisition/sensor/examination/derived-result types.
- `src/sensors/adapters.ts`, `ingestion.ts`, `SensorIntegration.tsx`: acquisition
  transport, deterministic fixtures, validation/import and acquisition UI.
- `src/health/intelligence.ts`, `HumanPerformance.tsx`, `Conditions.tsx`: derived
  comparison/rules, integrated assessment and declared-condition controls.
- `src/shared/validation.ts`, `src/app/state/reducer.ts`, `persistence.ts`: canonical
  validation, atomic imports, subject/scope isolation and additive storage migration.
- `src/health/Assessments.tsx`, `HealthMonitor.tsx`, `AssessmentHistory.tsx`,
  `engine.ts`: existing workflows now retain context and use qualified comparisons,
  show new examination/lab history and integrate findings into existing cases.
- `src/simulation/engine.ts`: reproducible physiology/visual/environment contexts
  and existing scenarios; `src/health/sources.ts`, `Research.tsx`: authored protocol
  register and explicit limitations without pretending unpublished remote links exist.
- `src/vision/CameraAssessment.tsx`, `records.ts`: session context capture and linked
  physical-activity metadata; `src/anatomy/Anatomy.tsx`: existing HRV/SpO₂ records
  mapped descriptively to systems, without diagnostic findings.
- `src/app/App.tsx`, `styles.css`: two navigation sections and scoped table sizing.
- `src/sensors/sensors.test.ts`, `SensorIntegration.test.tsx`,
  `src/health/intelligence.test.ts`, `src/vision/integration.test.ts`: new coverage
  and updated migration-version expectation.
- `docs/CONTRACTS_V4_1.md`, this report, README, DEVELOPMENT_HANDOFF, GIT_WORKFLOW
  and RC1_STATUS: local scope/compatibility, demo/tests and preserved freeze boundary.

Dependencies, generated builds, model assets, public headers, deployment settings,
completed TEAM_TESTING/PRODUCTION_VERIFICATION documents and frozen release code
were not changed. No remote GitHub Actions were triggered by this work.

## Local Git references

- Branch: `develop`; original local checkpoint: `2ab370c`.
- Local contract proposal commit: `66275a9` (applied before implementation).
- The implementation commit is reproducibly identified by
  `git log -1 --format="%H %s" -- src/health/intelligence.ts` and reported to the owner
  after committing. It includes this report and the successful validation results.
- Frozen production and local `origin/develop` reference remain `034fcdb`; no fetch,
  push, tag publication, remote PR operation or deployment was performed.

## Known limitations and v4.2 dependencies

- No medical hardware, Bluetooth/serial/device drivers, continuous real sensor
  subscription, ECG waveform or ultrasound image processing. Future adapters must
  retain explicit subject/device/protocol/unit/quality and cancellation semantics.
- Declared acquisition labels do not establish measurement equivalence. Real HRV
  statistics, assay identifiers, instrument calibration, latency/sampling uncertainty,
  baseline representativeness and validated comparison protocols need domain review.
- Rules, freshness and minute-spaced generated baselines are demonstration choices.
  No confidence percentage or diagnostic accuracy is claimed. Physical-webcam blink/
  exercise ground truth, device/browser coverage and scientific/manual acceptance
  remain pending; virtual-camera checks are not physical-camera validation.
- Derived findings are recalculated from canonical records; clinical cases retain
  their existing history. This is not a new immutable, signed assessment audit log.
- LocalStorage size/unencrypted data, fictional identities and demo role controls
  remain prototype limitations. Secure authorization and production medical-data
  governance require an approved trusted boundary, not another client store.
- V4.2 is not started. Next dependencies: owner review of these local changes,
  team/scientific acceptance, actual device specifications/protocols and explicit
  approval for any remote integration, publication or deployment.

AI/tool use: implementation and tests assisted by Codex; local npm/Vitest/Vite and
Playwright CLI/Chrome used. No new scientific results/datasets were imported; no
video, private health data, external API or deployment was used by this task.
