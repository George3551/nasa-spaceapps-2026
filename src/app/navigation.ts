/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Role-scoped navigation definitions.
 * Implementation: team-directed, AI-assisted (Anthropic Claude Code).
 * Team concept and requirements; exact line-level authorship remains unverified.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import type { AppState, Section, UserMode } from './state/reducer'

/** Single source of truth for navigation labels, grouping and page titles.
 *  Section ids are persisted and must not be renamed; only presentation lives here. */
export type IconName = 'overview' | 'health' | 'alert' | 'review' | 'body' | 'test' | 'eye' | 'move' | 'sensor' | 'ship' | 'sim' | 'book'
export interface NavItem { id: Section; label: string; icon: IconName; description: string; optional?: string }
export interface NavGroup { id: string; label: string | null; items: NavItem[] }

export const roleLabels: Record<UserMode, string> = {
  astronaut: 'Astronaut',
  medical: 'Crew Medical Officer',
  mission: 'Mission Overview (demo)',
}

export function healthLabel(mode: UserMode) { return mode === 'astronaut' ? 'My Health' : 'Crew Health' }

const groups = (mode: UserMode): NavGroup[] => [
  { id: 'home', label: null, items: [
    { id: 'dashboard', label: 'Overview', icon: 'overview', description: 'What needs attention and where to go next.' },
  ] },
  { id: 'health', label: 'Health', items: [
    { id: 'health', label: healthLabel(mode), icon: 'health', description: 'Latest readings, trends and the observation log.' },
    { id: 'events', label: 'Alerts & Cases', icon: 'alert', description: 'Explained detections, acknowledgement and medical follow-up.' },
    { id: 'performance', label: 'Integrated Review', icon: 'review', description: 'Latest results against individual compatible baselines.' },
    { id: 'anatomy', label: 'Body Systems', icon: 'body', description: 'Browse records grouped by body system.' },
  ] },
  { id: 'record', label: 'Record data', items: [
    { id: 'assessments', label: 'Cognitive Tests', icon: 'test', description: 'Typing, reaction time and procedure input tasks.' },
    { id: 'visual', label: 'Eye Observation', icon: 'eye', description: 'Optional camera check of blink and eyelid closure.', optional: 'Camera' },
    { id: 'physical', label: 'Movement Check', icon: 'move', description: 'Optional camera check of right elbow flexion.', optional: 'Camera' },
    { id: 'sensors', label: 'Sensors & Exams', icon: 'sensor', description: 'Examination reports and demonstration sensor packets.' },
  ] },
  { id: 'mission', label: 'Mission', items: [
    { id: 'spacecraft', label: 'Spacecraft', icon: 'ship', description: 'Conceptual compartments, crew locations and cabin readings.' },
    { id: 'simulation', label: 'Simulator', icon: 'sim', description: 'Scenario, seed, clock speed and playback.' },
  ] },
  { id: 'reference', label: 'Reference', items: [
    { id: 'research', label: 'Research & Sources', icon: 'book', description: 'Rule register, evidence sources and limitations.' },
  ] },
]

/** Mirrors the reducer's navigation guards so unavailable destinations are never offered. */
export function isSectionAvailable(section: Section, mode: UserMode) {
  if ((section === 'spacecraft' || section === 'simulation') && mode !== 'mission') return false
  if ((section === 'visual' || section === 'physical') && mode === 'mission') return false
  return true
}

export function navigationFor(mode: UserMode): NavGroup[] {
  return groups(mode).map(g => ({ ...g, items: g.items.filter(i => isSectionAvailable(i.id, mode)) })).filter(g => g.items.length)
}

export function findNavItem(state: Pick<AppState, 'mode' | 'section'>) {
  for (const group of groups(state.mode)) {
    const item = group.items.find(i => i.id === state.section)
    if (item) return { group, item }
  }
  return null
}
