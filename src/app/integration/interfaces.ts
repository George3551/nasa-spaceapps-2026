import type { ComponentType } from 'react'
import type {
  ActivityRecord, AstronautId, CompartmentId, HealthMeasurement,
  HealthEvaluatorPort, MissionState, SimulationPort, VisionPort,
} from '../../../contracts/types'

// UI adapters only. All domain records and services come from the canonical contract.
export interface MissionViewProps {
  mission: Readonly<MissionState>
  selectedAstronautId: AstronautId | null
  selectedCompartmentId: CompartmentId | null
  onSelectAstronaut(id: AstronautId): void
  onSelectCompartment(id: CompartmentId): void
}

export interface HealthViewProps {
  mission: Readonly<MissionState>
  astronautId: AstronautId | null
  onMeasurementAdded(record: HealthMeasurement): void
  onAcknowledgeAlert(id: string): void
}

export interface SimulationViewProps {
  mission: Readonly<MissionState>
  onMissionChanged(mission: MissionState): void
}

export interface AnatomyViewProps {
  mission: Readonly<MissionState>
  astronautId: AstronautId | null
}

export interface VisionViewProps {
  astronautId: AstronautId | null
  onActivityAdded(record: ActivityRecord): void
}

export interface ModuleViews {
  spacecraft?: ComponentType<MissionViewProps>
  health?: ComponentType<HealthViewProps>
  simulation?: ComponentType<SimulationViewProps>
  anatomy?: ComponentType<AnatomyViewProps>
  vision?: ComponentType<VisionViewProps>
}

// Future orchestration dependencies, not implemented or started by this scaffold.
export interface ModuleServices {
  simulation?: SimulationPort
  health?: HealthEvaluatorPort
  vision?: VisionPort
}
