<!-- Development disclosure: team-directed, AI-assisted code/documentation. See ../../AI_DISCLOSURE.md for tool scope, third-party sources and attribution uncertainty. -->
# Simulation — owned by feat/simulation

Core v2 now implements engine.ts, SimulationControls.tsx and determinism tests.
AppProvider/reducer orchestrates the clock and health evaluation. The original
integration notes below remain architectural background.

Implement `SimulationPort` from `../../contracts/types` here. The optional
UI uses `SimulationViewProps` from `../app/integration/interfaces`.
Do not start a private UI interval: the integrator owns the single clock.
See `docs/INTEGRATION.md`. Temporary fixtures remain in src/app/integration.
