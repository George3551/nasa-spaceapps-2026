/** AEGIS - team-directed, AI-assisted implementation (Anthropic Claude Code); integration fixes/tests assisted by OpenAI Codex.
 * Local research prototype, not clinical validation. See docs/V4_2_INTEGRATION_REPORT.md and AI_DISCLOSURE.md. */
import type { AppState } from '../app/state/reducer'
import { parseQuestion } from './intents'
import { buildReply } from './respond'
import { enforceReplyPolicy } from './safety'
import { scopeFromState } from './scope'
import type { AssistantReply, ConversationContext, ParsedQuestion } from './types'

export interface AssistantRequest {
  question: string
  /** The CURRENT reducer state at the moment of asking; never a cached snapshot. */
  state: AppState
  previous: ConversationContext | null
  now?: Date
}
export interface AssistantAnswer { parsed: ParsedQuestion; reply: AssistantReply; context: ConversationContext | null }

/** Provider boundary. Only the local deterministic provider exists. A future LLM provider
 *  (local or server-mediated, owner-approved) would receive only already-scoped evidence and
 *  its output would still pass through the same scope and claims gate. None is connected. */
export interface AssistantProvider {
  readonly id: string
  readonly kind: 'local-deterministic'
  readonly label: string
  answer(request: AssistantRequest): AssistantAnswer
}

const TOPICAL = new Set(['overview', 'performance_findings', 'baseline_compare', 'sleep', 'reaction', 'typing', 'visual', 'physiology', 'environment', 'alerts', 'case_status', 'available_tests'])

export const localRulesProvider: AssistantProvider = {
  id: 'aegis-local-rules-v1',
  kind: 'local-deterministic',
  label: 'AEGIS Guided Assistant — offline, rules-based prototype',
  answer({ question, state, previous, now }) {
    const scope = scopeFromState(state, now)
    const parsed = parseQuestion(question, { otherSubjectTerms: scope.ok ? scope.otherSubjectTerms : [], previous })
    const built = buildReply(parsed, scope)
    if (parsed.flags.injection) built.policyNotes.push('Instructions or role claims inside a question are treated as text. They cannot change the assistant’s scope, rules or records.')
    if (parsed.flags.truncated) built.policyNotes.push('Your question was shortened to 500 characters.')
    const reply = enforceReplyPolicy(built, scope)
    const context = TOPICAL.has(parsed.intent) ? { intent: parsed.intent, focus: parsed.focus } : previous
    return { parsed, reply, context }
  },
}
