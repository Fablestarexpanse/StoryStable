import { describe, expect, it } from 'vitest';
import { parseNote } from '../src/links.js';
import { compileH3 } from '../src/h3.js';
import { cameraPhrase, fps, parseShot, shotToH3Input, type Shot } from '../src/shots.js';

const shotNote = (frontmatter: string) =>
  parseNote({ path: 'Studio/Shots/010.md', source: `---\n${frontmatter}\n---\n` });

const MINIMAL = [
  'id: shot_010',
  'type: shot',
  'scene_id: scene_14',
  'order: 10',
  'status: planned',
  'purpose: Lan realises the ring is moving.',
  'duration:',
  '  target_seconds: 6',
  '  rate: { numerator: 24, denominator: 1 }',
].join('\n');

const parsed = (frontmatter: string): Shot => {
  const shot = parseShot(shotNote(frontmatter));
  if (!shot) throw new Error('expected a shot');
  return shot;
};

describe('parseShot', () => {
  it('ignores a note that is not a shot', () => {
    expect(parseShot(parseNote({ path: 'a.md', source: '---\ntype: scene\n---\n' }))).toBeNull();
  });

  it('reads the core fields', () => {
    const shot = parsed(MINIMAL);
    expect(shot.id).toBe('shot_010');
    expect(shot.sceneId).toBe('scene_14');
    expect(shot.order).toBe(10);
    expect(shot.status).toBe('planned');
    expect(shot.duration.targetSeconds).toBe(6);
    expect(fps(shot.duration.rate)).toBe(24);
  });

  it('falls back to 24fps when the rate is missing or nonsensical', () => {
    const shot = parsed(
      [
        'type: shot',
        'duration:',
        '  target_seconds: 6',
        '  rate: { numerator: 0, denominator: 1 }',
      ].join('\n'),
    );
    expect(fps(shot.duration.rate)).toBe(24);
  });

  it('accepts a non-integer rate exactly', () => {
    const shot = parsed(
      [
        'type: shot',
        'duration:',
        '  target_seconds: 6',
        '  rate: { numerator: 24000, denominator: 1001 }',
      ].join('\n'),
    );
    expect(fps(shot.duration.rate)).toBeCloseTo(23.976, 3);
  });

  it('survives a half-written shot rather than rejecting it', () => {
    const shot = parsed('type: shot');
    expect(shot.duration.targetSeconds).toBe(0);
    expect(shot.purpose).toBe('');
    expect(shot.camera.movement).toBeNull();
  });

  it('drops an unknown enum value instead of carrying it through', () => {
    const shot = parsed(
      ['type: shot', 'status: nonsense', 'camera:', '  movement: teleport'].join('\n'),
    );
    expect(shot.status).toBeNull();
    expect(shot.camera.movement).toBeNull();
  });

  it('drops dialogue entries missing a speaker or text', () => {
    const shot = parsed(
      [
        'type: shot',
        'dialogue:',
        '  - { character_id: char_lan, text: "It sees me." }',
        '  - { character_id: char_lan }',
        '  - { text: "orphaned" }',
      ].join('\n'),
    );
    expect(shot.dialogue).toHaveLength(1);
    expect(shot.dialogue[0]?.characterId).toBe('char_lan');
  });

  it('reads keyframes and the mode hint', () => {
    const shot = parsed(
      [
        'type: shot',
        'keyframes:',
        '  first_frame_asset_id: asset_open',
        '  last_frame_asset_id: asset_close',
        'renderer:',
        '  preferred: minimax_h3',
        '  mode_hint: fl2va',
      ].join('\n'),
    );
    expect(shot.firstFrameAssetId).toBe('asset_open');
    expect(shot.lastFrameAssetId).toBe('asset_close');
    expect(shot.modeHint).toBe('FL2VA');
  });

  it('treats an auto mode hint as no hint', () => {
    expect(parsed(['type: shot', 'renderer:', '  mode_hint: auto'].join('\n')).modeHint).toBeNull();
  });
});

describe('cameraPhrase', () => {
  const camera = (over: Partial<Shot['camera']> = {}): Shot['camera'] => ({
    movement: 'push_in',
    amplitude: null,
    speed: null,
    notes: '',
    ...over,
  });

  it('returns nothing when no movement is recorded', () => {
    expect(cameraPhrase(camera({ movement: null }))).toBeNull();
  });

  it('orders motion, amplitude, then speed', () => {
    expect(cameraPhrase(camera({ amplitude: 'small', speed: 'slow' }))?.text).toBe(
      'The camera pushes in with small amplitude at slow speed.',
    );
  });

  it('omits medium amplitude and medium speed as the guide directs', () => {
    expect(cameraPhrase(camera({ amplitude: 'medium', speed: 'medium' }))?.text).toBe(
      'The camera pushes in.',
    );
  });

  it('omits amplitude when it is none', () => {
    expect(cameraPhrase(camera({ amplitude: 'none' }))?.text).toBe('The camera pushes in.');
  });

  it('marks a directionless movement as needing a direction', () => {
    expect(cameraPhrase(camera({ movement: 'pan' }))?.needsDirection).toBe(true);
    expect(cameraPhrase(camera({ movement: 'push_in' }))?.needsDirection).toBe(false);
  });

  it('renders a static shot as held rather than moving', () => {
    expect(cameraPhrase(camera({ movement: 'static' }))?.text).toBe(
      'The camera holds a static shot.',
    );
  });
});

describe('shotToH3Input', () => {
  it('turns a first frame into a picture reference and routes to I2VA', () => {
    const shot = parsed([MINIMAL, 'keyframes:', '  first_frame_asset_id: asset_open'].join('\n'));
    const { input } = shotToH3Input(shot);
    expect(input.references).toHaveLength(1);
    expect(compileH3({ ...input, body: '[Shot 1] {{ref:asset_open}} holds.' }).mode).toBe('I2VA');
  });

  it('routes to FL2VA when both keyframes are present', () => {
    const shot = parsed(
      [
        MINIMAL,
        'keyframes:',
        '  first_frame_asset_id: asset_open',
        '  last_frame_asset_id: asset_close',
      ].join('\n'),
    );
    const { input } = shotToH3Input(shot);
    const out = compileH3({
      ...input,
      body: '[Shot 1] From {{ref:asset_open}} to {{ref:asset_close}}.',
    });
    expect(out.mode).toBe('FL2VA');
  });

  it('lets an explicit mode hint override the routed mode', () => {
    const shot = parsed([MINIMAL, 'renderer:', '  preferred: h3', '  mode_hint: t2va'].join('\n'));
    expect(shotToH3Input(shot).input.mode).toBe('T2VA');
  });

  it('carries the frame rate through to the compiler', () => {
    const shot = parsed(
      [
        'type: shot',
        'purpose: x',
        'duration:',
        '  target_seconds: 6',
        '  rate: { numerator: 30, denominator: 1 }',
      ].join('\n'),
    );
    const { input } = shotToH3Input(shot);
    expect(compileH3({ ...input, body: '[Shot 1] A street.' }).frames).toBe(180);
  });

  it('builds the soundscape from ambience and effects', () => {
    const shot = parsed(
      [MINIMAL, 'sound:', '  ambience: ["Low hull hum."]', '  sfx: ["A bolt ticks."]'].join('\n'),
    );
    expect(shotToH3Input(shot).input.soundscape).toBe('Low hull hum. A bolt ticks.');
  });

  it('falls back to N/A rather than an empty soundscape', () => {
    expect(shotToH3Input(parsed(MINIMAL)).input.soundscape).toBe('N/A');
  });

  it('uses a non-diegetic instruction as the music field', () => {
    const shot = parsed(
      [
        MINIMAL,
        'sound:',
        '  music:',
        '    mode: non_diegetic',
        '    instruction: Low strings.',
      ].join('\n'),
    );
    expect(shotToH3Input(shot).input.music).toBe('Low strings.');
  });

  it('reports diegetic music as belonging in the description', () => {
    const shot = parsed(
      [MINIMAL, 'sound:', '  music:', '    mode: diegetic', '    instruction: A radio plays.'].join(
        '\n',
      ),
    );
    const { input, gaps } = shotToH3Input(shot);
    expect(input.music).toBe('N/A');
    expect(gaps.some((g) => g.includes('diegetic'))).toBe(true);
  });

  it('reports a missing duration and purpose', () => {
    const { gaps } = shotToH3Input(parsed('type: shot'));
    expect(gaps.some((g) => g.includes('duration'))).toBe(true);
    expect(gaps.some((g) => g.includes('purpose'))).toBe(true);
  });

  it('reports a directionless camera movement as a gap', () => {
    const shot = parsed([MINIMAL, 'camera:', '  movement: pan'].join('\n'));
    expect(shotToH3Input(shot).gaps.some((g) => g.includes('direction'))).toBe(true);
  });

  it('accepts a direction recorded in camera notes', () => {
    const shot = parsed(
      [MINIMAL, 'camera:', '  movement: pan', '  notes: pans right toward the doorway'].join('\n'),
    );
    expect(shotToH3Input(shot).gaps.some((g) => g.includes('direction'))).toBe(false);
  });

  it('reports an unresolved reference set rather than compiling without it', () => {
    const shot = parsed([MINIMAL, 'reference_set_id: refset_lan'].join('\n'));
    expect(shotToH3Input(shot).gaps.some((g) => g.includes('refset_lan'))).toBe(true);
  });

  it('treats a supplied reference list as resolving the set', () => {
    const shot = parsed([MINIMAL, 'reference_set_id: refset_lan'].join('\n'));
    const { gaps } = shotToH3Input(shot, {
      references: [{ id: 'lan', kind: 'subject', role: 'subject', description: 'is Lan.' }],
    });
    expect(gaps.some((g) => g.includes('refset_lan'))).toBe(false);
  });

  it('places keyframes before supplied references so labels stay predictable', () => {
    const shot = parsed([MINIMAL, 'keyframes:', '  first_frame_asset_id: asset_open'].join('\n'));
    const { input } = shotToH3Input(shot, {
      references: [{ id: 'extra', kind: 'picture', role: 'storyboard', description: 'x' }],
    });
    const out = compileH3({ ...input, body: '[Shot 1] {{ref:asset_open}} {{ref:extra}}' });
    expect(out.labels.asset_open).toBe('Picture 1');
    expect(out.labels.extra).toBe('Picture 2');
  });

  it('produces a compilable prompt end to end', () => {
    const shot = parsed(
      [
        MINIMAL,
        'camera:',
        '  movement: push_in',
        '  amplitude: small',
        '  speed: slow',
        'sound:',
        '  ambience: ["Low hull hum."]',
      ].join('\n'),
    );
    const { input } = shotToH3Input(shot, {
      body: '[Shot 1] Live-action, cinematic, Lan watches the outer ring turn. The camera pushes in with small amplitude at slow speed.',
    });
    const out = compileH3(input);
    expect(out.mode).toBe('T2VA');
    expect(out.warnings).toEqual([]);
    expect(out.prompt).toContain('integrated_multimodal_description:');
    expect(out.prompt).toContain('overall_soundscape: Low hull hum.');
  });
});
