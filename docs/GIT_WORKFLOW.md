# Git workflow for 5 teammates and multiple AI agents

## Set up once — team lead

1. Create a GitHub repository named `aegis-spaceapps-2026`. Choose **Private** until the team agrees to publish. **Do not** pre-create README or `.gitignore` on GitHub if uploading this kit using `git init`.
2. Extract this starter archive as the repository root, then execute:

```bash
git init
git branch -M main
git add .
git commit -m "docs: establish AEGIS spec and collaboration contract"
git remote add origin https://github.com/OWNER/aegis-spaceapps-2026.git
git push -u origin main
```

Replace `OWNER` with your account or organization; log in to GitHub when prompted. Invite all four teammates as collaborators with write access. Set main protection / PR requirements if the account supports it. If not, follow the same procedure by convention.

## Everyone else

```bash
git clone https://github.com/OWNER/aegis-spaceapps-2026.git
cd aegis-spaceapps-2026
git switch -c feat/mission-ui   # replace branch with your assignment
```

Never work directly on `main`. Branches:

- `chore/integration` — lead/integrator and build bootstrap
- `feat/mission-ui` — spacecraft and UI
- `feat/health-engine` — medical dashboard/decision support
- `feat/simulation` — simulation engine/data
- `feat/vision-anatomy` — optional camera and anatomy visualization

To publish your work:

```bash
git status
git add <your-changed-files>
git commit -m "feat: describe completed change"
git push -u origin YOUR_BRANCH
```

Open a GitHub **Pull Request** into `main`. Have another teammate review. Integrator merges when the build is green. Before starting another feature, update local `main` and create a **new** branch from it; don't keep unrelated work on a merged branch.

To update a long-running branch after `main` changes:

```bash
git fetch origin
git switch YOUR_BRANCH
git merge origin/main
```

Resolve conflicts yourself with your assigned agent, carefully inspect conflicts in shared files, then commit/push. Do not let an agent overwrite another teammate's work to silence merge conflicts. Avoid `git push --force` on shared branches.

## AI agent parallelism rules

- Each coding agent gets its own working copy / Git worktree and branch.
- One agent per owned directory, unless explicitly coordinated.
- No AI agent may change `contracts/types.ts`, package manager/lockfile, routing or app entry point without the integrator's approval.
- AI agent must show `git diff --stat`, test outcome, and exact commit before PR.
- Don't merge unfinished PRs solely because the UI looks impressive.

## Important

Do not upload real medical data, actual people's biometric videos, secrets, access tokens, or proprietary NASA/SpaceX assets. Label synthetic profiles and scenarios. Public access and source licenses should be checked before submission.
