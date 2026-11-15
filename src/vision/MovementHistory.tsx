/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Projected elbow-angle history chart.
 * Implementation: team-directed, AI-assisted (OpenAI Codex; Anthropic Claude Code).
 * Google MediaPipe supplies pretrained landmarks; AEGIS measurements are experimental, not clinically validated.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import type { PhysicalAssessmentMetrics } from '../../contracts/types'
export function MovementHistory({ result }: { result: PhysicalAssessmentMetrics }) {
  const path = result.angleHistory.map((p, index) => {
    if (p.angleDeg === null) return ''
    const previous = result.angleHistory[index - 1]
    const command = previous?.angleDeg != null && p.atMs - previous.atMs <= 250 ? 'L' : 'M'
    return `${command}${(30 + p.atMs / Math.max(1, result.durationMs) * 460).toFixed(1)},${(165 - p.angleDeg / 180 * 145).toFixed(1)}`
  }).join(' ')
  return <svg viewBox="0 0 520 200" className="trend-svg" role="img" aria-label="Observed elbow angle history, 0 to 180 degrees; gaps are missing observations"><path className="chart-axis" d="M30 20 V165 H490" fill="none" /><path className="chart-line" d={path} fill="none" /><g className="chart-axis-label" fontSize="11"><text x="0" y="24">180°</text><text x="8" y="168">0°</text><text x="30" y="190">0 s</text><text x="445" y="190">{(result.durationMs / 1000).toFixed(1)} s</text></g></svg>
}
