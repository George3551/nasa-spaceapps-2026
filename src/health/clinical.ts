import type { ClinicalAction, MedicalEncounter } from '../../contracts/types'

export function transitionEncounter(encounter: MedicalEncounter, transition: 'review' | 'resolve', at: string): MedicalEncounter {
  if (transition === 'review') {
    if (encounter.status !== 'open') throw new Error('Only an open case can enter review.')
    return { ...encounter, status: 'under_review' }
  }
  if (encounter.status !== 'under_review') throw new Error('Review the case before resolving it.')
  if (!encounter.actions.some(a => a.kind === 'follow_up' && a.completed)) throw new Error('Record a completed follow-up before resolving the case.')
  return { ...encounter, status: 'resolved', resolvedAt: at }
}

export function addFollowUp(encounter: MedicalEncounter, action: ClinicalAction): MedicalEncounter {
  if (encounter.status === 'resolved') throw new Error('Resolved cases are read-only.')
  if (action.astronautId !== encounter.astronautId || action.origin !== encounter.origin) throw new Error('Follow-up subject and origin must match the case.')
  if (!action.note.trim()) throw new Error('Describe the follow-up.')
  return { ...encounter, actions: [...encounter.actions, action] }
}
