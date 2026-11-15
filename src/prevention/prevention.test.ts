/** AEGIS - team-directed, AI-assisted implementation (Google Gemini); integration fixes/tests assisted by OpenAI Codex.
 * Local research prototype, not clinical validation. See docs/V4_2_INTEGRATION_REPORT.md and AI_DISCLOSURE.md. */
import { beforeEach, describe, expect, it } from 'vitest'
import { appReducer, createAppState, selectWorkspace } from '../app/state/reducer'
import { LEGACY_STORAGE_KEY, persistState, PREVIOUS_STORAGE_KEY, restoreState, STORAGE_KEY } from '../app/state/persistence'
import { PhysicalMetrics } from '../vision/metrics'
import { cameraRecord } from '../vision/records'
import {
  buildHydrationRecord,
  buildManualExerciseCompletion,
  buildUserPreventionPlan,
  computeActiveScheduleWindow,
  selectHydrationSummary,
  selectPreventionItemStatus,
  selectPreventionSchedule,
  selectSleepRecoveryContext,
} from './index'

const association = { kind: 'fictional_demo_profile' as const, confirmedAt: '2026-11-14T08:00:00.000Z' }

beforeEach(() => localStorage.clear())

describe('Preventive Health Management — domain selectors, provenance, and persistence', () => {
  it('derives disjoint schedule states: not_yet_due, due, completed, insufficient_evidence, and unknown', () => {
    const state = createAppState()
    const plan = buildUserPreventionPlan({
      id: 'plan-obs-exercise-1',
      astronautId: 'crew-01',
      origin: 'observed',
      category: 'exercise',
      targetKind: 'physical_assessment',
      title: 'Morning Resistance Check',
      description: 'Informational exercise window.',
      plannedStartAt: '2026-11-14T08:00:00.000Z',
      plannedEndAt: '2026-11-14T08:30:00.000Z',
      recurrence: 'once',
      now: '2026-11-14T07:45:00.000Z',
    })
    const withPlan = appReducer(state, { type: 'prevention/plan-upsert', plan })

    // 1. Before window -> not_yet_due
    expect(selectPreventionItemStatus(withPlan, plan, 'observed', '2026-11-14T07:50:00.000Z').status).toBe('not_yet_due')

    // 2. Inside window without evidence -> due
    expect(selectPreventionItemStatus(withPlan, plan, 'observed', '2026-11-14T08:10:00.000Z').status).toBe('due')

    // 3. Past window without evidence -> unknown (never labeled noncompliance)
    const pastEval = selectPreventionItemStatus(withPlan, plan, 'observed', '2026-11-14T09:00:00.000Z')
    expect(pastEval.status).toBe('unknown')
    expect(pastEval.statusExplanation).toContain('never inferred as noncompliance')

    // 4. Explicit manual completion -> completed
    const manual = buildManualExerciseCompletion({
      astronautId: 'crew-01',
      origin: 'observed',
      completedAt: '2026-11-14T08:15:00.000Z',
      durationMinutes: 25,
      note: 'Completed resistive set',
    })
    const completedState = appReducer(withPlan, {
      type: 'prevention/complete',
      planId: plan.id,
      completion: manual.completion,
      activity: manual.activity,
    })
    const savedPlan = completedState.personal.preventionPlans![0]!
    const completedEval = selectPreventionItemStatus(completedState, savedPlan, 'observed', '2026-11-14T08:20:00.000Z')
    expect(completedEval.status).toBe('completed')
    expect(completedEval.matchedEvidence[0]?.source).toBe('manual')

    // 5. Withholding/removing linked evidence -> returns to insufficient_evidence, never falsely completed
    const withheldState = appReducer(completedState, {
      type: 'prevention/evidence-withhold',
      planId: plan.id,
      evidenceId: manual.activity.id,
      removeCanonicalRecord: true,
      at: '2026-11-14T08:22:00.000Z',
    })
    const withheldPlan = withheldState.personal.preventionPlans![0]!
    const withheldEval = selectPreventionItemStatus(withheldState, withheldPlan, 'observed', '2026-11-14T08:25:00.000Z')
    expect(withheldEval.status).toBe('insufficient_evidence')
    expect(withheldEval.matchedEvidence).toHaveLength(0)
  })

  it('excludes future-dated evidence and flags stale historical evidence accurately', () => {
    let state = createAppState()
    const plan = buildUserPreventionPlan({
      id: 'plan-sleep-check',
      astronautId: 'crew-01',
      origin: 'observed',
      category: 'sleep_recovery',
      targetKind: 'sleep_observation',
      title: 'Sleep Duration Check',
      description: 'Daily sleep log check.',
      plannedStartAt: '2026-11-14T08:00:00.000Z',
      plannedEndAt: '2026-11-14T09:00:00.000Z',
      recurrence: 'once',
      now: '2026-11-14T08:00:00.000Z',
    })
    state = appReducer(state, { type: 'prevention/plan-upsert', plan })

    // Add a future-dated sleep observation at 08:30Z while evaluating at 08:10Z
    state = appReducer(state, {
      type: 'measurements/upsert',
      records: [
        {
          id: 'sleep-future',
          astronautId: 'crew-01',
          metric: 'sleep_duration',
          value: 7.5,
          unit: 'h',
          timestamp: '2026-11-14T08:30:00.000Z',
          source: 'manual',
          origin: 'observed',
          quality: 'valid',
        },
      ],
    })
    const at0810 = selectPreventionItemStatus(state, plan, 'observed', '2026-11-14T08:10:00.000Z')
    expect(at0810.status).toBe('due')
    expect(at0810.warnings.join(' ')).toContain('Future-dated')

    // At 08:35Z, the 08:30Z observation is no longer in the future -> completed
    const at0835 = selectPreventionItemStatus(state, plan, 'observed', '2026-11-14T08:35:00.000Z')
    expect(at0835.status).toBe('completed')

    // Stale evidence only (48 hours earlier) when window has elapsed -> insufficient_evidence
    let staleState = appReducer(createAppState(), { type: 'prevention/plan-upsert', plan })
    staleState = appReducer(staleState, {
      type: 'measurements/upsert',
      records: [
        {
          id: 'sleep-stale-48h',
          astronautId: 'crew-01',
          metric: 'sleep_duration',
          value: 7.0,
          unit: 'h',
          timestamp: '2026-11-12T06:00:00.000Z',
          source: 'manual',
          origin: 'observed',
          quality: 'valid',
        },
      ],
    })
    const staleEval = selectPreventionItemStatus(staleState, plan, 'observed', '2026-11-14T10:00:00.000Z')
    expect(staleEval.status).toBe('insufficient_evidence')
  })

  it('links valid CV physical assessments and rejects insufficient/invalid visual geometry as completed exercise', () => {
    let state = createAppState()
    const plan = buildUserPreventionPlan({
      id: 'plan-cv-exercise',
      astronautId: 'crew-01',
      origin: 'observed',
      category: 'exercise',
      targetKind: 'physical_assessment',
      title: 'Elbow Flexion Camera Check',
      description: 'Camera pose check.',
      plannedStartAt: '2026-11-14T10:00:00.000Z',
      plannedEndAt: '2026-11-14T10:30:00.000Z',
      recurrence: 'once',
      now: '2026-11-14T10:00:00.000Z',
    })
    state = appReducer(state, { type: 'prevention/plan-upsert', plan })

    // 1. Insufficient camera geometry (no pose detected -> sufficient: false, quality: 'missing')
    const invalidMetrics = new PhysicalMetrics()
    for (let at = 0; at <= 1000; at += 100) invalidMetrics.feed(at, { angle: null, visibility: 0, issue: 'no_pose' })
    const invalidRecord = cameraRecord('physical', 'crew-01', association, invalidMetrics.result(1000), '2026-11-14T10:05:00.000Z')
    const withInvalidCv = appReducer(state, { type: 'assessment/add', record: invalidRecord })
    const invalidEval = selectPreventionItemStatus(withInvalidCv, plan, 'observed', '2026-11-14T10:10:00.000Z')
    expect(invalidEval.status).toBe('insufficient_evidence')
    expect(invalidEval.matchedEvidence).toHaveLength(0)

    // 2. Sufficient camera geometry with valid elbow flexion cycle -> completed with camera_pose provenance
    const validMetrics = new PhysicalMetrics()
    for (let at = 0; at <= 1500; at += 50) validMetrics.feed(at, { angle: 165, visibility: 0.99, issue: null })
    for (let at = 1550; at <= 2500; at += 50) validMetrics.feed(at, { angle: 50, visibility: 0.99, issue: null })
    for (let at = 2550; at <= 4000; at += 50) validMetrics.feed(at, { angle: 168, visibility: 0.99, issue: null })
    const validRecord = cameraRecord('physical', 'crew-01', association, validMetrics.result(4000), '2026-11-14T10:12:00.000Z')
    const withValidCv = appReducer(state, { type: 'assessment/add', record: validRecord })
    const validEval = selectPreventionItemStatus(withValidCv, plan, 'observed', '2026-11-14T10:15:00.000Z')
    expect(validEval.status).toBe('completed')
    expect(validEval.matchedEvidence.some(e => e.source === 'camera_pose')).toBe(true)
  })

  it('handles deterministic mission-clock rollover and timezone offset timestamps identically', () => {
    const plan = buildUserPreventionPlan({
      id: 'plan-daily-rollover',
      astronautId: 'crew-01',
      origin: 'observed',
      category: 'self_assessment',
      targetKind: 'reaction_assessment',
      title: 'Daily Morning Reaction Check',
      description: 'Recurring daily window.',
      plannedStartAt: '2026-11-14T08:00:00.000Z',
      plannedEndAt: '2026-11-14T09:00:00.000Z',
      recurrence: 'daily',
      now: '2026-11-14T08:00:00.000Z',
    })

    // Day 0 window in UTC vs +05:00 timezone offset
    const winUtc = computeActiveScheduleWindow(plan, '2026-11-14T08:30:00.000Z')
    const winOffset = computeActiveScheduleWindow(plan, '2026-11-14T13:30:00+05:00')
    expect(winUtc).toEqual(winOffset)
    expect(winUtc.cycleIndex).toBe(0)

    // Rollover to Day 1 (24 hours later)
    const winDay1 = computeActiveScheduleWindow(plan, '2026-11-15T08:15:00.000Z')
    expect(winDay1.cycleIndex).toBe(1)
    expect(winDay1.startAt).toBe('2026-11-15T08:00:00.000Z')
    expect(winDay1.endAt).toBe('2026-11-15T09:00:00.000Z')
  })

  it('tracks hydration amounts, converts L to mL transparently, and never counts missing entries as zero', () => {
    let state = createAppState()
    const entryMl = buildHydrationRecord({
      id: 'hyd-1',
      astronautId: 'crew-01',
      timestamp: '2026-11-14T08:10:00.000Z',
      amount: 300,
      unit: 'mL',
      origin: 'observed',
      source: 'manual',
    })
    const entryLiters = buildHydrationRecord({
      id: 'hyd-2',
      astronautId: 'crew-01',
      timestamp: '2026-11-14T09:10:00.000Z',
      amount: 0.5,
      unit: 'L',
      origin: 'observed',
      source: 'manual',
    })
    const entryMissing = buildHydrationRecord({
      id: 'hyd-3',
      astronautId: 'crew-01',
      timestamp: '2026-11-14T09:30:00.000Z',
      amount: null,
      unit: 'mL',
      origin: 'observed',
      source: 'manual',
      missing: true,
    })

    state = appReducer(state, { type: 'hydration/add', record: entryMl })
    state = appReducer(state, { type: 'hydration/add', record: entryLiters })
    state = appReducer(state, { type: 'hydration/add', record: entryMissing })

    const summary = selectHydrationSummary(state, 'crew-01', 'observed', '2026-11-14T10:00:00.000Z', 24)
    expect(summary.totalMl).toBe(800)
    expect(summary.usableEntriesCount).toBe(2)
    expect(summary.missingEntriesCount).toBe(1)
    expect(summary.convertedFromLitersCount).toBe(1)
    expect(summary.warnings.join(' ')).toContain('not counted as zero')
    expect(summary.warnings.join(' ')).toContain('1 L = 1000 mL')
  })

  it('enforces crew/scope data boundaries and preserves personal history across synthetic scenario resets and v2/v3/v4 migrations', () => {
    let state = createAppState()
    const personalPlan = buildUserPreventionPlan({
      id: 'personal-plan-own',
      astronautId: 'crew-01',
      origin: 'observed',
      category: 'hydration',
      targetKind: 'hydration_log',
      title: 'My Observed Hydration Plan',
      description: 'Personal plan.',
      plannedStartAt: '2026-11-14T08:00:00.000Z',
      plannedEndAt: '2026-11-14T10:00:00.000Z',
      recurrence: 'daily',
      now: '2026-11-14T08:00:00.000Z',
      hydrationGoalMl: 750,
    })
    state = appReducer(state, { type: 'prevention/plan-upsert', plan: personalPlan })

    // Rejects cross-subject plan or hydration creation in ordinary Astronaut Mode
    const foreignPlan = { ...personalPlan, id: 'foreign-plan', astronautId: 'crew-02' }
    const rejected = appReducer(state, { type: 'prevention/plan-upsert', plan: foreignPlan })
    expect(rejected.personal.preventionPlans).toHaveLength(1)
    expect(rejected.notice).toContain('Not saved')

    // Selector restricts access to crew-02 in ordinary Astronaut Mode
    const restrictedSchedule = selectPreventionSchedule(state, 'crew-02', 'observed', '2026-11-14T08:30:00.000Z')
    expect(restrictedSchedule.accessRestricted).toBe(true)
    expect(restrictedSchedule.items).toHaveLength(0)

    // Switch to Mission Overview, load sleep-disruption scenario, advance 3 virtual minutes
    state = appReducer(state, { type: 'mode/set', mode: 'mission' })
    state = appReducer(state, { type: 'mission/scenario', scenario: 'sleep-disruption', seed: 42 })
    state = appReducer(state, { type: 'mission/advance', seconds: 180 })

    // Personal observed plan remains intact
    expect(state.personal.preventionPlans).toEqual([personalPlan])

    // Synthetic sleep/recovery context links to existing CDSS case without altering it
    const sleepCtx = selectSleepRecoveryContext(state, 'crew-01', 'synthetic', state.mission.missionTime)
    expect(sleepCtx.latestSleepHours).toBe(5.2)
    expect(sleepCtx.baselineComparison.status).toBe('ready')
    expect(sleepCtx.linkedEncounters).toHaveLength(1)
    expect(sleepCtx.linkedEncounters[0]?.status).toBe('open')

    // Completing a synthetic prevention item never modifies the CDSS case
    const manualSyn = buildManualExerciseCompletion({
      astronautId: 'crew-01',
      origin: 'synthetic',
      completedAt: state.mission.missionTime,
      durationMinutes: 20,
    })
    state = appReducer(state, {
      type: 'prevention/complete',
      planId: 'plan-synthetic-crew-01-exercise',
      completion: manualSyn.completion,
      activity: manualSyn.activity,
    })
    expect(state.mission.encounters[0]?.status).toBe('open')

    // Persist and restore; verify personal and synthetic data round-trip cleanly
    persistState(localStorage, state)
    const restored = restoreState(localStorage)
    expect(restored.error).toBeNull()
    expect(restored.state?.personal.preventionPlans).toEqual([personalPlan])
    expect(selectWorkspace(restored.state!).preventionPlans).toEqual([personalPlan])

    // Verify v2 and v3 legacy payloads without preventionPlans/hydrationRecords migrate additively
    const v3Raw = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    delete v3Raw.state.personal.preventionPlans
    delete v3Raw.state.personal.hydrationRecords
    delete v3Raw.state.mission.preventionPlans
    delete v3Raw.state.mission.hydrationRecords
    localStorage.removeItem(STORAGE_KEY)
    localStorage.setItem(PREVIOUS_STORAGE_KEY, JSON.stringify({ version: 3, state: v3Raw.state }))
    const migratedV3 = restoreState(localStorage)
    expect(migratedV3.error).toBeNull()
    expect(migratedV3.state?.personal.preventionPlans).toEqual([])
    expect(migratedV3.state?.personal.hydrationRecords).toEqual([])

    localStorage.removeItem(PREVIOUS_STORAGE_KEY)
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ version: 2, state: v3Raw.state }))
    const migratedV2 = restoreState(localStorage)
    expect(migratedV2.error).toBeNull()
    expect(migratedV2.state?.personal.preventionPlans).toEqual([])
  })
})
