import type { ActivityRecord, AssessmentResult, DemoAssociation, PhysicalAssessmentMetrics, VisualAssessmentMetrics } from '../../contracts/types'

export type CameraAssessment = Extract<AssessmentResult, { kind: 'visual' | 'physical' }>
export function cameraRecord(kind: 'visual', subject: string, association: DemoAssociation, result: VisualAssessmentMetrics, timestamp?: string): CameraAssessment
export function cameraRecord(kind: 'physical', subject: string, association: DemoAssociation, result: PhysicalAssessmentMetrics, timestamp?: string): CameraAssessment
export function cameraRecord(kind: 'visual' | 'physical', subject: string, association: DemoAssociation, result: VisualAssessmentMetrics | PhysicalAssessmentMetrics, timestamp = new Date().toISOString()): CameraAssessment {
  const base = { id: crypto.randomUUID(), astronautId: subject, timestamp, origin: 'observed' as const, quality: result.sufficient ? 'estimated' as const : 'missing' as const, unit: 'assessment', sourceRefIds: ['aegis-cv-protocol-v1', kind === 'visual' ? 'mediapipe-face' : 'mediapipe-pose'], demonstrationOnly: true, experimental: true as const, association }
  return kind === 'visual' ? { ...base, source: 'camera_face', kind, result: result as VisualAssessmentMetrics } : { ...base, source: 'camera_pose', kind, result: result as PhysicalAssessmentMetrics }
}
export function physicalActivity(record: Extract<CameraAssessment, { kind: 'physical' }>): ActivityRecord {
  return { id: `activity-${record.id}`, astronautId: record.astronautId, kind: 'exercise', startedAt: new Date(Date.parse(record.timestamp) - record.result.durationMs).toISOString(), endedAt: record.timestamp, source: 'camera_pose', origin: 'observed', quality: record.quality, details: { exercise: record.result.exercise, repetitions: record.result.repetitions, durationMs: record.result.durationMs, validObservationMs: record.result.validObservationMs, experimental: true, assessmentId: record.id, demoAssociation: true } }
}
