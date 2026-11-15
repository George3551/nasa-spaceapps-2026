<!-- Development disclosure: team-directed, AI-assisted code/documentation. See ../../AI_DISCLOSURE.md for tool scope, third-party sources and attribution uncertainty. -->
# Vision — Core v3

CameraAssessment is the optional user interface; CameraSession owns the local
MediaPipe stream/model lifecycle. signals.ts converts SDK landmarks to geometry;
metrics.ts integrates elapsed time and finite-state episodes. records.ts creates
canonical assessments and linked activities. No raw frames/landmarks are saved.

Read [the protocol and limits](../../docs/CORE_V3.md) before changing thresholds,
models or SDK versions. Camera access occurs only after explicit Start and demo
association. All other application features work with the camera off.
