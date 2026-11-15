import { useState } from 'react'
import type {
  HydrationUnit,
  PreventionCategory,
  PreventionRecurrence,
  PreventionTargetKind,
} from '../../contracts/types'
import { Panel } from '../app/components/Panel'
import { useAppState } from '../app/state/context'
import { selectWorkspace } from '../app/state/reducer'
import {
  buildHydrationRecord,
  buildManualExerciseCompletion,
  buildUserPreventionPlan,
} from './fixtures'
import { selectPreventionSchedule } from './selectors'
import './prevention.css'

const categoryLabels: Record<PreventionCategory, string> = {
  exercise: 'Physical activity & exercise',
  sleep_recovery: 'Sleep & recovery follow-up',
  self_assessment: 'Self-assessment & cognitive checks',
  hydration: 'Hydration & fluid intake',
}

const targetKindLabels: Record<PreventionTargetKind, string> = {
  physical_assessment: 'Physical camera or manual countermeasure check',
  exercise_activity: 'Exercise activity / duration log',
  sleep_observation: 'Sleep duration observation',
  fatigue_stress_check: 'Subjective fatigue / stress self-report',
  reaction_assessment: 'Reaction time self-assessment (PVT-inspired)',
  typing_assessment: 'Typing performance self-assessment',
  procedure_assessment: 'Procedure input verification task',
  hydration_log: 'Hydration fluid intake entry',
}

export function PreventiveHealth() {
  const { state, dispatch } = useAppState()
  const workspace = selectWorkspace(state)
  const subjectId = state.selectedAstronautId ?? state.sessionAstronautId
  const crewMember = workspace.crew.find(c => c.id === subjectId) ?? state.mission.crew.find(c => c.id === subjectId)
  const nowIso = () => (state.scope === 'synthetic' ? state.mission.missionTime : new Date().toISOString())

  const [categoryFilter, setCategoryFilter] = useState<PreventionCategory | 'all'>('all')
  const [manualDuration, setManualDuration] = useState('30')
  const [manualNote, setManualNote] = useState('')
  const [manualError, setManualError] = useState('')

  // Hydration form state
  const [hydrationAmount, setHydrationAmount] = useState('350')
  const [hydrationUnit, setHydrationUnit] = useState<HydrationUnit>('mL')
  const [hydrationMissing, setHydrationMissing] = useState(false)
  const [hydrationNote, setHydrationNote] = useState('')
  const [hydrationError, setHydrationError] = useState('')

  // Create plan form state
  const [planCategory, setPlanCategory] = useState<PreventionCategory>('exercise')
  const [planTarget, setPlanTarget] = useState<PreventionTargetKind>('physical_assessment')
  const [planTitle, setPlanTitle] = useState('')
  const [planDescription, setPlanDescription] = useState('')
  const [planWindowMinutes, setPlanWindowMinutes] = useState('45')
  const [planOffsetMinutes, setPlanOffsetMinutes] = useState('0')
  const [planRecurrence, setPlanRecurrence] = useState<PreventionRecurrence>('daily')
  const [planHydrationGoal, setPlanHydrationGoal] = useState('')
  const [planError, setPlanError] = useState('')

  const evalTime = state.scope === 'synthetic' ? state.mission.missionTime : new Date().toISOString()
  const schedule = selectPreventionSchedule(state, subjectId, state.scope, evalTime)
  const visibleItems = schedule.items.filter(
    item => categoryFilter === 'all' || item.plan.category === categoryFilter,
  )

  function addStarterObservedPlans() {
    const now = nowIso()
    const baseMs = Date.parse(now)
    const startIso = new Date(baseMs - 5 * 60000).toISOString()
    const endIso = new Date(baseMs + 55 * 60000).toISOString()
    const futureStartIso = new Date(baseMs + 30 * 60000).toISOString()
    const futureEndIso = new Date(baseMs + 90 * 60000).toISOString()

    const starterPlans = [
      buildUserPreventionPlan({
        id: `plan-observed-${subjectId}-exercise`,
        astronautId: subjectId,
        origin: state.scope,
        category: 'exercise',
        targetKind: 'physical_assessment',
        title: 'Personal Resistance & Elbow Range Check-in',
        description: 'User-created exercise check-in. Complete via Physical Performance (camera opt-in) or manual exercise log.',
        plannedStartAt: startIso,
        plannedEndAt: endIso,
        recurrence: 'daily',
        now,
      }),
      buildUserPreventionPlan({
        id: `plan-observed-${subjectId}-sleep`,
        astronautId: subjectId,
        origin: state.scope,
        category: 'sleep_recovery',
        targetKind: 'sleep_observation',
        title: 'Personal Sleep & Recovery Check-in',
        description: 'User-created sleep duration follow-up linked to My Health sleep observations.',
        plannedStartAt: startIso,
        plannedEndAt: endIso,
        recurrence: 'daily',
        now,
      }),
      buildUserPreventionPlan({
        id: `plan-observed-${subjectId}-reaction`,
        astronautId: subjectId,
        origin: state.scope,
        category: 'self_assessment',
        targetKind: 'reaction_assessment',
        title: 'Personal Cognitive Reaction Check',
        description: 'User-created 30-second reaction check in Daily Assessments.',
        plannedStartAt: futureStartIso,
        plannedEndAt: futureEndIso,
        recurrence: 'daily',
        now,
      }),
      buildUserPreventionPlan({
        id: `plan-observed-${subjectId}-hydration`,
        astronautId: subjectId,
        origin: state.scope,
        category: 'hydration',
        targetKind: 'hydration_log',
        title: 'Personal Fluid Intake Check-in',
        description: 'User-created hydration tracking window with optional personal goal (non-clinical).',
        plannedStartAt: startIso,
        plannedEndAt: endIso,
        recurrence: 'daily',
        now,
        hydrationGoalMl: 600,
      }),
    ]
    for (const plan of starterPlans) {
      dispatch({ type: 'prevention/plan-upsert', plan })
    }
  }

  return (
    <>
      <div className="page-intro">
        <div>
          <p className="eyebrow">Preventive health management · Schedule, evidence & longitudinal history</p>
          <h1>Preventive Health</h1>
          <p className="muted">
            {crewMember?.displayName ?? subjectId} · {state.scope} workspace · evaluated at {schedule.asOf}. Completion is derived strictly from linked or window-matched canonical records; missing data never implies noncompliance or a diagnosis.
          </p>
        </div>
        {state.mode !== 'astronaut' && (
          <label className="select-label">
            Prevention subject
            <select
              aria-label="Prevention subject"
              value={subjectId}
              onChange={e => dispatch({ type: 'crew/select', id: e.target.value })}
            >
              {state.mission.crew.map(c => (
                <option key={c.id} value={c.id}>{c.displayName}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="prevention-summary-grid" role="region" aria-label="Prevention schedule status summary">
        <div className="summary">
          <p className="eyebrow">Completed</p>
          <strong>{schedule.counts.completed}</strong>
          <p>Verified by linked evidence</p>
        </div>
        <div className="summary">
          <p className="eyebrow">Due now</p>
          <strong>{schedule.counts.due}</strong>
          <p>Active window · awaiting check</p>
        </div>
        <div className="summary">
          <p className="eyebrow">Not yet due</p>
          <strong>{schedule.counts.not_yet_due}</strong>
          <p>Upcoming window</p>
        </div>
        <div className="summary">
          <p className="eyebrow">Insufficient evidence</p>
          <strong>{schedule.counts.insufficient_evidence}</strong>
          <p>Missing/invalid or withheld record</p>
        </div>
        <div className="summary">
          <p className="eyebrow">Unknown / unverified</p>
          <strong>{schedule.counts.unknown}</strong>
          <p>Past window · not noncompliance</p>
        </div>
        <div className="summary">
          <p className="eyebrow">24h Hydration</p>
          <strong>{schedule.hydrationSummary.totalMl} mL</strong>
          <p>{schedule.hydrationSummary.usableEntriesCount} usable · {schedule.hydrationSummary.missingEntriesCount} missing</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="stack">
          <Panel
            title="Scheduled prevention items & evidence verification"
            eyebrow={state.scope === 'synthetic' ? 'Deterministic mission-clock schedule · synthetic fixtures' : 'Personal observed prevention schedule · separate from scenarios'}
          >
            <div className="control-row">
              <label className="field">
                Filter by prevention category
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value as PreventionCategory | 'all')}
                >
                  <option value="all">All categories ({schedule.items.length})</option>
                  {Object.entries(categoryLabels).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </label>
              {state.scope === 'observed' && schedule.items.length === 0 && (
                <button
                  type="button"
                  className="button primary"
                  onClick={addStarterObservedPlans}
                >
                  Add starter personal prevention schedule
                </button>
              )}
            </div>

            {!visibleItems.length && (
              <p className="empty-copy">
                No prevention plan items in this view. Create a personal plan item or add the starter schedule above; observed plans remain isolated from synthetic mission resets.
              </p>
            )}

            <div>
              {visibleItems.map(item => (
                <article
                  className="prevention-card"
                  key={item.plan.id}
                  data-testid={`prevention-item-${item.plan.id}`}
                >
                  <div className="prevention-badge-row">
                    <span className={`badge pstatus-${item.status}`}>
                      Status: {item.status.replaceAll('_', ' ')}
                    </span>
                    <span className="badge neutral">{categoryLabels[item.plan.category]}</span>
                    <span className="badge">
                      {item.plan.planSource === 'synthetic_demo' ? 'SYNTHETIC / DEMO PLAN' : 'USER-CREATED PLAN'}
                    </span>
                    <span className="badge neutral">Recurrence: {item.plan.recurrence}</span>
                  </div>

                  <h3>{item.plan.title}</h3>
                  <p className="muted">{item.plan.description}</p>
                  <p className="mono">
                    Window: {item.activeWindow.startAt} → {item.activeWindow.endAt} · ID: {item.plan.id}
                  </p>
                  <p>{item.statusExplanation}</p>

                  {item.matchedEvidence.length > 0 && (
                    <div className="evidence-box">
                      <strong>Verified linked evidence ({item.matchedEvidence.length}):</strong>
                      <ul>
                        {item.matchedEvidence.map(ev => (
                          <li key={ev.id}>
                            <span className="mono">{ev.id}</span> ({ev.timestamp}) — {ev.summary}
                          </li>
                        ))}
                      </ul>
                      <div className="control-row">
                        <button
                          type="button"
                          className="button"
                          onClick={() =>
                            dispatch({
                              type: 'prevention/evidence-withhold',
                              planId: item.plan.id,
                              evidenceId: item.matchedEvidence[item.matchedEvidence.length - 1]!.id,
                              removeCanonicalRecord: true,
                              at: nowIso(),
                            })
                          }
                        >
                          Withhold linked evidence (test verification)
                        </button>
                      </div>
                    </div>
                  )}

                  {item.invalidOrMissingEvidence.length > 0 && (
                    <div className="evidence-box insufficient" role="status">
                      <strong>Unverified / insufficient / withheld evidence:</strong>
                      <ul>
                        {item.invalidOrMissingEvidence.map(ev => (
                          <li key={ev.id}>
                            <span className="mono">{ev.id}</span>: {ev.summary} ({ev.reasonIfUnusable})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {item.warnings.length > 0 && (
                    <ul className="muted">
                      {item.warnings.map(w => <li key={w}>{w}</li>)}
                    </ul>
                  )}

                  {item.plan.category === 'exercise' && (
                    <div className="inline-complete-form">
                      <label className="field">
                        Manual duration (min)
                        <input
                          type="number"
                          min={1}
                          max={1440}
                          value={manualDuration}
                          onChange={e => setManualDuration(e.target.value)}
                        />
                      </label>
                      <label className="field">
                        Manual completion note (optional)
                        <input
                          value={manualNote}
                          maxLength={300}
                          placeholder="e.g., Resistance band set (manual log, not camera CV)"
                          onChange={e => setManualNote(e.target.value)}
                        />
                      </label>
                      <button
                        type="button"
                        className="button primary"
                        onClick={() => {
                          setManualError('')
                          try {
                            const completedAt = nowIso()
                            const bundle = buildManualExerciseCompletion({
                              astronautId: subjectId,
                              origin: state.scope,
                              completedAt,
                              durationMinutes: Number(manualDuration),
                              exerciseLabel: item.plan.title,
                              note: manualNote,
                            })
                            dispatch({
                              type: 'prevention/complete',
                              planId: item.plan.id,
                              completion: bundle.completion,
                              activity: bundle.activity,
                            })
                            setManualNote('')
                          } catch (err) {
                            setManualError(err instanceof Error ? err.message : 'Invalid manual completion')
                          }
                        }}
                      >
                        Record manual exercise completion
                      </button>
                    </div>
                  )}
                  {item.plan.category === 'exercise' && manualError && (
                    <p role="alert">{manualError}</p>
                  )}

                  <div className="control-row">
                    {item.recommendedRoute.section !== 'prevention' && (
                      <button
                        type="button"
                        className="button"
                        onClick={() => dispatch({ type: 'navigate', section: item.recommendedRoute.section })}
                      >
                        {item.recommendedRoute.label} →
                      </button>
                    )}
                    <details>
                      <summary className="mono">
                        Audit history ({item.plan.history.length} events · {item.plan.completions.length} explicit completions)
                      </summary>
                      <ul>
                        {item.plan.history.slice().reverse().map(h => (
                          <li key={h.id}>
                            <span className="mono">{h.at}</span> [{h.action}]: {h.summary}
                            {h.evidenceIds && h.evidenceIds.length > 0 && ` (evidence: ${h.evidenceIds.join(', ')})`}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                </article>
              ))}
            </div>
          </Panel>

          <Panel
            title="Sleep & recovery follow-up"
            eyebrow="Existing sleep observations · qualified 3-session baseline · CDSS case links"
          >
            <dl className="metadata">
              <div>
                <dt>Latest sleep</dt>
                <dd>
                  {schedule.sleepRecoveryContext.latestSleepHours !== null
                    ? `${schedule.sleepRecoveryContext.latestSleepHours} h (${schedule.sleepRecoveryContext.latestSleepTimestamp} · ${schedule.sleepRecoveryContext.latestSleepQuality})`
                    : 'No usable sleep record'}
                </dd>
              </div>
              <div>
                <dt>Baseline status</dt>
                <dd>
                  <span className="badge neutral">
                    {schedule.sleepRecoveryContext.baselineComparison.status.replaceAll('_', ' ')}
                  </span>{' '}
                  {schedule.sleepRecoveryContext.baselineComparison.baseline !== null
                    ? `Median baseline: ${schedule.sleepRecoveryContext.baselineComparison.baseline.toFixed(2)} h (sources: ${schedule.sleepRecoveryContext.baselineComparison.baselineRecords.map(r => r.id).join(', ')})`
                    : 'No qualified 3-session baseline established'}
                </dd>
              </div>
              <div>
                <dt>Self-reports</dt>
                <dd>
                  Latest fatigue: {schedule.sleepRecoveryContext.latestFatigueScore ?? 'No data'}/10 · Latest stress: {schedule.sleepRecoveryContext.latestStressScore ?? 'No data'}/10
                </dd>
              </div>
            </dl>
            <p className="sample-note">{schedule.sleepRecoveryContext.explanation}</p>

            <div className="event-item">
              <h3>Related CDSS recovery cases ({schedule.sleepRecoveryContext.linkedEncounters.length})</h3>
              {!schedule.sleepRecoveryContext.linkedEncounters.length ? (
                <p className="muted">
                  No open or historical recovery CDSS case for this astronaut in the {state.scope} workspace.
                </p>
              ) : (
                <ul>
                  {schedule.sleepRecoveryContext.linkedEncounters.map(enc => (
                    <li key={enc.id}>
                      <strong>{enc.title}</strong> (<span className="mono">{enc.id}</span>) — status:{' '}
                      <span className="badge neutral">{enc.status.replaceAll('_', ' ')}</span> · actions: {enc.actions.length}
                    </li>
                  ))}
                </ul>
              )}
              <p className="muted">
                Safety boundary: Preventive Health actions never automatically acknowledge alerts or transition/resolve CDSS cases.
              </p>
              <div className="control-row">
                <button
                  type="button"
                  className="button"
                  onClick={() => dispatch({ type: 'navigate', section: 'health' })}
                >
                  Open My Health (sleep & fatigue observations)
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => dispatch({ type: 'navigate', section: 'performance' })}
                >
                  Open Human Performance Assessment
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => dispatch({ type: 'navigate', section: 'events' })}
                >
                  Open Events & Alerts (CDSS cases)
                </button>
              </div>
            </div>
          </Panel>
        </div>

        <div className="stack">
          <Panel
            title="Hydration tracking & period totals"
            eyebrow="Manual vs synthetic provenance · transparent mL conversion · non-clinical reference"
          >
            <dl className="metadata">
              <div>
                <dt>Last 24h total</dt>
                <dd>
                  <strong>{schedule.hydrationSummary.totalMl} mL</strong> ({schedule.hydrationSummary.usableEntriesCount} usable entries since {schedule.hydrationSummary.windowStartAt})
                </dd>
              </div>
              <div>
                <dt>Missing entries</dt>
                <dd>
                  {schedule.hydrationSummary.missingEntriesCount} (stored as null/missing, never counted as 0 mL)
                </dd>
              </div>
              <div>
                <dt>Tracking goal</dt>
                <dd>{schedule.hydrationSummary.goalLabel}</dd>
              </div>
            </dl>
            {schedule.hydrationSummary.warnings.length > 0 && (
              <ul className="sample-note">
                {schedule.hydrationSummary.warnings.map(w => <li key={w}>{w}</li>)}
              </ul>
            )}

            <form
              className="entry-form"
              onSubmit={e => {
                e.preventDefault()
                setHydrationError('')
                try {
                  if (!hydrationMissing && (!hydrationAmount.trim() || Number(hydrationAmount) <= 0)) {
                    throw new Error('Enter a positive fluid amount, or mark the entry unavailable/missing.')
                  }
                  const hydrationPlan = schedule.items.find(i => i.plan.category === 'hydration')?.plan
                  const record = buildHydrationRecord({
                    astronautId: subjectId,
                    timestamp: nowIso(),
                    amount: hydrationMissing ? null : Number(hydrationAmount),
                    unit: hydrationUnit,
                    origin: state.scope,
                    source: 'manual',
                    missing: hydrationMissing,
                    note: hydrationNote,
                    ...(hydrationPlan ? { linkedPlanId: hydrationPlan.id } : {}),
                  })
                  dispatch({ type: 'hydration/add', record })
                  setHydrationNote('')
                } catch (err) {
                  setHydrationError(err instanceof Error ? err.message : 'Invalid hydration entry')
                }
              }}
            >
              <label className="field">
                Fluid amount
                <input
                  type="number"
                  step="any"
                  min={0.01}
                  max={10000}
                  disabled={hydrationMissing}
                  required={!hydrationMissing}
                  value={hydrationAmount}
                  onChange={e => setHydrationAmount(e.target.value)}
                />
              </label>
              <label className="field">
                Hydration unit (1 L = 1000 mL)
                <select value={hydrationUnit} onChange={e => setHydrationUnit(e.target.value as HydrationUnit)}>
                  <option value="mL">Milliliters (mL)</option>
                  <option value="L">Liters (L → normalized to mL)</option>
                </select>
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={hydrationMissing}
                  onChange={e => setHydrationMissing(e.target.checked)}
                />
                Intake amount unavailable — record as missing (null), never zero
              </label>
              <label className="field">
                Hydration note (optional)
                <input
                  value={hydrationNote}
                  maxLength={500}
                  placeholder="e.g., Post-exercise water pouch"
                  onChange={e => setHydrationNote(e.target.value)}
                />
              </label>
              <button className="button primary" type="submit">
                Log hydration entry
              </button>
              {hydrationError && <p role="alert">{hydrationError}</p>}
            </form>

            <div className="history-list">
              {schedule.hydrationSummary.records.slice().reverse().map(r => (
                <p className="event-item" key={r.id}>
                  <span className="mono">{r.timestamp}</span> ·{' '}
                  {r.amount !== null ? `${r.amount} ${r.unit} (${r.amountMl} mL)` : 'Unavailable (null)'} ·{' '}
                  {r.source} / {r.origin} / {r.quality}
                  {r.note ? ` · ${r.note}` : ''}
                </p>
              ))}
              {!schedule.hydrationSummary.records.length && (
                <p className="empty-copy">No hydration entries recorded in this 24-hour window.</p>
              )}
            </div>
          </Panel>

          <Panel
            title="Create prevention plan item"
            eyebrow="User-created schedule · persisted in active workspace"
          >
            <form
              className="entry-form"
              onSubmit={e => {
                e.preventDefault()
                setPlanError('')
                try {
                  if (!planTitle.trim() || !planDescription.trim()) {
                    throw new Error('Provide both a title and neutral informational description.')
                  }
                  const now = nowIso()
                  const baseMs = Date.parse(now)
                  const offsetMs = Number(planOffsetMinutes) * 60000
                  const durationMs = Math.max(5, Number(planWindowMinutes)) * 60000
                  const startAt = new Date(baseMs + offsetMs).toISOString()
                  const endAt = new Date(baseMs + offsetMs + durationMs).toISOString()
                  const goalMl =
                    planCategory === 'hydration' && planHydrationGoal.trim()
                      ? Number(planHydrationGoal)
                      : undefined
                  const plan = buildUserPreventionPlan({
                    astronautId: subjectId,
                    origin: state.scope,
                    category: planCategory,
                    targetKind: planTarget,
                    title: planTitle,
                    description: planDescription,
                    plannedStartAt: startAt,
                    plannedEndAt: endAt,
                    recurrence: planRecurrence,
                    now,
                    ...(goalMl !== undefined ? { hydrationGoalMl: goalMl } : {}),
                  })
                  dispatch({ type: 'prevention/plan-upsert', plan })
                  setPlanTitle('')
                  setPlanDescription('')
                  setPlanHydrationGoal('')
                } catch (err) {
                  setPlanError(err instanceof Error ? err.message : 'Could not save prevention plan')
                }
              }}
            >
              <label className="field">
                Prevention category
                <select
                  value={planCategory}
                  onChange={e => {
                    const nextCat = e.target.value as PreventionCategory
                    setPlanCategory(nextCat)
                    if (nextCat === 'exercise') setPlanTarget('physical_assessment')
                    else if (nextCat === 'sleep_recovery') setPlanTarget('sleep_observation')
                    else if (nextCat === 'self_assessment') setPlanTarget('reaction_assessment')
                    else setPlanTarget('hydration_log')
                  }}
                >
                  {Object.entries(categoryLabels).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Evidence target type
                <select
                  value={planTarget}
                  onChange={e => setPlanTarget(e.target.value as PreventionTargetKind)}
                >
                  {Object.entries(targetKindLabels).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Plan title
                <input
                  value={planTitle}
                  onChange={e => setPlanTitle(e.target.value)}
                  placeholder="e.g., Afternoon Resistive Exercise Check"
                  maxLength={300}
                  required
                />
              </label>
              <label className="field">
                Neutral informational description (not a clinical order)
                <textarea
                  value={planDescription}
                  onChange={e => setPlanDescription(e.target.value)}
                  placeholder="Describe the planned self-check or countermeasure activity…"
                  maxLength={2000}
                  required
                />
              </label>
              <div className="control-row">
                <label className="field">
                  Window start offset (min from current clock)
                  <input
                    type="number"
                    min={-720}
                    max={1440}
                    value={planOffsetMinutes}
                    onChange={e => setPlanOffsetMinutes(e.target.value)}
                  />
                </label>
                <label className="field">
                  Window duration (min)
                  <input
                    type="number"
                    min={5}
                    max={1440}
                    value={planWindowMinutes}
                    onChange={e => setPlanWindowMinutes(e.target.value)}
                  />
                </label>
              </div>
              <label className="field">
                Recurrence
                <select
                  value={planRecurrence}
                  onChange={e => setPlanRecurrence(e.target.value as PreventionRecurrence)}
                >
                  <option value="once">One-time window</option>
                  <option value="daily">Daily recurring window (24 h)</option>
                  <option value="per_shift">Per-shift recurring window (8 h)</option>
                </select>
              </label>
              {planCategory === 'hydration' && (
                <label className="field">
                  Optional user-entered tracking goal (mL, non-clinical)
                  <input
                    type="number"
                    min={50}
                    max={10000}
                    value={planHydrationGoal}
                    onChange={e => setPlanHydrationGoal(e.target.value)}
                    placeholder="e.g., 600"
                  />
                </label>
              )}
              <button className="button primary" type="submit">
                Save prevention plan item
              </button>
              {planError && <p role="alert">{planError}</p>}
            </form>
          </Panel>

          <Panel
            title="Longitudinal exercise & assessment provenance log"
            eyebrow="Distinguishes manual confirmation from camera-measured geometry"
          >
            <p className="sample-note">
              Camera pose tracking (right elbow flexion) is optional and experimental. Elbow-flexion repetition counts do not measure or improve bone mineral density.
            </p>
            <div className="history-list">
              {workspace.activities
                .filter(a => a.astronautId === subjectId && a.kind === 'exercise')
                .slice(-10)
                .reverse()
                .map(a => (
                  <p className="event-item" key={a.id}>
                    <span className="mono">{a.endedAt ?? a.startedAt}</span> · {a.kind} ·{' '}
                    <span className="badge neutral">
                      {a.source === 'camera_pose' ? 'camera_pose (2D geometry)' : a.source === 'manual' ? 'manual confirmation' : a.source}
                    </span>{' '}
                    · {a.origin} · {a.quality}
                    {a.details?.durationMinutes ? ` · ${a.details.durationMinutes} min` : ''}
                    {a.details?.repetitions !== undefined ? ` · ${a.details.repetitions ?? 'Unavailable'} repetitions` : ''}
                  </p>
                ))}
              {!workspace.activities.some(a => a.astronautId === subjectId && a.kind === 'exercise') && (
                <p className="empty-copy">No recorded exercise activities in this workspace.</p>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}
