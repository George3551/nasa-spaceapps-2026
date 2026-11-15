# AEGIS RC1 — production verification

Verified 2026-11-15 (Asia/Tashkent). No production change, new deployment, Cloudflare
settings mutation or PR merge was performed during this verification.

## Deployment identity — verified, not assumed

- Stable production URL: **https://aegis-spaceapps-2026.pages.dev/**.
- Actual provider-associated Git SHA:
  **034fcdb76863ce0f861230a66b55f188c68a03d5**.
- The [Cloudflare Workers and Pages check](https://github.com/George3551/nasa-spaceapps-2026/runs/132684515923)
  on that exact full head_sha reports Deploy successful and Latest commit 034fcdb.
- Deployment ID: `4faefd81-3e76-4d3b-8fe0-b0d1af8c6cd2`; provider-linked URL:
  https://4faefd81.aegis-spaceapps-2026.pages.dev/.
- The provider check completed at **2026-11-15 03:24:18 UTC**, i.e.
  **2026-11-15 08:24:18 Asia/Tashkent**. This is the successful deployment-check
  timestamp, not a separately queried Cloudflare internal build-start timestamp.
- Production HTML and all 14 publicly served build files exactly match the local
  build of 034fcdb by SHA-256. The provider-linked deployment's HTML matches as well.
  This ties the public alias to the successful provider deployment/artifact set;
  it does not rely only on the owner's expected SHA.
- Both [push CI](https://github.com/George3551/nasa-spaceapps-2026/actions/runs/43671354847)
  and [PR CI](https://github.com/George3551/nasa-spaceapps-2026/actions/runs/43671358798)
  succeeded. PR #4 remains open, draft and unmerged at that head.

For owner corroboration, open Cloudflare → Workers & Pages → aegis-spaceapps-2026
→ Deployments → the deployment above → Deployment details / Source. Check full
commit SHA and branch develop, rather than assuming “Region: Earth” identifies
the commit. If production later changes, repeat identity and artifact verification.

## HTTP, TLS and artifacts

The existing command passed against the actual public URL:

```sh
node scripts/verify-deployment.mjs https://aegis-spaceapps-2026.pages.dev/
```

It was also rerun from an ignored isolated source copy made with `git archive
034fcdb`, built with the locked existing dependencies. This avoids comparing the
current local, unpublished UI clarification build against the deployed old build.
Future reruns must likewise use the exact deployed source/build.

| Check | Result |
| --- | --- |
| Public HTTPS / certificate validation | Passed Node's normal TLS validation and Chrome without ignoreHTTPSErrors; no certificate bypass |
| Root HTML, favicon, JS and CSS | HTTP 200, correct entry paths and MIME; cache revalidation may return 304 in browser |
| Face / Pose model bundles | Same-origin, HTTP 200, exact expected sizes and SHA-256 |
| SIMD and non-SIMD WASM/runtime assets | All six manifest assets verified; application/wasm for WASM; actual inference used the browser-selected SIMD runtime |
| Complete static file integrity | All 14 public files match local 034fcdb bytes, including SDK chunk, CSS, JS, manifests and license/notices |
| SPA nested fallback | Root-resolved resources and My Health after navigation/refresh; saved records retained |
| CSP | Same-origin connections, wasm-unsafe-eval, frame-ancestors none |
| Permissions-Policy | camera=(self), microphone=(), geolocation=() |
| Other headers | nosniff, X-Frame-Options DENY, Referrer-Policy no-referrer |

`_headers` itself is Cloudflare configuration, not a publicly served content file;
its effects were checked from actual response headers. No runtime CDN/backend is
required. The host still receives normal static-file HTTP requests.

## Production Chrome workflows executed

All entries below were tested in isolated browser profiles using the real public
host. No real medical data or participant video was uploaded.

- **Astronaut:** manual 7.8 h fictional smoke-test entry, explicitly noted as not a
  real measurement, saved under observed/manual input; history and refresh passed.
  It stayed separate from synthetic scenario records. Ordinary astronaut interface
  did not expose other crew records.
- **Cognitive assessments:** actual 30-second UI typing and reaction sessions,
  typing correction, premature reaction trial, automatic completed-result saving,
  review and refresh. Also tested procedure mismatch/correction and saved attempts.
- **Medical workflow:** sleep scenario → advance time → explained alert/evidence →
  acknowledge → begin review → completed follow-up → Medical Officer synthetic
  scope → explicit resolution. Case, action and acknowledgement survived refresh.
- **Simulation/context:** CO₂ scenario, contextual alerts, mission clock Resume/Pause,
  spacecraft compartment indicators, Life support environmental panel and Mira
  click-through to her synthetic health profile.
- **Anatomy:** all five systems opened. Cognitive displayed the manually entered
  sleep record plus typing/reaction history; Musculoskeletal displayed saved
  physical assessment/activity. Unknown records stayed unknown.
- **CV permission/lifecycle:** actual browser permission state denied produced a
  retryable Permission denied message. A separate granted virtual-camera browser
  loaded both real MediaPipe models from production, detected no-face/no-pose,
  released tracks on Stop/navigation during startup, saved unavailable results
  with null summaries and preserved them after refresh.
- **Actual SDK inference:** public static MediaPipe portrait/pose test images were
  routed locally into canvas video streams in the isolated test browser. Face
  calibration EAR about 0.208 and >10 usable seconds; static elbow about 175° with
  angle history and zero observed repetitions; both saved as estimated/experimental.
  This is **not a physical-webcam human blink/exercise trial**. Test image bytes were
  not sent to the production server; fixture requests were fulfilled locally.
- **Responsive screens:** personal UI and new Anatomy/Visual/Physical views had
  no horizontal page overflow at 1366, 820, 390 and 320 px widths.

Production console/network inspection found no application runtime exceptions,
failed asset requests, storage errors or unexpected remote requests in the tested
flows. The non-CV browser console had zero messages at inspection. MediaPipe emits
an informational “Created TensorFlow Lite XNNPACK delegate” line via console.error,
plus graphics/feedback/projection warnings. These are upstream logs, not a claimed
absence of every console.error entry. They did not prevent inference or cleanup.

## Owner-reported session and local clarification

The owner reported a visual session with 59.8 s duration, 46.3 s usable and 99.7%
coverage, then confirmed that the site was minimized. Investigation established:

- Coverage excludes the entire calibration phase. The rounded numbers imply
  approximately 13.4 s to calibration completion; whole-session usable share is
  approximately 77.4%. No calculation defect was established.
- Hiding the page intentionally stops capture for privacy. The generic deployed
  `camera interrupted` status describes that path, not a defective manual Stop.
- Display wording was ambiguous. A local, unpublished clarification shows the
  denominator/calibration duration and a separate session-ending reason. It also
  avoids labelling a completed clean snapshot “not started”.

See [VISUAL_SESSION_REVIEW.md](VISUAL_SESSION_REVIEW.md). Local patch validation:
61 tests across 10 files, lint, typecheck/build and local Chrome Stop/controlled
visibilitychange/320 px checks passed. No changes to measurement algorithms or
canonical persisted schemas. These patch results **do not describe deployed code**;
production and its successful CI remain 034fcdb. No urgent algorithm fix or
automatic deployment was justified by the session report.

## Cloudflare configuration and freeze

Public response protections and the successful provider deployment are accessible
and verified. **Current automatic production/preview deployment flags are not
visible through the public site or GitHub check.** No authenticated Cloudflare
settings connector is available. On 2026-11-15 the owner subsequently confirmed
automatic production deployments **disabled** and Preview deployments **None**,
superseding the earlier enabled-setting report. These settings are owner-confirmed,
not independently inspected by the agent. No settings were changed by the agent
and no credentials requested.

The owner completed the following freeze controls; retain them during testing:

1. Cloudflare → Workers & Pages → aegis-spaceapps-2026 → Settings → Builds &
   deployments → Configure Production deployments / Branch controls.
2. Keep production branch develop; uncheck **Enable automatic production branch
   deployments** and Save.
3. Set automatic **Preview deployments → None**, and Save. Do not select Retry
   deployment, Save and Deploy or create a new deployment while freezing RC1.
4. The owner confirmation is recorded in RC1_STATUS.md. No further account action
   or secret is needed for the current freeze.

These controls are described in the
[Cloudflare branch documentation](https://developers.cloudflare.com/pages/configuration/branch-build-controls/).
The stable verified release reference is the full Git SHA plus deployment ID above.
Those owner-side controls are now confirmed in force. They cannot be inferred from
artifact verification alone. No new tag or GitHub Release was published. The local
CV clarification is preserved for later review, not pushed or deployed; v4 is not started.

## Team handoff and remaining checks

[TEAM_TESTING.md](TEAM_TESTING.md) contains four independent assignments, exact
navigation, expected results/failure conditions and a redacted bug-report template.
The other four members test/review; the owner remains the only software developer.

Still pending: physical-webcam blink/exercise ground truth, device/lighting/browser
coverage, manual scientific/source and usability acceptance. The owner's one visual
session report is useful evidence, not completion of every camera test. Automated
fixtures do not establish clinical or microgravity validity. No critical production
runtime/data-integrity problem was found in the tested paths; UI wording has a
prepared local improvement. No new backend/API/paid service, PR merge or v4 work.

Ignored evidence: output/playwright/production-artifacts.json, production-personal.png,
production-anatomy-tablet.png, production-anatomy-mobile.png, production-face-fixture.png
and the isolated browser console/network logs. No raw participant recording is stored.
