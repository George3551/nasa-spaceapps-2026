# AEGIS

Autonomous Health Monitoring & Decision Support for Deep-Space Missions.

A functioning React/TypeScript research prototype for NASA Space Apps 2026.
Astronauts can record observations, complete cognitive tests, compare compatible
personal baselines, understand explained alerts and record human-controlled
follow-up. The spacecraft and mission scenarios use clearly labelled synthetic
fixtures. Optional face/pose measurements run locally; no raw video is stored.

## Start here

```sh
npm ci
npm run dev
```

Open the printed local URL. Click **Start Mission Demo** to load the real Sleep
Disruption scenario and open **Integrated Review**. Read the sleep, fatigue and
reaction comparisons, then **Open alerts and follow-up**. Acknowledge, begin review,
and record a completed follow-up. Resolution is separate and available only in
the Medical Officer demo context; it is not proof of recovery.

**Check My Health** opens personal observed records. **Explore the Spacecraft**
opens the fictional vehicle. The **Simulator** also provides the cabin CO2 incident.
Replay asks before replacing existing synthetic mission records; observed records
are preserved. Browser-local persistence survives refresh and pauses the mission.

## Verify

```sh
npm run check
npm run build
node scripts/verify-release.mjs
```

No runtime API, backend or third-party model CDN is required. LocalStorage is not
encrypted; use non-sensitive test data only. Role switching is not authentication.
No hardware integration, diagnosis, treatment prescription, validated clinical
threshold or personal cumulative radiation-risk calculation is claimed.

See [release fixes](docs/STABILIZATION_REPORT.md),
[branch inventory](docs/INTEGRATION_READINESS.md),
[radiation capability](docs/RADIATION_CAPABILITY.md),
[v4.1 architecture](docs/CORE_V4_1.md) and [team tests](docs/TEAM_TESTING.md).

## AI Usage and Attribution

The AEGIS team originated the concept and scientific direction, defined the
requirements, selected technologies, and directed research and testing.
Generative AI tools (ChatGPT, Codex, Claude Code and Gemini) assisted planning,
research, substantial code generation, debugging and testing. Separate v4.2
branches are distinguished from the actual released application.
Google MediaPipe supplies third-party pretrained face/pose landmark models;
the team did not train those models. AEGIS measurement rules are experimental.

See [AI_DISCLOSURE.md](AI_DISCLOSURE.md) for detailed contributions, source limits
and the complete file table, and [AI_DISCLOSURE_MANIFEST.json](AI_DISCLOSURE_MANIFEST.json)
for machine-readable metadata. This attribution addendum preserves the published
implementation at [b8e26c9](https://github.com/George3551/nasa-spaceapps-2026/tree/b8e26c9dded392b0fb612f8ec034b7da2201d4e0)
and does not redeploy the website.
