# Local contract proposal — v4.1

Explicitly requested by the owner for local implementation after checkpoint
2ab370c. No push, new GitHub PR or merge is authorized. This local proposal replaces
the usual remote contract-PR step for this task; production 034fcdb stays frozen.

Additive changes in canonical contracts/types.ts: AcquisitionContext (declared
device/protocol/condition/session), medical_device acquisition, temperature/SpO₂/
HRV/laboratory metric keys, optional lab analyte and acquisition context; optional
personal environment and ECG/ultrasound examination arrays. SensorAdapter/Batch/
Request define the transport boundary. PerformanceObservation/Comparison/Assessment
and MultimodalFinding define derived results, not a second medical store.

Existing v2/v3 records remain assignable. Missing metadata is not fabricated during
migration; new comparisons explain missing conditions and withhold unqualified
baselines. New discriminated unions/metric switches need corresponding validation
and labels. Camera visual records retain observed/camera_face provenance; explicit
synthetic visual fixtures use synthetic/simulator, never a pretend live camera.
The same visual numeric structure is reused, with experimental/demo markers.

Storage v4 will read v2/v3 additively, retain their old bytes and save only to the
new version key. New arrays default empty. Canonical records retain timestamps,
units, missing values and subject/scope. ECG/ultrasound contain report records, not
raw signals/images or machine interpretations. Laboratories require named analyte
and unit; no implicit conversion or clinical reference ranges are introduced.
