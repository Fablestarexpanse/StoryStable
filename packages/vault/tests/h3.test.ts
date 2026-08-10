import { describe, expect, it } from 'vitest';
import {
  assignLabels,
  checkShots,
  compileH3,
  formatCutTime,
  formatSeconds,
  parseShots,
  resolveMode,
  resolveTags,
  snapToFrames,
  type H3Input,
  type H3Reference,
} from '../src/h3.js';

const picture = (id: string, role: H3Reference['role']): H3Reference => ({
  id,
  kind: 'picture',
  role,
  description: `the ${role} image`,
});

const base = (over: Partial<H3Input> = {}): H3Input => ({
  durationSeconds: 6,
  references: [],
  body: '[Shot 1] Live-action, cinematic, a wide shot of a quiet street.',
  soundscape: 'Distant traffic continues throughout.',
  music: 'N/A',
  ...over,
});

describe('snapToFrames', () => {
  it('snaps onto the 24fps grid', () => {
    expect(snapToFrames(6)).toBe(144);
    expect(snapToFrames(6.05)).toBe(145);
  });

  it('never returns a zero-length video for a positive duration', () => {
    expect(snapToFrames(0.001)).toBe(1);
  });

  it('treats a non-positive or non-finite duration as empty', () => {
    expect(snapToFrames(0)).toBe(0);
    expect(snapToFrames(-3)).toBe(0);
    expect(snapToFrames(Number.NaN)).toBe(0);
  });
});

describe('time formatting', () => {
  it('renders durations with exactly two decimals', () => {
    expect(formatSeconds(8)).toBe('8.00');
    expect(formatSeconds(6.041666)).toBe('6.04');
  });

  it('renders cut times as MM:SS.mmm', () => {
    expect(formatCutTime(3.5)).toBe('00:03.500');
    expect(formatCutTime(65.125)).toBe('01:05.125');
    expect(formatCutTime(0)).toBe('00:00.000');
  });

  it('carries a millisecond rounding up into seconds', () => {
    // 3.9999 must not render as 00:03.1000.
    expect(formatCutTime(3.9999)).toBe('00:04.000');
  });
});

describe('resolveMode', () => {
  it('routes to T2VA with no references', () => {
    expect(resolveMode([])).toBe('T2VA');
  });

  it('routes to I2VA for a first frame alone', () => {
    expect(resolveMode([picture('a', 'first_frame')])).toBe('I2VA');
  });

  it('routes to FL2VA for a first and last frame', () => {
    expect(resolveMode([picture('a', 'first_frame'), picture('b', 'last_frame')])).toBe('FL2VA');
  });

  it('routes to L2VA for a last frame alone', () => {
    expect(resolveMode([picture('b', 'last_frame')])).toBe('L2VA');
  });

  it('routes to Ref2VA once any non-keyframe role appears', () => {
    const subject: H3Reference = { id: 's', kind: 'subject', role: 'subject', description: 'x' };
    expect(resolveMode([picture('a', 'first_frame'), subject])).toBe('Ref2VA');
  });

  it('routes to Ref2VA for audio or video even in a frame role', () => {
    const audio: H3Reference = { id: 'v', kind: 'audio', role: 'audio', description: 'x' };
    expect(resolveMode([audio])).toBe('Ref2VA');
  });
});

describe('assignLabels', () => {
  it('numbers each category independently', () => {
    const labels = assignLabels([
      { id: 'p1', kind: 'picture', role: 'first_frame', description: '' },
      { id: 'v1', kind: 'video', role: 'source_video', description: '' },
      { id: 'p2', kind: 'picture', role: 'last_frame', description: '' },
      { id: 'a1', kind: 'audio', role: 'audio', description: '' },
    ]);
    expect(labels.get('p1')).toBe('Picture 1');
    expect(labels.get('p2')).toBe('Picture 2');
    expect(labels.get('v1')).toBe('Video 1');
    expect(labels.get('a1')).toBe('Audio 1');
  });

  it('renumbers atomically when an earlier reference is removed', () => {
    const all: H3Reference[] = [
      { id: 'p1', kind: 'picture', role: 'subject', description: '' },
      { id: 'p2', kind: 'picture', role: 'subject', description: '' },
      { id: 'p3', kind: 'picture', role: 'subject', description: '' },
    ];
    const after = assignLabels(all.filter((r) => r.id !== 'p1'));
    expect(after.get('p2')).toBe('Picture 1');
    expect(after.get('p3')).toBe('Picture 2');
  });
});

describe('resolveTags', () => {
  const labels = assignLabels([{ id: 'hero', kind: 'subject', role: 'subject', description: '' }]);

  it('substitutes a placeholder with its current label', () => {
    expect(resolveTags('{{ref:hero}} turns away.', labels).text).toBe('<Subject 1> turns away.');
  });

  it('tolerates whitespace inside the placeholder', () => {
    expect(resolveTags('{{ref: hero }} waits.', labels).text).toBe('<Subject 1> waits.');
  });

  it('leaves an unknown placeholder intact and reports it', () => {
    const out = resolveTags('{{ref:ghost}} appears.', labels);
    expect(out.unresolved).toEqual(['ghost']);
    expect(out.text).toContain('{{ref:ghost}}');
  });

  it('flags a hand-written label as unrenumberable', () => {
    expect(resolveTags('<Picture 2> opens the shot.', labels).rawLabels).toEqual(['<Picture 2>']);
  });
});

describe('parseShots', () => {
  it('reads shot numbers and cut times', () => {
    const shots = parseShots('[Shot 1] Open. [Shot 2] At 00:03.500, cut to a close-up.');
    expect(shots).toHaveLength(2);
    expect(shots[0]?.cutTime).toBeNull();
    expect(shots[1]?.cutTime).toBeCloseTo(3.5);
  });
});

describe('checkShots', () => {
  it('accepts a well-formed body', () => {
    expect(checkShots('[Shot 1] Open. [Shot 2] At 00:03.000, cut.', 6)).toEqual([]);
  });

  it('reports a body with no shot marker', () => {
    expect(checkShots('Just prose.', 6)[0]?.category).toBe('no-shots');
  });

  it('rejects a timestamp on the first shot', () => {
    const warnings = checkShots('[Shot 1] At 00:00.000, open.', 6);
    expect(warnings.some((w) => w.category === 'shot-timestamp')).toBe(true);
  });

  it('rejects a later shot with no cut time', () => {
    const warnings = checkShots('[Shot 1] Open. [Shot 2] cut.', 6);
    expect(warnings.some((w) => w.message.includes('no cut time'))).toBe(true);
  });

  it('rejects cut times that do not strictly increase', () => {
    const warnings = checkShots(
      '[Shot 1] Open. [Shot 2] At 00:03.000, cut. [Shot 3] At 00:02.000, cut.',
      6,
    );
    expect(warnings.some((w) => w.message.includes('at or before'))).toBe(true);
  });

  it('rejects a cut at or past the duration', () => {
    const warnings = checkShots('[Shot 1] Open. [Shot 2] At 00:06.000, cut.', 6);
    expect(warnings.some((w) => w.message.includes('at or past'))).toBe(true);
  });

  it('reports out-of-sequence shot numbers', () => {
    const warnings = checkShots('[Shot 1] Open. [Shot 3] At 00:03.000, cut.', 6);
    expect(warnings.some((w) => w.category === 'shot-numbering')).toBe(true);
  });
});

describe('compileH3 — base modes', () => {
  it('T2VA emits the three core fields and no instruction line', () => {
    const out = compileH3(base());
    expect(out.mode).toBe('T2VA');
    expect(out.prompt.startsWith('integrated_multimodal_description:')).toBe(true);
    expect(out.prompt).toContain('overall_soundscape:');
    expect(out.prompt).toContain('non_diegetic_music:');
  });

  it('I2VA leads with the fixed first-frame instruction', () => {
    const out = compileH3(
      base({
        references: [picture('open', 'first_frame')],
        body: '[Shot 1] The woman in {{ref:open}} lifts her gaze.',
      }),
    );
    expect(out.prompt.split('\n')[0]).toBe(
      'For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.',
    );
  });

  it('separates the instruction from the fields with a blank line', () => {
    const out = compileH3(
      base({
        references: [picture('open', 'first_frame')],
        body: '[Shot 1] {{ref:open}} holds.',
      }),
    );
    expect(out.prompt.split('\n')[1]).toBe('');
  });

  it('FL2VA names the last shot and the effective duration', () => {
    const out = compileH3(
      base({
        durationSeconds: 8,
        references: [picture('a', 'first_frame'), picture('b', 'last_frame')],
        body: '[Shot 1] From {{ref:a}} the cyclist settles into {{ref:b}}.',
      }),
    );
    expect(out.mode).toBe('FL2VA');
    expect(out.prompt).toContain('Picture 1 (from Shot 1) aligns with the 0.00-second mark');
    expect(out.prompt).toContain('Picture 2 (from Shot 1) aligns with the 8.00-second mark');
  });

  it('FL2VA points the last frame at the final shot, not always the first', () => {
    const out = compileH3(
      base({
        durationSeconds: 8,
        references: [picture('a', 'first_frame'), picture('b', 'last_frame')],
        body: '[Shot 1] From {{ref:a}}. [Shot 2] At 00:04.000, cut and land on {{ref:b}}.',
      }),
    );
    expect(out.prompt).toContain('Picture 2 (from Shot 2)');
  });

  it('L2VA uses the bracketed instruction form', () => {
    const out = compileH3(
      base({
        references: [picture('end', 'last_frame')],
        body: '[Shot 1] The glass settles into {{ref:end}}.',
      }),
    );
    expect(out.prompt.split('\n')[0]).toBe(
      'How the reference pictures align with the target video — <Picture 1> (from [Shot 1]) aligns with the 6.00-second mark of the target video.',
    );
  });
});

describe('compileH3 — full reference', () => {
  const refs: H3Reference[] = [
    {
      id: 'hero',
      kind: 'subject',
      role: 'subject',
      description: 'is the young woman in the café, with long dark hair and a blue cardigan.',
      retention: 'fully_preserved',
      retentionNote: 'her hair, cardigan, and necklace are retained.',
      shots: [1, 2],
    },
    {
      id: 'voice',
      kind: 'audio',
      role: 'audio',
      description: 'is the voice-timbre reference for <Subject 1> (S1).',
      retention: 'reference',
      retentionNote: 'timbre only; the signal is not copied.',
    },
  ];

  const refInput = base({
    references: refs,
    taskTypes: ['reference generation', 'audio reference'],
    summary: 'The target video follows {{ref:hero}} through a quiet café.',
    styleOpening: 'The target video is in a cinematic style with soft lighting.',
    body: '[Shot 1] {{ref:hero}} sits by the window and speaks in the timbre of {{ref:voice}}.',
  });

  it('emits the six sections in the documented order', () => {
    const out = compileH3(refInput);
    expect(out.mode).toBe('Ref2VA');
    const order = [
      'subject_definitions:',
      'summary:',
      'retention_analysis:',
      'detailed_description:',
      'overall_soundscape:',
      'non_diegetic_music:',
    ];
    const positions = order.map((s) => out.prompt.indexOf(s));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('prefixes the summary with the joined task types', () => {
    expect(compileH3(refInput).prompt).toContain(
      '[reference generation + audio reference] The target video follows <Subject 1>',
    );
  });

  it('never repeats a task type in the prefix', () => {
    const out = compileH3({
      ...refInput,
      taskTypes: ['reference generation', 'reference generation'],
    });
    expect(out.prompt).toContain('[reference generation] ');
  });

  it('warns when no task type is supplied', () => {
    const out = compileH3({ ...refInput, taskTypes: [] });
    expect(out.warnings.some((w) => w.category === 'task-type')).toBe(true);
  });

  it('lists shot appearances for visible content but not for audio', () => {
    const out = compileH3(refInput);
    expect(out.prompt).toContain('<Subject 1> (appears in [Shot 1], [Shot 2]): fully_preserved');
    expect(out.prompt).toContain('<Audio 1>: reference');
  });

  it('places the style opening before the first shot', () => {
    const out = compileH3(refInput);
    const description = out.prompt.slice(out.prompt.indexOf('detailed_description:'));
    expect(description.indexOf('cinematic style')).toBeLessThan(description.indexOf('[Shot 1]'));
  });
});

describe('compileH3 — warnings', () => {
  it('reports a duration snapped onto the frame grid', () => {
    const out = compileH3(base({ durationSeconds: 6.05 }));
    expect(out.frames).toBe(145);
    expect(out.warnings.some((w) => w.category === 'duration')).toBe(true);
  });

  it('does not warn about a duration already on the grid', () => {
    expect(compileH3(base({ durationSeconds: 6 })).warnings).toEqual([]);
  });

  it('reports an unresolved placeholder', () => {
    const out = compileH3(base({ body: '[Shot 1] {{ref:ghost}} waits.' }));
    expect(out.warnings.some((w) => w.category === 'unresolved-reference')).toBe(true);
  });

  it('reports a reference that is defined but never cited', () => {
    const out = compileH3(
      base({ references: [picture('open', 'first_frame')], body: '[Shot 1] A street.' }),
    );
    expect(out.warnings.some((w) => w.category === 'uncited-reference')).toBe(true);
  });

  it('reports a literal label anywhere in the prompt, including the soundscape', () => {
    const out = compileH3(base({ soundscape: 'The ambience of <Audio 1> continues.' }));
    expect(out.warnings.some((w) => w.category === 'literal-label')).toBe(true);
  });

  it('carries shot-structure warnings through the compile', () => {
    const out = compileH3(base({ body: '[Shot 1] Open. [Shot 2] At 00:09.000, cut.' }));
    expect(out.warnings.some((w) => w.message.includes('at or past'))).toBe(true);
  });

  it('warns but still compiles when the duration is zero', () => {
    const out = compileH3(base({ durationSeconds: 0 }));
    expect(out.frames).toBe(0);
    expect(out.prompt).toContain('integrated_multimodal_description:');
  });
});
