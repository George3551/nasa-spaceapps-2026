import type { HealthMeasurement, SourceReference } from '../../../contracts/types'
import { formatTimestamp } from '../format'

export function MeasurementCard({ measurement, source }: { measurement: HealthMeasurement; source?: SourceReference | undefined }) {
  const available = measurement.value !== null && Number.isFinite(measurement.value)
    && measurement.quality !== 'missing' && measurement.quality !== 'invalid'
  return <article className="measurement" aria-label="Integration measurement">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="eyebrow">{measurement.metric.replaceAll('_', ' ')}</p>
      <span className="badge">{measurement.origin === 'synthetic' ? 'Synthetic data' : measurement.origin.replaceAll('_', ' ')}</span>
    </div>
    <p className="measurement-value">{available ? measurement.value : 'No data'} {available && <span>{measurement.unit}</span>}</p>
    <p className="muted">{available ? measurement.origin === 'synthetic' ? 'Synthetic scenario observation' : 'Recorded observation · interpretation requires review' : 'Insufficient evidence · no health assessment'}</p>
    <dl className="metadata">
      <div><dt>Recorded</dt><dd><time dateTime={measurement.timestamp}>{formatTimestamp(measurement.timestamp)}</time></dd></div>
      <div><dt>Acquisition</dt><dd>{measurement.source}</dd></div>
      <div><dt>Quality</dt><dd>{measurement.quality}</dd></div>
      <div><dt>Source</dt><dd>{source?.title ?? measurement.sourceRefId ?? 'Source not supplied'}</dd></div>
    </dl>
    {measurement.demonstrationOnly && <p className="sample-note">Demonstration only · not a clinical threshold or NASA measurement.</p>}
  </article>
}
