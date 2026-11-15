/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Display formatting and provenance labels.
 * Implementation: team-directed, AI-assisted (OpenAI Codex; Anthropic Claude Code).
 * Team concept and requirements; exact line-level authorship remains unverified.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import { measurementRules } from '../shared/validation'

export function formatTimestamp(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Invalid timestamp' : date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC')
}

/** Short UTC time for dense lists, e.g. "11-14 08:03 UTC". Full value stays in the dateTime attribute. */
export function formatShortTimestamp(value: string | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Invalid timestamp' : `${date.toISOString().slice(5, 16).replace('T', ' ')} UTC`
}

/** Generic snake/kebab-case enum → sentence case. Presentation only; stored values are unchanged. */
export function humanize(value: string): string {
  const text = value.replaceAll('_', ' ').replaceAll('-', ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const extraMetricLabels: Record<string, string> = {
  cabin_co2: 'Cabin CO₂', cabin_temperature: 'Cabin temperature', cabin_pressure: 'Cabin pressure',
  radiation_dose: 'Radiation dose', laboratory: 'Laboratory', exercise_repetitions: 'Exercise repetitions',
  movement_range: 'Movement range', visual_fatigue: 'Visual fatigue', reaction_mean: 'Reaction time (mean)',
  typing_wpm: 'Typing speed', visual_blink_rate: 'Blink rate', visual_closure_proportion: 'Eye closure proportion',
  physical_repetitions: 'Elbow flexion repetitions',
}
/** Display name of a metric or performance signal, without the entry-scale hint. */
export function metricLabel(key: string): string {
  const rule = measurementRules[key as keyof typeof measurementRules]
  return rule ? rule.label.split(' · ')[0]! : extraMetricLabels[key] ?? humanize(key)
}

const sourceLabels: Record<string, string> = {
  simulator: 'Simulator', manual: 'Manual entry', wearable: 'Wearable', medical_device: 'Medical device',
  environment_sensor: 'Environment sensor', camera_pose: 'Camera · pose', camera_face: 'Camera · face',
  dataset_import: 'Dataset import', assessment: 'Assessment task',
}
export const sourceLabel = (source: string) => sourceLabels[source] ?? humanize(source)
export const originLabel = (origin: string) => origin === 'research_dataset' ? 'Research dataset' : humanize(origin)
export const qualityLabel = (quality: string) => humanize(quality)

export function formatValue(value: number | null | undefined, unit?: string, digits?: number): string {
  if (value == null || !Number.isFinite(value)) return 'Unavailable'
  const text = digits === undefined ? String(value) : value.toFixed(digits)
  return unit ? `${text} ${unit}` : text
}

export function initials(name: string | undefined): string {
  return name?.split(' ').map(part => part[0]).slice(0, 2).join('') ?? '—'
}
