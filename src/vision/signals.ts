/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Landmark geometry, EAR, suitability checks and projected elbow angles.
 * Implementation: team-directed, AI-assisted (OpenAI Codex).
 * Google MediaPipe supplies pretrained landmarks; AEGIS measurements are experimental, not clinically validated.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import type { TrackingIssue } from '../../contracts/types'
export type Point = Pick<NormalizedLandmark, 'x' | 'y' | 'z'> & { visibility?: number; presence?: number }
export interface FaceSignal { ear: number | null; issue: TrackingIssue | null }
export interface PoseSignal { angle: number | null; issue: TrackingIssue | null; visibility: number | null }
const distance = (a: Point, b: Point, width: number, height: number) => Math.hypot((a.x - b.x) * width, (a.y - b.y) * height)
function inside(p: Point | undefined): p is Point { return !!p && [p.x, p.y, p.z].every(Number.isFinite) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1 }
const eyeIndices = [[33, 160, 158, 133, 153, 144], [362, 385, 387, 263, 373, 380]] as const
export function faceSignal(faces: Point[][], width: number, height: number): FaceSignal {
  if (faces.length !== 1) return { ear: null, issue: faces.length ? 'multiple_faces' : 'no_face' }
  const face = faces[0]!
  const indices = [...eyeIndices.flat(), 1, 152, 10]
  if (width <= 0 || height <= 0 || indices.some(i => !inside(face[i]))) return { ear: null, issue: 'out_of_frame' }
  const left = face[33]!, right = face[263]!, nose = face[1]!
  const dx = (right.x - left.x) * width, dy = (right.y - left.y) * height
  const span = Math.hypot(dx, dy)
  const roll = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI)
  // Geometric suitability proxies, not a calibrated 3D head-angle estimate.
  const asymmetry = Math.abs(distance(left, nose, width, height) - distance(right, nose, width, height)) / Math.max(1, span)
  if (span < 35 || roll > 20 || asymmetry > .35) return { ear: null, issue: 'head_pose' }
  const ratios = eyeIndices.map(ids => {
    const p = ids.map(i => face[i]!)
    return (distance(p[1]!, p[5]!, width, height) + distance(p[2]!, p[4]!, width, height)) / (2 * distance(p[0]!, p[3]!, width, height))
  })
  const ear = (ratios[0]! + ratios[1]!) / 2
  return Number.isFinite(ear) && ear >= 0 && ear <= .8 ? { ear, issue: null } : { ear: null, issue: 'unstable' }
}

export function jointAngle(a: Point, b: Point, c: Point, width: number, height: number): number | null {
  const u = [(a.x - b.x) * width, (a.y - b.y) * height], v = [(c.x - b.x) * width, (c.y - b.y) * height]
  const norm = Math.hypot(...u) * Math.hypot(...v)
  return norm < 1 ? null : Math.acos(Math.max(-1, Math.min(1, (u[0]! * v[0]! + u[1]! * v[1]!) / norm))) * 180 / Math.PI
}
export function poseSignal(poses: Point[][], width: number, height: number): PoseSignal {
  if (poses.length !== 1) return { angle: null, visibility: null, issue: poses.length ? 'multiple_poses' : 'no_pose' }
  const points = [12, 14, 16].map(i => poses[0]![i])
  if (points.some(p => !inside(p))) return { angle: null, visibility: null, issue: 'out_of_frame' }
  const visibility = Math.min(...points.map(p => p!.visibility ?? NaN))
  if (!Number.isFinite(visibility) || visibility < .65 || points.some(p => p!.presence !== undefined && p!.presence < .65)) return { angle: null, visibility: Number.isFinite(visibility) ? visibility : null, issue: 'low_visibility' }
  const angle = jointAngle(points[0]!, points[1]!, points[2]!, width, height)
  return { angle, visibility, issue: angle === null ? 'unstable' : null }
}

export const POSE_CONNECTIONS = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]] as const
