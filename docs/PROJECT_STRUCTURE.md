# Complete tracked project structure

Build output, installed dependencies, temporary scaffold and browser captures
are ignored and excluded from this source tree.

```text
NasaSpaceApp/
├── .gitattributes
├── .gitignore
├── .github/
│   ├── pull_request_template.md
│   └── workflows/ci.yml
├── AGENTS.md
├── README.md
├── package.json
├── package-lock.json
├── index.html
├── eslint.config.js
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── public/favicon.svg
├── contracts/types.ts
├── docs/
│   ├── TECHNICAL_SPEC_RU.md
│   ├── TEAM_TASKS.md
│   ├── GIT_WORKFLOW.md
│   ├── DEMO.md
│   ├── RESEARCH_AND_SOURCES.md
│   ├── INTEGRATION.md
│   ├── PROJECT_STRUCTURE.md
│   └── VALIDATION.md
└── src/
    ├── main.tsx
    ├── app/
    │   ├── App.tsx
    │   ├── App.test.tsx
    │   ├── format.ts
    │   ├── styles.css
    │   ├── components/
    │   │   ├── Panel.tsx
    │   │   └── MeasurementCard.tsx
    │   ├── integration/
    │   │   ├── fixtures.ts
    │   │   └── interfaces.ts
    │   ├── state/
    │   │   ├── AppProvider.tsx
    │   │   ├── context.ts
    │   │   ├── reducer.ts
    │   │   └── reducer.test.ts
    │   ├── test/setup.ts
    │   └── views/
    │       ├── Dashboard.tsx
    │       ├── CrewHealth.tsx
    │       └── Events.tsx
    ├── mission/README.md
    ├── health/README.md
    ├── simulation/README.md
    ├── vision/README.md
    ├── anatomy/README.md
    └── shared/README.md
```

The module README files reserve ownership; no other developer's domain module
has been implemented. All temporary UI and example data live in src/app.

New files in the application-foundation commit: configuration files, workflow,
public/favicon.svg, src/** and docs/{INTEGRATION,PROJECT_STRUCTURE,VALIDATION}.md.
Modified files: README.md (appended implementation update), .gitignore.
The original technical specification, task allocation, Git workflow, demo,
research register, AGENTS.md and contracts/types.ts remain unchanged.
