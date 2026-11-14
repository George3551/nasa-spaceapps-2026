// Small recorded SDK-output fixture, 2026-11-14, @mediapipe/tasks-vision 0.10.32.
// Public MediaPipe portrait.jpg / pose.jpg, fitted into 640×640 canvas video.
// Only the coordinates needed by the algorithms are retained, no input pixels.
// https://storage.googleapis.com/mediapipe-assets/portrait.jpg
// https://storage.googleapis.com/mediapipe-assets/pose.jpg
// These model estimates are test inputs, not clinical validation data.
import type { Point } from './signals'
const faceCoordinates: Record<number, [number, number, number]> = {
  1: [.4969213605, .2256904691, -.0513206646],
  10: [.4958014786, .0997243524, -.0049618264],
  33: [.4396376014, .1734562516, .0135315685],
  133: [.4733323455, .1743177325, .0078435959],
  144: [.4496900439, .1749083698, .0061185015],
  152: [.4966619015, .340597719, .000431664],
  153: [.4615652561, .1747125834, .0040632105],
  158: [.4594206512, .1673613191, .0030579874],
  160: [.4478427172, .1684449017, .004688412],
  263: [.5529618263, .1719827056, .0177540947],
  362: [.5191922784, .173553139, .009718461],
  373: [.542779088, .1736142933, .0096421447],
  380: [.5306207538, .1735674888, .0066519929],
  385: [.5328933001, .1666754484, .0057202904],
  387: [.5444704294, .1673726439, .0083062537],
}
export function recordedFace(): Point[] {
  const result = Array.from({ length: 478 }, () => ({ x: 0, y: 0, z: 0 }))
  for (const [index, [x, y, z]] of Object.entries(faceCoordinates)) result[Number(index)] = { x, y, z }
  return result
}
export function recordedPose(): Point[] {
  const result: Point[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0 }))
  result[12] = { x: .4540378451, y: .4935387969, z: .0273793358, visibility: .9999911785 }
  result[14] = { x: .3705964088, y: .4810503721, z: .0501442477, visibility: .98233217 }
  result[16] = { x: .2969709635, y: .4763585329, z: -.055086039, visibility: .9816718698 }
  return result
}
