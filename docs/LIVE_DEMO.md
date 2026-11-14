# AEGIS — reproducible release-candidate demonstration

Use the built app locally, or the final public URL **after it has been deployed
with owner approval and verified**. No public URL has been tested in this release
preparation. Follow [deployment instructions](DEPLOYMENT.md) and
[release/manual acceptance gates](RELEASE_CHECKLIST.md).

The main user is the astronaut. AEGIS is a local research-informed demonstration,
not clinical software. Use a fresh browser profile and fictional/non-sensitive
entries. Mode switching is a demonstration convenience, not real authorization.
Camera is optional throughout. Keep the same origin/browser profile for refresh
checks; other devices and hostnames do not share these local records.

## Start and establish provenance

```sh
npm ci
npm run check
npm run build
node scripts/verify-release.mjs
npm run preview -- --port 4174
```

Open `http://127.0.0.1:4174/`. For Cloudflare header/MIME tests use the local Pages
emulator described in DEPLOYMENT.md. The production host needs HTTPS for camera
permission; localhost is also supported. Do not use a remote plain-HTTP LAN address
for webcam acceptance. Show the on-screen research/prototype and fictional-profile
warnings before entering anything.

## 1. Astronaut: gather and review personal records (about 2 minutes)

1. Confirm **Astronaut Mode → My Health → Observed records**, fictional Mira Chen.
   No ordinary crew picker is exposed. A new workspace says No data, not healthy.
2. Under **Record an observation**, choose **Sleep duration**, enter **7.8 h**,
   and add a context note such as `Fictional demo entry for presentation`.
   Select **Save observation**. A value/time/source/origin entry and trend appear.
   It is an observed manual input into the fictional demo workspace, not a sensor
   measurement or a claim about an astronaut's actual sleep.
3. Open **Daily Assessments**. Select **Start typing test**, type into the labelled
   field, correct a character with Backspace, and allow the 30-second session to
   finish. Saving is automatic on completion. Only this field receives keystrokes.
4. Select **Start reaction test**. Respond only to **RESPOND NOW**; a deliberate
   click during WAIT can demonstrate a premature trial. Allow 30 seconds to finish.
   Results are task/device observations, not clinical performance classifications.
5. Return to **My Health → Assessment history**. Show both results with timestamps,
   `observed` origin and acquisition source. Refresh: the manual entry and both
   completed results remain; startup safely returns to My Health and pauses mission.

The optional procedure check can be shown in Daily Assessments: Start procedure
check → enter Sample volume **21** (mismatch) → **12** (matches 12 mL) → Device
setpoint **24** (demo units). The record keeps attempts; it controls no equipment.

## 2. GATHER → EVALUATE → EXPLAIN → ACT → FOLLOW-UP (about 3 minutes)

This is a clearly labelled **synthetic scenario** that tests the complete support
workflow. Its observations are never mixed with the personal records above.

| Stage | Reproducible action | Evidence to show |
| --- | --- | --- |
| GATHER | Switch **Demo user context → Mission Overview**. Open **Mission Simulation**, choose **Sleep disruption**, set seed **42**, select **Load scenario**, confirm the synthetic reset. Select **Advance 3 virtual minutes**. | Timestamped, source-labelled simulated sleep/fatigue observations. Loading/resetting a scenario preserves personal observations. |
| EVALUATE | Open **Events & Alerts**. | **Recovery indicators changed**, created by the deterministic demo rule from repeated low sleep and a fatigue self-rating. |
| EXPLAIN | Read the alert's explanation and evidence list. Open **Research & Sources** if needed, then return. | Evidence IDs, values, origin, timestamp, the demonstration-only rule, limitations and a safe verification step. The demo condition is not a NASA/clinical cutoff or diagnosis. |
| ACT | Choose **Acknowledge**, then **Begin review** for Mira's encounter. | Acknowledged alert and a separate under-review case. Acknowledgement does not prove recovery or close the case. |
| FOLLOW-UP | Enter `Confirmed the demo sleep entries, repeated the check and documented the result.` in **Follow-up note**; optionally link a supporting observation. Check **I completed the described follow-up** and select **Record follow-up**. | A timestamped, completed synthetic action linked to the case. In a real workflow this checkbox must follow the actual check; here it is an explicitly fictional demonstration. |

For explicit case resolution, switch to **Crew Medical Officer Mode**. That switch
defaults to Observed records, so choose **Synthetic mission preview** again and open
Events & Alerts. Select **Resolve case after review**. Show **Case: resolved**.
Refresh, then re-enter the synthetic medical context: the completed note and case
status remain. Resolution is a workflow state, not medical clearance.

Suggested narration: “We gather source-labelled observations, evaluate an explicit
demo rule, explain the evidence, document an action and retain a follow-up record.
The astronaut remains the user; this scenario makes the workflow reproducible.”

## 3. Mission context and environment (about 1 minute)

1. Switch to **Mission Overview → Spacecraft**. Select a compartment (for example
   **Life support**) and show its CO₂, temperature, pressure and radiation record,
   with timestamp/provenance/quality. This is a fictional spacecraft cutaway.
2. Select **Mira Chen** on the ship. Her **Crew Health** synthetic profile opens.
   It is visibly different from the personal observed workspace.
3. Optional environmental case: **Mission Simulation → Cabin environment incident → seed 42 →
   Load scenario → Advance 3 virtual minutes → Events & Alerts**. Show correlated
   compartment and occupant observations. Explain co-occurrence without claiming
   causation, poisoning or a validated exposure model.
4. Switch back to Astronaut Mode; show that the 7.8 h entry and personal assessment
   results remain. Scenario changes never replace them.

## 4. Anatomy driven by records (about 1 minute)

In Astronaut Mode → **Anatomy**, select **Nervous / Cognitive**. Show the 7.8 h
sleep entry and typing/reaction history from step 1. Other systems can legitimately
say that no supporting observations exist. Selection changes the schematic
highlight; its color does not indicate disease or diagnostic imaging.

Select **Musculoskeletal** after a saved physical session to show its activity and
angle-history graph. Cardiovascular reads available heart-rate/blood-pressure
records; bone density appears only if separately recorded from an examination.
Environment and radiation records are synthetic compartment context in the
synthetic workspace, not an invented individual organ-damage prediction.

## 5. Optional webcam demonstration (owner acceptance first; about 1 minute)

Only perform this section if the real-webcam checklist passed on the intended
device/browser. The automated release tests used virtual streams and public static
test images; they did **not** validate physical human blinks or exercise counting.

1. **Astronaut Mode → Observed records → Visual Assessment**. Read the purpose and
   privacy text. Explicitly confirm linking this session to the **fictional** profile.
2. Select **Start Assessment**, allow the browser camera request, and keep eyes
   naturally open/frontal/steady for calibration. The overlay should follow the
   face. Allow at least 10 usable seconds after calibration (about 14+ seconds total),
   then show normal blinks and the experimental observations.
3. Move out of view briefly: no-face/missing intervals must appear; missing frames
   must not become eye closure. Insufficient tracking shows the unavailable message.
4. Select **Stop Assessment** and check that the device indicator turns off. Save
   the experimental assessment, or explicitly save an unavailable result. Open
   **My Health → Assessment history**, then refresh and confirm it remains.
5. Optional **Physical Performance**: start after demo association, show the right
   shoulder/elbow/wrist, extend (>150°), flex (<65°), extend, holding endpoints
   briefly. Only perform a comfortable voluntary movement; this is not an exercise
   prescription. Show the live skeleton/angle, stop, save and review the activity.
   Camera inference does not measure muscle mass/bone density and is not validated
   for microgravity. Do not claim a counted repetition until it is actually observed.

If permission is denied, hardware is missing, calibration fails or lighting is poor,
show the explicit error/unavailable state, stop the session and continue the other
sections. Never present a canned count or static-image test as a live human result.

## Handoff and acceptance record

Record the actual URL, full commit SHA, browser/device, date and each pass/fail in
RELEASE_CHECKLIST.md. A successful local demo does not establish a deployed RC.
After an approved deployment, repeat on the real HTTPS hostname, including refresh
and camera cleanup, then open the link unauthenticated on a second device.

Do not capture/share participant video or real health data in screenshots. Local
records are not synchronized between devices; missing records on a different
origin are expected. Keep a no-camera version of the presentation ready.
