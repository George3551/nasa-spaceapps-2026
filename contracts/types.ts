/** AEGIS canonical integration contracts v1.0 (hackathon prototype).
 *  Changes require integrator review. Do not duplicate types per feature module.
 */

export type ISODateTime = string;
export type AstronautId = string;
export type CompartmentId = string;
export type ObservationId = string;
export type ScenarioId = 'normal-day' | 'sleep-disruption' | 'co2-excursion' | 'radiation-event';

/** Separates provenance, which is not the same thing as acquisition method. */
export type DataOrigin = 'synthetic' | 'observed' | 'research_dataset';
export type AcquisitionMethod = 'simulator' | 'manual' | 'wearable' | 'medical_device' | 'environment_sensor' | 'camera_pose' | 'camera_face' | 'dataset_import' | 'assessment';
export type ObservationQuality = 'valid' | 'estimated' | 'missing' | 'invalid';

export type MetricKey =
  | 'heart_rate'                // bpm
  | 'body_temperature'          // °C
  | 'oxygen_saturation'         // %
  | 'heart_rate_variability'    // ms; protocol must identify the statistic
  | 'laboratory'               // analyte + unit required; no implicit conversion
  | 'resting_heart_rate'        // bpm
  | 'blood_pressure_systolic'  // mmHg
  | 'blood_pressure_diastolic' // mmHg
  | 'sleep_duration'            // h
  | 'reported_stress'           // scale with defined questionnaire
  | 'reported_fatigue'          // scale with defined questionnaire
  | 'exercise_duration'         // min
  | 'exercise_repetitions'      // count
  | 'cabin_co2'                 // ppm
  | 'cabin_temperature'         // °C
  | 'cabin_pressure'            // kPa
  | 'radiation_dose'            // unit specified in record; no unsupported predictions
  | 'reported_mood'
  | 'symptom_severity'
  | 'bone_mineral_density'
  | 'movement_range'
  | 'visual_fatigue'
  | 'other';

export interface SourceReference {
  id: string;
  title: string;
  url?: string;
  /** Examples: NASA HRP research, NASA OSDR study ID, simulated fixture. */
  kind: 'research' | 'dataset' | 'synthetic_fixture' | 'user_entry' | 'device';
  note?: string;
}

export interface HealthMeasurement {
  /** Only the mission sampler sets this; imported/manual records are retained. */
  generatedTelemetry?: true;
  id: ObservationId;
  astronautId: AstronautId;
  metric: MetricKey;
  /** Missing values must be encoded with quality='missing' and value=null, NEVER 0. */
  value: number | null;
  unit: string;
  timestamp: ISODateTime;
  source: AcquisitionMethod;
  origin: DataOrigin;
  quality: ObservationQuality;
  compartmentId?: CompartmentId;
  sourceRefId?: string;
  /** Explicitly identifies arbitrary demonstration thresholds/fixtures. */
  demonstrationOnly?: boolean;
  /** Additional context, never a diagnosis. Symptom name or examination site. */
  note?: string;
  acquisition?: AcquisitionContext;
  analyte?: string;
}

export interface EnvironmentalMeasurement {
  generatedTelemetry?: true;
  id: ObservationId;
  compartmentId: CompartmentId;
  metric: 'cabin_co2' | 'cabin_temperature' | 'cabin_pressure' | 'radiation_dose' | 'other';
  value: number | null;
  unit: string;
  timestamp: ISODateTime;
  source: 'simulator' | 'environment_sensor' | 'dataset_import';
  origin: DataOrigin;
  quality: ObservationQuality;
  sourceRefId?: string;
  demonstrationOnly?: boolean;
  /** Explicit association required when importing into personal observed records. */
  astronautId?: AstronautId;
  acquisition?: AcquisitionContext;
}

export interface CrewMember {
  id: AstronautId;
  displayName: string;
  role: string;
  /** A baseline is a descriptive user-specific comparison, NOT a diagnosis. */
  baselines: Partial<Record<MetricKey, number>>;
  currentCompartmentId: CompartmentId;
  syntheticIdentity: boolean;
}

export interface Compartment {
  id: CompartmentId;
  label: string;
  category: 'living' | 'exercise' | 'medical' | 'work' | 'life_support' | 'shelter';
}

export interface ActivityRecord {
  generatedTelemetry?: true;
  id: string;
  astronautId: AstronautId;
  kind: 'exercise' | 'sleep' | 'work' | 'rest' | 'self_report' | 'medical_check';
  startedAt: ISODateTime;
  endedAt?: ISODateTime;
  source: AcquisitionMethod;
  origin: DataOrigin;
  quality: ObservationQuality;
  details?: Record<string, number | string | boolean | null>;
  acquisition?: AcquisitionContext;
}

export interface AlertEvidence {
  observationId: string;
  explanation: string;
}

export interface HealthAlert {
  /** Original evidence is immutable; subsequent detections are dated snapshots. */
  updates?: AlertUpdate[];
  id: string;
  astronautId?: AstronautId;
  compartmentId?: CompartmentId;
  createdAt: ISODateTime;
  level: 'information' | 'attention' | 'review';
  title: string;
  explanation: string;
  evidence: AlertEvidence[];
  safeNextStep: string;
  status: 'new' | 'acknowledged';
  ruleId: string;
  /** For unvalidated demo rules, this MUST be true. */
  demonstrationOnly: boolean;
  sourceRefIds?: string[];
}

export interface MissionEvent {
  id: string;
  at: ISODateTime;
  kind: 'crew_movement' | 'routine' | 'measurement' | 'environment_incident' | 'radiation_incident' | 'health_alert' | 'operator_action';
  astronautId?: AstronautId;
  compartmentId?: CompartmentId;
  summary: string;
  scenarioId?: ScenarioId;
  synthetic: boolean;
}

export interface MissionState {
  missionTime: ISODateTime;
  /** Simulation can be paused; speed is the count of virtual seconds per real second. */
  paused: boolean;
  speed: number;
  activeScenario: ScenarioId;
  seed: number;
  crew: CrewMember[];
  compartments: Compartment[];
  measurements: HealthMeasurement[];
  environment: EnvironmentalMeasurement[];
  activities: ActivityRecord[];
  alerts: HealthAlert[];
  events: MissionEvent[];
  /** v2 additions are optional for compatibility with v1 consumers. */
  assessments?: AssessmentResult[];
  encounters?: MedicalEncounter[];
  sources?: SourceReference[];
  resources?: MedicalResource[];
  examinations?: ExaminationRecord[];
}

export interface SimulationPort {
  initialState(seed?: number): MissionState;
  step(state: MissionState, virtualSeconds: number): MissionState;
  runScenario(state: MissionState, id: ScenarioId): MissionState;
  reset(seed?: number): MissionState;
}

export interface HealthEvaluatorPort {
  evaluate(state: MissionState): HealthAlert[];
}

export interface VisionPort {
  start(): Promise<void>;
  stop(): void;
  /** Output observations; must not record video by default. */
  onActivityRecord(callback: (activity: ActivityRecord) => void): () => void;
}

/** v2 provenance shared by assessment, encounter and follow-up records. */
export interface RecordMetadata {
  generatedTelemetry?: true;
  id: string;
  astronautId: AstronautId;
  timestamp: ISODateTime;
  source: AcquisitionMethod;
  origin: DataOrigin;
  quality: ObservationQuality;
  unit: string;
  sourceRefIds: string[];
  demonstrationOnly: boolean;
  acquisition?: AcquisitionContext;
}

export interface TypingMetrics {
  durationMs: number;
  typedCharacters: number;
  correctCharacters: number;
  errors: number;
  corrections: number;
  interKeyMs: number[];
  wpm: number;
  accuracy: number;
}

export interface ReactionTrial {
  waitMs: number;
  responseMs: number | null;
  outcome: 'response' | 'missed' | 'premature';
}

export interface ReactionMetrics {
  durationMs: number;
  mode: 'demo' | 'extended';
  trials: ReactionTrial[];
  meanMs: number | null;
  medianMs: number | null;
  missed: number;
  premature: number;
}

export interface ProcedureAttempt {
  field: string;
  unit: string;
  expected: number;
  entered: number;
  matched: boolean;
  elapsedMs: number;
}

export type AssessmentResult = RecordMetadata & (
  | { kind: 'typing'; result: TypingMetrics }
  | { kind: 'reaction'; result: ReactionMetrics }
  | { kind: 'procedure'; result: { attempts: ProcedureAttempt[]; completed: boolean } }
  | { kind: 'visual'; experimental: true; association: DemoAssociation; result: VisualAssessmentMetrics }
  | { kind: 'physical'; experimental: true; association: DemoAssociation; result: PhysicalAssessmentMetrics }
);

export interface ClinicalAction extends RecordMetadata {
  kind: 'review' | 'follow_up';
  note: string;
  observationIds: string[];
  completed: boolean;
}

export interface MedicalEncounter extends RecordMetadata {
  alertId: string;
  title: string;
  status: 'open' | 'under_review' | 'resolved';
  actions: ClinicalAction[];
  resolvedAt?: ISODateTime;
}

export interface MedicalResource {
  id: string;
  label: string;
  quantity: number | null;
  unit: string;
  origin: DataOrigin;
  quality: ObservationQuality;
  timestamp: ISODateTime;
  source: AcquisitionMethod;
  sourceRefIds: string[];
}

export interface ClinicalWorkspace {
  measurements: HealthMeasurement[];
  assessments: AssessmentResult[];
  alerts: HealthAlert[];
  encounters: MedicalEncounter[];
  activities?: ActivityRecord[];
  environment?: EnvironmentalMeasurement[];
  examinations?: ExaminationRecord[];
}

export interface MissionSnapshot extends MissionState {
  assessments: AssessmentResult[];
  encounters: MedicalEncounter[];
  sources: SourceReference[];
  resources: MedicalResource[];
}

export interface ResearchSource extends SourceReference {
  establishes: string;
  feature: string;
  limitation: string;
  access: 'full_text' | 'abstract' | 'metadata' | 'unavailable';
  providesData: boolean;
  checkedAt: string;
}

export interface DemoAssociation {
  kind: 'fictional_demo_profile';
  confirmedAt: ISODateTime;
}
export type TrackingIssue = 'no_face' | 'multiple_faces' | 'head_pose' | 'unstable' | 'out_of_frame' | 'low_visibility' | 'no_pose' | 'multiple_poses' | 'camera_interrupted' | 'sampling_gap' | 'calibrating';
export interface InvalidTrackingInterval { startMs: number; endMs: number; reason: TrackingIssue }
export interface VisualAssessmentMetrics {
  durationMs: number;
  validObservationMs: number;
  calibrationMs: number;
  trackingCoverage: number;
  blinkCount: number | null;
  blinkRatePerMinute: number | null;
  blinkDurationsMs: number[];
  meanBlinkDurationMs: number | null;
  eyeClosureMs: number | null;
  prolongedClosureMs: number | null;
  closureProportion: number | null;
  perclosInspiredProportion: number | null;
  calibratedOpenEar: number | null;
  invalidIntervals: InvalidTrackingInterval[];
  sufficient: boolean;
  algorithm: 'ear-hysteresis-v1';
}
export interface PhysicalAssessmentMetrics {
  exercise: 'right_elbow_flexion';
  durationMs: number;
  validObservationMs: number;
  trackingCoverage: number;
  repetitions: number | null;
  angleHistory: { atMs: number; angleDeg: number | null }[];
  rangeDeg: number | null;
  invalidIntervals: InvalidTrackingInterval[];
  sufficient: boolean;
  algorithm: 'elbow-cycle-v1';
}

/** Acquisition labels are supplied, not proof of calibrated hardware identity. */
export interface AcquisitionContext {
  deviceId: string;
  protocolId: string;
  condition: string;
  sessionId: string;
}
export interface ExaminationRecord extends RecordMetadata {
  kind: 'ecg' | 'ultrasound';
  summary: string | null;
}
export interface SensorBatch {
  measurements: HealthMeasurement[];
  environment: EnvironmentalMeasurement[];
  examinations: ExaminationRecord[];
}
export interface SensorRequest {
  astronautId: AstronautId;
  compartmentId: CompartmentId;
  timestamp: ISODateTime;
  seed: number;
}
/** Acquisition transport only; the existing reducer remains the sole record store. */
export interface SensorAdapter {
  id: string;
  label: string;
  category: 'physiological' | 'medical' | 'environmental';
  cadence: 'continuous' | 'periodic';
  origin: DataOrigin;
  read(request: SensorRequest): Promise<SensorBatch>;
}
export type PerformanceSignal = MetricKey | 'reaction_mean' | 'typing_wpm' | 'visual_blink_rate' | 'visual_closure_proportion' | 'physical_repetitions';
export interface PerformanceObservation {
  id: string;
  astronautId: AstronautId;
  signal: PerformanceSignal;
  value: number | null;
  unit: string;
  timestamp: ISODateTime;
  source: AcquisitionMethod;
  origin: DataOrigin;
  quality: ObservationQuality;
  acquisition?: AcquisitionContext;
  analyte?: string;
}
export interface BaselineComparison {
  signal: PerformanceSignal;
  current: PerformanceObservation | null;
  latestEntry: PerformanceObservation | null;
  baseline: number | null;
  baselineRecords: PerformanceObservation[];
  history: PerformanceObservation[];
  delta: number | null;
  percentChange: number | null;
  status: 'ready' | 'missing' | 'invalid' | 'stale' | 'incompatible' | 'insufficient_baseline';
  warnings: string[];
}
export interface MultimodalFinding {
  ruleId: string;
  title: string;
  explanation: string;
  evidence: AlertEvidence[];
  nextStep: string;
  demonstrationOnly: true;
}
export interface PerformanceAssessment {
  astronautId: AstronautId;
  origin: DataOrigin;
  asOf: ISODateTime;
  comparisons: BaselineComparison[];
  findings: MultimodalFinding[];
  limitations: string[];
}

export interface AlertUpdate {
  at: ISODateTime;
  title: string;
  explanation: string;
  evidence: AlertEvidence[];
  safeNextStep: string;
  ruleId: string;
}
