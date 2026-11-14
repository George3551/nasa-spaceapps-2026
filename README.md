# AEGIS — Astronaut Health Monitoring & Mission Digital Twin

**NASA Space Apps Challenge 2026 | Team starter (planning and interface contracts)**

AEGIS is a proposed **astronaut-facing**, offline-capable health monitoring and decision-support prototype. It integrates time-stamped physiological observations, self-reports, spacecraft environment measurements, and optional camera-based exercise analysis. An interactive spacecraft cutaway is the demonstration interface, not the source of medical measurements.

**Status:** planning kit. This archive is **not yet a functioning application**. It is intended to be the first commit shared by five developers and multiple AI coding agents.

## Read first

1. [`docs/TECHNICAL_SPEC_RU.md`](docs/TECHNICAL_SPEC_RU.md) — full initial specification, accepted assumptions, acceptance tests.
2. [`docs/TEAM_TASKS.md`](docs/TEAM_TASKS.md) — five independent workstreams and priorities.
3. [`docs/GIT_WORKFLOW.md`](docs/GIT_WORKFLOW.md) — safe Git collaboration for humans and AI agents.
4. [`AGENTS.md`](AGENTS.md) — shared coding-agent instructions.
5. [`contracts/types.ts`](contracts/types.ts) — proposed integration contract; change only by agreement.
6. [`docs/RESEARCH_AND_SOURCES.md`](docs/RESEARCH_AND_SOURCES.md) — evidence, provenance, NASA source plan.
7. [`docs/DEMO.md`](docs/DEMO.md) — demo acceptance scenario.

## Proposed stack

- Vite + React + TypeScript, TypeScript simulation/analytics, SVG/2.5D ship initially; optional Three.js.
- Browser-local storage; no server required for the hackathon prototype.
- Camera module (MediaPipe) is strictly opt-in and disabled by default.
- Separate demo scenarios from real data; no diagnosis or prescribing.

## Starting the implementation

Only the **integrator** initializes the application scaffold and chooses dependency versions. Do not have several AI agents independently scaffold separate applications. Bootstrap using `npm create vite@latest . -- --template react-ts` **in a separate temporary directory** and copy the application files into this repository without overwriting documentation or contracts. Then `npm install` and `npm run dev`.

Project must identify all simulated values as *synthetic* and display relevant NASA sources. Make the first committed milestone an application that loads and can render one `HealthMeasurement` from `contracts/types.ts`.
