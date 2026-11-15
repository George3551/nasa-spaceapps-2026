# Submission stabilization — 2026-11-15

Urgent final-release authorization supersedes earlier publication restrictions.
Baseline: 8831e4a; independent audit read from AEGIS v4.1 Independent Technical Audit.md
provided in the local Downloads/Telegram Desktop directory. All A1–A5 were first
reproduced by seven failing regression probes, then corrected without threshold changes.

- A1: only marked clock telemetry is capped; first compatible baseline sessions,
  fixture/manual/explicit imports and original/update/follow-up evidence are retained.
  Expired baseline anchors cannot silently roll into disrupted observations.
- A2: explicit asOf, existing freshness windows, actual chronological ordering,
  future exclusion and distinct sleep sessions/instants. Future manual dates rejected.
- A3: spot physiology no longer emits sleep/activity durations. Same-instant
  conflicting/incompatible measurements are unavailable with a warning, never
  selected silently by insertion order. The scenario finding survives acquisition.
- A4: immutable/idempotent observation insertion; subject/source/origin/category
  collisions fail atomically and preserve existing records.
- A5: original alert evidence/creation/status remain intact. New detections append
  dated snapshots; case and acknowledgement/follow-up histories are preserved.
- A7/A8/A9/A10: readable validation, contextual notices, absolute ordinal differences,
  rounded evidence display and current README. Existing numeric precision retained.

Minimal onboarding uses the actual reducer/simulator/CDSS: Start Mission Demo,
Check My Health, Explore the Spacecraft, evidence and follow-up instructions.
Replay confirms before replacing synthetic records; observed records remain separate.
Newly published UI commits through d26328f are preserved in the release merge.

Additive contract proposal: optional generatedTelemetry on existing canonical record
interfaces; optional HealthAlert.updates with dated evidence snapshots. Old storage
remains readable; imported records are protected. These are metadata additions,
not a second store or a new diagnostic algorithm. PR #4 is not merged.

Validation: npm run check passed 120 tests in 16 files, lint, TypeScript and build.
Local Chrome passed one-click demo, sensor packet/coherent finding, acknowledgement,
review/follow-up/medical-context resolution, +120/+240 minute baseline retention,
refresh/storage, native future-date rejection, CO2 finding, cognitive/CV availability,
390px mobile menu/no page overflow and no application console errors.
Physical webcam/hardware validation was not performed. Role attribution remains
unverified demo context (A6); no claim of authenticated clinician action. Science
validation and v4.2 module acceptance remain outside the submission release.

Gemini prevention/resources and the newly published Claude assistant (3ce281f) are excluded because independent integration verification is incomplete.
See INTEGRATION_READINESS.md and RADIATION_CAPABILITY.md for concise status.
Commit identity is available with git log -1 after the release merge is committed.
