<!-- Development disclosure: team-directed, AI-assisted code/documentation. See ../../AI_DISCLOSURE.md for tool scope, third-party sources and attribution uncertainty. -->
# Mission view — owned by feat/mission-ui

Core v2 now implements MissionView.tsx with the existing props adapter.
The ownership/integration notes below describe the original foundation.

Implement the spacecraft view here. Export a component accepting
`MissionViewProps` from `../app/integration/interfaces`. Import domain types
from `../../contracts/types`. See `docs/INTEGRATION.md` for callbacks and ownership.
No implementation is included in the foundation.
