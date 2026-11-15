/** AEGIS - team-directed, AI-assisted implementation (Anthropic Claude Code); integration fixes/tests assisted by OpenAI Codex.
 * Local research prototype, not clinical validation. See docs/V4_2_INTEGRATION_REPORT.md and AI_DISCLOSURE.md. */
import type { DataOrigin, ObservationQuality, PerformanceSignal } from '../../contracts/types'
import type { Section } from '../app/state/reducer'

/** Display/orchestration types for the Guided Assistant only.
 *  Medical records stay in contracts/types.ts; nothing here is a second health model. */
export type AssistantIntent =
  | 'overview' | 'performance_findings' | 'baseline_compare' | 'sleep' | 'reaction' | 'typing' | 'visual'
  | 'physiology' | 'environment' | 'alerts' | 'case_status' | 'available_tests'
  | 'unsupported_medical' | 'other_subject' | 'action_request' | 'module_unavailable' | 'prevention' | 'resources' | 'help' | 'unknown'

export interface ParsedQuestion {
  /** Sanitized text (trimmed, control characters removed, length-capped). Never executed. */
  text: string
  intent: AssistantIntent
  recognized: boolean
  /** Rule labels that matched, for transparency and tests. */
  matched: string[]
  /** Signals explicitly named in the question (or carried from the previous turn). */
  focus: PerformanceSignal[]
  /** True when the intent/focus was carried over from the previous turn. */
  contextual: boolean
  flags: { injection: boolean; truncated: boolean; urgent: boolean; module?: 'prevention' | 'resources' }
}

export interface ConversationContext {
  intent: AssistantIntent
  focus: PerformanceSignal[]
}

export type EvidenceKind = 'measurement' | 'assessment' | 'environment' | 'examination' | 'alert' | 'case' | 'follow_up' | 'prevention' | 'hydration' | 'resource'
export type EvidenceAvailability = 'current' | 'stale' | 'historical' | 'missing' | 'invalid' | 'baseline' | 'record'

export interface EvidenceItem {
  /** Existing canonical record / alert / case identifier. Never invented. */
  id: string
  kind: EvidenceKind
  label: string
  /** Pre-formatted value; null means no value was recorded (never 0). */
  value: string | null
  unit?: string
  timestamp?: string
  origin?: DataOrigin
  source?: string
  quality?: ObservationQuality
  acquisition?: string
  availability: EvidenceAvailability
  demonstrationOnly?: boolean
  /** Existing system text attached to this record (e.g. the rule's evidence explanation). */
  detail?: string
  /** Text entered by the user in an existing workflow; displayed as attributed data. */
  userNote?: string
}

export interface AssistantAction { label: string; section: Section }

export interface ReplyScope { subjectId: string; subjectName: string; origin: DataOrigin; asOf: string }

export interface AssistantReply {
  intent: AssistantIntent
  status: 'answered' | 'insufficient' | 'refused' | 'unsupported'
  headline: string
  body: string[]
  evidence: EvidenceItem[]
  actions: AssistantAction[]
  limitations: string[]
  scope: ReplyScope | null
  provider: 'local-rules'
  /** Set when the safety gate replaced or trimmed generated content. */
  policyNotes: string[]
}
