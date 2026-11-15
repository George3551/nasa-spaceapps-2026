# AEGIS release candidate — engineering report and acceptance gates

Date: 2026-11-14 (Asia/Tashkent). **Prepared locally, not published.** A public
production URL and a physical-webcam human trial have not been tested. The
candidate is suitable for the owner's release review; these remaining gates must
not be described as passed. No new major feature, backend, service account,
deployment, Git push, repository visibility change or PR merge was performed.

Companion documents: [deployment](DEPLOYMENT.md), [live demonstration](LIVE_DEMO.md),
[CV algorithms and scientific limitations](CORE_V3.md),
[contract compatibility](CONTRACTS_V3.md).

## 1. Repository and reviewed scope

- Started with a clean worktree on `develop` at
  `c38eaa2f58dbcb5661905d11f6d7bea89ff2ce89` (Core v3).
- Read-only GitHub inspection: [PR #4](https://github.com/George3551/nasa-spaceapps-2026/pull/4)
  was open, draft, unmerged and mergeable, with 44 changed files. Both checks on
  that head completed successfully. Its base/main was
  `55fa13d5ec76288e3aaa60a2b52ef76a5e43b760` (Core v2).
- Reviewed the canonical types, state selectors/reducer, persistence validation,
  health/assessment/case/simulation workflows, Face/Pose controller and model files.
  Existing architecture and shared contracts are preserved by this preparation.
- The repository was already public at inspection. Its visibility was not changed.
  New preparation changes are local until the owner approves publication.
- Application dependencies remain exact MediaPipe Tasks Vision 0.10.32,
  React/React DOM 19.3.1 and Zod 4.6.7. Lockfile/dependency versions were not changed.

The release-preparation commit is the commit containing this report and the
configuration/scripts below. Obtain its exact SHA with `git log -1 --format=%H`
after committing; it is also reported in the handoff. Check `git status --short`
and `git log origin/develop..develop --oneline` before a later approved push.
Remote CI status above belongs to c38eaa2, not to an unpublished preparation commit.

## 2. Completed local release checks

| Check | Actual result |
| --- | --- |
| `npm ci` | Passed; 245 packages installed, 253 audited, 0 reported vulnerabilities. Initial Windows file-lock failure resolved as described below. |
| `npm run check` | Passed: lint, **57 tests in 9 files**, TypeScript and Vite production build. |
| Separate `npm run build` | Passed. |
| `node scripts/verify-release.mjs` | Passed: production entry files, six pinned model/runtime hashes, license/notices, Pages size limit, no source/dependency/debug artifacts and repository-relative documentation links. |
| `node scripts/verify-deployment.mjs http://127.0.0.1:4174/` | Passed against **local** Wrangler Pages, including response headers, three entry assets, JavaScript/CSS/WASM MIME, six model/runtime hashes and nested SPA fallback. |
| Runtime dependency check | No required third-party CDN; browser monitoring during camera sessions saw same-origin requests only. |
| Local HTTPS | Passed in an isolated Chrome test browser: secure context, same-origin camera policy, virtual-camera start/stop, WASM inference and saved result after refresh. Development self-signed certificate was ignored only for this local test. |
| External UI/source links | 19 distinct endpoints checked; a NASA AMO 404 was fixed. Recheck found no 4xx/5xx. PubMed endpoints returned HTTP 203; HTTP reachability is not evidence that a paper's full text was reviewed. |
| Browser console | No JavaScript pageerror/runtime exceptions in acceptance flows. Upstream WASM emits an informational XNNPACK initialization line through console.error and graphics/feedback warnings; these were inspected, not hidden or counted as application crashes. |
| Git whitespace | `git diff --check` passed. |

The production artifact has 15 files with this configuration; the largest is
`models/vision/wasm/vision_wasm_internal.wasm` (11,453,626 bytes), under Pages'
25 MiB per-file limit. This count excludes ignored test evidence and local tools.
Local toolchain: Windows, Node 22.19.0, npm 10.9.3; Wrangler 4.162.0 used only as
a local verification CLI. No Cloudflare Linux build for this candidate has run yet.

## 3. Browser end-to-end acceptance actually executed

Chrome operated the **built `dist` application in local Cloudflare Pages**:

- [x] Astronaut Mode: enter and save a 7.8 h manual demo sleep observation; review
  history and restore it after refresh, without exposing another astronaut's data.
- [x] Complete a real 30-second UI typing assessment with Backspace correction;
  verify observed metrics, inter-key intervals and persisted result.
- [x] Complete a 30-second UI reaction assessment including a premature response;
  verify valid response times, completion and history after refresh.
- [x] Procedure input mismatch/correction and completed saved attempts.
- [x] Synthetic sleep-disruption load → time advance → explained alert → acknowledge
  → begin review → completed follow-up → medical-context resolution → persistence.
- [x] CO₂ scenario and contextual alerts; resumed/paused mission clock.
- [x] Spacecraft compartment selection exposes environment readings; clicking Mira
  opens the matching synthetic health profile.
- [x] Anatomy selects all five systems; Cognitive reads the observed sleep and
  typing/reaction records, and Musculoskeletal reads saved physical assessments.
- [x] Camera permission denial produces a retryable error; unrelated features work.
- [x] Granted **Chrome virtual camera**, both actual local MediaPipe WASM models,
  no-face/no-pose behavior, Stop cleanup and navigation cleanup during startup.
- [x] Save unavailable CV as `quality: missing`, null summary values and explicit
  fictional-profile association; refresh preserves assessment and linked activity.
- [x] Actual SDK landmark inference using public static MediaPipe test images through
  a canvas video stream: face calibration and >10 usable seconds; static elbow
  angle/history. These are **not** recordings of human blinks or full exercise cycles.
- [x] New Anatomy/Visual/Physical screens have no horizontal page overflow at
  1366, 820, 390 and 320 px widths; existing personal workflows also checked.
- [x] Nested SPA fallback opens the production app, including root-resolved resources;
  refresh safely returns to own health with saved records and paused mission.
- [x] Local HTTPS repeats virtual-camera start/stop, inference and persistence with
  no remote requests. No public TLS or physical-camera result is inferred from it.

Unit tests additionally cover elapsed-time blink/closure metrics, missing tracking,
quality gates, calibration failures, exercise finite-state cycles, provenance,
serialization, v2 migration, permission/model failures, late initialization
cancellation and hidden-tab cleanup. They do not establish real-world accuracy.

Local evidence is ignored under `output/playwright/` and `.playwright-cli/`, e.g.
`rc-anatomy-mobile.png`, `v3-anatomy-tablet.png`, `v3-face-fixture.png` and the link
check JSON. It is not shipped in `dist` or committed as user data.

## 4. Problems found and fixes

1. **Nested SPA resource resolution:** Vite used `base: './'`, so a nested fallback
   URL could resolve JS/model URLs relative to that path. Changed only the build
   base to `/` for the Pages origin-root deployment. HTTP and browser nested-path
   checks passed. No router or application-shell replacement was introduced.
2. **Production response protections:** HTML had a useful CSP meta tag but no Pages
   HTTP configuration, including framing/camera policy. Added `public/_headers`
   with same-origin connection CSP, WASM allowance, frame denial, camera self,
   no microphone/geolocation, nosniff and no-referrer. Local Pages parsed the rule;
   HTTP tests and the HTTPS browser confirmed it. Public-host enforcement remains
   a deployment acceptance check.
3. **Broken NASA source link:** replaced the 404 AMO address with the verified
   [NASA archived AMO page](https://www.nasa.gov/directorates/stmd/game-changing-development-program/autonomous-medical-operations-amo/).
   The registry now explicitly labels historical context and transfers no clinical
   validation or procedures to AEGIS.
4. **Build repeatability:** added `.node-version` matching the validated local
   runtime, aligned CI's Node selection, and added release-artifact checks to CI.
   New scripts verify packaged assets and future deployed responses without
   requiring Cloudflare credentials. These are release tools, not app features.
5. **Windows validation environment:** the first `npm ci` failed with EPERM on
   lightningcss because an old project Vite preview process held its native module.
   Identified and stopped only that process; `npm ci` then passed. No source,
   lockfile or saved browser records were deleted to bypass the problem.
6. **Local emulator artifacts:** running Pages created generated `.wrangler/`
   JavaScript that the default ESLint scan attempted to treat as application code.
   Excluded this local tool cache from both Git and lint, matching the existing
   policy for build/vendor artifacts. The application sources remain fully linted.

Changed release files: `.node-version`, `.github/workflows/ci.yml`, `.gitignore`,
`vite.config.ts`, `eslint.config.js`, `public/_headers`, `src/health/sources.ts`,
`scripts/verify-release.mjs`, `scripts/verify-deployment.mjs`, this checklist,
DEPLOYMENT.md, LIVE_DEMO.md and the README's release links. No shared type change.

## 5. Short owner checklist — **physical webcam, still pending**

Use a normal top-level browser window on localhost for an initial trial, and repeat
on the final HTTPS URL after deployment approval. Disable any virtual-camera test
override. Record actual hardware, browser/version, lighting and pass/fail; use only
non-sensitive demonstration inputs. Do not upload recordings or medical data.

- [ ] Before Start, no application camera session or device capture indicator.
- [ ] Deny permission: visible error, usable retry after changing site permission,
  and manual/cognitive/mission workflows remain available.
- [ ] Allow permission on **Visual Assessment** after explicit fictional-profile
  association: real preview and overlay follow the intended face; no microphone.
- [ ] Calibrate with naturally open eyes and steady frontal head, then allow ≥10
  usable seconds. Observe several natural blinks, record manual count and displayed
  count/durations/rate. Log misses/duplicates; do not describe discrepancies as
  validated fatigue detection or tune new medical cutoffs for the presentation.
- [ ] Leave the frame or briefly occlude the face: missing/invalid tracking appears,
  unusable time is excluded, and absence does not become closed eyes or good health.
  Try a second face/large head turn; record any quality-gate failures.
- [ ] Stop, navigate away, hide the tab, refresh and cancel startup in separate
  trials: the application's stream ends and its capture indicator clears promptly
  (another application's camera use may keep the hardware light on).
- [ ] Save a usable result, return to My Health and refresh: source, timestamp,
  experimental status, quality, demo association and metrics remain. Insufficient
  sessions show the exact unavailable message and null summary, not invented zero.
- [ ] Physical Performance: if comfortable, frame the right shoulder/elbow/wrist,
  perform three complete extended → flexed → extended cycles with brief endpoint
  holds, and record the actual/displayed count and angle history. A static or
  incomplete arm movement must not accumulate repetitions. Tracking loss must
  reset readiness. This is a software demonstration, not prescribed exercise.
- [ ] Stop/save physical result; linked activity and anatomy history survive refresh.
  Inspect Network/Storage: no outbound frame upload, no raw video/landmark records.

If hardware/lighting/calibration fails, keep the explicit unavailable state and
present the no-camera core journey. Mark live CV demonstration **not accepted**;
do not replace it with automated fixtures while claiming a physical-camera pass.

## 6. Known limitations

- No public deployment/TLS/second-device acceptance yet. No physical-camera human
  blink/exercise validation or full browser/device matrix. Local headless Chrome
  virtual streams test integration, not physical accuracy or usability.
- CV gates, EAR/PERCLOS-inspired summaries and repetition logic are experimental
  engineering heuristics; no clinical or microgravity validation. A static camera
  image cannot establish organ health, muscle mass, bone density or mental state.
- Inference is synchronous on the main thread; CPU/lighting/occlusion/viewpoint
  affect tracking. Face Landmarker supplies no scalar frame-confidence here.
  Upstream informational/error-channel logs remain visible.
- Data stays in origin-bound localStorage, without production authentication,
  encryption, audit, cross-device sync or backup restoration UI. Use fictional
  non-sensitive data only. Private browsing/quota can limit persistence; recovery
  warnings must not be dismissed as a successful save.
- Reload discards active unsaved sessions and resets the view to own health while
  preserving completed saved records. No URL-level route state restoration.
- No offline PWA install, detailed 3D anatomy, validated radiation-risk model,
  NASA endorsement, clinical diagnosis or treatment prescription.
- A public static host necessarily sees ordinary page/model asset requests.
  “Local processing” means camera frames/health results are not submitted to an
  application API; it does not mean the host receives no HTTP requests.

## 7. Publication gates — **not completed**

- [ ] Owner explicitly approves pushing the reviewed local preparation commit,
  Cloudflare GitHub authorization and public RC deployment from develop.
- [ ] Push approved commit; new GitHub checks pass. Keep PR #4 unmerged.
- [ ] Owner completes Cloudflare sign-in and repository-specific authorization;
  applies DEPLOYMENT.md settings and explicitly starts the first deployment.
- [ ] Cloudflare build passes; exact SHA and assigned stable HTTPS URL recorded.
- [ ] Run verify-deployment.mjs against that real URL from the exact build commit.
- [ ] Repeat LIVE_DEMO.md and physical-webcam checklist on the public HTTPS host.
- [ ] Open URL on a second device/unauthenticated browser; confirm no login required.
- [ ] Freeze/disable automatic production deployments pending later approval and
  publish competition link only after these checks.

Deployment URL: **not created/tested**. Deployment commit: **not deployed**.
Owner webcam tester/device/browser: **pending**. Acceptance date/result: **pending**.

Prepared with OpenAI Codex. External sources retain their cited scope; no new
medical dataset or remote API was added. Next dependency is the owner's physical
webcam acceptance and explicit publication/account authorization, followed by
actual HTTPS production verification. Local preparation can finish before those
external actions; production release validation cannot.
