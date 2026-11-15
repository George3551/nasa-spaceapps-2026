/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Measurement and missing-data presentation.
 * Implementation: team-directed, AI-assisted (OpenAI Codex; Anthropic Claude Code).
 * Team concept and requirements; exact line-level authorship remains unverified.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import type { HealthMeasurement, SourceReference } from '../../../contracts/types'
import { metricLabel, sourceLabel } from '../format'
import { DemoBadge, OriginBadge, QualityBadge, Time } from './ui'

/** Latest reading tile. Missing/invalid values never display as a number and never imply "healthy". */
export function MeasurementCard({ measurement, source }: { measurement: HealthMeasurement; source?: SourceReference | undefined }) {
  const available = measurement.value !== null && Number.isFinite(measurement.value)
    && measurement.quality !== 'missing' && measurement.quality !== 'invalid'
  return <article className="metric-tile" aria-label={`${metricLabel(measurement.metric)} reading`}>
    <div className="metric-tile-head"><p className="metric-name">{metricLabel(measurement.metric)}</p><OriginBadge origin={measurement.origin} /></div>
    <p className="metric-value">{available ? measurement.value : 'No data'} {available && <span>{measurement.unit}</span>}</p>
    <p className="metric-caption">{available ? measurement.origin === 'synthetic' ? 'Synthetic scenario observation' : 'Recorded observation · interpretation requires review' : 'Insufficient evidence · no health assessment'}</p>
    <dl className="key-value compact">
      <div><dt>Recorded</dt><dd><Time value={measurement.timestamp} short /></dd></div>
      <div><dt>Acquired by</dt><dd>{sourceLabel(measurement.source)}</dd></div>
      <div><dt>Reference</dt><dd>{source?.title ?? measurement.sourceRefId ?? 'Source not supplied'}</dd></div>
      <div><dt>Quality</dt><dd><QualityBadge quality={measurement.quality} /></dd></div>
    </dl>
    {measurement.demonstrationOnly && <p className="metric-flag"><DemoBadge>Demonstration only · not a clinical threshold or NASA measurement</DemoBadge></p>}
  </article>
}

export function MissingMetricTile({ metric }: { metric: string }) {
  return <article className="metric-tile is-missing" aria-label={`${metricLabel(metric)} reading`}>
    <div className="metric-tile-head"><p className="metric-name">{metricLabel(metric)}</p></div>
    <p className="metric-value missing">No data</p>
    <p className="metric-caption">Not assessed · absence of data is not a normal result</p>
  </article>
}
