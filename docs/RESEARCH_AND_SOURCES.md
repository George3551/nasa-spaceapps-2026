# Evidence and source tracking

## Verified primary challenge references (checked 2026-11-14)

1. NASA Space Apps Challenge 2026 — official task: https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/
2. Challenge resources tab: https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/?tab=resources
3. NASA Human Research Program — Five Hazards: https://www.nasa.gov/hrp/hazards/
4. NASA Human Research Program — Risks: https://www.nasa.gov/hrp/risks/
5. NASA Open Science Data Repository: https://osdr.nasa.gov/
6. Local Tashkent schedule: https://www.spaceappschallenge.org/2026/local-events/tashkent/?tab=schedule
7. 2026 event/submission: https://www.spaceappschallenge.org/2026/

## Scientific credibility requirements

- For **each displayed metric**, list actual measurement source (manual, simulation, camera, NASA dataset), units, availability, and interpretation limits.
- For **each alert**, provide provenance and a source-backed explanation where available. If threshold is illustrative, make that explicit in both source code and UI.
- Do not equate risk factors with a diagnosed illness. Bone density and immune status cannot be inferred from exercise and heart rate alone.
- A relevant NASA research publication or dataset must be actually read before claiming that a numeric scenario is based on NASA data. References alone are not proof that the demo data are real.
- If actual NASA dataset is used, keep dataset ID, title, variables used, units, transformation, URL, license/usage conditions, and limitations in this file.
- Protect privacy: only invented crew members and synthetic measurements in demo. Do not record identifiable real videos.

## Evidence register template

| Feature / claim | Metric & unit | Source title/URL | Type | Direct use / interpretation | Limitations |
|---|---|---|---|---|---|
| Sleep monitoring | Hours | NASA HRP + synthetic demo log | Research context + synthetic | Trend visualization | Not a validated diagnostic predictor |
| Radiation event | Simulated dose or event | NASA radiation risk research (link to exact study before quantitative use) | Research context + synthetic | Scenario demonstration | No clinical dose prediction |
| Environment alert | CO2 ppm | Simulated telemetry; threshold explicitly demonstration-only | Synthetic | Show data pipeline and acknowledgement | Not flight operation limit |

## Project submission provenance / credits

List ALL third-party libraries, model weights, ship/astronaut visuals, fonts, NASA materials/datasets, AI assistants used, and asset licenses. Do not imply NASA endorsement.
