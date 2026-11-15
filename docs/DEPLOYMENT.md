# AEGIS release candidate — Cloudflare Pages

Prepared 2026-11-14. **No Cloudflare account was connected and no public deployment
was performed.** Local HTTP/HTTPS emulation is not a production URL. Publication,
Git push, account authorization and any main merge require the owner's separate
approval. PR #4 remains draft/unmerged. See [release gates](RELEASE_CHECKLIST.md)
and [demonstration steps](LIVE_DEMO.md).

## Architecture and exact build settings

Deploy the existing static React/Vite application; no Worker/Functions, backend,
database, API token, runtime secret, paid service or external model CDN is needed.
All model and WASM files are in `public/models/vision` and copied into `dist`.

| Setting | Value for this RC |
| --- | --- |
| GitHub repository | `George3551/nasa-spaceapps-2026` |
| Project type | **Pages**, import an existing Git repository |
| Framework preset | **None** with the explicit Vite settings below |
| Root directory | Repository root (leave blank, or `/` if required by the UI) |
| Production branch for this RC project | `develop` |
| Build command | `npm ci --include=dev && npm run check && node scripts/verify-release.mjs` |
| Build output directory | `dist` |
| Node version | `.node-version` pins `22.19.0`, matching the local acceptance run |
| Build-only variable | `SKIP_DEPENDENCY_INSTALL=1` to use the explicit `npm ci` above |
| Runtime variables / secrets | None; no `VITE_*` variables are required |
| Functions / bindings | None |

`npm run check` already includes the production build. Keep build-time dev
dependencies installed for Vite, TypeScript, ESLint and Vitest. Do not set an
installation policy that omits them. The same build command is suitable for
preview branches. If a dashboard `NODE_VERSION` override exists, remove it or
make it match `.node-version`. No npm package versions changed in this preparation.

The custom build settings follow the [Cloudflare React deployment guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/).
The [build-image documentation](https://developers.cloudflare.com/pages/configuration/build-image/)
describes `.node-version` and skipping the default install. The Pages environment
has not yet executed this candidate; local Windows tests and the existing v3
GitHub checks are separate evidence from a future Cloudflare Linux build.

## Branch and publication policy

The immediate v3 candidate is on `develop`; `main` still contains Core v2.
Using `main` now would publish the older application. For an initial RC without
merging PR #4, configure a dedicated Pages RC project to build **develop**, freeze
that branch for the approved release, and record the exact deployment commit.
After the initial approved deployment, disable automatic production deployments
in branch controls until future publications are explicitly approved. Continuing
development must not silently change the public demonstration.

Alternatively, after a separately approved PR #4 integration, the owner can use
`main` as the production branch. That is a different, later operation.
[Cloudflare Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/)
supports selecting a production branch. Its automation makes the initial account
connection and Save/Deploy a publication step, not just passive configuration.

## Reproduce local verification first

From the repository root, with Node 22.19.0 / npm 10.9.3:

```sh
npm ci
npm run check
npm run build
node scripts/verify-release.mjs
npm run preview -- --port 4174
```

Open `http://127.0.0.1:4174/` and follow LIVE_DEMO.md. Vite preview serves the
production build, but does **not** apply Cloudflare's `_headers` rules.
For the same local Pages emulation used in acceptance, stop preview and run:

```sh
npx --yes wrangler@4.162.0 pages dev dist --ip 127.0.0.1 --port 4174 --compatibility-date 2026-11-14
```

This command serves local files and needs no Cloudflare login. Wrangler is an
optional verification tool, not an application dependency. Its generated
`.wrangler/` files are ignored. Local mode may print a synthetic `CF_PAGES_URL`;
that string is **not evidence of a deployed site**. CLI usage is documented in
[Cloudflare local development](https://developers.cloudflare.com/pages/functions/local-development/).

```sh
node scripts/verify-deployment.mjs http://127.0.0.1:4174/
```

The verifier checks actual response headers, root assets, JavaScript/CSS/WASM MIME
types, all six model/runtime SHA-256 values and a nested SPA fallback path.
`npm ci` on Windows can fail with EPERM if a Vite process holds a native module:
stop only this project's dev/preview server, then retry; do not delete saved data.

## Files and serving behavior

- Vite `base: '/'` targets a Pages origin root. Root-relative JS/CSS/model URLs
  work even when the HTML is served through a nested-path SPA fallback.
- Navigation uses existing React state, not a URL router. Refresh intentionally
  opens **Astronaut Mode → My Health → Observed records**, pauses the mission and
  retains saved records. Refresh does not resume an active assessment or camera.
- No top-level `404.html` or catch-all `_redirects` override is added. Pages'
  [default SPA handling](https://developers.cloudflare.com/pages/configuration/serving-pages/)
  supplies the root shell for paths without an asset. Do not mistake a 200 HTML
  fallback for a successfully loaded `.task` or `.wasm`; the verifier hashes bytes.
- `public/_headers` is copied to `dist/_headers`; Cloudflare parses it as
  [static-response headers](https://developers.cloudflare.com/pages/configuration/headers/).
  CSP restricts connections to the same origin, permits WASM compilation and
  forbids framing. Camera permission is allowed only for the same origin;
  microphone and geolocation are disabled. Browser permission is still required.
- Keep Pages' default cache behavior. Unversioned model names are not assigned
  year-long immutable caching. No service worker or offline install is configured.
- Each file is below the [25 MiB Pages limit](https://developers.cloudflare.com/pages/platform/limits/).
  The largest is 11,453,626 bytes; verify-release.mjs rechecks the artifact at build.
- Publish only `dist`, never the repository root, `.git`, `node_modules`, test
  screenshots, fixtures, local backups or credentials. Runtime model assets and
  their notices/license are intentional dependencies, not user health data.

## Exact owner actions to publish — only after approval

1. Review the local release-preparation commit (`git log -1 --oneline`),
   RELEASE_CHECKLIST.md and the real-webcam checklist. Explicitly approve **Git
   push, Cloudflare GitHub authorization and RC publication from develop**.
   No visibility change is needed; read-only inspection found the repository
   already public. This preparation did not change its visibility.
2. After that approval, publish the reviewed commit with `git push origin develop`.
   Wait for the latest GitHub Actions checks. Do not merge PR #4 as part of this step.
3. The owner signs into Cloudflare → Workers & Pages → Create application →
   **Pages** → Import an existing Git repository. Authorize the Cloudflare GitHub
   app for **only this repository**. Interactive sign-in/authorization is the
   remaining account action; no credentials should be pasted into project files.
4. Enter the table settings, choose an available RC project name, and check that
   the selected branch is `develop`. Use the included Pages/free static-hosting
   option; no custom domain purchase or paid add-on is needed for this setup.
   Leave optional Web Analytics, Zaraz and injected third-party scripts off.
5. Only with publication approval, select Save and Deploy. Record the full commit
   SHA from Cloudflare's successful build and the actual assigned HTTPS URL.
   Disable automatic production deployments after this approved build. No URL
   is assumed in advance; `https://YOUR-PROJECT.pages.dev/` is a placeholder.
6. On a checkout of **that exact commit**, run the commands below, then perform
   LIVE_DEMO.md and the manual webcam checks using the actual URL. Open it on
   another device or fresh unauthenticated browser to check public accessibility.

```sh
git rev-parse HEAD
npm ci
npm run check
node scripts/verify-release.mjs
node scripts/verify-deployment.mjs https://YOUR-ACTUAL-PROJECT.pages.dev/
```

The URL verifier requires valid public TLS; do not disable certificate validation
for a public deployment. Local HTTPS acceptance used a self-signed development
certificate in an isolated test browser only. A passed HTTP verifier does not
replace browser interaction or physical-webcam acceptance.

7. Record the URL, commit, browser/device, date, command outcomes and owner webcam
   result in the release checklist. Only then label the **public** RC verified.
   If any gate fails, retain the failure and fix/retest before sharing a competition
   link. Use an earlier verified Pages deployment for rollback if one exists;
   do not delete browser storage or rewrite Git history to recover a deployment.

## Persistence and public-demo scope

Records stay in localStorage on the visitor's browser; hosting serves static files
and receives ordinary asset requests, not an application health-data submission.
This is not authentication, encrypted clinical storage, a shared database or
cross-device synchronization. Use fictional/non-sensitive entries only.

Storage is bound to the **origin**. Localhost, a branch-preview hostname, a unique
deployment hostname, the stable `pages.dev` hostname and a custom domain have
separate records and camera permissions. Use the stable final hostname during
the demonstration. A new hostname starts an empty personal workspace, not a data
migration failure. Private browsing, quota exhaustion or cleared site data can
prevent persistence. Failed validation/quota errors retain the existing recovery UI.

Known limitations and manual/production gates remain in RELEASE_CHECKLIST.md.
