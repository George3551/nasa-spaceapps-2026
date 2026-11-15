/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Shared panel primitives.
 * Implementation: team-directed, AI-assisted (OpenAI Codex; Anthropic Claude Code).
 * Team concept and requirements; exact line-level authorship remains unverified.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import type { ReactNode } from 'react'

/** Standard content container: optional eyebrow (context/provenance), title, description and header actions. */
export function Panel({ title, eyebrow, description, actions, children, className = '', id }: { title: string; eyebrow?: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return <section className={`panel ${className}`} id={id}>
    <header className="panel-heading"><div className="panel-heading-text">{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2>{description && <p className="panel-description">{description}</p>}</div>{actions && <div className="panel-actions">{actions}</div>}</header>
    <div className="panel-body">{children}</div>
  </section>
}

export function ModulePlaceholder({ name, owner, children }: { name: string; owner: string; children: ReactNode }) {
  return <Panel title={name} eyebrow="Module awaiting integration">
    <div className="empty-state"><h3>{name} is not connected</h3><p>{children}</p><p className="mono muted">{owner}</p>
      <span className="badge neutral">Not implemented</span>
    </div>
  </Panel>
}
