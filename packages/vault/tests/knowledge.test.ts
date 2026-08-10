import { describe, expect, it } from 'vitest';
import { parseNote } from '../src/links.js';
import {
  buildKnowledgeModel,
  stateAt,
  beliefsFor,
  spoilersFor,
  isUnknownValue,
  AUDIENCE,
} from '../src/knowledge.js';

const note = (path: string, fm: string) => parseNote({ path, source: `---\n${fm}\n---\n` });

const scene14 = note('Story/Scenes/S14.md', 'title: S14\nid: scene_014\ntype: scene\norder: 14');
const scene16 = note('Story/Scenes/S16.md', 'title: S16\nid: scene_016\ntype: scene\norder: 16');
const lan = note('World/Characters/Lan.md', 'title: Lan\nid: char_lan');
const mira = note('World/Characters/Mira.md', 'title: Mira\nid: char_mira');

const snap14 = note(
  'Production/StateSnapshots/s14-end.md',
  [
    'title: S14 end',
    'id: state_s14_end',
    'type: state_snapshot',
    'story_position:',
    '  scene_id: scene_014',
    '  phase: end',
    'world_state:',
    '  char_lan:',
    '    left_hand: burned',
    '  ship_01:',
    '    reactor_percent: 71',
    'knowledge:',
    '  audience:',
    '    fablestar_recognizes_lan: true',
    '    builders_identity: unknown',
    '  char_lan:',
    '    fablestar_recognizes_him: true',
    '    builders_identity: unknown',
    '  char_mira:',
    '    fablestar_recognizes_lan: unknown',
  ].join('\n'),
);

const snap16 = note(
  'Production/StateSnapshots/s16-end.md',
  [
    'title: S16 end',
    'id: state_s16_end',
    'type: state_snapshot',
    'story_position:',
    '  scene_id: scene_016',
    '  phase: end',
    'world_state:',
    '  char_lan:',
    '    left_hand: healing',
    'knowledge:',
    '  char_mira:',
    '    fablestar_recognizes_lan: true',
  ].join('\n'),
);

const base = [scene14, scene16, lan, mira, snap14, snap16];

describe('isUnknownValue', () => {
  it('treats unknown markers, null and false as not-known', () => {
    for (const v of ['unknown', 'Unknown', ' none ', '', null, false]) {
      expect(isUnknownValue(v as never), String(v)).toBe(true);
    }
  });

  it('treats real values as known', () => {
    for (const v of [true, 'burned', 0, 71]) {
      expect(isUnknownValue(v as never), String(v)).toBe(false);
    }
  });
});

describe('buildKnowledgeModel', () => {
  const model = buildKnowledgeModel(base);

  it('collects snapshots in scene order', () => {
    expect(model.snapshots.map((s) => s.sceneId)).toEqual(['scene_014', 'scene_016']);
  });

  it('flattens world state to entity.property paths', () => {
    expect(model.snapshots[0]?.worldState).toMatchObject({
      'char_lan.left_hand': 'burned',
      'ship_01.reactor_percent': 71,
    });
  });

  it('lists observers with audience first', () => {
    expect(model.observers[0]).toBe(AUDIENCE);
    expect(model.observers).toContain('char_lan');
  });

  it('collects every fact key', () => {
    expect(model.facts).toContain('fablestar_recognizes_lan');
    expect(model.facts).toContain('builders_identity');
  });

  it('reports no issues for a well-formed set', () => {
    expect(model.issues).toEqual([]);
  });

  it('warns when a snapshot is anchored to an unknown scene', () => {
    const orphan = note(
      'Production/StateSnapshots/x.md',
      'title: X\nid: s_x\ntype: state_snapshot\nstory_position:\n  scene_id: scene_999\n  phase: end',
    );
    const issues = buildKnowledgeModel([...base, orphan]).issues;
    expect(issues.some((i) => i.message.includes('unknown scene "scene_999"'))).toBe(true);
  });

  it('warns when story_position.scene_id is missing', () => {
    const bad = note('Production/StateSnapshots/b.md', 'title: B\nid: s_b\ntype: state_snapshot');
    const issues = buildKnowledgeModel([bad]).issues;
    expect(issues[0]?.message).toContain('no story_position.scene_id');
  });

  it('warns on duplicate snapshots for the same scene and phase', () => {
    const dup = note(
      'Production/StateSnapshots/dup.md',
      'title: D\nid: s_d\ntype: state_snapshot\nstory_position:\n  scene_id: scene_014\n  phase: end',
    );
    const issues = buildKnowledgeModel([...base, dup]).issues;
    expect(issues.some((i) => i.message.includes('duplicate snapshot'))).toBe(true);
  });

  it('flags knowledge recorded for an observer that does not exist', () => {
    const ghost = note(
      'Production/StateSnapshots/g.md',
      'title: G\nid: s_g\ntype: state_snapshot\nstory_position:\n  scene_id: scene_014\n  phase: start\nknowledge:\n  char_nobody:\n    x: true',
    );
    const issues = buildKnowledgeModel([...base, ghost]).issues;
    expect(issues.some((i) => i.message.includes('unknown observer "char_nobody"'))).toBe(true);
  });

  it('flags knowledge regression as an advisory question, not an error', () => {
    const forgets = note(
      'Production/StateSnapshots/s18.md',
      [
        'title: S18',
        'id: s_18',
        'type: state_snapshot',
        'story_position:',
        '  scene_id: scene_018',
        '  phase: end',
        'knowledge:',
        '  char_lan:',
        '    fablestar_recognizes_him: unknown',
      ].join('\n'),
    );
    const scene18 = note(
      'Story/Scenes/S18.md',
      'title: S18\nid: scene_018\ntype: scene\norder: 18',
    );
    const issues = buildKnowledgeModel([...base, scene18, forgets]).issues;
    const regression = issues.find((i) => i.message.includes('knew "fablestar_recognizes_him"'));
    expect(regression?.severity).toBe('advisory');
  });

  it('sorts unanchored snapshots last rather than dropping them', () => {
    const orphan = note(
      'Production/StateSnapshots/z.md',
      'title: Z\nid: s_z\ntype: state_snapshot\nstory_position:\n  scene_id: scene_999\n  phase: end',
    );
    const model2 = buildKnowledgeModel([...base, orphan]);
    expect(model2.snapshots[model2.snapshots.length - 1]?.sceneId).toBe('scene_999');
  });

  it('ignores notes that are not state snapshots', () => {
    expect(buildKnowledgeModel([lan, mira]).snapshots).toHaveLength(0);
  });
});

describe('stateAt', () => {
  const model = buildKnowledgeModel(base);

  it('accumulates snapshots up to the requested scene', () => {
    const early = stateAt(model, 'scene_014');
    expect(early.worldState['char_lan.left_hand']).toBe('burned');
    expect(early.knowledge.char_mira?.fablestar_recognizes_lan).toBe('unknown');
  });

  it('later snapshots override earlier values', () => {
    const late = stateAt(model, 'scene_016');
    expect(late.worldState['char_lan.left_hand']).toBe('healing');
    expect(late.knowledge.char_mira?.fablestar_recognizes_lan).toBe(true);
  });

  it('accumulates everything when no scene is given', () => {
    expect(stateAt(model, null).worldState['char_lan.left_hand']).toBe('healing');
  });
});

describe('beliefsFor', () => {
  const model = buildKnowledgeModel(base);

  it('classifies known and unknown beliefs', () => {
    const beliefs = beliefsFor(model, 'char_lan', 'scene_014');
    const byFact = new Map(beliefs.map((b) => [b.fact, b]));
    expect(byFact.get('fablestar_recognizes_him')?.kind).toBe('known');
    expect(byFact.get('builders_identity')?.kind).toBe('unknown');
  });

  it('detects a false belief against recorded world truth', () => {
    const wrong = note(
      'Production/StateSnapshots/false.md',
      [
        'title: F',
        'id: s_f',
        'type: state_snapshot',
        'story_position:',
        '  scene_id: scene_014',
        '  phase: mid',
        'world_state:',
        '  char_lan:',
        '    left_hand: burned',
        'knowledge:',
        '  char_mira:',
        '    char_lan.left_hand: fine',
      ].join('\n'),
    );
    const model2 = buildKnowledgeModel([scene14, lan, mira, wrong]);
    const belief = beliefsFor(model2, 'char_mira', 'scene_014').find(
      (b) => b.fact === 'char_lan.left_hand',
    );
    expect(belief?.kind).toBe('false_belief');
    expect(belief?.truth).toBe('burned');
  });

  it('does not call a belief false when world truth is unrecorded', () => {
    const beliefs = beliefsFor(model, AUDIENCE, 'scene_014');
    const belief = beliefs.find((b) => b.fact === 'fablestar_recognizes_lan');
    expect(belief?.kind).toBe('known');
    expect(belief?.truth).toBeUndefined();
  });
});

describe('spoilersFor', () => {
  const model = buildKnowledgeModel(base);

  it('lists what the audience knows that a character does not', () => {
    expect(spoilersFor(model, 'char_mira', 'scene_014')).toEqual(['fablestar_recognizes_lan']);
  });

  it('drops a fact from the spoiler set once the character learns it', () => {
    expect(spoilersFor(model, 'char_mira', 'scene_016')).toEqual([]);
  });

  it('never reports facts the audience itself does not know', () => {
    expect(spoilersFor(model, 'char_lan', 'scene_014')).not.toContain('builders_identity');
  });

  it('returns an empty list for an unknown character rather than throwing', () => {
    expect(spoilersFor(model, 'char_nobody', 'scene_014')).toEqual(['fablestar_recognizes_lan']);
  });
});
