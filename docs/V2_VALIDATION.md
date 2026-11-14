# AEGIS Core v2 — verification report

Date: 2026-11-14. Windows, Node 22.19.0, npm 10.9.3, Chrome via Playwright CLI.
The tests establish software behavior, not clinical/scientific validity.

## Commands actually executed

- npm install --save-exact zod@4: passed (Zod 4.6.7 locked).
- npm ci: passed after stopping this project's Vite processes to release Windows
  native-module file locks. Audit: 0 vulnerabilities.
- npm run check: lint, tests, typecheck and production build passed.
- 5 test files, 33 tests: simulation, validation, scoring, workflow, privacy-aware
  selectors/reducer guards, persistence, UI entry/navigation and adapter behavior.
- npm run dev -- --port 5180 --strictPort: started successfully.
- npm run preview -- --port 5181 --strictPort: production build served successfully.

## Browser scenarios actually executed

Final production session:

1. Mission Overview → Sleep disruption → Advance 3 virtual minutes.
2. Inspect recovery evidence; acknowledge; begin review; record completed follow-up.
3. Medical Officer → Synthetic preview → resolve the reviewed case.
4. Refresh: case/action/acknowledgement persisted; default returned to own observed
   health, without a foreign crew picker or other astronaut's records.
5. Ship crew button opened the corresponding synthetic profile.
6. CO₂ scenario produced two personal alerts linked to the living compartment.
7. Resume/pause changed the authoritative mission time.
8. Manual observed sleep entry survived refresh and remained separate from all
   scenario observations.
9. Width checks 1366/390/320 px: no horizontal document overflow in personal health.
10. Final production numeric procedure: wrong volume → corrected volume → correct
    setpoint. All 3 attempts and mL/demo-units survived reload.
11. Production browser console: 0 errors, 0 warnings; no uncaught page errors.

Real 30-second assessment sessions were also performed via browser input, without
mocking application timers or injecting precomputed results:

- Typing: typed a prefix, corrected one character and left one mismatch. Stored
  30,000 ms, 19 final characters, 1 error, 1 correction, inter-key intervals,
  7.6 gross WPM and 94.7368% positional accuracy, origin=observed.
- Reaction: one deliberately premature response and 11 valid responses; mean and
  median computed from the recorded delays. Completed result survived refresh.
- A separate numeric procedure retained one mismatch and two corrected/reference
  matches, with actual measured response times.

These are automated-input/browser measurements. They do not validate human
performance assessment accuracy, health inference, or device timing precision.
The 3-minute reaction mode shares the tested lifecycle/scoring but was not run
for its full duration. Hidden-tab cancellation and Stop behavior are implemented;
device-specific timing and accessibility review need further study.

Early browser-script issues were locator matching and duplicate test dialog
handlers, not application errors. The final clean production scenario passed
without those handlers/errors. Local captures are under output/playwright and
are ignored; generated code, dependencies and captures are not committed.

## Source review boundaries

Registry in src/health/sources.ts exposes each source and its review extent.
HRP overview/risk and CSA radiation pages were readable. NTRS abstracts/metadata,
HRR page titles, PubMed abstracts and the author-institution Acta abstract were
reviewed. TechPort required JavaScript; PMC/publisher full-text access was blocked.
No listed PDF is claimed as fully read. No dataset, clinical threshold or NASA
validation was imported. Specific inaccessible details remain marked unverified.

## Changed source areas

- contracts/types.ts + docs/CONTRACTS_V2.md: separate contract-only commits/PR.
- src/app/App.tsx, views/{Dashboard,CrewHealth,Events}.tsx, styles.css,
  components/MeasurementCard.tsx, format.ts: existing shell extended in place.
- src/app/state/{reducer,AppProvider,persistence}.ts(x): one store, orchestration,
  user contexts, provenance separation, guarded transitions and validated saving.
- src/health/{HealthMonitor,Assessments,Encounters,Research}.tsx and
  {engine,clinical,assessmentMetrics,sources}.ts: integrated health workflow.
- src/simulation/{engine,SimulationControls}.ts(x): deterministic scenarios/control UI.
- src/mission/MissionView.tsx: interactive conceptual cutaway.
- src/shared/validation.ts: runtime schemas and input bounds.
- Test files in app, app/state, health and simulation.
- package.json/package-lock.json: one additional runtime validator dependency.
- README and docs: current behavior, historical statuses, source boundaries and demo.

## Remaining limits

No real authentication/authorization, encrypted medical storage, multi-tab conflict
resolution, hardware integration, clinically validated diagnoses/protocols,
calibrated cognition tests, PWA cold-start cache, advanced 3D, detailed anatomy,
camera/voice/facial monitoring or validated physiological predictions.
Synthetic sensor histories are bounded; completed observed results and clinical
actions are retained until explicit replacement/storage limits. Quota errors
surface recovery controls. Acknowledgement is never treated as case resolution.

See CORE_V2.md for the exact reproducible demonstration and full design decisions.
