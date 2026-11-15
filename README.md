# AEGIS

### Autonomous Exploration Health & Guidance Intelligence System
**A unified health-monitoring and decision-support prototype for astronauts on long-duration space missions.**

**NASA Space Apps Challenge 2026 · Health Monitoring Software Challenge**  
Team: **Delayed Sanitarium**

🚀 **[Try the live AEGIS demo](https://aegis-spaceapps-2026.pages.dev/)** · 💻 **[Explore the source code](https://github.com/George3551/nasa-spaceapps-2026/tree/develop)**

## Why AEGIS?

Astronauts on long-duration missions face altered gravity, radiation, isolation, constrained medical resources, and communication delays with Earth. Monitoring individual health trends matters when immediate support may be unavailable.

**AEGIS brings different observations into one understandable workflow.** Rather than simply displaying numbers, it helps a crew member see what changed relative to their own history, inspect the evidence, and document what they checked next.

> **Monitor → Compare → Explain → Review → Follow up**

AEGIS is a **research prototype**, not a diagnostic device or certified spaceflight medical system.

## Try it in under a minute

No installation or account is required for the public demonstration.

1. **[Open AEGIS](https://aegis-spaceapps-2026.pages.dev/)** in a modern desktop browser.
2. Click **Start Mission Demo**. Confirm the reset if prompted; this only resets the synthetic mission scenario, not observed records.
3. In **Integrated Review**, inspect the fictional astronaut Mira's sleep, self-reported fatigue, and reaction-time observations. See the personal baseline, measurement quality, and explanation of the finding.
4. Select **Open alerts and follow-up** to view the evidence behind the alert.
5. **Acknowledge** the alert, **Begin review**, and record a follow-up note. The case history is saved in the browser. Closing a case is a separate action in the demo Medical Officer context; it does **not** prove medical recovery.

You can also explore **My Health**, **Cognitive Tests**, **Sensors & Exams**, **Spacecraft**, **Body Systems**, and the **Simulator**. The simulator includes a cabin CO₂ scenario.

**What you are seeing:** Mira, her mission, and the scenario measurements are fictional and synthetic. You can separately enter your own test observations and complete interactive assessments; do not enter sensitive medical information.

## What can AEGIS do?

| Capability | What it demonstrates |
| --- | --- |
| **My Health & History** | Record health observations, sleep, symptoms, and self-reported fatigue; view their history across browser refreshes. |
| **Cognitive Tests** | Run interactive reaction-time, typing, and procedure-entry assessments and save results. |
| **Integrated Review** | Compare compatible measurements with a personal baseline, show data-quality and source context, and explain selected changes. |
| **Alerts & Cases** | Present rule-based findings with supporting observations; acknowledge, review, and document follow-up. |
| **Sensors & Exams** | Explore synthetic sensor adapters and structured laboratory, ECG, and ultrasound *records*; no live medical hardware is connected. |
| **Spacecraft & Simulator** | Explore a fictional spacecraft and repeatable environmental and health scenarios. |
| **Body Systems** | Navigate body-system views linked to available observations and assessments. |
| **Eye Observation & Movement Check** | Optionally use local Google MediaPipe face/pose landmark models for experimental camera-based measurements. |

### How does it detect a change?

AEGIS first records a measurement along with its timestamp, source, subject, and quality information. For an eligible comparison, it selects compatible earlier observations for the **same person** and derives a descriptive personal baseline. Explainable, predefined rules then identify selected combinations of changes and link a finding back to the records behind it.

For example, a *synthetic* sleep-disruption scenario may show shorter sleep, higher self-reported fatigue, and slower reaction time together. AEGIS highlights those changes; it **does not** infer a disease or make a clinical diagnosis.

### What AI actually runs in the prototype?

- **Google MediaPipe:** third-party, pretrained machine-learning models detect face and body landmarks locally for optional camera assessments.
- **Health assessment:** primarily deterministic comparison and rule-based logic. These are **not** proprietary trained medical AI models.
- **Generative chat assistant:** **not part of the documented stable public release**. Experimental assistant work is developed separately; do not assume a branch feature is available on the live website.

Generative AI coding tools also assisted the team during development. See [AI Usage & Attribution](#ai-usage--attribution).

## Technologies

- **Frontend:** React, TypeScript, Vite.
- **Computer vision:** Google MediaPipe Tasks Vision, with model assets and WASM runtime served from the same origin.
- **Validation and analysis:** typed application records, input validation, personal-baseline comparisons, and explainable rules.
- **Hosting:** Cloudflare Pages.
- **Prototype storage:** browser `localStorage` (not encrypted or suitable for sensitive health data).

The core demonstration does not require a server-side medical API or a continuously connected external generative-AI service. Device access and real-world offline deployment have not been validated for spaceflight use.

## Run locally

You need a compatible Node.js installation and npm. From the repository root:

```bash
npm ci
npm run dev
```

Open the local address printed by Vite.

To run the project's checks and production build:

```bash
npm run check
npm run build
node scripts/verify-release.mjs
```

## Research, scope, and limitations

AEGIS is informed by publicly available astronaut-health research and operational considerations; these sources motivate the design but **do not clinically validate** its rules or measurements. The present version uses fictional crew identities and synthetic sensor/mission data for its guided demonstrations.

**Current limitations:** no connected clinical hardware, no verified diagnostic accuracy, no validated treatment recommendations, no production authentication or encrypted medical records, and no personal cumulative radiation-dose calculation. Camera-based measurements are experimental, depend on tracking quality and device conditions, and should not be treated as medical findings.

For implementation details and evidence, see the [v4.1 architecture](docs/CORE_V4_1.md), [stabilization report](docs/STABILIZATION_REPORT.md), [team testing](docs/TEAM_TESTING.md), [radiation capability](docs/RADIATION_CAPABILITY.md), and [integration readiness](docs/INTEGRATION_READINESS.md).

## AI Usage & Attribution

**The AEGIS team originated the project concept, research direction, requirements, technology choices, and intended workflows.** The team researched and reviewed scientific material, worked with MediaPipe, and directed development and testing.

ChatGPT, Codex, Claude Code, and Gemini were used for planning and research assistance, substantial code generation, debugging, technical review, and tests. Those contributions are disclosed rather than presented as entirely hand-written code. Google MediaPipe supplies its own pretrained models; AEGIS did not train them.

See **[AI_DISCLOSURE.md](AI_DISCLOSURE.md)** for the detailed human/AI contribution record and **[AI_DISCLOSURE_MANIFEST.json](AI_DISCLOSURE_MANIFEST.json)** for file-level metadata. Experimental features in separate branches are distinguished from the stable public release.

## Project links

- **Live demo:** https://aegis-spaceapps-2026.pages.dev/
- **Submitted source (`develop`):** https://github.com/George3551/nasa-spaceapps-2026/tree/develop

---

*AEGIS supports informed human review; it does not replace professional medical judgment.*

## v4.2 integration preview

This branch combines the local deterministic Guided Assistant, Preventive Health
and Mission Medical Resources for independent review. Production remains on the
frozen v4.1 release. See [V4_2_INTEGRATION_REPORT.md](docs/V4_2_INTEGRATION_REPORT.md)
for the preview URL, exact source references, test results and limitations.
