# AEGIS v4.2 — Preventive Health Management & Mission Medical Resources
## Technical Handoff & Integration Documentation

- **Project:** AEGIS — Autonomous Exploration Health & Guidance Intelligence System
- **Date:** 2026-11-15
- **Base branch:** `review/v4.1`
- **Base commit SHA:** `8831e4a62bf0a395be7ba7ec881e0eab4ed98202`
- **Feature branch:** `feat/v4.2-prevention-resources`
- **Final feature commit SHA:** Recorded in Git commit history of `feat/v4.2-prevention-resources` (`git rev-parse HEAD`)
- **Production / Review / Develop status:** **Unchanged.** Frozen production (`034fcdb76863ce0f861230a66b55f188c68a03d5`), `review/v4.1`, `develop`, `main`, PR `#4`, and `feat/v4.2-medical-assistant` were not modified, merged, or deployed.

---

## 1. Architecture Overview & New Modules

Both **Preventive Health Management** (`src/prevention/**`) and **Mission Medical Resources** (`src/resources/**`) extend the single canonical AEGIS store (`src/app/state/reducer.ts` and `src/app/state/persistence.ts`) without introducing a second medical store, external runtime API, or background timer.

```text
+-----------------------------------------------------------------------------------+
|                        Canonical AEGIS Store (AppState)                           |
|  - mission (synthetic): measurements, assessments, activities, encounters,        |
|                         examinations, environment, preventionPlans,               |
|                         hydrationRecords, resources                               |
|  - personal (observed): measurements, assessments, activities, encounters,        |
|                         examinations, environment, preventionPlans,               |
|                         hydrationRecords                                          |
+-----------------------------------------------------------------------------------+
                  |                                                |
                  v                                                v
+-------------------------------------------+    +----------------------------------+
|     src/prevention/** (Read-Only API)     |    |  src/resources/** (Read-Only API)|
| - selectPreventionSchedule(...)           |    | - selectAvailableMedicalEquipment|
| - selectPreventionItemStatus(...)         |    | - queryEquipmentCapability(...)  |
| - selectHydrationSummary(...)             |    | - selectMedicalResourceById(...) |
| - selectSleepRecoveryContext(...)         |    | - evaluateMedicalResource(...)   |
+-------------------------------------------+    +----------------------------------+
       |                        |                         |                 |
       v                        v                         v                 v
+--------------------+  +-----------------------------------+  +--------------------+
| PreventiveHealth   |  | Future Claude Medical Assistant   |  | MissionResources   |
| UI (Section 13)    |  | (Consumes typed read-only APIs)   |  | UI (Section 14)    |
+--------------------+  +-----------------------------------+  +--------------------+
```

---

## 2. Files Created & Shared Files Modified

### New Files Created
- [`src/prevention/fixtures.ts`](../src/prevention/fixtures.ts) — Deterministic synthetic prevention schedule fixtures (`08:00 UTC` mission epoch), user plan builder, hydration record builder (`mL` / `L` normalization), and manual exercise completion builder.
- [`src/prevention/selectors.ts`](../src/prevention/selectors.ts) — Pure, deterministic read-only selectors for prevention schedule evaluation, recurrence window rollover, evidence matching/withholding, hydration period totals, and sleep/recovery baseline + CDSS context.
- [`src/prevention/PreventiveHealth.tsx`](../src/prevention/PreventiveHealth.tsx) — Astronaut-first Preventive Health UI (`Section = 'prevention'`).
- [`src/prevention/prevention.css`](../src/prevention/prevention.css) — Scoped styles for prevention status badges, evidence verification boxes, and inline forms.
- [`src/prevention/index.ts`](../src/prevention/index.ts) — Public barrel export for the Prevention module and future Medical Assistant integration.
- [`src/prevention/prevention.test.ts`](../src/prevention/prevention.test.ts) — Automated unit and reducer/persistence tests for Preventive Health Management.
- [`src/prevention/PreventiveHealth.test.tsx`](../src/prevention/PreventiveHealth.test.tsx) — End-to-end UI integration tests covering mandatory Demos A, B, C, and D.
- [`src/resources/inventory.ts`](../src/resources/inventory.ts) — Synthetic onboard medical resource inventory fixtures (`bp-monitor`, `ecg-12lead-01`, `ecg-patch-02`, `ultrasound-scanner-01`, `ultrasound-probe-02`, `pulse-oximeter-01`, `thermometer-ir-01`, `first-aid-station-01`, `poc-analyzer-01`) and validated status update helper.
- [`src/resources/selectors.ts`](../src/resources/selectors.ts) — Pure, deterministic read-only selectors for equipment inventory filtering, distinct availability/operability/qualification evaluation, and natural-capability queries (`ecg`, `ultrasound`, `laboratory`, `vital_signs`, `first_aid`).
- [`src/resources/MissionResources.tsx`](../src/resources/MissionResources.tsx) — Mission Medical Resources UI (`Section = 'resources'`) with search/filter, typed query inspector, and synthetic status editor.
- [`src/resources/resources.css`](../src/resources/resources.css) — Scoped styles for resource status badges, metadata cards, and query inspector.
- [`src/resources/index.ts`](../src/resources/index.ts) — Public barrel export for the Mission Medical Resources module.
- [`src/resources/resources.test.ts`](../src/resources/resources.test.ts) — Automated unit and reducer/persistence tests for Mission Medical Resources.
- [`docs/PREVENTION_RESOURCES_V4_2.md`](PREVENTION_RESOURCES_V4_2.md) — This technical handoff report.

### Every Change in Shared Files (for Integrator / Codex Merge Review)
Only **5 shared files** were touched, with strictly additive changes:
1. [`contracts/types.ts`](../contracts/types.ts):
   - Added optional `preventionPlans?: PreventionPlanItem[]` and `hydrationRecords?: HydrationRecord[]` to `MissionState` and `ClinicalWorkspace`.
   - Extended `MedicalResource` with optional v4.2 fields (`category`, `availability`, `operability`, `occupancy`, `compartmentId`, `requiredQualification`, `qualificationNote`, `lastVerifiedAt`, `statusReason`, `constraints`, `demonstrationOnly`, `history`) so legacy v2–v4 `MedicalResource` items remain 100% compatible.
   - Appended canonical types: `PreventionCategory`, `PreventionPlanSource`, `PreventionRecurrence`, `PreventionTargetKind`, `PreventionStatus`, `PreventionCompletionRecord`, `PreventionHistoryEntry`, `PreventionPlanItem`, `HydrationUnit`, `HydrationRecord`, `ResourceCategory`, `ResourceAvailability`, `ResourceOperability`, `ResourceOccupancy`, `OperatorQualification`, and `ResourceStatusHistoryEntry`.
2. [`src/shared/validation.ts`](../src/shared/validation.ts):
   - Added `preventionCompletionSchema`, `preventionHistorySchema`, `preventionPlanSchema`, `hydrationRecordSchema`, `resourceHistorySchema`, and `resourceSchema`.
   - Added `preventionPlans: z.array(preventionPlanSchema).default([])` and `hydrationRecords: z.array(hydrationRecordSchema).default([])` to `clinicalSchema` (inherited by `missionSchema`).
   - Updated `missionSchema.shape.resources` to use `z.array(resourceSchema)`.
   - Exported `validatePreventionPlan`, `validateHydrationRecord`, and `validateResource`.
3. [`src/app/state/reducer.ts`](../src/app/state/reducer.ts):
   - Extended `Section` union with `'prevention' | 'resources'`.
   - Added `seedMissionDefaults` in `createAppState`, `mission/scenario`, `mission/replace`, and `fixture/reset` to populate synthetic prevention plans, synthetic hydration fixtures, and the 9-item synthetic medical resource inventory.
   - Updated `selectWorkspace` and `updateClinical` to preserve and subject-filter `preventionPlans` and `hydrationRecords` in ordinary Astronaut Mode.
   - Preserved `section: 'prevention'` when switching crew members via `crew/select` on the Preventive Health screen in Medical Officer / Mission modes.
   - Added 5 canonical reducer actions: `prevention/plan-upsert`, `prevention/complete`, `prevention/evidence-withhold`, `hydration/add`, and `resources/update-status`.
4. [`src/app/state/persistence.ts`](../src/app/state/persistence.ts):
   - Added `'prevention'` and `'resources'` to `stateSchema.shape.section`.
   - Extended provenance and duplicate-ID checks in `stateSchema.superRefine` to cover `preventionPlans`, `hydrationRecords`, and `resources`.
   - Retained `STORAGE_KEY = 'aegis.core.v4'` and `STORAGE_VERSION = 4` with additive `.default([])` migration from `v2`, `v3`, and `v4.1` payloads.
5. [`src/app/App.tsx`](../src/app/App.tsx):
   - Added navigation entries `13 Preventive Health` (`id: 'prevention'`) and `14 Mission Medical Resources` (`id: 'resources'`) and mounted `<PreventiveHealth />` and `<MissionResources />`.

---

## 3. Canonical Types, Reducer Actions & Migration Behavior

### Disjoint Schedule States (`PreventionStatus`)
- `'completed'` — Verified by at least one usable canonical record (`quality` in `['valid', 'estimated']`, non-null value, `sufficient: true` for camera geometry, timestamp <= evaluation time `asOf`) linked to the plan or matching its active window.
- `'insufficient_evidence'` — A linked record was withheld or removed from the workspace, an attempted record in the active window has `missing`/`invalid` quality (e.g., failed camera pose geometry or null reaction mean), or only stale historical evidence exists outside the freshness window.
- `'not_yet_due'` — Current evaluation time `asOf` precedes `activeWindow.startAt` with no completion recorded yet.
- `'due'` — Current evaluation time `asOf` is within `[activeWindow.startAt, activeWindow.endAt]` with no completion or invalid attempt recorded yet.
- `'unknown'` — Current evaluation time `asOf` has passed `activeWindow.endAt` with no recorded evidence in the workspace. Overdue unrecorded items are labeled unverified (`unknown`), **never noncompliance or a health problem**.

### Canonical Reducer Actions
- `{ type: 'prevention/plan-upsert'; plan: PreventionPlanItem }` — Validates and saves a user-created or synthetic plan item into the active workspace (`personal` or `mission`) after checking subject access and ID uniqueness.
- `{ type: 'prevention/complete'; planId: string; completion: PreventionCompletionRecord; activity?: ActivityRecord; measurement?: HealthMeasurement; hydration?: HydrationRecord }` — Atomically saves the canonical evidence record and links its ID to the target plan's `linkedObservationIds`, `completions`, and `history`.
- `{ type: 'prevention/evidence-withhold'; planId: string; evidenceId: string; removeCanonicalRecord?: boolean; at: ISODateTime }` — Records an explicit `evidence_withheld` audit entry and optionally removes the linked canonical record from the workspace so derived status returns to `'insufficient_evidence'`.
- `{ type: 'hydration/add'; record: HydrationRecord }` — Validates and appends a manual or synthetic hydration record (`mL` or `L` normalized to `amountMl`, or `null` with `quality: 'missing'`) and links it to a hydration plan when `linkedPlanId` is supplied.
- `{ type: 'resources/update-status'; id: string; availability: ResourceAvailability; operability: ResourceOperability; occupancy?: ResourceOccupancy; quantity?: number | null; statusReason: string; updatedAt: ISODateTime; actorRole?: string }` — Updates a synthetic medical resource's status and appends a non-destructive `ResourceStatusHistoryEntry` (permitted only when `state.scope === 'synthetic'`).

### Persistence & Migration Behavior
- Storage continues to use `STORAGE_KEY = 'aegis.core.v4'` (`version: 4`) and reads `v4 → v3 → v2` additively without overwriting `aegis.core.v3` or `aegis.core.v2` bytes until explicit save.
- Legacy `v2`, `v3`, and `v4.1` payloads lacking `preventionPlans` or `hydrationRecords` default those arrays to `[]` via Zod `.default([])`.
- Legacy `MedicalResource` entries lacking v4.2 fields (`availability`, `operability`, `category`, `requiredQualification`) validate cleanly; `evaluateMedicalResource` reports missing metadata as `'unknown'` rather than inferring availability.

---

## 4. Typed Read-Only Selectors for Medical Assistant Integration

The future Claude Medical Assistant can import these pure, read-only functions directly from `src/prevention` and `src/resources` (each accepts either `AppState` or `MissionState`):

### From [`src/prevention/index.ts`](../src/prevention/index.ts)
```ts
function selectPreventionSchedule(
  source: PreventionStateContainer | MissionState,
  subjectId: AstronautId,
  scope?: DataOrigin,
  asOf?: ISODateTime,
): PreventionScheduleSummary

function selectPreventionItemStatus(
  source: PreventionStateContainer | MissionState,
  plan: PreventionPlanItem,
  scope?: DataOrigin,
  asOf?: ISODateTime,
): EvaluatedPreventionItem

function selectHydrationSummary(
  source: PreventionStateContainer | MissionState,
  subjectId: AstronautId,
  scope?: DataOrigin,
  asOf?: ISODateTime,
  windowHours?: number,
): HydrationPeriodSummary

function selectSleepRecoveryContext(
  source: PreventionStateContainer | MissionState,
  subjectId: AstronautId,
  scope?: DataOrigin,
  asOf?: ISODateTime,
): SleepRecoveryContext
```

### From [`src/resources/index.ts`](../src/resources/index.ts)
```ts
function selectAvailableMedicalEquipment(
  source: ResourceStateContainer | MissionState,
  scope?: DataOrigin,
  filter?: MedicalEquipmentFilter,
): MedicalEquipmentQueryResult

function queryEquipmentCapability(
  source: ResourceStateContainer | MissionState,
  capability: 'ecg' | 'ultrasound' | 'vital_signs' | 'first_aid' | 'laboratory' | string,
  scope?: DataOrigin,
  actorQualification?: OperatorQualification,
): EquipmentCapabilityAnswer

function selectMedicalResourceById(
  source: ResourceStateContainer | MissionState,
  resourceId: string,
  scope?: DataOrigin,
  asOf?: ISODateTime,
): EvaluatedMedicalResource | null
```

---

## 5. User-Visible Screens & Supported Actions

1. **Preventive Health (`Section = 'prevention'`, Nav `13`)**:
   - Displays 6 summary cards (`Completed`, `Due now`, `Not yet due`, `Insufficient evidence`, `Unknown / unverified`, `24h Hydration`).
   - Lists scheduled prevention items with category filter, provenance badges (`SYNTHETIC / DEMO PLAN` vs `USER-CREATED PLAN`), schedule windows, verified linked evidence, and audit history.
   - Provides one-click starter personal schedule creation in `observed` workspace, custom plan creation form, inline manual exercise completion (`source: 'manual'`), controlled evidence withholding button (`prevention/evidence-withhold`), and navigation buttons to `Physical Performance`, `Daily Assessments`, `My Health`, `Human Performance Assessment`, and `Events & Alerts`.
   - Includes **Sleep & recovery follow-up** panel showing latest sleep, fatigue/stress self-reports, qualified 3-session baseline status, and linked CDSS recovery cases.
   - Includes **Hydration tracking & period totals** panel supporting `mL` and `L` (`1 L = 1000 mL`), explicit missing-value logging (`null`, never `0`), and optional non-clinical tracking goal.
2. **Mission Medical Resources (`Section = 'resources'`, Nav `14`)**:
   - Displays 5 summary cards (`Total fixtures`, `Available & functional`, `Unavailable`, `Out of service`, `Unknown / unverified`).
   - Provides text search and filters by category, availability, operability, and usable-only status.
   - Renders each synthetic onboard item with distinct **Availability**, **Operability**, **Occupancy**, **Quantity**, **Compartment**, **Declared operator qualification**, **Verification timestamp/freshness**, **Constraints**, **Supervision warning**, and **Status history**.
   - Includes **Typed selector query inspector** to run live `queryEquipmentCapability` queries (`ecg`, `ultrasound`, `laboratory`, `ultrasound-probe-02`, `ecg-patch-02`, `vital_signs`, `first_aid`, or custom device queries).
   - Includes **Update synthetic resource status** form in synthetic scope (`resources/update-status`) with persistence across page refresh.

---

## 6. Provenance, Isolation & Scientific Limitations

- **No diagnosis or clinical thresholds:** Schedule windows, hydration goals, and baseline comparisons are engineering/user-defined demonstration aids, never NASA medical standards or diagnostic cutoffs.
- **No autonomous treatment:** Neither module recommends medications, dosages, or unsupervised clinical procedures.
- **Provenance separation:** Observed records (`state.personal`) and synthetic simulation fixtures (`state.mission`) never mix. Manual exercise completions (`source: 'manual'`) are explicitly distinguished from camera pose assessments (`source: 'camera_pose'`). Elbow-flexion counts never claim to measure or improve bone mineral density.
- **Subject privacy in Astronaut Mode:** Ordinary Astronaut Mode restricts `selectWorkspace` and `selectPreventionSchedule` to `sessionAstronautId` (`crew-01`), preventing disclosure of other crew members' records.

---

## 7. Reproduction Steps for Mandatory Demos A–D

### Demo A — Planned exercise → recorded activity
1. Start in `Astronaut Mode` with `Data workspace = Observed records` (or `Synthetic mission preview`).
2. Open **13 Preventive Health**. In Observed workspace, click **Add starter personal prevention schedule** (in Synthetic workspace, inspect `Scheduled Upper-Body Resistance & Range Check`, which starts as `Status: due`).
3. Either click **Open Physical Performance (Camera / Optional) →** to record a camera pose session, or enter duration/note and click **Record manual exercise completion**.
4. Verify the exercise item transitions to `Status: completed` and lists the linked canonical activity ID, timestamp, and `manual` (or `camera_pose`) provenance.
5. Refresh the browser; verify `Status: completed` and audit history persist.
6. Click **Withhold linked evidence (test verification)** on the completed item; verify the status immediately transitions to `Status: insufficient evidence` rather than remaining falsely completed.

### Demo B — Sleep/recovery and self-assessment
1. Set `Demo user context = Mission Overview`, open **04 Mission Simulation**, select **Sleep disruption**, seed **42**, click **Load scenario** (confirm), and click **Advance 3 virtual minutes**.
2. Open **13 Preventive Health** for Mira Chen (`crew-01`).
3. Verify `Daily Sleep Duration & Recovery Baseline Check` (`5.2 h` vs `8.00 h` median baseline) and `Post-Wake Reaction Time Check (PVT-inspired)` (`420 ms` at `08:03:00Z`) are `Status: completed` with linked canonical evidence IDs, while `Mid-Morning Typing Performance Check-in` (`08:15Z–08:45Z`) is `Status: not yet due`.
4. Inspect the **Sleep & recovery follow-up** panel showing linked CDSS case `case-synthetic-crew-01-recovery` (`open`).
5. Record a manual exercise completion or refresh; verify `case-synthetic-crew-01-recovery` remains `open` (no prevention action automatically modifies a CDSS case).

### Demo C — Equipment availability
1. Open **14 Mission Medical Resources** and click **Use synthetic workspace for resource demonstration** (or select `Synthetic mission preview`).
2. Inspect `12-Lead Diagnostic ECG Unit (Primary)` (`Availability: available`, `Operability: functional`), `Wearable Chest ECG Patch Recorder (Secondary)` (`Availability: unavailable`, `Operability: functional`, `Occupancy: in use`), and `Backup Handheld Ultrasound Array (Secondary)` (`Availability: unavailable`, `Operability: out of service`).
3. Filter by category (`Diagnostic imaging (Ultrasound)`) or search text.
4. In **Update synthetic resource status**, select `ecg-patch-02`, set Availability to `Available`, Occupancy to `Free`, enter a verification reason, and click **Save synthetic status change**. Refresh the page and switch to `Synthetic mission preview` to confirm persistence.
5. In **Typed selector query inspector**, select `Is point-of-care laboratory analyzer available? (unknown fixture)` or enter an unlisted device name in `Custom capability / device ID query…` and verify the selector returns `Selector status: unknown` rather than inventing availability.

### Demo D — Data boundaries
1. In `Astronaut Mode` (`Observed records`), open **13 Preventive Health**, create a custom personal plan item (`Save prevention plan item`), and log a hydration entry (`Log hydration entry`).
2. Switch to `Mission Overview` → **04 Mission Simulation** and click **Load scenario** to reset the synthetic mission.
3. Switch to `Crew Medical Officer Mode` (`Observed records`) and open **13 Preventive Health**: verify `crew-01` (Mira Chen) still has the personal observed plan and hydration record, then switch `Crew member` to `Alex Rivera` (`crew-02`) and verify `crew-01`'s private records are not leaked.
4. Refresh the browser and verify personal records remain intact after reload and migration.

---

## 8. Baseline & Final Validation Results

| Command | Baseline (`8831e4a`) | Final (`feat/v4.2-prevention-resources`) |
| --- | --- | --- |
| `npm run lint` | Passed (0 errors, 0 warnings) | Passed (0 errors, 0 warnings) |
| `npm run test` | Passed: 13 test files, 104 tests | Passed: 16 test files, 118 tests |
| `npm run build` | Passed (`tsc -b && vite build`) | Passed (`tsc -b && vite build`) |
| `npm run check` | Passed | Passed |
| `node scripts/verify-release.mjs` | Passed | Passed (assets, SHA-256 manifest, headers, and local Markdown links verified) |

---

## 9. Known Limitations & Integration Notes for Codex / Team Lead

- **Shared-file merge points:** When integrating `feat/v4.2-prevention-resources` with `feat/v4.2-medical-assistant`, merge the additive exports in `contracts/types.ts`, `src/shared/validation.ts`, `src/app/state/reducer.ts`, `src/app/state/persistence.ts`, and `src/app/App.tsx`.
- **Assistant integration:** Connect the Claude assistant's prevention and resource queries to `selectPreventionSchedule`, `selectHydrationSummary`, `selectSleepRecoveryContext` (`src/prevention`) and `selectAvailableMedicalEquipment`, `queryEquipmentCapability` (`src/resources`).
- **Prototype constraints preserved:** Browser `localStorage` remains unencrypted and local-only; role switching is not real authentication; synthetic equipment fixtures do not represent actual NASA vehicle manifests.
