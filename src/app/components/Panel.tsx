import type { ReactNode } from 'react'

export function Panel({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return <section className="panel">
    <header className="panel-heading">{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></header>
    {children}
  </section>
}

export function ModulePlaceholder({ name, owner, children }: { name: string; owner: string; children: ReactNode }) {
  return <Panel title={name} eyebrow="Module awaiting integration">
    <div className="empty-state"><span className="empty-marker" aria-hidden="true">+</span>
      <h3>{name} is not connected</h3><p>{children}</p><p className="mono muted">{owner}</p>
      <span className="badge neutral">Not implemented</span>
    </div>
  </Panel>
}
