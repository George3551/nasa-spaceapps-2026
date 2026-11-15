import type { AcquisitionContext } from '../../contracts/types'
export function acquisition(deviceId: string, protocolId: string, condition: string, sessionId = crypto.randomUUID()): AcquisitionContext {
  return { deviceId, protocolId, condition, sessionId }
}
export function Conditions({ value, onChange, disabled = false, label = 'Acquisition conditions' }: { value: string; onChange: (value: string) => void; disabled?: boolean; label?: string }) {
  return <label className="field">{label}<select value={value} disabled={disabled} onChange={e => onChange(e.target.value)}><option value="unspecified">Not recorded — no qualified baseline</option><option value="quiet-seated">Quiet, seated, usual setup (self-declared)</option><option value="after-exercise">After exercise (self-declared)</option><option value="other">Other / unknown setup — no qualified baseline</option></select></label>
}
