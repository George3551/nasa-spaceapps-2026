<!-- Development disclosure: team-directed, AI-assisted code/documentation. See ../../AI_DISCLOSURE.md for tool scope, third-party sources and attribution uncertainty. -->
# Health — owned by feat/health-engine

Core v2: HealthMonitor, Assessments, Encounters, Research, engine, clinical,
assessmentMetrics and sources are now implemented by the primary developer.
The allocation below describes the earlier foundation; see docs/CORE_V2.md.

Implement the personal dashboard and a pure `HealthEvaluatorPort` here.
UI accepts `HealthViewProps` from `../app/integration/interfaces`.
Use `../../contracts/types`; preserve provenance, units, missing values and
evidence. See `docs/INTEGRATION.md`. No health engine is included yet.
