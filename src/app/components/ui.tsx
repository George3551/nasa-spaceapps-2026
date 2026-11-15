import type { ReactNode } from 'react'
import type { DataOrigin, HealthAlert, ObservationQuality } from '../../../contracts/types'
import { formatShortTimestamp, formatTimestamp, originLabel, qualityLabel } from '../format'
import { Icon } from './Icon'

export type Tone = 'neutral' | 'info' | 'success' | 'attention' | 'critical' | 'synthetic' | 'observed'

/** Every page starts with the same header: where you are (title = nav label), whose data, and page-level actions. */
export function PageHeader({ title, description, context, actions }: { title: string; description?: ReactNode; context?: ReactNode; actions?: ReactNode }) {
  return <div className="page-header">
    <div className="page-header-text"><h1>{title}</h1>{description && <p className="page-description">{description}</p>}{context && <div className="page-context">{context}</div>}</div>
    {actions && <div className="page-actions">{actions}</div>}
  </div>
}

export function Badge({ tone = 'neutral', children, icon }: { tone?: Tone; children: ReactNode; icon?: 'check' | 'warning' | 'info' | 'lock' | 'clock' | undefined }) {
  return <span className={`badge tone-${tone}`}>{icon && <Icon name={icon} size={12} />}{children}</span>
}

/** Provenance is shown as text plus a distinct shape so it never relies on colour alone. */
export function OriginBadge({ origin }: { origin: DataOrigin }) {
  return <span className={`badge origin-${origin}`}><span className="origin-mark" aria-hidden="true" />{originLabel(origin)}</span>
}

const qualityTone: Record<ObservationQuality, Tone> = { valid: 'neutral', estimated: 'info', missing: 'attention', invalid: 'critical' }
export function QualityBadge({ quality }: { quality: ObservationQuality }) {
  return <Badge tone={qualityTone[quality]}>{qualityLabel(quality)}</Badge>
}

export function DemoBadge({ children = 'Demonstration only' }: { children?: ReactNode }) {
  return <Badge tone="attention" icon="warning">{children}</Badge>
}

const levelTone: Record<HealthAlert['level'], Tone> = { information: 'info', attention: 'attention', review: 'critical' }
const levelText: Record<HealthAlert['level'], string> = { information: 'Information', attention: 'Attention', review: 'Review needed' }
export function AlertLevelBadge({ level }: { level: HealthAlert['level'] }) {
  return <Badge tone={levelTone[level]} icon={level === 'information' ? 'info' : 'warning'}>{levelText[level]}</Badge>
}

/** Secondary explanatory text: method notes, limitations, privacy. Visually subordinate to data. */
export function Callout({ tone = 'neutral', title, children }: { tone?: Tone; title?: string; children: ReactNode }) {
  return <div className={`callout tone-${tone}`}><Icon name={tone === 'attention' || tone === 'critical' ? 'warning' : 'info'} size={16} /><div>{title && <p className="callout-title">{title}</p>}<div className="callout-body">{children}</div></div></div>
}

/** Progressive disclosure for method details that experts need but first-time users do not. */
export function Disclosure({ summary, children, className = '' }: { summary: ReactNode; children: ReactNode; className?: string }) {
  return <details className={`disclosure ${className}`}><summary>{summary}</summary><div className="disclosure-body">{children}</div></details>
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="empty-state"><p className="empty-title">{title}</p>{children && <p>{children}</p>}{action}</div>
}

export function Time({ value, short = false }: { value: string | undefined; short?: boolean }) {
  if (!value) return <span>—</span>
  return <time dateTime={value} title={formatTimestamp(value)}>{short ? formatShortTimestamp(value) : formatTimestamp(value)}</time>
}

export function KeyValue({ items }: { items: [ReactNode, ReactNode][] }) {
  return <dl className="key-value">{items.map(([k, v], i) => <div key={i}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
}

/** Compact one-line provenance string used in lists: origin · source · quality. */
export function Provenance({ children }: { children: ReactNode }) {
  return <p className="provenance">{children}</p>
}
