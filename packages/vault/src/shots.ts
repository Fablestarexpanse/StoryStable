/**
 * Shots (spec §5, Phase 5) and the bridge from a Shot to the H3 compiler.
 *
 * A Shot is the renderer-neutral statement of production intent. It never
 * stores an H3 prompt: the compiler in `h3.ts` derives one at render time.
 * This module is the seam between the two — it reads Shot notes out of the
 * vault and translates their vocabulary into the compiler's input.
 *
 * The translation is deliberately lossy in one direction only. Everything H3
 * needs that the Shot records is carried across; anything H3 needs that the
 * Shot cannot express is reported as a gap rather than invented, because a
 * guessed camera direction is worse than an acknowledged missing one.
 */
import type { ParsedNote } from './links.js';
import type { H3Input, H3Reference, H3Mode } from './h3.js';

export type ShotStatus =
  'planned' | 'board_approved' | 'generating' | 'review' | 'approved' | 'final';

export type CameraMovement =
  | 'static'
  | 'push_in'
  | 'pull_out'
  | 'pan'
  | 'tilt'
  | 'tracking'
  | 'crane'
  | 'handheld'
  | 'orbit'
  | 'zoom';

export type Amplitude = 'none' | 'small' | 'medium' | 'large';
export type Speed = 'slow' | 'medium' | 'fast';

export interface Rational {
  numerator: number;
  denominator: number;
}

export interface ShotDuration {
  targetSeconds: number;
  rate: Rational;
  targetFrames: number | null;
  hardMaxSeconds: number | null;
}

export interface ShotCamera {
  movement: CameraMovement | null;
  amplitude: Amplitude | null;
  speed: Speed | null;
  notes: string;
}

export interface ShotDialogue {
  characterId: string;
  text: string;
  delivery: string;
  voiceover: boolean;
}

export interface Shot {
  path: string;
  id: string;
  sceneId: string;
  order: number;
  status: ShotStatus | null;
  purpose: string;
  duration: ShotDuration;
  camera: ShotCamera;
  dialogue: ShotDialogue[];
  ambience: string[];
  sfx: string[];
  musicMode: 'none' | 'diegetic' | 'non_diegetic' | null;
  musicInstruction: string;
  firstFrameAssetId: string | null;
  lastFrameAssetId: string | null;
  referenceSetId: string | null;
  modeHint: H3Mode | null;
}

const DEFAULT_RATE: Rational = { numerator: 24, denominator: 1 };

const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
const strList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

const record = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | null =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : null;

const MOVEMENTS: CameraMovement[] = [
  'static',
  'push_in',
  'pull_out',
  'pan',
  'tilt',
  'tracking',
  'crane',
  'handheld',
  'orbit',
  'zoom',
];

const STATUSES: ShotStatus[] = [
  'planned',
  'board_approved',
  'generating',
  'review',
  'approved',
  'final',
];

const MODE_HINTS: Record<string, H3Mode> = {
  t2va: 'T2VA',
  i2va: 'I2VA',
  fl2va: 'FL2VA',
  l2va: 'L2VA',
  ref2va: 'Ref2VA',
};

function parseRate(value: unknown): Rational {
  const raw = record(value);
  const numerator = num(raw.numerator);
  const denominator = num(raw.denominator);
  if (numerator === null || denominator === null || numerator <= 0 || denominator <= 0) {
    return DEFAULT_RATE;
  }
  return { numerator, denominator };
}

/** Frames per second as a number. Rates are stored exactly, used approximately. */
export function fps(rate: Rational): number {
  return rate.numerator / rate.denominator;
}

/** Shot notes are `type: shot` frontmatter objects. */
export function isShotNote(note: ParsedNote): boolean {
  return note.frontmatter.type === 'shot';
}

/**
 * Read a Shot out of a note. Never throws and never rejects a note for being
 * incomplete — a half-written shot is a normal state of work, and the caller
 * decides what is missing.
 */
export function parseShot(note: ParsedNote): Shot | null {
  if (!isShotNote(note)) return null;
  const fm = note.frontmatter;

  const durationRaw = record(fm.duration);
  const rate = parseRate(durationRaw.rate);
  const camera = record(fm.camera);
  const keyframes = record(fm.keyframes);
  const sound = record(fm.sound);
  const music = record(sound.music);
  const renderer = record(fm.renderer);

  const dialogue: ShotDialogue[] = (Array.isArray(fm.dialogue) ? fm.dialogue : [])
    .map((entry) => record(entry))
    .filter((entry) => str(entry.character_id) !== '' && str(entry.text) !== '')
    .map((entry) => ({
      characterId: str(entry.character_id),
      text: str(entry.text),
      delivery: str(entry.delivery),
      voiceover: entry.voiceover === true,
    }));

  return {
    path: note.path,
    id: str(fm.id),
    sceneId: str(fm.scene_id),
    order: num(fm.order) ?? 0,
    status: oneOf(fm.status, STATUSES),
    purpose: str(fm.purpose),
    duration: {
      targetSeconds: num(durationRaw.target_seconds) ?? 0,
      rate,
      targetFrames: num(durationRaw.target_frames),
      hardMaxSeconds: num(durationRaw.hard_max_seconds),
    },
    camera: {
      movement: oneOf(camera.movement, MOVEMENTS),
      amplitude: oneOf(camera.amplitude, ['none', 'small', 'medium', 'large'] as const),
      speed: oneOf(camera.speed, ['slow', 'medium', 'fast'] as const),
      notes: str(camera.notes),
    },
    dialogue,
    ambience: strList(sound.ambience),
    sfx: strList(sound.sfx),
    musicMode: oneOf(music.mode, ['none', 'diegetic', 'non_diegetic'] as const),
    musicInstruction: str(music.instruction),
    firstFrameAssetId: str(keyframes.first_frame_asset_id) || null,
    lastFrameAssetId: str(keyframes.last_frame_asset_id) || null,
    referenceSetId: str(fm.reference_set_id) || null,
    modeHint: MODE_HINTS[str(renderer.mode_hint).toLowerCase()] ?? null,
  };
}

/**
 * Build a new Shot note. `now` is injected so callers stay deterministic.
 *
 * The body is the shot's description in `{{ref:id}}` placeholder form — the
 * one piece of the H3 prompt a person or a model actually writes. It lives in
 * the note body rather than in frontmatter because it is prose, and because
 * keeping it out of the compiled prompt is what makes the prompt derived.
 */
export function createShot(
  sceneId: string,
  order: number,
  now: string,
  targetSeconds = 6,
): { path: string; source: string } {
  const slug = String(order).padStart(3, '0');
  const frontmatter = [
    '---',
    'schema_version: 1',
    `id: shot_${slug}`,
    'type: shot',
    `scene_id: ${sceneId}`,
    `order: ${String(order)}`,
    'status: planned',
    'purpose: ""',
    `created_at: ${now}`,
    'duration:',
    `  target_seconds: ${String(targetSeconds)}`,
    '  rate: { numerator: 24, denominator: 1 }',
    'composition:',
    '  shot_size: medium',
    '  angle: eye_level',
    'camera:',
    '  movement: static',
    '  amplitude: none',
    '  speed: medium',
    '  notes: ""',
    'sound:',
    '  ambience: []',
    '  sfx: []',
    '  music: { mode: none }',
    'keyframes:',
    '  first_frame_asset_id: null',
    '  last_frame_asset_id: null',
    'reference_set_id: null',
    'renderer:',
    '  preferred: minimax_h3',
    '  mode_hint: auto',
    '---',
    '',
    '[Shot 1] ',
    '',
  ].join('\n');
  return { path: `Studio/Shots/${slug}.md`, source: frontmatter };
}

/**
 * H3's motion vocabulary, keyed by the Shot's renderer-neutral movement.
 *
 * `directional` marks the movements H3 expresses as a left/right or up/down
 * pair that the Shot schema stores without a direction. Those are reported
 * rather than guessed.
 */
const CAMERA_PHRASES: Record<CameraMovement, { phrase: string; directional: boolean }> = {
  static: { phrase: 'holds a static shot', directional: false },
  push_in: { phrase: 'pushes in', directional: false },
  pull_out: { phrase: 'pulls out', directional: false },
  pan: { phrase: 'pans', directional: true },
  tilt: { phrase: 'tilts', directional: true },
  tracking: { phrase: 'follows the subject in a tracking shot', directional: false },
  crane: { phrase: 'cranes', directional: true },
  handheld: { phrase: 'shakes slightly', directional: false },
  orbit: { phrase: 'moves around the subject in an arc shot', directional: false },
  zoom: { phrase: 'zooms', directional: true },
};

export interface CameraPhrase {
  text: string;
  /** True when H3 needs a direction the Shot does not record. */
  needsDirection: boolean;
}

/**
 * Render a Shot's camera as the natural English H3 expects, in the documented
 * order: motion type, then amplitude, then speed. Medium amplitude and normal
 * speed are omitted, as the guide directs — stating a default adds no
 * information and crowds the description.
 */
export function cameraPhrase(camera: ShotCamera): CameraPhrase | null {
  if (camera.movement === null) return null;
  const entry = CAMERA_PHRASES[camera.movement];
  const parts = [`The camera ${entry.phrase}`];
  if (camera.amplitude === 'small' || camera.amplitude === 'large') {
    parts.push(`with ${camera.amplitude} amplitude`);
  }
  if (camera.speed === 'slow' || camera.speed === 'fast') {
    parts.push(`at ${camera.speed} speed`);
  }
  return { text: `${parts.join(' ')}.`, needsDirection: entry.directional };
}

export interface ShotToH3Options {
  /**
   * References resolved from the shot's Reference Set. Keyframes are added by
   * the adapter; anything else has to be supplied, because a Reference Set
   * lives in its own note and this module does not read the vault.
   */
  references?: readonly H3Reference[];
  /** Model-written prose in `{{ref:id}}` placeholder form. */
  body?: string;
  soundscape?: string;
  music?: string;
}

export interface ShotH3Bridge {
  input: H3Input;
  /** What H3 needs that this Shot does not record. */
  gaps: string[];
}

/**
 * Translate a Shot into compiler input.
 *
 * Keyframe assets become picture references automatically, which is what
 * drives the compiler's mode routing: a shot with a first frame is I2VA, one
 * with both is FL2VA, and so on, without anyone choosing a mode by hand. An
 * explicit `renderer.mode_hint` still wins when the operator set one.
 */
export function shotToH3Input(shot: Shot, options: ShotToH3Options = {}): ShotH3Bridge {
  const gaps: string[] = [];
  const references: H3Reference[] = [];

  if (shot.firstFrameAssetId !== null) {
    references.push({
      id: shot.firstFrameAssetId,
      kind: 'picture',
      role: 'first_frame',
      description: 'is the first frame of [Shot 1].',
    });
  }
  if (shot.lastFrameAssetId !== null) {
    references.push({
      id: shot.lastFrameAssetId,
      kind: 'picture',
      role: 'last_frame',
      description: 'is the final frame of the shot.',
    });
  }
  references.push(...(options.references ?? []));

  if (shot.referenceSetId !== null && (options.references ?? []).length === 0) {
    gaps.push(
      `shot names reference set ${shot.referenceSetId} but no references were supplied to resolve it`,
    );
  }

  if (shot.duration.targetSeconds <= 0) {
    gaps.push('shot records no target duration');
  }
  if (shot.purpose.trim() === '') {
    gaps.push('shot records no purpose, so there is nothing to write the description from');
  }

  const camera = cameraPhrase(shot.camera);
  if (camera === null) {
    gaps.push('shot records no camera movement');
  } else if (camera.needsDirection && shot.camera.notes.trim() === '') {
    // H3 writes Pan Left or Pan Right; the Shot schema stores only `pan`.
    gaps.push(
      `H3 needs a direction for "${shot.camera.movement ?? ''}" — record it in camera.notes`,
    );
  }

  const soundscape = options.soundscape ?? [...shot.ambience, ...shot.sfx].join(' ').trim();
  const music =
    options.music ??
    (shot.musicMode === 'non_diegetic' && shot.musicInstruction !== ''
      ? shot.musicInstruction
      : 'N/A');

  if (shot.musicMode === 'diegetic' && options.music === undefined) {
    // Diegetic music is something the characters hear, so it belongs in the
    // description alongside the action, not in the audience-only field.
    gaps.push('music is diegetic and belongs in the description, not non_diegetic_music');
  }

  const input: H3Input = {
    durationSeconds: shot.duration.targetSeconds,
    fps: fps(shot.duration.rate),
    references,
    body: options.body ?? '',
    soundscape: soundscape === '' ? 'N/A' : soundscape,
    music: music === '' ? 'N/A' : music,
    ...(shot.modeHint !== null ? { mode: shot.modeHint } : {}),
  };

  return { input, gaps };
}
