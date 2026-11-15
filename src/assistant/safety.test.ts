/** AEGIS - team-directed, AI-assisted implementation (Anthropic Claude Code); integration fixes/tests assisted by OpenAI Codex.
 * Local research prototype, not clinical validation. See docs/V4_2_INTEGRATION_REPORT.md and AI_DISCLOSURE.md. */
import { describe, expect, it } from 'vitest'
import { enforceReplyPolicy, findViolations } from './safety'
import { scopeFromState } from './scope'
import { scenarioAsAstronaut } from './test-helpers'
import type { AssistantReply } from './types'

const base = (over: Partial<AssistantReply> = {}): AssistantReply => ({ intent: 'sleep', status: 'answered', headline: 'Sleep duration: 5 h.', body: [], evidence: [], actions: [], limitations: [], scope: null, provider: 'local-rules', policyNotes: [], ...over })

describe('assistant claims and evidence gate', () => {
  const scope = scopeFromState(scenarioAsAstronaut('sleep-disruption'))

  it('removes evidence that is not in the subject’s scoped records or has another origin', () => {
    const own = 'sleep-disruption-3-crew-01-sleep_duration'
    const reply = enforceReplyPolicy(base({ evidence: [
      { id: own, kind: 'measurement', label: 'Sleep', value: '5.2', availability: 'current', origin: 'synthetic' },
      { id: 'sleep-disruption-3-crew-02-sleep_duration', kind: 'measurement', label: 'Sleep', value: '7.5', availability: 'current', origin: 'synthetic' },
      { id: 'invented-record', kind: 'measurement', label: 'Sleep', value: '9', availability: 'current' },
      { id: own, kind: 'measurement', label: 'Sleep (wrong origin)', value: '5.2', availability: 'current', origin: 'observed' },
    ] }), scope)
    expect(reply.evidence.map(e => e.label)).toEqual(['Sleep'])
    expect(reply.policyNotes.join(' ')).toContain('3 cited item(s) were removed')
  })

  it('withholds generated text containing diagnoses, doses, reassurance or overclaims', () => {
    for (const bad of ['You have depression.', 'Take 5 mg melatonin.', 'You are healthy.', 'Your values are normal.', 'AEGIS is clinically validated.', 'LLM-connected answer', 'This is an emergency.', '92% confidence', 'See https://example.com']) {
      const reply = enforceReplyPolicy(base({ body: [bad] }), scope)
      expect(reply.status, bad).toBe('refused')
      expect(reply.body.join(' ')).not.toContain(bad)
      expect(reply.evidence).toEqual([])
    }
  })

  it('allows negated limitation language and leaves attributed user notes untouched', () => {
    const reply = base({ body: ['AEGIS is not clinically validated. It cannot provide a diagnosis.'], evidence: [{ id: 'sleep-disruption-3-crew-01-sleep_duration', kind: 'measurement', label: 'Sleep', value: '5.2', availability: 'current', userNote: 'you have depression (typed by user)' }] })
    expect(findViolations(reply)).toEqual([])
    expect(enforceReplyPolicy(reply, scope).status).toBe('answered')
  })

  it('drops all evidence when no scope is available', () => {
    const reply = enforceReplyPolicy(base({ evidence: [{ id: 'x', kind: 'measurement', label: 'Sleep', value: '1', availability: 'current' }] }), { ok: false, reason: 'no' })
    expect(reply.evidence).toEqual([])
  })
})
