# Radiation capability — final release assessment

Implemented: radiation_dose numeric records with explicit mSv unit, provenance,
quality and timestamp; synthetic environmental adapter; radiation-event fixture;
compartment indicators and record-driven Body Systems history/source references.
The event changes a labelled synthetic compartment value; it is not dosimetry.

Not implemented: dose-rate (mSv/h), physical environmental hardware, calibrated
personal dosimeter integration, accumulation over non-overlapping intervals,
shielding/transport modelling, organ dose or clinical risk interpretation.
Environmental mSv values are not automatically personal cumulative exposure.
Repeated snapshots are never summed into a dose. No NASA radiation limits or
new clinical alert thresholds are introduced by stabilization.

Future minimal proposal: distinguish quantity (dose/rate), instrument and subject/
location; record integration interval, unit, calibration/uncertainty, provenance and
quality; deduplicate intervals before any accumulation. Keep personal dosimetry
separate from cabin context and require domain review before interpreting risk.
This is a proposal only, outside this deadline release. NASA/CSA registry references
remain background, not validation of AEGIS or a source of clinical limits.
