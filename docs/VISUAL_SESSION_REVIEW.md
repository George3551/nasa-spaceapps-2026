# Visual session review — coverage and minimized page

Reviewed 2026-11-15 for deployed RC1
`034fcdb76863ce0f861230a66b55f188c68a03d5`.

## Coverage calculation

The implemented visual metric uses:

```text
postCalibrationWindowMs = max(0, durationMs - calibrationMs)
trackingCoverage = validObservationMs / postCalibrationWindowMs
```

The whole calibration phase, including any initial delay/failed calibration
attempts, is excluded. Three seconds is the minimum continuous suitable-eye
window, not a fixed amount subtracted from every session. Thus calibration may
take considerably longer than three seconds.

Owner-reported display: session 59.8 s, usable 46.3 s, coverage 99.7%.
Using rounded displayed values gives a post-calibration window about
`46.3 / 0.997 = 46.44 s`, implying about **13.36 s before calibration completed**.
Whole-session usable proportion is approximately `46.3 / 59.8 = 77.4%`.
These two percentages have different denominators. Exact calibration time cannot
be recovered from rounded display values; the saved visual record's calibrationMs
holds it. A long calibration is consistent with the report, not proven to have a
particular lighting/pose cause from these numbers alone.

The formula is consistent with the documented engineering protocol. No numerical
defect was established. The deployed label “Usable coverage” does not explain the
denominator sufficiently, so a local UI clarification was prepared.

## Why camera interrupted appeared

The owner confirmed **“я свернул сайт”** (minimized the site). The controller's
visibilitychange listener stops the stream when document.hidden becomes true.
The existing interrupted path marks `camera_interrupted`, stops all tracks/model,
and displays “Assessment stopped because the page became hidden.” It is an
intentional privacy stop, not evidence of a camera hardware failure or a manual
Stop defect. Missing time still remains unusable; it is never eye-closure time.

Ordinary Stop does not set camera_interrupted. It captures the last tracking
state and releases the stream. The old UI also labels a clean completed tracking
snapshot “not started” once inactive, which is another display ambiguity.

## Local clarification — not published/deployed

- Display Calibration phase, Post-calibration window, **Usable coverage after
  calibration**, and a separate Whole-session usable proportion.
- Preserve the final sample as **Last tracking observation**.
- Explain session ending separately: stopped by you, hidden page, external stream
  end, stalled frames, time limit, processing error or startup failure.
- The ending reason is runtime/UI metadata only; it does not change the canonical
  saved assessment schema. Existing saved quality intervals remain unchanged.
- No changes to metrics.ts, EAR, calibration gates, smoothing/hysteresis, blink or
  closure formulas, PERCLOS-inspired calculation, quality cutoffs, or exercise FSM.

Validation of this local patch: **61 tests across 10 files**, lint, TypeScript and
production build passed. Added regression checks cover a 13.4-second calibration
phase with approximately 99.7% post-calibration coverage, user Stop versus hidden
page versus external stream end, and the rendered UI labels. A local Chrome test
with virtual camera verified user Stop without an error, controlled visibilitychange
stop, track cleanup and 320 px layout. That controlled event test is not a physical
webcam accuracy validation. The owner supplied one real-interface session report;
full blink-count ground truth and physical exercise acceptance remain pending.

The deployed 034fcdb remains unchanged. No critical algorithm change or emergency
deployment is required by these findings. Publication of the UI patch requires
separate approval and a new reviewed release reference.

Freeze handoff: the existing patch and tests are preserved in a local develop
checkpoint, together with production/team documentation. No push or deployment
is authorized. See [DEVELOPMENT_HANDOFF.md](DEVELOPMENT_HANDOFF.md).
