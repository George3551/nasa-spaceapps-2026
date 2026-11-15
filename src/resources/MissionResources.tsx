import { useState } from 'react'
import type {
  OperatorQualification,
  ResourceAvailability,
  ResourceCategory,
  ResourceOccupancy,
  ResourceOperability,
} from '../../contracts/types'
import { Panel } from '../app/components/Panel'
import { useAppState } from '../app/state/context'
import { resourceCategoryLabels } from './inventory'
import { queryEquipmentCapability, selectAvailableMedicalEquipment } from './selectors'
import './resources.css'

export function MissionResources() {
  const { state, dispatch } = useAppState()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ResourceCategory | 'all'>('all')
  const [availabilityFilter, setAvailabilityFilter] = useState<ResourceAvailability | 'all'>('all')
  const [operabilityFilter, setOperabilityFilter] = useState<ResourceOperability | 'all'>('all')
  const [onlyUsable, setOnlyUsable] = useState(false)

  // Typed selector query inspector state
  const [queryCap, setQueryCap] = useState<string>('ecg')
  const [customCap, setCustomCap] = useState('')
  const [actorQual, setActorQual] = useState<OperatorQualification | 'unspecified'>('unspecified')

  // Status update form state (synthetic demo workspace)
  const [selectedId, setSelectedId] = useState('ecg-patch-02')
  const [nextAvailability, setNextAvailability] = useState<ResourceAvailability>('available')
  const [nextOperability, setNextOperability] = useState<ResourceOperability>('functional')
  const [nextOccupancy, setNextOccupancy] = useState<ResourceOccupancy>('free')
  const [nextQuantity, setNextQuantity] = useState('1')
  const [nextUnknownQty, setNextUnknownQty] = useState(false)
  const [statusReason, setStatusReason] = useState('')
  const [formError, setFormError] = useState('')

  const inventory = selectAvailableMedicalEquipment(state, state.scope, {
    category,
    availability: availabilityFilter,
    operability: operabilityFilter,
    search,
    onlyAvailableAndFunctional: onlyUsable,
  })
  const fullInventory = selectAvailableMedicalEquipment(state, state.scope)
  const activeQueryTarget = queryCap === 'custom' ? (customCap.trim() || 'unknown-device') : queryCap
  const capabilityAnswer = queryEquipmentCapability(
    state,
    activeQueryTarget,
    state.scope,
    actorQual === 'unspecified' ? undefined : actorQual,
  )

  function selectItemForEdit(id: string) {
    const found = fullInventory.items.find(item => item.id === id)
    if (!found) return
    setSelectedId(found.id)
    setNextAvailability(found.availability)
    setNextOperability(found.operability)
    setNextOccupancy(found.occupancy)
    setNextUnknownQty(found.quantity === null)
    setNextQuantity(found.quantity === null ? '' : String(found.quantity))
    setStatusReason('')
    setFormError('')
  }

  return (
    <>
      <div className="page-intro">
        <div>
          <p className="eyebrow">Synthetic onboard resource inventory · Read-only CDSS & assistant context</p>
          <h1>Mission Medical Resources</h1>
          <p className="muted">
            {state.scope} workspace · SYNTHETIC / DEMO fixtures only. Does not assert actual equipment presence on any NASA vehicle, and never issues clinical treatment or dosing instructions.
          </p>
        </div>
        <span className="badge">SYNTHETIC / DEMO INVENTORY</span>
      </div>

      <div className="resources-summary-grid" role="region" aria-label="Synthetic inventory summary">
        <div className="summary">
          <p className="eyebrow">Total fixtures</p>
          <strong>{inventory.counts.total}</strong>
          <p>Fictional onboard entries</p>
        </div>
        <div className="summary">
          <p className="eyebrow">Available & functional</p>
          <strong>{inventory.counts.availableAndFunctional}</strong>
          <p>Ready in synthetic context</p>
        </div>
        <div className="summary">
          <p className="eyebrow">Unavailable</p>
          <strong>{inventory.counts.unavailable}</strong>
          <p>Occupied or reserved</p>
        </div>
        <div className="summary">
          <p className="eyebrow">Out of service</p>
          <strong>{inventory.counts.outOfService}</strong>
          <p>Operability fault flagged</p>
        </div>
        <div className="summary">
          <p className="eyebrow">Unknown / unverified</p>
          <strong>{inventory.counts.unknown}</strong>
          <p>Never assumed available</p>
        </div>
      </div>

      {state.scope === 'observed' && (
        <Panel title="Observed local workspace notice" eyebrow="Workspace boundary · no physical spacecraft inventory">
          <p className="empty-copy">{inventory.scopeNotice}</p>
          <div className="control-row">
            <button
              className="button primary"
              onClick={() => dispatch({ type: 'scope/set', scope: 'synthetic' })}
            >
              Use synthetic workspace for resource demonstration
            </button>
          </div>
        </Panel>
      )}

      <div className="content-grid">
        <div className="stack">
          <Panel title="Search & filter onboard equipment" eyebrow="Distinct availability, operability, and operator qualification">
            <div className="resource-filter-bar">
              <label className="field">
                Search medical equipment
                <input
                  type="search"
                  placeholder="Search by name, ID, compartment, reason…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </label>
              <label className="field">
                Filter by equipment category
                <select value={category} onChange={e => setCategory(e.target.value as ResourceCategory | 'all')}>
                  <option value="all">All categories</option>
                  {Object.entries(resourceCategoryLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Filter by availability
                <select value={availabilityFilter} onChange={e => setAvailabilityFilter(e.target.value as ResourceAvailability | 'all')}>
                  <option value="all">All availability states</option>
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>
              <label className="field">
                Filter by operability
                <select value={operabilityFilter} onChange={e => setOperabilityFilter(e.target.value as ResourceOperability | 'all')}>
                  <option value="all">All operability states</option>
                  <option value="functional">Functional</option>
                  <option value="out_of_service">Out of service</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>
            </div>
            <label className="check-label">
              <input
                type="checkbox"
                checked={onlyUsable}
                onChange={e => setOnlyUsable(e.target.checked)}
              />
              Show only equipment that is both available and functional
            </label>

            {!inventory.items.length && (
              <p className="empty-copy">No synthetic equipment matches the active filters. Missing matches do not imply alternative equipment is available.</p>
            )}

            <div>
              {inventory.items.map(item => (
                <article className="resource-card" key={item.id} data-testid={`resource-item-${item.id}`}>
                  <div className="resource-badge-row">
                    <span className="badge">SYNTHETIC / DEMO</span>
                    <span className="badge neutral">{item.categoryLabel}</span>
                    <span className={`badge status-${item.availability}`}>
                      Availability: {item.availability.replaceAll('_', ' ')}
                    </span>
                    <span className={`badge status-${item.operability}`}>
                      Operability: {item.operability.replaceAll('_', ' ')}
                    </span>
                    <span className={`badge status-${item.occupancy}`}>
                      Occupancy: {item.occupancy.replaceAll('_', ' ')}
                    </span>
                  </div>
                  <h3>{item.label} <span className="mono">({item.id})</span></h3>
                  <p>{item.statusReason}</p>
                  <dl className="resource-meta-grid">
                    <div>
                      <dt>Usable for examination</dt>
                      <dd>{item.usableForExamination ? 'Yes (available & functional)' : 'No'} — {item.usabilityReason}</dd>
                    </div>
                    <div>
                      <dt>Quantity & location</dt>
                      <dd>
                        {item.quantity === null ? 'Unknown / unmodeled quantity' : `${item.quantity} ${item.unit}`} · Compartment: {item.compartmentId ?? 'Unassigned'}
                      </dd>
                    </div>
                    <div>
                      <dt>Declared operator qualification</dt>
                      <dd>{item.qualificationLabel}</dd>
                    </div>
                    <div>
                      <dt>Last verification & provenance</dt>
                      <dd>
                        {item.lastVerifiedAt ?? 'Not verified'} ({item.verificationFreshness}) · {item.resource.origin} / {item.resource.source} / {item.resource.quality}
                      </dd>
                    </div>
                  </dl>
                  <p className="muted"><strong>Constraints:</strong> {item.constraints}</p>
                  {item.supervisionWarning && (
                    <p className="supervision-note">{item.supervisionWarning}</p>
                  )}
                  <div className="control-row">
                    {state.scope === 'synthetic' && (
                      <button
                        type="button"
                        className="button"
                        onClick={() => selectItemForEdit(item.id)}
                      >
                        Load {item.id} into status editor
                      </button>
                    )}
                    {item.resource.history && item.resource.history.length > 0 && (
                      <details>
                        <summary className="mono">Status history ({item.resource.history.length})</summary>
                        <ul>
                          {item.resource.history.slice().reverse().map(h => (
                            <li key={h.id}>
                              <span className="mono">{h.at}</span>: availability={h.availability}, operability={h.operability}, occupancy={h.occupancy}, qty={h.quantity ?? 'unknown'} — {h.reason}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </Panel>
        </div>

        <div className="stack">
          <Panel title="Typed selector query inspector" eyebrow="Read-only API preview for Medical Assistant & CDSS">
            <p className="muted">
              Demonstrates typed read-only calls to <span className="mono">queryEquipmentCapability(state, capability, scope, qualification)</span>. Unavailable, out-of-service, or unverified equipment never fabricates availability.
            </p>
            <div className="entry-form">
              <label className="field">
                Capability or device query
                <select value={queryCap} onChange={e => setQueryCap(e.target.value)}>
                  <option value="ecg">Is ECG equipment available? (cardiac_monitoring)</option>
                  <option value="ultrasound">Which ultrasound device is functional? (imaging)</option>
                  <option value="laboratory">Is point-of-care laboratory analyzer available? (unknown fixture)</option>
                  <option value="ultrasound-probe-02">Backup handheld ultrasound probe (out_of_service fixture)</option>
                  <option value="ecg-patch-02">Secondary wearable ECG patch (unavailable / in_use fixture)</option>
                  <option value="vital_signs">Vital signs monitors (BP cuff, SpO₂, thermometer)</option>
                  <option value="first_aid">Basic first-aid station</option>
                  <option value="custom">Custom capability / device ID query…</option>
                </select>
              </label>
              {queryCap === 'custom' && (
                <label className="field">
                  Custom capability or equipment ID
                  <input
                    value={customCap}
                    onChange={e => setCustomCap(e.target.value)}
                    placeholder="e.g., defibrillator or MRI (unlisted returns unknown)"
                  />
                </label>
              )}
              <label className="field">
                Declared operator qualification filter (optional fixture)
                <select value={actorQual} onChange={e => setActorQual(e.target.value as OperatorQualification | 'unspecified')}>
                  <option value="unspecified">No operator filter (check hardware status)</option>
                  <option value="any_crew">Any crew member (basic orientation)</option>
                  <option value="trained_operator">Trained operator</option>
                  <option value="crew_medical_officer">Crew Medical Officer</option>
                </select>
              </label>
            </div>
            <div className="query-inspector-box" role="region" aria-label="Typed selector result">
              <div className="resource-badge-row">
                <span className="badge">Selector status: {capabilityAnswer.status.replaceAll('_', ' ')}</span>
                <span className="badge neutral">Scope: {capabilityAnswer.scope}</span>
                <span className="badge neutral">Usable matches: {capabilityAnswer.usableDevices.length} / {capabilityAnswer.matchingDevices.length}</span>
              </div>
              <p><strong>Summary:</strong> {capabilityAnswer.summary}</p>
              <p className="muted"><strong>Supervision & qualification boundary:</strong> {capabilityAnswer.supervisionNotice}</p>
            </div>
          </Panel>

          <Panel title="Update synthetic resource status" eyebrow="Authorized demo action · persists in synthetic workspace">
            {state.scope !== 'synthetic' ? (
              <p className="empty-copy">
                Switch to the <strong>Synthetic mission preview</strong> workspace to modify demonstration equipment availability or operability.
              </p>
            ) : (
              <form
                className="entry-form"
                onSubmit={e => {
                  e.preventDefault()
                  setFormError('')
                  try {
                    if (!statusReason.trim()) throw new Error('Provide a status reason for the audit log.')
                    const parsedQty = nextUnknownQty ? null : Number(nextQuantity)
                    if (!nextUnknownQty && (!Number.isInteger(parsedQty) || parsedQty! < 0)) {
                      throw new Error('Quantity must be a non-negative integer, or mark quantity unknown.')
                    }
                    dispatch({
                      type: 'resources/update-status',
                      id: selectedId,
                      availability: nextAvailability,
                      operability: nextOperability,
                      occupancy: nextOccupancy,
                      quantity: parsedQty,
                      statusReason: statusReason.trim(),
                      updatedAt: state.mission.missionTime,
                      actorRole: state.mode,
                    })
                    setStatusReason('')
                  } catch (err) {
                    setFormError(err instanceof Error ? err.message : 'Could not update resource status')
                  }
                }}
              >
                <label className="field">
                  Target synthetic equipment
                  <select value={selectedId} onChange={e => selectItemForEdit(e.target.value)}>
                    {fullInventory.items.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.label} ({item.id})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Availability (separate from operability)
                  <select value={nextAvailability} onChange={e => setNextAvailability(e.target.value as ResourceAvailability)}>
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                    <option value="unknown">Unknown / unverified</option>
                  </select>
                </label>
                <label className="field">
                  Operability (separate from availability)
                  <select value={nextOperability} onChange={e => setNextOperability(e.target.value as ResourceOperability)}>
                    <option value="functional">Functional</option>
                    <option value="out_of_service">Out of service</option>
                    <option value="unknown">Unknown / unverified</option>
                  </select>
                </label>
                <label className="field">
                  Occupancy state
                  <select value={nextOccupancy} onChange={e => setNextOccupancy(e.target.value as ResourceOccupancy)}>
                    <option value="free">Free</option>
                    <option value="in_use">In use</option>
                    <option value="reserved">Reserved</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={nextUnknownQty}
                    onChange={e => setNextUnknownQty(e.target.checked)}
                  />
                  Quantity unknown / unmodeled (store null, never infer from missing metadata)
                </label>
                {!nextUnknownQty && (
                  <label className="field">
                    Available unit quantity
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={nextQuantity}
                      onChange={e => setNextQuantity(e.target.value)}
                      required
                    />
                  </label>
                )}
                <label className="field">
                  Status reason / verification note
                  <textarea
                    value={statusReason}
                    onChange={e => setStatusReason(e.target.value)}
                    placeholder="Describe why availability or operability changed in this synthetic scenario…"
                    maxLength={1000}
                    required
                  />
                </label>
                <button className="button primary" type="submit">
                  Save synthetic status change
                </button>
                {formError && <p role="alert">{formError}</p>}
              </form>
            )}
            <p className="sample-note">
              Status changes apply only to the synthetic onboard inventory and persist in local browser storage. They never alter clinical guidance, prescribe medications, or synthesize emergency procedures.
            </p>
          </Panel>
        </div>
      </div>
    </>
  )
}
