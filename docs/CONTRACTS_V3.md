# v3 contract extension

Requested explicitly for locally processed, voluntary camera sessions. Adds
visual/physical variants to canonical AssessmentResult, camera_face acquisition,
time-based metrics with nullable unavailable values, experimental=true, tracking
intervals, explicit fictional-profile association and optional ClinicalWorkspace
activities. Existing v2 records remain assignable. Exhaustive assessment switches
must handle two new kinds. No identity, diagnosis or emotion classifier is added.

The optional activities array preserves v2 compatibility. Persistence v3 validates
new results and migrates v2 without deleting its original storage key. All live
camera results have observed origin and explicit demo association; simulation
records are not modified. Visual metrics never become a scalar fatigue score.

The contract proposal is committed first on develop, with a draft PR to main.
No extra long-lived branch is created; no automatic main merge is performed.
