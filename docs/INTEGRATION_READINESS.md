# Final release integration inventory — 2026-11-15

Read-only remote inventory at 06:36 UTC:

| Branch | SHA | Assessment |
| --- | --- | --- |
| main | 55fa13d5ec76288e3aaa60a2b52ef76a5e43b760 | Original integrated foundation |
| develop | 034fcdb76863ce0f861230a66b55f188c68a03d5 | Original RC1 production source, ancestor of release |
| review/v4.1 | d26328f7e35fc9ba3386076b9c3ca5329d7285bb | Includes three newly published UI commits over 8831e4a; preserved through a merge |
| feat/v4.2-prevention-resources | 3720ed800ede5765d20324076ae2e674079ffbb1 | Gemini; based on exact 8831e4a; 4,868 inserted lines, 19 files |
| analytics-so-on | 55fa13d5ec76288e3aaa60a2b52ef76a5e43b760 | Same as main |

At 06:46 UTC feat/v4.2-medical-assistant appeared at 3ce281f7e35fc9ba3386076b9c3ca5329d7285bb, based on 8831e4a (18 files, 1,917 inserted lines). It is not independently accepted/included in this time-limited release.
The UI work is by Mikhail/Claude, not an Intelligent Medical Assistant module.
Local develop started clean at 8831e4a. Audit fixes were checkpointed at fde72f2.
The concurrent UI updates are merged without rebasing or replacing their history.

Gemini changes contracts/types.ts, reducer, persistence, validation and App in
addition to prevention/resources modules. Their own report claims 118 tests passed;
this final-release task has not independently accepted those modules. They are
excluded to prioritize verified core fixes before the deadline. No teammate branch
is changed or merged. Future order: review additive contracts, reconcile the five
shared files with stabilization metadata, integrate prevention/resources in an
isolated worktree, validate persistence/UI, then consider the assistant if published.

The owner's urgent final-release instruction explicitly supersedes earlier no-push/
freeze instructions for the verified final release only. Publish review/v4.1 by
fast-forward, test it online, then publish the same commit to production if safe.
PR #4 must remain unmerged; main and teammate histories must not be reset.
