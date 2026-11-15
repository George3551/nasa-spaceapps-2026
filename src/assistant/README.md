# src/assistant — AEGIS Guided Assistant (v4.2)

Offline, rules-based, read-only assistant for the astronaut's own records. No LLM,
no network calls, no record writes. See [docs/ASSISTANT_V4_2.md](../../docs/ASSISTANT_V4_2.md).

| File | Role |
| --- | --- |
| `intents.ts` | Pure deterministic intent parser + input sanitation (keyword rules, not NLU) |
| `scope.ts` | Scoped data access from the live reducer state (`selectWorkspace`, `assessPerformance`) |
| `respond.ts` | Grounded reply builder: every value/ID/time comes from a canonical record |
| `safety.ts` | Final gate: evidence must be in scope; blocks diagnostic/dosing/overclaiming text |
| `provider.ts` | Provider boundary; only `localRulesProvider` exists |
| `AssistantDock.tsx` | Sidebar toggle (Astronaut Mode) + lazily loaded panel |
| `AssistantPanel.tsx` | In-memory conversation UI, evidence cards, navigation actions |
| `types.ts` | Display/orchestration types only — medical types stay in `contracts/types.ts` |
