# Demo and acceptance walkthrough

**Core product claim:** an astronaut can collect observations, understand deviations, inspect supporting information and select a sensible non-diagnostic next step, while a spacecraft digital twin contextualizes location/exposure.

## 2–4 minute live demo (suggestion)

0. Start app offline (precache / local build). Show clearly marked **SIMULATED MISSION** and 3 synthetic crew members.
1. Select crew member from ship schematic. Open **astronaut-facing** health screen, not observer-only 3D view.
2. Show sleep, pulse, activity, environment history with units, source badges and timeline.
3. Start **Sleep Disruption** scenario, advance mission clock. Show explainable alert using several measurements; show evidence and safe verification action.
4. Start **CO2 Excursion** scenario. Show affected compartment, sensor reading, affected crew and transparent demo threshold. Show event history/acknowledge.
5. Show **Radiation Event** in scenario mode; do NOT infer illness from event.
6. (Optional) Open camera opt-in, show exercise pose tracking; deny/disable webcam and demonstrate no loss of core monitoring.
7. Return to dashboard and articulate source provenance and NASA risk research. Show that all demo data are synthetic.

## Tests to execute

- Refresh page: core state restored or reset intentionally with clear label.
- Camera denied: application continues.
- Missing sensor: display `Unknown / no data` instead of green status.
- Scenario reset/pause: event timeline consistent, no duplicated alerts.
- Two astronauts in different compartments: exposure/alerts mapped to the correct crew member.
- Alert explanation references actual recorded metrics, not fabricated data.
- Build and published link tested from a different machine.
- Project credits include AI tools and third-party assets.

## Formal required-submission items

Verify exact content and media limits in the **Project Tab** for your team; the event site confirms project submission closes 2026-11-15 at 23:59 in local time. Tashkent preliminary judging is scheduled 2026-11-15 at 14:00.
