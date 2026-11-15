import type { PerformanceSignal } from '../../contracts/types'
import type { AssistantIntent, ConversationContext, ParsedQuestion } from './types'

/** Deterministic keyword rules. This is transparent pattern matching, NOT a trained
 *  classifier or general-purpose language understanding. English only. */
export const MAX_INPUT_LENGTH = 500

interface Rule { intent: AssistantIntent; label: string; pattern: RegExp; weight: number }

const rule = (intent: AssistantIntent, label: string, pattern: RegExp, weight: number): Rule => ({ intent, label, pattern, weight })

/** Write/override requests: the assistant is read-only and never changes records. */
const ACTION_REQUEST: Rule[] = [
  rule('action_request', 'polite-write-request', /\b(?:can|could|would|will)\s+you\s+(?:please\s+)?(?:acknowledge|resolve|close|complete|mark|record|log|create|open|delete|remove|erase|reset|change|update|edit|set|clear|dismiss|approve|submit|write|save|start|begin|turn on|enable)\b/, 1),
  rule('action_request', 'imperative-write', /^(?:please\s+|now\s+)?(?:acknowledge|resolve|close|complete|mark|log|create|delete|remove|erase|reset|change|update|edit|set|clear|dismiss|approve|submit|write|save|begin|start|turn on|enable)\b/, 1),
  rule('action_request', 'mark-as-status', /\b(?:mark|set|flag|change)\b.{0,60}\b(?:as|to)\s+(?:resolved|completed|complete|done|acknowledged|reviewed|closed|healthy|normal)\b/, 1),
  rule('action_request', 'embedded-write', /\b(?:and|then|also)\s+(?:acknowledge|resolve|close|delete|erase|reset)\b/, 1),
]

/** Generic references to other people. Specific names/IDs are added per request. */
const OTHER_SUBJECT: RegExp[] = [
  /\b(?:another|other|someone else'?s?|every(?:one|body)'?s?|all(?: the)?|whole)\s+(?:astronauts?|crew(?: ?members?)?|crewmates?|persons?|people|colleagues?|team(?:mates?)?)\b/,
  /\b(?:astronaut|crew ?member|crewmate|colleague)\s+(?!i\b)(?:[a-z]|\d{1,2})(?:'s)?(?![\p{L}\p{N}])/u,
  /\b(?:the\s+)?(?:commander|flight engineer|crewmate|colleague)'?s\b/,
  /\b(?:his|her|their)\s+(?:medical|health|sleep|records?|data|history|results?|alerts?|cases?)\b/,
  /\b(?:every(?:one|body)|all of (?:us|them)|other people|the others)\b|\bthe (?:whole |entire )?crew\b(?! medical)/,
]

const MEDICAL_STRONG: Rule[] = [
  rule('unsupported_medical', 'diagnosis', /\bdiagnos\w*/, 1),
  rule('unsupported_medical', 'prescription', /\bprescri\w*/, 1),
  rule('unsupported_medical', 'dose', /(?<!radiation )\bdos(?:e|es|age|ages|ing)\b/, 1),
  rule('unsupported_medical', 'what-to-take', /\bwhat (?:should|can|do) i take\b|\bshould i take\b/, 1),
  rule('unsupported_medical', 'treatment', /\b(?:treat|treatment|treatments|therapy|cure|remedy)\b/, 1),
  rule('unsupported_medical', 'do-i-have', /\b(?:do i have|have i got)\s+(?!(?:an?\s+|any\s+|my\s+)?(?:alerts?|cases?|follow[- ]?ups?|records?|data|baselines?|assessments?|measurements?|observations?|results?|warnings?|findings?|access|tests?|reviews?)\b)\w/, 1),
  rule('unsupported_medical', 'am-i-ill', /\bam i (?:suffering|sick|ill|depressed|anxious|burn(?:ed|t) out)\b/, 1),
  rule('unsupported_medical', 'seriousness', /\bis (?:it|this|that) (?:serious|dangerous|fatal|life[- ]threatening)\b/, 1),
]
const MEDICAL_WEAK: Rule[] = [
  rule('unsupported_medical', 'medication', /\bmedicat\w*|\bmedicines?\b|\bdrugs?\b|\bpills?\b|\btablets?\b/, 1),
  rule('unsupported_medical', 'condition-name', /\b(?:depress\w*|anxiety|burnout|insomnia|disorders?|diseases?|illness|infection|ptsd|adhd|bipolar)\b/, 1),
]
const URGENT = /\b(?:chest pain|can'?t breathe|cannot breathe|short(?:ness)? of breath|unconscious|passed out|faint(?:ed|ing)?|seizure|bleeding|emergency|suicid\w*|kill myself|self[- ]harm|overdose|stroke|heart attack)\b/

const MODULES: { module: 'prevention' | 'resources'; pattern: RegExp }[] = [
  { module: 'prevention', pattern: /\bprevent(?:ive|ion|ative)\b|\bcountermeasures?\b|\bprevention plan\b/ },
  { module: 'resources', pattern: /\b(?:medical )?(?:resources?|supplies|supply|inventory|stock|consumables?)\b|\bmedical kit\b/ },
]

const INJECTION: RegExp[] = [
  /\bignore (?:all |any |the |your |my )?(?:previous |prior |above |earlier |safety )?(?:instructions|rules|prompts?|messages|policy|policies|restrictions)\b/,
  /\bsystem prompt\b|\byou are now\b|\bdeveloper mode\b|\bjailbreak\b|\bdan mode\b/,
  /\boverride\b|\bbypass\b|\bpretend (?:to be|you are)\b|\bact as\b/,
  /\bi am (?:the |a |an )?(?:medical officer|doctor|physician|commander|admin(?:istrator)?|flight surgeon)\b/,
  /\badmin(?:istrator)? (?:access|mode)\b/,
  /<\s*\/?\s*(?:script|img|iframe|svg|style|a)\b/,
]

const TOPICAL: Rule[] = [
  rule('case_status', 'follow-up', /\bfollow[- ]?ups?\b/, 5),
  rule('case_status', 'case', /\bcases?\b|\bencounters?\b/, 4),
  rule('case_status', 'resolved', /\bresolved?\b|\bresolution\b/, 3),
  rule('case_status', 'review', /\breview(?:ed|ing)?\b/, 2),
  rule('case_status', 'completed', /\bcomplet(?:e|ed|ion)\b/, 2),
  rule('case_status', 'acknowledged', /\backnowledg\w*/, 2),
  rule('alerts', 'alert', /\balerts?\b/, 5),
  rule('alerts', 'warning', /\bwarnings?\b|\bflag(?:ged)?\b|\bnotifications?\b/, 3),
  rule('alerts', 'detected', /\bdetect(?:ed|ion)\b|\btriggered\b/, 2),
  rule('performance_findings', 'performance', /\bperformance\b/, 3),
  rule('performance_findings', 'indicators', /\bindicators?\b/, 2),
  rule('performance_findings', 'findings', /\bfindings?\b|\bmultimodal\b/, 3),
  rule('performance_findings', 'why-change', /\bwhy\b.{0,40}\bchang\w*/, 1),
  rule('baseline_compare', 'baseline', /\bbaselines?\b/, 4),
  rule('baseline_compare', 'comparison', /\bcompar\w*/, 2),
  rule('baseline_compare', 'usual', /\busual\b|\btypical\b|\bnormally\b|\btrends?\b|\bdifferent from\b/, 2),
  rule('baseline_compare', 'self-report-signal', /\bfatigue\b|\btired\b|\bstress(?:ed)?\b|\bmood\b|\bexercise\b|\bworkout\b|\brepetitions?\b|\breps\b/, 2),
  rule('baseline_compare', 'what-changed', /\bwhat (?:has )?changed\b/, 1),
  rule('sleep', 'sleep', /\bsle(?:ep|pt|eping)\b|\bnaps?\b/, 4),
  rule('reaction', 'reaction', /\breaction\b|\bresponse times?\b|\breflex\w*|\bpvt\b|\bvigilance\b/, 4),
  rule('typing', 'typing', /\btyping\b|\btyped\b|\bwpm\b|\bwords per minute\b|\bkeyboard\b/, 4),
  rule('typing', 'type', /\btype\b/, 1),
  rule('visual', 'eye', /\beyes?\b|\bblink\w*|\bvisual\b|\beyelids?\b|\bperclos\b|\bgaze\b/, 4),
  rule('visual', 'camera', /\bcamera\b/, 2),
  rule('physiology', 'heart', /\bpulse\b|\bheart ?rate\b|\bhr\b|\bbpm\b|\bhrv\b/, 4),
  rule('physiology', 'spo2', /\bspo2\b|\bsp ?o2\b|\boxygen saturation\b|\bsaturation\b|\bblood oxygen\b/, 4),
  rule('physiology', 'blood-pressure', /\bblood pressure\b|\bbp\b|\bsystolic\b|\bdiastolic\b/, 4),
  rule('physiology', 'temperature', /\b(?:body )?temperature\b/, 2),
  rule('physiology', 'vitals', /\bvitals?\b|\bvital signs\b|\bphysiolog\w*/, 3),
  rule('environment', 'co2', /\bco2\b|\bcarbon dioxide\b/, 5),
  rule('environment', 'environment', /\benvironment(?:al)?\b|\bcabin\b|\bradiation\b|\bcompartment\b/, 4),
  rule('environment', 'ambient', /\b(?:cabin|room|air|ambient) (?:temperature|pressure)\b|\bair quality\b/, 4),
  rule('available_tests', 'which-assessments', /\b(?:which|what)\b.{0,30}\b(?:assessments?|tests?|checks?)\b.{0,30}\b(?:can|could|available|perform|do|run|take)\b/, 6),
  rule('available_tests', 'available-tests', /\bavailable (?:assessments?|tests?|checks?)\b|\bwhat can i (?:measure|record|test)\b/, 6),
  rule('available_tests', 'assessments', /\bassessments?\b/, 1),
  rule('overview', 'how-am-i', /\bhow am i\b|\bhow (?:have|am) i been\b|\bhow'?s my health\b/, 4),
  rule('overview', 'summary', /\boverview\b|\bsummar\w*/, 4),
  rule('overview', 'clearance-question', /\bam i (?:ok|okay|healthy|fine|normal|well|alright|all right)\b/, 4),
  rule('overview', 'my-health', /\bmy health\b|\bwhat (?:data|records|information)\b|\bwhat do you know\b/, 3),
  rule('overview', 'status', /\bstatus\b/, 1),
  rule('help', 'help', /^(?:help|what can you do|what do you do|how do(?:es)? (?:this|you|it) work)\b|\bwhat (?:can|could|should) i ask\b/, 5),
]
/** Tie-break order (earlier wins on equal score). */
const PRIORITY: AssistantIntent[] = ['case_status', 'alerts', 'performance_findings', 'baseline_compare', 'sleep', 'reaction', 'typing', 'visual', 'physiology', 'environment', 'available_tests', 'overview', 'help']

const FOCUS: { signal: PerformanceSignal; pattern: RegExp }[] = [
  { signal: 'sleep_duration', pattern: /\bsle(?:ep|pt|eping)\b|\bnaps?\b/ },
  { signal: 'reported_fatigue', pattern: /\bfatigue\b|\btired\b/ },
  { signal: 'reported_stress', pattern: /\bstress(?:ed)?\b/ },
  { signal: 'reported_mood', pattern: /\bmood\b/ },
  { signal: 'exercise_duration', pattern: /\bexercise\b|\bworkout\b/ },
  { signal: 'physical_repetitions', pattern: /\brepetitions?\b|\breps\b/ },
  { signal: 'reaction_mean', pattern: /\breaction\b|\bresponse times?\b|\bpvt\b/ },
  { signal: 'typing_wpm', pattern: /\btyping\b|\bwpm\b|\bwords per minute\b/ },
  { signal: 'visual_blink_rate', pattern: /\bblink\w*|\beyes?\b|\bvisual\b/ },
  { signal: 'visual_closure_proportion', pattern: /\bclosure\b|\beyelids?\b|\bperclos\b|\beyes?\b|\bvisual\b/ },
  { signal: 'resting_heart_rate', pattern: /\bresting heart\b|\bresting hr\b/ },
  { signal: 'heart_rate', pattern: /\bpulse\b|\b(?<!resting )heart ?rate(?! variability)\b|\bhr\b|\bbpm\b/ },
  { signal: 'heart_rate_variability', pattern: /\bhrv\b|\bheart rate variability\b/ },
  { signal: 'oxygen_saturation', pattern: /\bspo2\b|\bsp ?o2\b|\boxygen saturation\b|\bsaturation\b|\bblood oxygen\b/ },
  { signal: 'blood_pressure_systolic', pattern: /\bblood pressure\b|\bbp\b|\bsystolic\b/ },
  { signal: 'blood_pressure_diastolic', pattern: /\bblood pressure\b|\bbp\b|\bdiastolic\b/ },
  { signal: 'body_temperature', pattern: /\bbody temperature\b|(?<!(?:cabin|room|air|ambient) )\btemperature\b/ },
  { signal: 'cabin_co2', pattern: /\bco2\b|\bcarbon dioxide\b|\bair quality\b/ },
  { signal: 'cabin_temperature', pattern: /\b(?:cabin|room|air|ambient) temperature\b/ },
  { signal: 'cabin_pressure', pattern: /\b(?:cabin|room|air|ambient) pressure\b/ },
  { signal: 'radiation_dose', pattern: /\bradiation\b/ },
]
const ENVIRONMENT_SIGNALS: PerformanceSignal[] = ['cabin_co2', 'cabin_temperature', 'cabin_pressure', 'radiation_dose']
const ELLIPSIS = /^(?:why|how come|tell me more|more|details?|explain|go on|and|really|what does (?:that|it) mean)\b/
const CARRY_FOCUS = /^(?:and|what about|how about|also|then)\b/

// Strips C0/C1 control characters from untrusted input (intentional control-character class).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = new RegExp('[\\u0000-\\u001F\\u007F-\\u009F]', 'g')
const INVISIBLE_FORMATTING = new RegExp('[\\u200B-\\u200F\\u202A-\\u202E\\u2066-\\u2069\\uFEFF]', 'g')
/** Removes control/bidirectional-override characters, collapses whitespace, caps length. */
export function sanitizeQuestion(raw: string): { text: string; truncated: boolean } {
  const cleaned = raw.replace(CONTROL_CHARACTERS, ' ').replace(INVISIBLE_FORMATTING, '').replace(/\s+/g, ' ').trim()
  const characters = Array.from(cleaned)
  return characters.length > MAX_INPUT_LENGTH ? { text: characters.slice(0, MAX_INPUT_LENGTH).join(''), truncated: true } : { text: cleaned, truncated: false }
}

const normalize = (text: string) => text.toLowerCase().replace(/₂/g, '2').replace(/[’‘`]/g, "'").replace(/[“”]/g, '"')

export interface ParseOptions {
  /** Names/IDs of crew members other than the current subject; used only to refuse. */
  otherSubjectTerms?: string[]
  previous?: ConversationContext | null
}

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Pure, deterministic intent parser. User text is matched as data and never executed. */
export function parseQuestion(raw: string, options: ParseOptions = {}): ParsedQuestion {
  const { text, truncated } = sanitizeQuestion(raw)
  const q = normalize(text)
  const injection = INJECTION.some(p => p.test(q))
  const urgent = URGENT.test(q)
  const base = { text, focus: [] as PerformanceSignal[], contextual: false, flags: { injection, truncated, urgent } }
  const result = (intent: AssistantIntent, matched: string[], extra: Partial<ParsedQuestion> = {}): ParsedQuestion => ({ ...base, intent, recognized: intent !== 'unknown', matched, ...extra })
  if (!q) return result('unknown', ['empty'])

  // Imperatives are checked per sentence so a write request cannot hide after a preamble.
  const sentences = [q, ...q.split(/[.!?;:\n]+/).map(part => part.trim()).filter(Boolean)]
  const writes = ACTION_REQUEST.filter(r => sentences.some(sentence => r.pattern.test(sentence))).map(r => r.label)
  if (writes.length) return result('action_request', writes)

  const named = (options.otherSubjectTerms ?? []).map(t => t.trim().toLowerCase()).filter(t => t.length >= 2)
  const otherHits = [...named.filter(t => new RegExp(`(?:^|[^\\p{L}\\p{N}])${escape(t)}(?:$|[^\\p{L}\\p{N}])`, 'u').test(q)).map(t => `named:${t}`), ...OTHER_SUBJECT.filter(p => p.test(q)).map(() => 'other-subject-reference')]
  if (otherHits.length) return result('other_subject', otherHits)

  const strong = MEDICAL_STRONG.filter(r => r.pattern.test(q)).map(r => r.label)
  if (strong.length || urgent) return result('unsupported_medical', urgent ? [...strong, 'urgent'] : strong)
  const module = MODULES.find(m => m.pattern.test(q))
  if (module) return { ...result('module_unavailable', [`module:${module.module}`]), flags: { ...base.flags, module: module.module } }
  const weak = MEDICAL_WEAK.filter(r => r.pattern.test(q)).map(r => r.label)
  if (weak.length) return result('unsupported_medical', weak)

  const scores = new Map<AssistantIntent, { score: number; labels: string[] }>()
  for (const r of TOPICAL) if (r.pattern.test(q)) {
    const entry = scores.get(r.intent) ?? { score: 0, labels: [] }
    entry.score += r.weight; entry.labels.push(r.label); scores.set(r.intent, entry)
  }
  let focus = FOCUS.filter(f => f.pattern.test(q)).map(f => f.signal)
  // "temperature" alone is physiological; cabin/room/air temperature is environmental.
  if (focus.some(s => ENVIRONMENT_SIGNALS.includes(s))) {
    const env = scores.get('environment') ?? { score: 0, labels: [] }
    if (focus.includes('cabin_temperature') || focus.includes('cabin_pressure')) { scores.delete('physiology'); env.score += 2 }
    scores.set('environment', env)
  }
  const ranked = [...scores.entries()].sort((a, b) => b[1].score - a[1].score || PRIORITY.indexOf(a[0]) - PRIORITY.indexOf(b[0]))
  const best = ranked[0]
  const previous = options.previous ?? null
  if (!best) {
    if (previous && ELLIPSIS.test(q)) return result(previous.intent, ['contextual-follow-up'], { focus: previous.focus, contextual: true })
    return result('unknown', [])
  }
  let contextual = false
  if (!focus.length && previous?.focus.length && (CARRY_FOCUS.test(q) || q.split(' ').length <= 4) && ['baseline_compare', 'performance_findings', 'alerts'].includes(best[0])) { focus = previous.focus; contextual = true }
  return result(best[0], best[1].labels, { focus, contextual })
}

/** Questions shown as buttons; each maps to a tested intent. */
export const SUGGESTED_QUESTIONS: { text: string; intent: AssistantIntent }[] = [
  { text: 'Why did my performance indicators change?', intent: 'performance_findings' },
  { text: 'What changed compared with my baseline?', intent: 'baseline_compare' },
  { text: 'How did I sleep?', intent: 'sleep' },
  { text: 'What are my latest reaction-time results?', intent: 'reaction' },
  { text: 'Why was this alert created?', intent: 'alerts' },
  { text: 'What is the status of my follow-up?', intent: 'case_status' },
  { text: 'Which assessments can I perform?', intent: 'available_tests' },
  { text: 'What environmental observations are available?', intent: 'environment' },
]
