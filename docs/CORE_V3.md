# AEGIS Core v3 — voluntary camera assessments and anatomy

Implemented on `develop`; proposed in draft PR #4. Main is not automatically
updated. The astronaut's own health remains the primary journey. V2 simulation,
manual observations, typing/reaction/procedure tests and medical encounters are
preserved. This document supersedes historical camera/anatomy placeholders.

## Run and demonstrate

Use the Node versions specified by package.json. Run `npm ci`, `npm run dev`.
For the production version: `npm run check`, `npm run build`, `npm run preview`.
Camera access requires localhost or HTTPS and explicit browser permission.

1. Astronaut Mode → My Health shows the astronaut's observed records.
2. Visual Assessment: explicitly confirm association with the fictional profile,
   then Start Assessment. Keep eyes naturally open, frontal and steady during
   calibration (at least 3 seconds), then blink normally. Allow at least 10 usable
   seconds after calibration; longer sessions give more meaningful descriptive
   rates. Stop, review quality, then Save experimental assessment. A failed session
   can be explicitly saved as unavailable, never as zero blinks or good health.
3. Physical Performance: show the right shoulder/elbow/wrist, from a suitable
   side view, avoiding occlusion. Start with an extended arm, flex, then extend;
   hold endpoints briefly. The skeleton, live projected angle and history graph
   reflect camera inference. Stop and save. Use a comfortable movement range;
   the prototype does not prescribe exercise or judge rehabilitation readiness.
4. My Health → Assessment history contains camera results alongside existing
   performance assessments. Physical sessions also produce one linked activity.
   Refresh preserves completed saved records. Unsaved sessions are discarded.
5. Anatomy: select any of five systems. Tables show supporting personal records
   and their historical values/provenance, not organ disease. Musculoskeletal
   includes exercise/angle history and independently entered bone examinations;
   Cognitive includes sleep/self-reports and task/eyelid assessments. In synthetic
   preview only, respiratory/radiation panels show the current compartment's
   synthetic environment; that is not an individual cumulative exposure history.
6. With the camera denied or off, all manual, cognitive and mission workflows
   remain available. Switch to Mission Overview to run existing scenarios.

## Local processing and lifecycle

`CameraSession` owns a single stream and a single MediaPipe model per session.
Models and SIMD/non-SIMD WASM are bundled at `public/models/vision`; there is no
runtime CDN. SDK import is deferred until Start. CPU delegate is requested, but
MediaPipe may still initialize browser graphics contexts internally. Video-mode
inference is synchronous on the main thread, capped at 20 processed frames/sec;
slow devices may have gaps. A Web Worker is a future performance improvement.

Stop, component unmount, navigation, hidden tab, stream failure and the 120-second
limit release tracks and model resources. Cancellation also releases camera streams
granted after the user pressed Stop. Stalled video is invalid after 750 ms and
stops after 3 seconds. Model/permission failures are shown with a retry path.
No audio is requested. There is no recording, frame upload, background monitoring,
identity recognition, expression classification or global keyboard capture.
Only explicitly saved aggregate results, validity intervals and an exercise angle
history enter local storage. User-session raw video and raw landmarks are never persisted.

The initially evaluated SDK 1.2.3 attempted Google ODML telemetry. It was replaced
with exact SDK 0.10.32, whose packaged inference path has no such logger. The
production HTML also restricts `connect-src` to the same origin with a CSP.
Actual browser request monitoring verified local-only requests with the selected
SDK. Deliberately changing the SDK requires rechecking this property. Asset hashes,
upstream URLs, Apache-2.0 license and notices accompany the vendored assets.

## Engineering protocol: eyelids (`ear-hysteresis-v1`)

All numbers below are unvalidated engineering/demo choices, not medical thresholds.
Records carry `experimental: true`, `demonstrationOnly: true` and UI warnings.

For each eye, six landmarks form EAR = (two vertical distances)/(twice horizontal
eye width); normalized coordinates are first scaled by actual video width/height.
Left and right EAR are averaged. Exactly one detected face is required. Missing,
multiple, out-of-frame, very small, strongly asymmetric or rotated faces are invalid.
Roll >20°, eye span <35 pixels, nose-distance asymmetry >0.35, abrupt center jump
>0.12 normalized units or eye-span change >35% are geometry/steadiness gates.
These are not calibrated head-pose angles or model confidence. Extreme pitch and
occlusion cannot be reliably rejected in all cases. The SDK face result exposes
no per-frame detection confidence scalar; the UI does not fabricate one.

Calibration requires continuous open-eye EAR 0.18–0.50, at least 20 samples over
3 seconds, with coefficient of variation <0.12; the median is the baseline.
Missing/unsuitable samples reset the calibration buffer. Narrow natural eye
openings, glasses, illumination and atypical anatomy can prevent calibration.

After calibration, EMA smoothing uses actual elapsed time (time constant 80 ms).
The closed state starts below 65% of open-eye EAR and ends above 80% (hysteresis).
A completed closed episode of 80–499 ms is a blink; at least 500 ms is prolonged
closure. Smoothing and sampling introduce boundary error: blink duration is an
algorithm estimate, not a clinical measurement. Missing tracking censors the
episode: it cannot complete a blink across a gap. Already observed closed time
is retained; unobserved time never becomes closed-eye time.

Only intervals whose adjacent samples are both usable count toward observation
time. Intervals >250 ms are sampling gaps. Blink frequency uses blinks per usable
minute; closure proportion uses observed closed time / usable observation time.
The PERCLOS-inspired value uses observed prolonged-closure time / usable time.
It does not estimate the standard percentage of ≥80% eyelid occlusion and is not
a validated PERCLOS implementation or a fatigue score.

An available summary requires a baseline, ≥10 usable seconds and ≥70% usable
coverage after calibration. Otherwise summary metrics are null and the UI says
“Assessment unavailable — insufficient reliable visual data.” Invalid intervals
and calibration remain reviewable. An observed zero is displayed only when the
session was sufficiently usable; absence of blinks is not a diagnosis.

## Engineering protocol: exercise (`elbow-cycle-v1`)

The right shoulder (12), elbow (14), wrist (16) form an aspect-corrected 2D angle.
Exactly one pose, in-frame coordinates and actual SDK landmark visibility ≥0.65
are required. Presence is additionally gated if the SDK supplies it; its absence
is not replaced by a fabricated confidence. EMA again uses 80 ms elapsed time.

The finite-state detector requires extended (>150°) → flexed (<65°) → extended,
with 200 ms dwell at endpoints. A flexed start, static arm, incomplete movement
or missing tracking cannot generate a full repetition. Gaps reset cycle readiness.
Available summaries require ≥3 usable seconds and ≥70% coverage. History is
sampled at at most 10 Hz; range is the observed smoothed maximum minus minimum.
It is a projected movement range, not a clinical range-of-motion examination.
Earth camera recognition is not validated for microgravity, muscle mass or bone
mineral density. Viewpoint, occlusion and restricted personal movement can prevent
counting. The interface demonstrates the actual local tracker; no scripted
exercise counts are substituted for missing observations.

## Contracts, state, migration and anatomy boundary

See CONTRACTS_V3.md and canonical contracts/types.ts. New visual/physical variants
require experimental metadata and explicit timestamped fictional-profile association.
Live records are `observed`, model-derived `estimated` when sufficient and `missing`
otherwise. Their acquisition is `camera_face` / `camera_pose`. They are never direct
physiological sensor measurements or a scalar disease/fatigue severity.

The existing reducer validates records and saves physical assessment/activity
atomically. Repeated saves with the same ID do not duplicate the linked activity.
The existing optional VisionPort remains compatible for external activity-only
adapters; the built-in session controller also returns richer canonical visual and
physical assessment metrics. No second domain-type system or global camera exists.
Astronaut selectors restrict visible records to the session astronaut. This is UI
isolation in a local fictional sandbox, not production authentication/authorization.
Medical Officer demo context can select another profile using existing health UI.

Storage version 3 reads v2 when no v3 key exists, defaults missing activities to [],
then writes the validated v3 state. The original v2 bytes remain unchanged. Corrupt
state is retained for existing explicit recovery/export. Main stays compatible
with its v2 storage key until integration is approved.

Anatomy is a lightweight SVG with five accessible selection buttons and one shared
state source. Its highlight means selection only. It does not claim diagnostic
imaging, real organ geometry or anatomical abnormalities. No 3D renderer or injury
color model was added; the record selectors and separate module allow a later 3D
presentation without changing measurement semantics. No organ-damage, radiation
risk, bone-loss or psychological-state model is active.

## Scientific scope

NASA HRR tasks 720, 1170 and 1316 provide research context only. No NASA dataset,
trained fatigue classifier, clinical cutoff or validated NASA algorithm has been
imported. EAR, timing, quality gates and exercise FSM are authored engineering
choices. The Research & Sources registry distinguishes metadata/abstract review
from full documentation and links this protocol separately from external research.
Neither SDK landmark inference nor these tests establish clinical validity.

## Verification (2026-11-14)

`npm run check` passed: lint, 57 tests across 9 files, TypeScript and production
build. The separately requested `npm run build` also passed. `git diff --check`
passed. npm install/audit reported zero known vulnerabilities for the locked tree.

Automated tests cover deterministic authored landmark fixtures plus a small
recorded SDK-output fixture from public static test images (recorded-fixture.ts).
A controlled eyelid episode transforms the recorded open-eye geometry; it is not
a recording of an actual human blink. Tests cover blink/prolonged closure,
elapsed-time differences, gaps, calibration
failure, rotation/bounds, visibility, complete/censored exercise cycles, canonical
serialization, provenance, atomic activity integration, subject/scope guards, v2
migration, camera startup cancellation, permission/model failure and hidden tabs.
Asset tests verify the exact six pinned model/runtime files by SHA-256.

Chrome production-build checks exercised actual permission denial, granted virtual
camera, both local WASM inference paths, no-face/no-pose, explicit Stop and startup
navigation cleanup, saving, refresh, anatomy records and all five system selectors.
The 820×1180 tablet layout had no horizontal page overflow. No JavaScript pageerror
occurred; upstream informational XNNPACK/graphics messages may appear as warnings
or stderr in the browser console.

Core v2 browser regression also passed: sleep and CO₂ scenarios, alert
acknowledgement, review/follow-up/medical resolution, spacecraft click-through,
mission clock, refresh, observed manual sleep entry, 30-second typing with a
correction, reaction with a premature response, procedure mismatch/correction,
and persistence of all three assessments. Existing health screens fit 1366, 390
and 320 pixel widths; the new anatomy view was additionally checked at tablet size.

Separate Chrome video-stream tests used Google's public MediaPipe test images
`mediapipe-assets/portrait.jpg` and `pose.jpg`, routed from ignored local test files
through canvas.captureStream. Real SDK inference calibrated a face (EAR ≈0.208)
and accumulated >10 usable seconds; it tracked a static right elbow (≈175°), saved
both results and correctly reported zero observed movements. These are static-image
virtual streams, not physical-webcam human trials. Test images and screenshots are
ignored, not shipped in the product. Camera pixels were not sent to external APIs.

Still required before a live demonstration: a person must test actual blinks and
full elbow cycles with their physical camera, lighting and browser. Automated
landmark sequences validate the logic, not real-world accuracy. No microgravity,
population, browser-matrix or medical validation was performed. No clinical alerts
are generated from camera results. Offline PWA installation is still not implemented;
a locally served build works without a remote runtime dependency.

## File map and next integration dependency

- `contracts/types.ts`, `docs/CONTRACTS_V3.md`: separately committed additive contract proposal.
- `src/vision/{CameraAssessment,MovementHistory}.tsx`: opt-in UI and angle graph.
- `src/vision/{CameraSession,signals,metrics,records}.ts`: lifecycle, SDK adapter,
  elapsed-time algorithms and canonical-record construction.
- `src/vision/*test.ts`, `fixtures.ts`, `recorded-fixture.ts`: lifecycle, algorithm,
  persistence/provenance and vendored-asset verification with explicit test sources.
- `src/anatomy/Anatomy.tsx`: interactive schematic and scoped record exploration.
- `src/health/{HealthMonitor,Assessments,AssessmentHistory}.tsx`, `engine.ts`,
  `sources.ts`: shared history, linked activities and evidence registry.
- `src/app/App.tsx`, `App.test.tsx`, `styles.css`, `state/{reducer,persistence,AppProvider}`:
  existing shell integration, optional navigation and compatible storage migration.
- `package.json`, `package-lock.json`, `public/models/vision/*`: pinned SDK and
  licensed local model/runtime dependencies with a SHA-256 manifest.
- `index.html`, `eslint.config.js`: same-origin network policy and exclusion of
  unmodified third-party runtime from first-party lint.
- `README.md`, module READMEs, this document: current behavior and demonstration guide.

Prepared with OpenAI Codex. No production medical dataset or remote health API
was added. Next dependency: human physical-camera acceptance testing, then review
of draft PR #4 before an explicitly approved main integration. The app has no
clinical validation, production access control or detailed 3D anatomy.
