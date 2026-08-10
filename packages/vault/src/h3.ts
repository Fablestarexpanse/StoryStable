/**
 * MiniMax H3 prompt compiler (spec §6, Phase 6).
 *
 * The compiler is the *only* place H3 syntax exists. Shots stay
 * renderer-neutral (spec §1.4/§1.5): nothing in the vault stores an H3 prompt
 * as authored content, so the same shot can be retargeted to another renderer
 * later and every prompt is reproducible from the data that produced it.
 *
 * The split of labour here matters. Everything mechanically checkable — mode
 * selection, the frame grid, timestamp formats, reference numbering, the fixed
 * instruction lines, section order — is computed deterministically. The prose
 * itself is written by a model, because it is a creative act. What the model
 * writes never contains a reference number: it writes `{{ref:id}}` and the
 * compiler substitutes labels at the end, which is what makes renumbering
 * atomic. Delete a reference and every remaining tag renumbers together; there
 * is no state in which prose points at a `<Picture 3>` that no longer exists.
 */

export type H3Mode = 'T2VA' | 'I2VA' | 'FL2VA' | 'L2VA' | 'Ref2VA';

/** Label category. Each category is numbered independently (ref guide §2.5). */
export type ReferenceKind = 'picture' | 'video' | 'audio' | 'subject';

export type ReferenceRole =
  'first_frame' | 'last_frame' | 'keyframe' | 'storyboard' | 'subject' | 'source_video' | 'audio';

/** Visible-content retention markers (ref guide §4.1). Fixed output values. */
export type VisualRetention =
  'fully_preserved' | 'partially_preserved' | 'attribute_transfer' | 'weak_reference';

/** Audio retention markers (ref guide §4.2). */
export type AudioRetention = 'fully_copy' | 'partially_copy' | 'reference' | 'weak_reference';

export type Retention = VisualRetention | AudioRetention;

export type TaskType =
  | 'keyframe completion'
  | 'reference generation'
  | 'video editing'
  | 'video continuation'
  | 'audio reuse'
  | 'audio reference';

export interface H3Reference {
  /** Stable id from the Reference Set. Never a label — labels are derived. */
  id: string;
  kind: ReferenceKind;
  role: ReferenceRole;
  /** One-line definition, used verbatim in `subject_definitions`. */
  description: string;
  retention?: Retention;
  /** Trailing clause after the retention marker. */
  retentionNote?: string;
  /** 1-based shot numbers this reference appears in. */
  shots?: readonly number[];
}

export interface H3Input {
  /** Requested duration in seconds, before snapping to the frame grid. */
  durationSeconds: number;
  /** Frames per second. H3 works on a 24fps grid; overridable for tests. */
  fps?: number;
  references: readonly H3Reference[];
  /** Override the routed mode when the operator knows better. */
  mode?: H3Mode;
  /**
   * Model-written body: `integrated_multimodal_description` in base modes,
   * `detailed_description` in Ref2VA. Uses `{{ref:id}}` placeholders.
   */
  body: string;
  soundscape: string;
  music: string;
  /** Ref2VA: one or two sentences of style, placed before `[Shot 1]`. */
  styleOpening?: string;
  /** Ref2VA: the summary paragraph, without its task-type prefix. */
  summary?: string;
  /** Ref2VA: task types for the summary prefix. */
  taskTypes?: readonly TaskType[];
}

export interface H3Warning {
  category: string;
  message: string;
}

export interface CompiledH3 {
  mode: H3Mode;
  /** Duration snapped to whole frames. */
  frames: number;
  durationSeconds: number;
  prompt: string;
  /** Reference id to assigned label, e.g. `hero_ref` → `Subject 1`. */
  labels: Record<string, string>;
  warnings: H3Warning[];
}

const DEFAULT_FPS = 24;

/** Category order is fixed so labels are stable across recompiles. */
const KIND_LABEL: Record<ReferenceKind, string> = {
  subject: 'Subject',
  picture: 'Picture',
  video: 'Video',
  audio: 'Audio',
};

const FRAME_ROLES: ReferenceRole[] = ['first_frame', 'last_frame'];

/**
 * Snap a duration onto the frame grid. H3 cuts on frames, so a duration that
 * is not a whole number of frames cannot be honoured exactly.
 */
export function snapToFrames(seconds: number, fps: number = DEFAULT_FPS): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.max(1, Math.round(seconds * fps));
}

/** `S.SS` — the instruction lines require exactly two decimal places. */
export function formatSeconds(seconds: number): string {
  return seconds.toFixed(2);
}

/** `MM:SS.mmm` — the cut-time format for shots after the first. */
export function formatCutTime(seconds: number): string {
  const total = Math.max(0, seconds);
  const minutes = Math.floor(total / 60);
  const rest = total - minutes * 60;
  const whole = Math.floor(rest);
  const millis = Math.round((rest - whole) * 1000);
  // Rounding milliseconds up to 1000 must carry into seconds, or we emit
  // `00:03.1000`, which no parser accepts.
  const carried = millis === 1000;
  const s = carried ? whole + 1 : whole;
  const ms = carried ? 0 : millis;
  return `${String(minutes).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

/**
 * Choose the input mode from the references present.
 *
 * Anything beyond plain keyframes — a subject, a source video, an audio
 * asset, a storyboard — needs the full-reference format, because those roles
 * have no expression in the base modes.
 */
export function resolveMode(references: readonly H3Reference[]): H3Mode {
  const needsFullReference = references.some(
    (r) => !FRAME_ROLES.includes(r.role) || r.kind !== 'picture',
  );
  if (needsFullReference) return 'Ref2VA';

  const hasFirst = references.some((r) => r.role === 'first_frame');
  const hasLast = references.some((r) => r.role === 'last_frame');
  if (hasFirst && hasLast) return 'FL2VA';
  if (hasFirst) return 'I2VA';
  if (hasLast) return 'L2VA';
  return 'T2VA';
}

/**
 * Assign labels per category in reference order.
 *
 * Numbering is derived, never stored, which is what keeps renumbering atomic:
 * there is no persisted `<Picture 2>` to go stale when Picture 1 is removed.
 */
export function assignLabels(references: readonly H3Reference[]): Map<string, string> {
  const counters = new Map<ReferenceKind, number>();
  const labels = new Map<string, string>();
  for (const ref of references) {
    if (labels.has(ref.id)) continue;
    const next = (counters.get(ref.kind) ?? 0) + 1;
    counters.set(ref.kind, next);
    labels.set(ref.id, `${KIND_LABEL[ref.kind]} ${String(next)}`);
  }
  return labels;
}

const PLACEHOLDER = /\{\{ref:([^}]+)\}\}/g;
const RAW_LABEL = /<(Subject|Picture|Video|Audio)\s+\d+>/g;

export interface ResolvedProse {
  text: string;
  /** Placeholder ids with no matching reference. */
  unresolved: string[];
  /** Hand-written labels that bypassed placeholder substitution. */
  rawLabels: string[];
}

/** Substitute `{{ref:id}}` placeholders with their current labels. */
export function resolveTags(prose: string, labels: Map<string, string>): ResolvedProse {
  const unresolved: string[] = [];
  const text = prose.replace(PLACEHOLDER, (_match, rawId: string) => {
    const id = rawId.trim();
    const label = labels.get(id);
    if (label === undefined) {
      unresolved.push(id);
      return `{{ref:${id}}}`;
    }
    return `<${label}>`;
  });
  // A label written by hand is not renumbered by anything, so it is a latent
  // inconsistency even when it currently happens to be correct.
  const rawLabels = [...prose.matchAll(RAW_LABEL)].map((m) => m[0]);
  return { text, unresolved, rawLabels };
}

interface ShotMarker {
  number: number;
  cutTime: number | null;
  raw: string;
}

const SHOT = /\[Shot (\d+)\](?:\s+At (\d{2}):(\d{2})\.(\d{3}),)?/g;

/** Parse the `[Shot N] At MM:SS.mmm,` markers out of a body. */
export function parseShots(body: string): ShotMarker[] {
  return [...body.matchAll(SHOT)].map((m) => {
    const mm = m[2];
    const ss = m[3];
    const ms = m[4];
    const cutTime =
      mm !== undefined && ss !== undefined && ms !== undefined
        ? Number(mm) * 60 + Number(ss) + Number(ms) / 1000
        : null;
    return { number: Number(m[1]), cutTime, raw: m[0] };
  });
}

/**
 * Structural checks on a body. These catch the failures that make H3 reject
 * or misread a prompt — they say nothing about whether the writing is good.
 */
export function checkShots(body: string, durationSeconds: number): H3Warning[] {
  const warnings: H3Warning[] = [];
  const shots = parseShots(body);

  if (shots.length === 0) {
    warnings.push({ category: 'no-shots', message: 'body contains no [Shot N] marker' });
    return warnings;
  }

  const first = shots[0];
  if (first && first.number !== 1) {
    warnings.push({
      category: 'shot-numbering',
      message: `body starts at [Shot ${String(first.number)}] rather than [Shot 1]`,
    });
  }
  if (first && first.cutTime !== null) {
    warnings.push({
      category: 'shot-timestamp',
      message: 'the first shot must not carry a cut time',
    });
  }

  let previous = 0;
  shots.forEach((shot, index) => {
    if (shot.number !== index + 1) {
      warnings.push({
        category: 'shot-numbering',
        message: `shot ${String(index + 1)} is labelled [Shot ${String(shot.number)}]`,
      });
    }
    if (index === 0 || shot.cutTime === null) {
      if (index > 0) {
        warnings.push({
          category: 'shot-timestamp',
          message: `[Shot ${String(shot.number)}] has no cut time`,
        });
      }
      return;
    }
    if (shot.cutTime <= previous) {
      warnings.push({
        category: 'shot-timestamp',
        message: `[Shot ${String(shot.number)}] cuts at or before the previous shot`,
      });
    }
    if (shot.cutTime >= durationSeconds) {
      warnings.push({
        category: 'shot-timestamp',
        message: `[Shot ${String(shot.number)}] cuts at ${formatCutTime(shot.cutTime)}, at or past the ${formatSeconds(durationSeconds)}s duration`,
      });
    }
    previous = shot.cutTime;
  });

  return warnings;
}

/** The fixed instruction line each keyframe mode requires, verbatim. */
function instructionLine(
  mode: H3Mode,
  references: readonly H3Reference[],
  labels: Map<string, string>,
  duration: string,
  lastShot: number,
): string | null {
  const labelOf = (role: ReferenceRole): string =>
    labels.get(references.find((r) => r.role === role)?.id ?? '') ?? 'Picture 1';

  if (mode === 'I2VA') {
    return `For the target video, at 0.00 seconds into the target video, <${labelOf('first_frame')}> (from [Shot 1]) is fully referenced.`;
  }
  if (mode === 'FL2VA') {
    return (
      'How the reference pictures align with the target video — ' +
      `${labelOf('first_frame')} (from Shot 1) aligns with the 0.00-second mark of the target video; ` +
      `${labelOf('last_frame')} (from Shot ${String(lastShot)}) aligns with the ${duration}-second mark of the target video.`
    );
  }
  if (mode === 'L2VA') {
    return (
      'How the reference pictures align with the target video — ' +
      `<${labelOf('last_frame')}> (from [Shot ${String(lastShot)}]) aligns with the ${duration}-second mark of the target video.`
    );
  }
  return null;
}

function retentionLine(ref: H3Reference, label: string): string {
  const marker = ref.retention ?? (ref.kind === 'audio' ? 'reference' : 'fully_preserved');
  const where =
    ref.kind === 'audio'
      ? ''
      : ref.shots && ref.shots.length > 0
        ? ` (appears in ${ref.shots.map((s) => `[Shot ${String(s)}]`).join(', ')})`
        : '';
  const note = ref.retentionNote ?? ref.description;
  return `<${label}>${where}: ${marker} - ${note}`;
}

/**
 * Compile a renderer-neutral shot description into an H3 prompt.
 *
 * Warnings never block: a prompt that is structurally odd is still a prompt,
 * and the operator reviewing it is better placed than the compiler to decide.
 */
export function compileH3(input: H3Input): CompiledH3 {
  const fps = input.fps ?? DEFAULT_FPS;
  const frames = snapToFrames(input.durationSeconds, fps);
  const durationSeconds = frames / fps;
  const duration = formatSeconds(durationSeconds);
  const warnings: H3Warning[] = [];

  if (frames === 0) {
    warnings.push({ category: 'duration', message: 'duration must be greater than zero' });
  } else if (Math.abs(durationSeconds - input.durationSeconds) > 1e-9) {
    warnings.push({
      category: 'duration',
      message: `duration snapped from ${formatSeconds(input.durationSeconds)}s to ${duration}s (${String(frames)} frames at ${String(fps)}fps)`,
    });
  }
  // The instruction lines carry two decimals, so a frame-accurate duration
  // that does not survive that rounding would name a different moment than
  // the one being rendered.
  if (frames > 0 && Math.abs(Number(duration) - durationSeconds) > 1e-9) {
    warnings.push({
      category: 'duration',
      message: `${String(frames)} frames is ${String(durationSeconds)}s, which the required two-decimal instruction format rounds to ${duration}s`,
    });
  }

  const mode = input.mode ?? resolveMode(input.references);
  const labels = assignLabels(input.references);

  const body = resolveTags(input.body, labels);
  const soundscape = resolveTags(input.soundscape, labels);
  const music = resolveTags(input.music, labels);

  const unresolved = [
    ...new Set([...body.unresolved, ...soundscape.unresolved, ...music.unresolved]),
  ];
  for (const id of unresolved) {
    warnings.push({ category: 'unresolved-reference', message: `no reference with id "${id}"` });
  }
  const rawLabels = [...new Set([...body.rawLabels, ...soundscape.rawLabels, ...music.rawLabels])];
  for (const label of rawLabels) {
    warnings.push({
      category: 'literal-label',
      message: `${label} was written literally and will not renumber — use a {{ref:id}} placeholder`,
    });
  }

  // Every reference that is defined but never cited is dead weight in the
  // packet, and usually means the writer meant to mention it.
  for (const ref of input.references) {
    const label = labels.get(ref.id);
    if (label !== undefined && !body.text.includes(`<${label}>`)) {
      warnings.push({
        category: 'uncited-reference',
        message: `<${label}> is defined but never appears in the description`,
      });
    }
  }

  warnings.push(...checkShots(body.text, durationSeconds));

  const shots = parseShots(body.text);
  const lastShot = shots.length > 0 ? Math.max(...shots.map((s) => s.number)) : 1;

  const sections: string[] = [];

  if (mode === 'Ref2VA') {
    const definitions = input.references.map(
      (ref) => `<${labels.get(ref.id) ?? ref.id}> ${ref.description}`,
    );
    const taskTypes = input.taskTypes ?? [];
    if (taskTypes.length === 0) {
      warnings.push({
        category: 'task-type',
        message: 'full-reference summaries require at least one task type',
      });
    }
    const prefix = taskTypes.length > 0 ? `[${[...new Set(taskTypes)].join(' + ')}] ` : '';
    const summary = resolveTags(input.summary ?? '', labels);

    sections.push(`subject_definitions:\n${definitions.join('\n')}`);
    sections.push(`summary:\n${prefix}${summary.text}`);
    sections.push(
      `retention_analysis:\n${input.references
        .map((ref) => retentionLine(ref, labels.get(ref.id) ?? ref.id))
        .join('\n')}`,
    );
    const opening = input.styleOpening !== undefined ? `${input.styleOpening.trim()}\n` : '';
    sections.push(`detailed_description:\n${opening}${body.text.trim()}`);
    sections.push(`overall_soundscape:\n${soundscape.text.trim()}`);
    sections.push(`non_diegetic_music:\n${music.text.trim()}`);
    return {
      mode,
      frames,
      durationSeconds,
      prompt: sections.join('\n\n'),
      labels: Object.fromEntries(labels),
      warnings,
    };
  }

  const instruction = instructionLine(mode, input.references, labels, duration, lastShot);
  if (instruction !== null) sections.push(instruction);
  sections.push(`integrated_multimodal_description: ${body.text.trim()}`);
  sections.push(`overall_soundscape: ${soundscape.text.trim()}`);
  sections.push(`non_diegetic_music: ${music.text.trim()}`);

  return {
    mode,
    frames,
    durationSeconds,
    prompt: sections.join('\n\n'),
    labels: Object.fromEntries(labels),
    warnings,
  };
}
