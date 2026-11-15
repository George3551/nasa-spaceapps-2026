/** AEGIS - team-directed, AI-assisted implementation (Anthropic Claude Code); integration fixes/tests assisted by OpenAI Codex.
 * Local research prototype, not clinical validation. See docs/V4_2_INTEGRATION_REPORT.md and AI_DISCLOSURE.md. */
import type { AssistantScope } from './scope'
import type { AssistantReply } from './types'

/** Claims the assistant must never generate. Applied to generated text only; user-entered
 *  notes are shown separately as attributed data and are not rewritten. */
export const FORBIDDEN_CLAIMS: { id: string; pattern: RegExp }[] = [
  { id: 'diagnosis-claim', pattern: /\byou (?:have|likely have|probably have|may have|might have|are suffering from|suffer from|are diagnosed with)\s+(?:an?\s+)?(?:depression|anxiety|burnout|insomnia|(?:\w+\s+)?(?:disorder|disease|infection|illness|syndrome|condition))\b/i },
  { id: 'diagnosis-statement', pattern: /\b(?:the |your )?diagnosis (?:is|was)\b|\bdiagnosed with\b/i },
  { id: 'false-reassurance', pattern: /\byou(?:'re| are) (?:healthy|fine|normal|safe|ok|okay|well|in good health|cleared)\b/i },
  { id: 'normality-claim', pattern: /\b(?:results?|values?|readings?|vitals?|measurements?) (?:is|are|look|looks|appear|appears) (?:normal|healthy|fine|abnormal|safe)\b/i },
  { id: 'dose', pattern: /\b\d+(?:[.,]\d+)?\s?(?:mg|mcg|µg|μg|ml|iu|tablets?|pills?|capsules?|drops)\b/i },
  { id: 'treatment-instruction', pattern: /\b(?:take|start|increase|decrease|stop taking|administer|inject)\s+(?:your\s+|a\s+|an\s+|the\s+)?(?:medication|medicine|pills?|tablets?|dose|drug|antidepressants?|sedatives?|melatonin)\b/i },
  { id: 'llm-claim', pattern: /\bllm[- ]connected\b|\bai doctor\b|\bconnected to (?:claude|gpt|an? (?:llm|language model))\b/i },
  { id: 'validation-claim', pattern: /(?<!not |never |isn't |is not |no )\b(?:clinically|medically) (?:validated|certified|approved)\b/i },
  { id: 'emergency-declaration', pattern: /\bthis is (?:an|a medical) emergency\b/i },
  { id: 'invented-confidence', pattern: /\b\d{1,3}(?:\.\d+)?\s?% (?:confidence|probability|likely|chance)\b/i },
  { id: 'external-link', pattern: /\bhttps?:\/\//i },
]

export function generatedText(reply: AssistantReply) {
  return [reply.headline, ...reply.body, ...reply.limitations, ...reply.actions.map(a => a.label), ...reply.evidence.flatMap(e => [e.label, e.value ?? '', e.detail ?? ''])]
}
export function findViolations(reply: AssistantReply) {
  const text = generatedText(reply)
  return FORBIDDEN_CLAIMS.filter(c => text.some(t => c.pattern.test(t))).map(c => c.id)
}

/** Final gate: cited evidence must belong to the current subject's scoped records and
 *  generated text must not contain diagnostic, prescribing or overclaiming language. */
export function enforceReplyPolicy(reply: AssistantReply, scope: AssistantScope): AssistantReply {
  const policyNotes = [...reply.policyNotes]
  let evidence = reply.evidence
  if (scope.ok) {
    const kept = evidence.filter(e => scope.allowedIds.has(e.id) && (!e.origin || e.origin === scope.origin))
    if (kept.length !== evidence.length) policyNotes.push(`${evidence.length - kept.length} cited item(s) were removed because they are not in your scoped records.`)
    evidence = kept
  } else if (evidence.length) { evidence = []; policyNotes.push('Evidence removed: no accessible scope.') }
  const checked = { ...reply, evidence, policyNotes }
  const violations = findViolations(checked)
  if (!violations.length) return checked
  return { ...checked, status: 'refused', headline: 'This answer was withheld by the assistant safety gate.', body: ['The generated answer contained language AEGIS does not permit (for example a diagnosis, dose, treatment instruction or unsupported claim). Please review your records directly or use the human-reviewed workflow in Events & Alerts.'],
    evidence: [], actions: [{ label: 'Open Events & Alerts', section: 'events' }], limitations: ['Safety gate: generated text is checked before display.'], policyNotes: [...policyNotes, `Blocked claim types: ${violations.join(', ')}.`] }
}
