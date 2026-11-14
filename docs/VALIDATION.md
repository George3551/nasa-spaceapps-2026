# Foundation validation — 2026-11-14

Environment: Windows, Node.js 22.19.0, npm 10.9.3, Chrome via Playwright CLI.
This report covers the application foundation, not the full product acceptance
criteria in TECHNICAL_SPEC_RU.md. No domain engine has been implemented.

## Actual command results

| Command | Result |
|---|---|
| `npm install` | Passed; exact versions recorded in lockfile; audit reported 0 vulnerabilities |
| `npm ci` | Passed from the final lockfile; 244 packages installed; audit reported 0 vulnerabilities |
| `npm run dev -- --port 5173 --strictPort` | Vite started on loopback; later a host-accessible browser run used port 5174 |
| `npm run lint` | Passed with zero allowed warnings |
| `npm test` | 2 test files, 9 tests passed |
| `npm run typecheck` | Passed with strict TypeScript, noUncheckedIndexedAccess, exactOptionalPropertyTypes |
| `npm run build` | Passed; Vite transformed 26 modules |
| `npm run check` | Passed: lint, tests, typecheck and production build |
| `npm ls --depth=0` | Passed; no invalid direct dependencies |
| `npm ls minimatch` | Passed; all affected paths use 11.0.8 |
| `git diff --check` | Passed |

Production assets at validation: JS 236.42 kB (gzip 73.14 kB), CSS 12.02 kB
(gzip 3.63 kB), index.html 0.64 kB. Generated dist is not committed.

An initial npm ci attempt while Vite was running hit a Windows file lock.
The two project Vite processes were stopped, then the clean install succeeded.
An initial developer-tool advisory was fixed by the documented scoped override;
the final lockfile was regenerated in an isolated directory and verified by ci.

## Automated coverage

- Independent synthetic fixture snapshots with canonical source/quality fields.
- Immutable measurement upsert, duplicate IDs, missing values preserved as null.
- Mission replacement with empty crew/rooms and invalid selection handling.
- Alert acknowledgement survives evaluator refresh, without changing measurements.
- Fixture reset removes incoming events and restores the same baseline snapshot.
- Visible synthetic label, unit, source, timestamp and non-assessment notice.
- All shell navigation targets, personal-health CTA and sample reload.
- Missing/invalid values render as No data rather than zero.
- Independently injected spacecraft/health test views exchange updates via store.

## Browser checks actually performed

The production build was served at http://127.0.0.1:5175/ using `npm run preview`.

- Opened every navigation section and returned to Mission Dashboard.
- Checked the personal profile, source metadata and placeholder states.
- Checked widths 1366, 390 and 320 px; no horizontal document overflow.
- Visually inspected the desktop dashboard and mobile personal profile.
- Production console: 0 errors, 0 warnings; no uncaught page errors.
- Reload + navigation issued no requests outside the local origin.
- With browser networking disabled after loading, navigation to Crew Health worked.
- Earlier dev favicon 404 was fixed with a local SVG favicon; production is clean.

Screenshots are local review output under output/playwright/ and intentionally
ignored, along with Playwright snapshots and installed dependencies.

## Limits and next checks

- Offline test covers the already loaded shell. A cold offline launch/installable
  PWA has not been implemented or claimed.
- No deployment on another device and no NASA dataset import were tested.
- No camera, medical rule engine, ship model, anatomy model or simulator exists yet.
- State is memory-only and resets on refresh, as stated in UI.
- Input validation of external data, persistence, clock orchestration, protocol
  actions and accessibility review of future modules remain integration work.
- GitHub Actions workflow is configured; a local pass does not establish a hosted
  CI result. Inspect the repository's Actions tab after publishing.
