# Attribution addendum — validation and release boundary

Prepared with OpenAI Codex on 2026-11-15. This report describes metadata work
against implementation `b8e26c9dded392b0fb612f8ec034b7da2201d4e0` on `develop`.
The published implementation is preserved; no deployment/configuration change,
new feature, medical threshold or algorithm change is authorized by this task.

## Scope and evidence

- 72 tracked first-party source/configuration/verification files inspected for
  purpose, imports, provenance documentation and change history; comments added.
- Six module README disclosure notes, one appended root README section, root
  AI disclosure and machine-readable file/asset manifest.
- Substantial generated code is acknowledged where the retained Codex
  implementation session supports it. Claude UI changes are supported by
  documented commit trailers and team reports. Exact per-line authorship remains
  unverified. Research/concept/direction/testing contributions are attributed to
  the team according to its report.
- Separate Claude assistant and Gemini prevention/resource branches are not
  ancestors of the inspected implementation and are not represented as deployed.
- Original notices, test directives and application source content retained.
  Strict JSON/configuration, dependencies, lockfile, third-party model/runtime
  assets and external notices/licenses are not modified for attribution.

## Verification

Executed locally on 2026-11-15:

| Check | Actual result |
|-------|---------------|
| `git diff --check` | Pass |
| Original-content preservation audit | Pass: all 72 source files equal their original content after removing only the inserted disclosure comment |
| Preserved-file SHA-256 checks | Pass: 50 other tracked files unchanged byte-for-byte, including third-party models/runtime, notices/licenses and lockfile |
| README preservation | Pass: root README appended; six module README notes only |
| Manifest / disclosure coverage | Valid JSON; 72 source rows; ten disclosure sections; local links resolve |
| `npm run check` | Pass: lint, 120 tests in 16 files, TypeScript and production build |
| Separate `npm run build` | Pass: 155 modules transformed |
| `node scripts/verify-release.mjs` | Pass: 15 distribution files, six pinned model/runtime assets verified, local documentation links pass |

Headers preserve original test-environment and TypeScript directives. Canonical
contract declarations and all original application source remain unchanged.
No new physical-webcam or clinical validation is claimed. Built asset hashes can
differ because of comments; this local build is not substituted for production.

Before publication, the authenticated Cloudflare dashboard showed production
`develop` at `b8e26c9`, deployment `a8662144-abaa-46ef-91f8-4acea6e87816`, with
**Automatic deployments paused / Disabled**. No Cloudflare setting was changed.

## Publication and submission boundary

Only `develop` may receive the normal fast-forward attribution commit after
checking that its remote tip still equals the reviewed implementation. The
metadata commit is separate from the frozen application SHA. Do not push
`main`, `review/v4.1` or teammate branches, directly modify/merge PR #4, retry
Cloudflare deployment or change deployment settings.

The official [2026 event page](https://www.spaceappschallenge.org/2026/)
states the project-submission deadline is November 15 at 11:59 p.m. local time.
The current [Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/)
(November 13, 2026) was read in the browser after the search/fetch tools failed
to retrieve it. It permits editing/resubmission until the hackathon ends and
states that projects saved/submitted after the deadline are ineligible for
judging. It also requires disclosure of generated code/data in descriptive text
and metadata. Neither that guide nor the reviewed
[participant terms](https://www.spaceappschallenge.org/legal/) establishes an
explicit allowance for modifying externally linked project contents after
closing. The team should obtain organizer guidance if a post-deadline correction
is needed. Publishing attribution is not presented as NASA approval of an
amended submission. No new application functionality or deployment is included
in this addendum.

## Reproduce

```sh
git diff --check
npm run check
npm run build
node scripts/verify-release.mjs
```

The complete exact file list, source scope and asset hashes are in
[AI_DISCLOSURE_MANIFEST.json](../AI_DISCLOSURE_MANIFEST.json) and
[AI_DISCLOSURE.md](../AI_DISCLOSURE.md). Physical-camera acceptance remains a
separate human activity; this task does not claim to repeat it.
