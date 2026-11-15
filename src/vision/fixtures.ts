/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Authored synthetic landmark test fixtures.
 * Implementation: team-directed, AI-assisted (OpenAI Codex).
 * Google MediaPipe supplies pretrained landmarks; AEGIS measurements are experimental, not clinically validated.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import type { Point } from './signals'
// Deterministic, authored landmark fixtures; not recordings of a person or medical data.
export function faceFixture(ear = .3): Point[] {
  const face = Array.from({ length: 478 }, () => ({ x: .5, y: .5, z: 0 }))
  for (const [ids, center] of [[[33, 160, 158, 133, 153, 144], .4], [[362, 385, 387, 263, 373, 380], .6]] as const) {
    const half = ear * .1 / 2
    const positions = [[center - .05, .4], [center - .025, .4 - half], [center + .025, .4 - half], [center + .05, .4], [center + .025, .4 + half], [center - .025, .4 + half]]
    ids.forEach((id, i) => { face[id] = { x: positions[i]![0]!, y: positions[i]![1]!, z: 0 } })
  }
  face[1] = { x: .5, y: .5, z: 0 }; face[10] = { x: .5, y: .2, z: 0 }; face[152] = { x: .5, y: .7, z: 0 }
  return face
}
export function poseFixture(angle = 170, visibility = .99): Point[] {
  const points = Array.from({ length: 33 }, () => ({ x: .5, y: .5, z: 0, visibility, presence: .99 }))
  points[12] = { ...points[12]!, x: .3 }
  const radians = (180 - angle) * Math.PI / 180
  points[16] = { ...points[16]!, x: .5 + .2 * Math.cos(radians), y: .5 + .2 * Math.sin(radians) }
  return points
}
