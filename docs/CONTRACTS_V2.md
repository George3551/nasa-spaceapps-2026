# Contract proposal v2 — backward-compatible extension

Requested by AEGIS Core Implementation v2.0. Baseline: 1e5f30d.

New canonical records: AssessmentResult (typing/reaction/procedure),
RecordMetadata, ClinicalAction, MedicalEncounter, ClinicalWorkspace,
MedicalResource, MissionSnapshot and ResearchSource. No duplicated feature models.

MissionState gains OPTIONAL assessments, encounters, sources and resources.
Existing v1 fixtures remain assignable; v2 uses MissionSnapshot with those arrays
required. AcquisitionMethod gains assessment and MetricKey gains mood, symptoms,
bone-density, movement and future visual-fatigue keys. Exhaustive switches on
these unions need updating. No existing fields are removed or reinterpreted.

Assessment metrics use explicit units (ms, %, conventional five-character WPM).
Each numeric ProcedureAttempt also carries the reference unit (mL/demo units),
so the stored value can be interpreted independently of the current UI.
Each record carries source, origin, quality, timestamp and references. Synthetic
and observed workspaces remain separate. Type definitions do not imply validation.

Encounter acknowledgement stays in HealthAlert; actions and resolution are
separate records. Acknowledgement never resolves a case. ClinicalAction is a
review/follow-up log, not a prescribing interface. Resolution requires human review.

The small contract PR targets chore/integration because main still contains only
the original planning kit. Implementation continues in feat/aegis-core-v2; no
automatic merge is authorized or performed.
