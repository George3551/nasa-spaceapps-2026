# AEGIS UI design system

Source of truth: `src/app/styles.css` (tokens + component styles),
`src/app/components/ui.tsx`, `Panel.tsx`, `MeasurementCard.tsx`, `Icon.tsx`,
`src/app/navigation.ts` and `src/app/format.ts`. Rationale: `docs/UI_UX_AUDIT.md`.

## Principles

1. **Provenance first.** The active workspace and every record's origin are visible
   without interaction, and are shown with text plus shape, never colour alone.
2. **Location is obvious.** Nav label = page H1 = breadcrumb leaf.
3. **Three tiers of text.** Data and actions → short muted notes → method detail in a
   `Disclosure`. Safety labels (`DemoBadge`, *Experimental*, *Synthetic*, *Missing*) are
   never hidden.
4. **Restraint.** No gradients or decorative cards. The only patterned surface is the
   synthetic hatch, which exists to be unmistakable.

## Tokens

| Group | Tokens |
|---|---|
| Surfaces | `--bg` page · `--surface-1` sidebar · `--surface-2` panel · `--surface-3` hover/raised · `--surface-inset` nested content, inputs |
| Lines | `--border`, `--border-strong` |
| Text | `--text` primary · `--text-2` secondary · `--text-3` labels/meta (≥ 5.6:1 on all surfaces) |
| Action | `--accent` (primary buttons, current nav, focus family), `--on-accent`, `--focus` |
| Semantic | `--info`, `--success`, `--attention`, `--critical`, each with `-bg` and `-border` |
| Provenance | `--observed` (teal, round mark), `--synthetic` (violet, diamond mark + hatch) |
| Type | `--fs-xs` 12 · `--fs-sm` 13 · `--fs-base` 14 · `--fs-md` 16 · `--fs-lg` 20 · `--fs-xl` 24 px; `--mono` for ids/clock |
| Space | 4 px grid `--sp-1`…`--sp-8`; `--radius` 8, `--radius-sm` 5; `--control-h` 40 |
| Breakpoints | 1200 px → single-column content · 920 px → nav drawer, stacked tiles · 560 px → single-column forms |

### Semantic colour usage

| Tone | Use | Never use for |
|---|---|---|
| critical | alert level *Review needed*, rejected-entry toast, invalid quality | decoration |
| attention | demonstration/experimental labels, open cases, compartments flagged for review, missing quality, consequence confirmations | general emphasis |
| info | *New* status, next-check callouts, estimated quality | provenance |
| success | saved confirmation, *Ready* baseline, running clock | a health judgement (never "healthy") |
| synthetic / observed | origin of data and the active workspace only | anything else |

## Components

| Component | Purpose / rules |
|---|---|
| `PageHeader` | One per page. `title` must equal the nav label. Optional `description`, `context` badges, `actions` (max one primary) |
| `Panel` | Content container: `eyebrow` (context/provenance) · `title` · `description` · `actions` slot. Body is a gap-based stack |
| `Badge` (`tone`, `icon`) | Short status. Always text; icon optional |
| `OriginBadge` | The only way to show record origin. Round = observed, diamond = synthetic, square = research dataset |
| `QualityBadge`, `AlertLevelBadge`, `DemoBadge` | Fixed tone mapping; do not restyle per page |
| `Callout` | A notice with tone and title: next steps, consequences, workspace restrictions |
| `Disclosure` | Method, scoring, limitations, evidence detail. Not for safety labels |
| `EmptyState` | Title plus explanation. Must say that missing data is not a normal result where relevant |
| `MeasurementCard` / `MissingMetricTile` | Latest reading. Missing renders *No data* in a dashed tile, never 0 |
| `Time` | All timestamps: UTC, short or full, full value in `title` / `dateTime` |
| `KeyValue`, `.record-list`, `.provenance` | Metadata pairs; list rows with a one-line provenance footer |
| `.segmented` | Mutually exclusive view choices (`aria-pressed`) |
| `.stat-tile` | Overview/summary numbers. As a `button` it must name its destination (`stat-action`) |
| `.alert-card`, `.case-card`, `.case-progress` | Alert and encounter presentation; level shown by badge and left rule |
| Toast | Single feedback channel for reducer `notice`; `role=status` / `role=alert` |
| Workspace banner | Rendered by the shell on every page; do not duplicate it inside pages |

### Buttons

`primary` — the single main action in a region (save, start, confirm). Default — secondary
actions. `ghost` — cancel / tertiary links. `small` — panel-header actions. Destructive or
irreversible actions use an inline confirmation block (`Callout tone="attention"` plus
primary *confirm* and ghost *Cancel*), not `window.confirm`.

### Forms

Required, primary fields first; optional provenance in a `fieldset` with a legend that
says why it matters. Hints use `.field-hint` and `aria-describedby`. Errors use
`.form-error` with `role="alert"` next to the submit button. Units always appear in the
label.

### Charts

The line uses `--accent`, gridlines are dashed `--border`, labels are `--text-3`.
Always provide an accessible text alternative and a caption naming the metric, unit,
range and the meaning of gaps.

### Navigation

Add pages only through `navigation.ts` (group, label, icon, description). Availability
must mirror the reducer guards in `isSectionAvailable`. Section ids are persisted:
never rename them.
