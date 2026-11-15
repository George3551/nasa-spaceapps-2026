import { useEffect, useId, useRef, useState } from 'react'
import { formatTimestamp } from '../app/format'
import { useAppState } from '../app/state/context'
import type { Section } from '../app/state/reducer'
import { MAX_INPUT_LENGTH, SUGGESTED_QUESTIONS } from './intents'
import { localRulesProvider } from './provider'
import type { AssistantProvider } from './provider'
import type { AssistantReply, ConversationContext, EvidenceItem } from './types'
import './assistant.css'

interface Turn { id: number; question: string; askedAt: string; reply: AssistantReply }

const AVAILABILITY: Record<EvidenceItem['availability'], string> = {
  current: 'Current', stale: 'Stale · not current', historical: 'History only', missing: 'Missing', invalid: 'Invalid', baseline: 'Baseline session', record: 'Cited record',
}
const STATUS: Record<AssistantReply['status'], string> = { answered: 'Answer from records', insufficient: 'Insufficient information', refused: 'Not permitted', unsupported: 'Not supported' }
const originLabel = (origin?: string) => origin === 'synthetic' ? 'SYNTHETIC' : origin === 'observed' ? 'OBSERVED' : origin ? origin.replaceAll('_', ' ').toUpperCase() : null

export default function AssistantPanel({ provider = localRulesProvider, open, onClose }: { provider?: AssistantProvider; open: boolean; onClose(): void }) {
  const { state, dispatch } = useAppState()
  const [turns, setTurns] = useState<Turn[]>([])
  const [context, setContext] = useState<ConversationContext | null>(null)
  const [draft, setDraft] = useState('')
  const input = useRef<HTMLInputElement>(null), log = useRef<HTMLDivElement>(null), nextId = useRef(0)
  const titleId = useId(), inputId = useId()
  useEffect(() => { if (open) input.current?.focus() }, [open])
  // Show the start of the newest answer (its question and headline), not the end of a long reply.
  useEffect(() => { const el = log.current, last = el?.lastElementChild as HTMLElement | null; if (el && last) el.scrollTop = last.offsetTop - el.offsetTop }, [turns.length])
  const subject = state.mission.crew.find(c => c.id === state.sessionAstronautId)

  function ask(question: string) {
    if (!question.trim()) return
    // Recomputed from the latest reducer state at the moment of asking.
    const answer = provider.answer({ question, state, previous: context })
    if (!answer.parsed.text) return
    const id = nextId.current++
    setTurns(t => [...t, { id, question: answer.parsed.text, askedAt: new Date().toISOString(), reply: answer.reply }])
    setContext(answer.context)
    setDraft('')
  }
  function navigate(section: Section) { dispatch({ type: 'navigate', section }); onClose() }

  return <section id="aegis-assistant-panel" className="assistant-panel" role="dialog" aria-modal="false" aria-labelledby={titleId} hidden={!open} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }}>
    <header className="assistant-header">
      <div><p className="eyebrow">Offline · rules-based prototype</p><h2 id={titleId}>AEGIS Guided Assistant</h2></div>
      <button type="button" className="button" onClick={onClose} aria-label="Close Guided Assistant">Close</button>
    </header>
    <p className="assistant-scope"><span className="badge">{state.scope === 'synthetic' ? 'SYNTHETIC mission preview' : 'OBSERVED records'}</span> <span>{subject?.displayName ?? 'No profile'} · own records only · resets when user context or workspace changes</span></p>
    <div className="assistant-log" ref={log} role="log" aria-live="polite" aria-label="Assistant conversation" tabIndex={0}>
      <p className="assistant-disclaimer"><strong>AEGIS Guided Assistant — offline, rules-based prototype.</strong> Research/demo software, not a clinical decision-maker: it cannot diagnose, prescribe, or change any record. No language model is connected and no question or record leaves this device. Each answer is rebuilt from your current records when you ask.</p>
      {!turns.length && <p className="empty-copy">Ask about your own accessible records, or choose a suggested question below. Answers cite existing AEGIS record IDs.</p>}
      {turns.map(t => <article className="assistant-turn" key={t.id}>
        <div className="assistant-question"><p className="eyebrow">You · {formatTimestamp(t.askedAt)}</p><p>{t.question}</p></div>
        <ReplyView reply={t.reply} onNavigate={navigate} />
      </article>)}
    </div>
    <details className="assistant-suggestions" key={turns.length ? 'collapsed' : 'open'} open={!turns.length}><summary>Suggested questions</summary>
      <div className="assistant-chips">{SUGGESTED_QUESTIONS.map(s => <button type="button" className="assistant-chip" key={s.text} onClick={() => ask(s.text)}>{s.text}</button>)}</div>
    </details>
    <form className="assistant-form" onSubmit={e => { e.preventDefault(); ask(draft) }}>
      <label className="field" htmlFor={inputId}>Ask about your accessible records
        <input id={inputId} ref={input} type="text" value={draft} maxLength={MAX_INPUT_LENGTH} autoComplete="off" spellCheck onChange={e => setDraft(e.target.value)} />
      </label>
      <div className="assistant-form-row"><button className="button primary" type="submit" disabled={!draft.trim()}>Ask</button><button type="button" className="button" disabled={!turns.length} onClick={() => { setTurns([]); setContext(null) }}>Clear conversation</button></div>
    </form>
  </section>
}

function ReplyView({ reply, onNavigate }: { reply: AssistantReply; onNavigate(section: Section): void }) {
  return <div className={`assistant-reply assistant-${reply.status}`}>
    <p className="eyebrow">Guided Assistant · {STATUS[reply.status]}{reply.scope ? ` · ${originLabel(reply.scope.origin)} · records as of ${formatTimestamp(reply.scope.asOf)}` : ''}</p>
    <h3>{reply.headline}</h3>
    {reply.body.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
    {reply.policyNotes.length > 0 && <ul className="assistant-policy" aria-label="Safety notes">{reply.policyNotes.map(n => <li key={n}>{n}</li>)}</ul>}
    {reply.evidence.length > 0 && <details className="assistant-details" open><summary>Evidence · {reply.evidence.length} cited record{reply.evidence.length === 1 ? '' : 's'}</summary>
      <ul className="assistant-evidence">{reply.evidence.map((e, i) => <EvidenceCard key={`${e.kind}-${e.id}-${i}`} item={e} />)}</ul></details>}
    {reply.limitations.length > 0 && <details className="assistant-details"><summary>Limitations · what this cannot establish</summary><ul>{reply.limitations.map(l => <li key={l}>{l}</li>)}</ul></details>}
    {reply.actions.length > 0 && <div className="assistant-actions">{reply.actions.map(a => <button type="button" className="button" key={`${a.section}-${a.label}`} onClick={() => onNavigate(a.section)}>{a.label}</button>)}</div>}
  </div>
}

function EvidenceCard({ item: e }: { item: EvidenceItem }) {
  const origin = originLabel(e.origin)
  return <li className="assistant-evidence-item">
    <p className="assistant-badges">{origin && <span className="badge">{origin}</span>}<span className="badge neutral">{AVAILABILITY[e.availability]}</span>{e.quality && <span className="badge neutral">Quality: {e.quality}</span>}{e.demonstrationOnly && <span className="badge neutral">Demonstration only</span>}</p>
    <p><strong>{e.label}</strong>: {e.value === null ? 'No value recorded' : `${e.value}${e.unit ? ` ${e.unit}` : ''}`}</p>
    <dl className="assistant-meta">
      <div><dt>Record ID</dt><dd className="mono">{e.id}</dd></div>
      {e.timestamp && <div><dt>Time</dt><dd><time dateTime={e.timestamp}>{formatTimestamp(e.timestamp)}</time></dd></div>}
      {e.source && <div><dt>Source</dt><dd>{e.source}</dd></div>}
      {e.acquisition && <div><dt>Acquisition</dt><dd>{e.acquisition}</dd></div>}
    </dl>
    {e.detail && <p className="muted">Record text: {e.detail}</p>}
    {e.userNote && <p className="muted">Recorded note (entered text): {e.userNote}</p>}
  </li>
}
