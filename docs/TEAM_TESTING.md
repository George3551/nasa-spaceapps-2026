# AEGIS RC1 — four independent acceptance assignments

One developer owns fixes and release operations. The other four team members each
take one assignment below; no coding, Git branches or tool installation is required.
Manual results remain pending until that member actually completes the assignment.
Testing does not delay technical deployment preparation.

**Verified production:** [aegis-spaceapps-2026.pages.dev](https://aegis-spaceapps-2026.pages.dev/).
**Deployed code SHA:** `034fcdb76863ce0f861230a66b55f188c68a03d5`, confirmed by the
[successful Cloudflare provider check](https://github.com/George3551/nasa-spaceapps-2026/runs/132684515923)
and matching deployed artifacts. Technical production checks passed on 2026-11-15;
the four manual/scientific assignments below are still pending. Use the same URL
throughout. Local UI clarifications prepared after verification are not yet deployed.

## Common setup and provenance

- Each tester uses their own fresh browser profile/private window and records
  browser/version, OS/device, URL, date/time and candidate SHA. Private storage can
  disappear when the window closes; test refresh before closing it.
- Use only fictional, non-sensitive test entries. Never send raw camera recordings,
  real medical records, passwords or tokens in a bug report.
- **Observed records:** actual manual inputs/task interactions or experimental
  camera estimates associated with a fictional demo profile. They are not verified
  measurements of an astronaut. Camera association must be explicitly confirmed.
- **Synthetic mission preview / Mission Overview:** generated scenario data.
  Scenarios must not replace personal observed records. NASA research is context,
  not a personal observation, imported dataset or clinical validation.
- Refresh intentionally opens **Astronaut Mode → My Health → Observed records**
  and pauses the mission. Saved records remain on that origin/browser only.
  Switch back to synthetic scope to inspect a saved mission case after refresh.
- In the deployed visual UI, coverage excludes the entire calibration phase:
  usable milliseconds / (session milliseconds − calibration milliseconds).
  Minimizing/hiding the page deliberately stops the camera and currently shows
  `camera interrupted`; check the accompanying hidden-page explanation. This is
  a privacy stop, not evidence of a medical condition or a hardware fault.
- Role switching is a demo control, not authentication. Missing data does not mean
  healthy. A quality/experimental label is not a clinical diagnosis.

## 1 — Computer vision and physical webcam (member A, 15–20 min)

**Steps**

1. Open **Astronaut Mode → Observed records → Eye Observation** using a real
   webcam; no virtual-camera/test-stream override. Before Start, confirm no app
   camera session is active. Confirm the fictional-profile association.
2. Select **Start Assessment**, deny browser permission. Confirm the error and
   retry control; navigate to My Health to confirm other features still work.
   Return, allow camera in the browser's site permissions, then Start again.
3. Check the real preview and moving face-landmark overlay. Keep eyes naturally
   open/frontal/steady for calibration (≥3 s), then collect ≥10 usable seconds.
   Observe five natural blinks, recording manual and displayed counts/durations.
   Record discrepancies rather than assuming medically valid accuracy.
4. Briefly leave the frame/occlude the face, try a large head turn and, if practical,
   a second consenting person in frame. Check quality messages and missing time.
5. **Stop Assessment → Save experimental assessment** (or explicitly save an
   unavailable session) → **My Health → Assessment history**. Refresh and review.
6. Repeat short trials: navigate away during startup/running, hide the tab and
   refresh while running. The application's capture must stop promptly.
7. **Movement Check**: confirm association, Start, clearly frame right
   shoulder/elbow/wrist. If comfortable, do three full extended (>150°) → flexed
   (<65°) → extended cycles with brief holds. Also try a static arm/incomplete cycle
   and brief tracking loss. Stop/save → My Health → Body Systems → Musculoskeletal.
   This is voluntary software testing, not an exercise prescription.

**Expected:** explicit camera activation, no audio; overlay follows observations;
tracking loss excludes unusable time and does not become closed eyes or extra
repetitions. Saved results show observed origin, camera source, quality,
experimental/demo association and timestamp. Physical history includes the linked
activity/angle graph. Camera stops after Stop/navigation/hidden tab. Other features
remain usable without camera. No upload or raw video/landmark storage is expected.

**Fail/report:** camera stays active, missing frames count as closure, static arm
adds reps, obviously wrong count/overlay, unavailable metrics become zero, save or
refresh loses results, unexpected outbound frame traffic, or diagnostic wording.
If lighting/hardware prevents calibration, report conditions and unavailable state;
do not claim a physical-camera pass. Another app's camera use can keep its LED on.

## 2 — Astronaut Mode and cognitive assessments (member B, 10–15 min)

**Steps**

1. Open My Health in Astronaut Mode/Observed records. Confirm own fictional profile,
   no ordinary crew picker and No data for unrecorded indicators.
2. **Record an observation → Sleep duration → 7.8 h**; add note `Fictional test`;
   Save. Change Indicator to Fatigue, enter **3 / 10**, Save. Review values, units,
   timestamps, source/origin and trend. Blank/malformed entries must not save as zero.
3. **Cognitive Tests → Start typing test**. Type in the response field, use
   Backspace once and finish 30 s. Completion saves automatically; review metrics.
4. **Start reaction test** in demo mode. Click WAIT once deliberately, then respond
   to RESPOND NOW. Finish 30 s. Review valid responses and premature count.
5. Start procedure check: enter Sample volume **21**, then **12**, then Device
   setpoint **24**. Review the mismatch/correction and saved attempts.
6. Return to **My Health → Assessment history**, refresh and confirm all completed
   results/manual entries remain. Start then stop/discard a typing trial; it must
   not appear as a completed result. Try the tablet/phone view if available.

**Expected:** usable personal dashboard without camera; observed/manual or
assessment provenance; corrections/premature trials visible; saved history after
refresh. Timing scores describe the task/device, not cognitive disease. UI remains
readable with keyboard/touch and no page-wide horizontal overflow.

**Fail/report:** another astronaut's records appear in ordinary Astronaut Mode,
data loss/duplicate completion, incorrect units, blank saved as zero, blocked core
features when camera is denied, or task scores presented as diagnosis. Do not
expect records to sync to another device or hostname.

## 3 — Simulator and clinical decision support (member C, 10–15 min)

**Steps**

1. First save a **7.8 h** sleep entry with note `Fictional test` in Astronaut Mode /
   Observed records, so separation can be checked independently.
2. **Mission Overview → Simulator → Sleep disruption → Random seed 42 →
   Load scenario**; confirm with **Reset and load**. **Advance 3 virtual minutes**.
3. **Alerts & Cases**: inspect **Recovery indicators changed**, explanation,
   evidence IDs/values/time, demonstration-rule label and safe next check.
4. **Acknowledge → Begin review**. Add a Follow-up note describing a fictional
   verification, optionally link an observation; check **I completed the described
   follow-up → Record follow-up**.
5. Switch to **Crew Medical Officer Mode → Synthetic mission preview → Events &
   Alerts → Resolve case after review**. Refresh, switch back to that synthetic
   context and confirm the case/note remain. Acknowledgement alone must not resolve.
6. **Mission Overview → Spacecraft → Life support**: review CO₂, temperature,
   pressure and radiation context. Select Mira Chen to open her synthetic profile.
7. **Simulator → Cabin environment incident → seed 42 → Load scenario → Reset and load →
   Advance 3 virtual minutes → Alerts & Cases**. Review compartment/occupant
   evidence. Try Resume/Pause. Return to Astronaut Mode and verify the 7.8 h entry.

**Expected:** GATHER synthetic observations → EVALUATE explicit demo rule → EXPLAIN
evidence → ACT/review → FOLLOW-UP record. Resolution is explicit and requires
review/completed follow-up; it is not recovery certification. Mission reset/time
changes do not overwrite personal observations. Environment is context, not proof
of illness or individual absorbed exposure.

**Fail/report:** no reproducible alert, absent/wrong-subject evidence, lost case,
resolution without required follow-up, clock does not pause, wrong crew click-through,
missing environment panel, or observed/synthetic records mixed.

## 4 — Scientific accuracy, NASA references and UX (member D, 15–20 min)

**Steps**

1. **Research & Sources**: open NASA HRR 720/1170/1316, NASA AMO, HRP and CDSS
   references. Distinguish reviewed metadata/abstracts from full text; record broken
   links or claims unsupported by the cited page. AMO is historical project context.
2. Read the Rule register and Alerts & Cases labels in a synthetic sleep scenario
   (Mission Overview → Simulator → Sleep disruption → seed 42 → Load →
   Advance 3 virtual minutes). Verify rule numbers are labelled unvalidated demo
   choices, not NASA medical limits or treatment instructions.
3. Return to **Astronaut Mode → Observed records**; save a fictional **7.8 h** sleep
   entry. **Body Systems → Nervous / Cognitive** must show that entry with provenance.
   Select all five systems; absent supporting records must remain unknown/missing.
4. Read Eye Observation / Movement Check privacy and limitation text without
   starting a camera. Check for any identity/emotion classifier, diagnosis, validated
   PERCLOS claim, bone/muscle inference or microgravity-validation implication.
5. Review terminology, readable units/timestamps and navigation at desktop and phone/
   tablet widths. The astronaut's own dashboard should be direct; mission simulation
   should be clearly separate. Body Systems must read as a schematic, not diagnostic imaging.

**Expected:** research context, implemented measurements and experimental assumptions
remain distinct; no imported NASA dataset/clinical validation is invented. No organ
damage or psychological state is inferred from the illustration/video. Camera is
optional and its purpose/limits are understandable. No-data is never called healthy.

**Fail/report:** unsupported scientific claim (quote exact wording + source URL),
missing demo label/provenance, misleading anatomy color/imaging, inaccessible source,
privacy text contradicting behavior, confusing mode/scope or unreadable layout.
Scientific review is still required even if software tests pass.

## One bug-report format — all assignments

Send the developer a text report or create an issue manually in the
[project issue tracker](https://github.com/George3551/nasa-spaceapps-2026/issues).
Do not alter code or deploy a fix. Use one report per distinct failure:

```text
Assignment / title:
URL + candidate SHA:
Browser/version + OS/device (+ camera model for member A):
Date/time + mode + observed/synthetic scope:
Steps (1, 2, 3):
Expected:
Actual (+ exact error text):
Reproduces: every time / sometimes (count):
Impact: blocker / functional error / scientific wording / usability:
Evidence: redacted screenshot or description; no raw video/real medical data:
```

Each member returns **PASS / FAIL / NOT TESTED** for their assignment, with any
bug references and conditions. Camera/data privacy leaks, corrupted/lost records,
mixed provenance, app crashes and diagnostic misrepresentation are release blockers.
The developer triages fixes and retests before any separately approved publication.
Manual acceptance is not automatically a clinical validation or a release approval.
