# v4.2 integration contract proposal

Team-directed integration assisted by Codex. Original prevention/resource
implementation by the Gemini workstream; assistant by the Claude workstream.
This proposal applies only to `test/v4.2-integration`, not production or develop.

The additive canonical types imported from `3720ed8` extend `MedicalResource`
with optional availability, operability, occupancy, qualification and status
history. Optional preventionPlans/hydrationRecords arrays extend MissionState
and ClinicalWorkspace. New PreventionPlanItem, completion/history, hydration
and resource-status types stay in contracts/types.ts; no parallel medical store
or private copy of domain records is introduced. The assistant's own types are
display/provider types and reference canonical records.

Compatibility: existing declarations including generatedTelemetry and
HealthAlert.updates are preserved. Existing v2/v3/v4 storage remains readable;
Zod supplies empty arrays for absent prevention/hydration fields. The storage
version/key remains v4 for this additive preview. Older application versions may
discard unrecognized fields if they write the same store; separate preview and
production origins prevent sharing browser localStorage. Export important test
data before replacing a preview. No real patient data should be entered.

New writes respect subject/origin/category ID isolation and immutable acquisition
semantics; identical retries remain idempotent. Withholding a prevention link
retains canonical medical history and alert evidence. The optional historical
removeCanonicalRecord action flag is accepted for compatibility but does not
authorize deletion. Resource readiness uses the existing engineering freshness
window, free occupancy and declared operational status, not clinical clearance.

Review the integration diff before any eventual promotion. No automatic merge
or production deployment is authorized by this contract proposal.
