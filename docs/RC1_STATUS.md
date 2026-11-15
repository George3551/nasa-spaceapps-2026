# AEGIS RC1 — verified release reference

Updated 2026-11-15 (Asia/Tashkent). **Production technical verification passed.**
**Release freeze is in force at 034fcdb.** On 2026-11-15 the owner confirmed
automatic production deployments are disabled and Preview deployments is None.
This supersedes the earlier enabled-setting report. The agent did not change
Cloudflare settings. Manual/scientific acceptance remains pending.

| Item | Recorded status |
| --- | --- |
| Production URL | https://aegis-spaceapps-2026.pages.dev/ |
| Actual deployed code SHA | `034fcdb76863ce0f861230a66b55f188c68a03d5` |
| Identity evidence | [Cloudflare provider check](https://github.com/George3551/nasa-spaceapps-2026/runs/132684515923) on that full SHA; all public artifact bytes match its local build |
| Deployment ID | `4faefd81-3e76-4d3b-8fe0-b0d1af8c6cd2` |
| Provider-linked deployment URL | https://4faefd81.aegis-spaceapps-2026.pages.dev/ |
| Successful provider check timestamp | 2026-11-15 08:24:18 Asia/Tashkent (03:24:18 UTC) |
| GitHub Actions — push | [Success](https://github.com/George3551/nasa-spaceapps-2026/actions/runs/43671354847) |
| GitHub Actions — pull_request | [Success](https://github.com/George3551/nasa-spaceapps-2026/actions/runs/43671358798) |
| PR #4 | Open, draft, unmerged; remote head remains the published SHA |
| HTTP/TLS/assets/headers/SPA | Existing verifier passed on real HTTPS URL from exact 034fcdb reference build |
| Production browser workflows | Passed; details in [PRODUCTION_VERIFICATION.md](PRODUCTION_VERIFICATION.md) |
| Physical-webcam/team acceptance | Pending four assignments in [TEAM_TESTING.md](TEAM_TESTING.md); owner supplied one visual-session report |
| Stable RC1 reference | Full deployed Git SHA + deployment ID above; no new tag/GitHub Release published |
| Automatic production deployments | Disabled, confirmed by the owner on 2026-11-15; not independently inspected in the account |
| Preview deployments | None, confirmed by the owner on 2026-11-15 |
| Release freeze | Preserve production at 034fcdb; no push/deployment/PR merge permitted without a new explicit instruction |
| Local UI clarification | Preserved in a local development checkpoint only; **not pushed or deployed**; [review](VISUAL_SESSION_REVIEW.md) |

## Preserve this production release

Do not advance the release reference to the local UI patch or a docs-only commit.
Do not merge PR #4 or publish another deployment without separate approval. Keep
the current production SHA until a reviewed change is authorized.

The owner has completed the branch-control changes. Keep production deployments
disabled and Preview deployments at None. No Retry deployment, new deployment,
GitHub Release, tag publication or PR #4 merge is part of this freeze operation.
Current policy also forbids pushing the local development checkpoint, even though
automatic Cloudflare builds are disabled. Local v4.1 was subsequently explicitly assigned on develop; see CORE_V4_1.md. That assignment does not permit publication or change this release reference.

The setting values are owner-confirmed, not inferred from public headers or a
GitHub check. See [Cloudflare branch controls](https://developers.cloudflare.com/pages/configuration/branch-build-controls/).
The agent did not change account settings. Local work is described in
[DEVELOPMENT_HANDOFF.md](DEVELOPMENT_HANDOFF.md).

## Reverify the same reference

Use a clean source/build of the full deployed SHA; the working directory now also
contains an unpublished UI clarification, whose different build must not be mistaken
for the old release. An ignored isolated archive of 034fcdb was used for the final
verifier rerun, which passed.

```sh
npm run build
node scripts/verify-release.mjs
node scripts/verify-deployment.mjs https://aegis-spaceapps-2026.pages.dev/
```

Then repeat [LIVE_DEMO.md](LIVE_DEMO.md) on the same host. Automated camera results
used explicitly labelled virtual/static-image streams. Real webcam blink/exercise
accuracy, scientific source review and broad device acceptance remain manual.

New status/team/review documents and the local UI patch are preserved in a local
checkpoint on develop, without publication. origin/develop and production remain
exactly 034fcdb. No backend/API/paid service or future-version work was introduced.
