# AEGIS — instructions for all AI coding agents

Read `docs/TECHNICAL_SPEC_RU.md`, `docs/TEAM_TASKS.md`, `docs/GIT_WORKFLOW.md`, and `contracts/types.ts` **before** changing code.

## Non-negotiable project rules

1. The **astronaut's own health self-assessment** is the core user journey; the ship view is supplementary/demonstrative.
2. Treat simulation data, research-derived background, direct measurements, and model inferences as different. Preserve provenance everywhere.
3. Never invent medical/radiation thresholds or label prototype heuristics as medically validated. Any demo-only threshold must be declared `demonstrationOnly` and visible in the UI.
4. No diagnosis, treatment prescription, or implied real-time clinical certification.
5. Computer vision is **optional**; no surveillance, discipline monitoring, face recognition, emotion diagnosis, or health inference from video. Opt-in movement analysis only, on-device, no video storage by default.
6. All features must function with CV turned off.
7. Do not add a remote API or cloud dependency to the core application without approval.
8. One codebase, one design system, a single shared set of domain types in `contracts/types.ts`. Do not create parallel copies of core types.
9. Do not silently change shared contracts. Open a small PR proposing the change and explain compatibility effects.
10. Never touch files owned by another workstream unless coordinated; do not commit generated artifacts, credentials, or dependencies directories.
11. Keep PRs small; provide test steps, screenshots where appropriate, and note use of AI/tools and data sources.
12. Before marking done, execute build/test commands defined in `package.json` and report actual outcomes; do not claim tests you did not run.

## Module boundaries (planned)

- `src/mission/` — spacecraft cutaway, navigation, crew positions.
- `src/health/` — measurements, health trends, explanations, alerts, profile views.
- `src/simulation/` — mission clock, profiles, scripted incidents, deterministic fixtures.
- `src/vision/` — optional opt-in posture/exercise capture.
- `src/app/` — shell, navigation, global state, integration.
- `src/shared/` — only contract-approved reusable utilities; canonical types are in `contracts/types.ts`.

## Deliverables for each request

Provide concise: (1) changed files, (2) reason, (3) how to run/test, (4) limitations, (5) next integration dependency.
