import { describe, expect, it } from 'vitest';
import { parseFountain, sceneSummaries } from '../src/fountain.js';
import { parseNote } from '../src/links.js';
import { parseFrontmatter } from '../src/frontmatter.js';
import { linkScenes, sceneCapsules, storyDiagnostics, createSceneCapsule } from '../src/scenes.js';

const note = (path: string, fm: string, body = '') =>
  parseNote({ path, source: `---\n${fm}\n---\n${body}` });

const script = parseFountain(
  [
    'INT. COCKPIT - NIGHT #14#',
    '',
    'LAN',
    'It sees me.',
    '',
    'EXT. OUTER RING - DAY #15#',
    '',
    'Debris turns.',
  ].join('\n'),
);

const lan = note('World/Characters/Lan.md', 'title: Lan\nid: char_lan');

describe('sceneCapsules', () => {
  it('selects only type: scene notes', () => {
    const capsule = note('Story/Scenes/a.md', 'title: A\ntype: scene');
    expect(sceneCapsules([capsule, lan]).map((n) => n.path)).toEqual(['Story/Scenes/a.md']);
  });
});

describe('linkScenes', () => {
  it('matches a capsule by scene_number', () => {
    const capsule = note('Story/Scenes/14.md', 'title: Anything\ntype: scene\nscene_number: "14"');
    const links = linkScenes(script, [capsule]);
    expect(links[0]?.capsule?.path).toBe('Story/Scenes/14.md');
    expect(links[1]?.capsule).toBeNull();
  });

  it('matches by explicit heading', () => {
    const capsule = note(
      'Story/Scenes/x.md',
      'title: Whatever\ntype: scene\nheading: "EXT. OUTER RING - DAY"',
    );
    const links = linkScenes(script, [capsule]);
    expect(links[1]?.capsule?.path).toBe('Story/Scenes/x.md');
  });

  it('falls back to the capsule title matching the heading', () => {
    const capsule = note('Story/Scenes/y.md', 'title: "INT. COCKPIT - NIGHT"\ntype: scene');
    expect(linkScenes(script, [capsule])[0]?.capsule?.path).toBe('Story/Scenes/y.md');
  });

  it('matching is case-insensitive', () => {
    const capsule = note(
      'Story/Scenes/z.md',
      'title: Z\ntype: scene\nheading: "int. cockpit - night"',
    );
    expect(linkScenes(script, [capsule])[0]?.capsule).not.toBeNull();
  });

  it('never lets two scenes claim the same capsule', () => {
    const twin = parseFountain('INT. ROOM\n\nA.\n\nINT. ROOM\n\nB.');
    const capsule = note('Story/Scenes/room.md', 'title: "INT. ROOM"\ntype: scene');
    const links = linkScenes(twin, [capsule]);
    const claimed = links.filter((l) => l.capsule !== null);
    expect(claimed).toHaveLength(1);
  });

  it('keeps a capsule that matches no scene rather than dropping it', () => {
    const orphan = note('Story/Scenes/cut.md', 'title: "INT. DELETED"\ntype: scene');
    const links = linkScenes(script, [orphan]);
    const dangling = links.find((l) => l.scene === null);
    expect(dangling?.capsule?.path).toBe('Story/Scenes/cut.md');
  });

  it('returns every scene even with no capsules at all', () => {
    expect(linkScenes(script, []).map((l) => l.scene?.heading)).toEqual([
      'INT. COCKPIT - NIGHT',
      'EXT. OUTER RING - DAY',
    ]);
  });
});

describe('storyDiagnostics', () => {
  it('every finding is a warning or advisory, never an error', () => {
    // Spec §6.8 makes story diagnostics advisory by design — an unfinished
    // scene is a normal state of work, so nothing here may block.
    const allowed: string[] = ['warning', 'advisory'];
    const findings = storyDiagnostics(script, []);
    expect(findings.filter((f) => !allowed.includes(f.severity))).toEqual([]);
  });

  it('flags a scene with no capsule as advisory, not a blocker', () => {
    const findings = storyDiagnostics(script, []);
    const missing = findings.filter((f) => f.category === 'no-capsule');
    expect(missing).toHaveLength(2);
    expect(missing[0]?.severity).toBe('advisory');
  });

  it('warns about a capsule matching no scene', () => {
    const orphan = note('Story/Scenes/cut.md', 'title: "INT. GONE"\ntype: scene');
    const finding = storyDiagnostics(script, [orphan]).find((f) => f.category === 'orphan-capsule');
    expect(finding?.severity).toBe('warning');
    expect(finding?.path).toBe('Story/Scenes/cut.md');
  });

  it('warns when start and end state are identical', () => {
    const capsule = note(
      'Story/Scenes/14.md',
      'title: T\ntype: scene\nscene_number: "14"\nintent: X\ncharacter_ids: [char_lan]\nstart_state_id: s1\nend_state_id: s1',
    );
    const finding = storyDiagnostics(script, [capsule, lan]).find(
      (f) => f.category === 'no-state-change',
    );
    expect(finding?.severity).toBe('warning');
    expect(finding?.message).toContain('nothing changes');
  });

  it('advises when no state is recorded at all', () => {
    const capsule = note(
      'Story/Scenes/14.md',
      'title: T\ntype: scene\nscene_number: "14"\nintent: X\ncharacter_ids: [char_lan]',
    );
    const finding = storyDiagnostics(script, [capsule, lan]).find(
      (f) => f.category === 'no-state-change',
    );
    expect(finding?.severity).toBe('advisory');
  });

  it('warns about a speaker missing from character_ids', () => {
    const capsule = note(
      'Story/Scenes/14.md',
      'title: T\ntype: scene\nscene_number: "14"\nintent: X\ncharacter_ids: []',
    );
    const finding = storyDiagnostics(script, [capsule, lan]).find(
      (f) => f.category === 'unlisted-speaker',
    );
    expect(finding?.message).toContain('LAN');
  });

  it('resolves a speaker name to its character id before complaining', () => {
    // The screenplay says LAN; the capsule lists char_lan. That is a match.
    const capsule = note(
      'Story/Scenes/14.md',
      'title: T\ntype: scene\nscene_number: "14"\nintent: X\ncharacter_ids: [char_lan]',
    );
    const findings = storyDiagnostics(script, [capsule, lan]);
    expect(findings.filter((f) => f.category === 'unlisted-speaker')).toHaveLength(0);
  });

  it('advises when a capsule records no intent', () => {
    const capsule = note(
      'Story/Scenes/14.md',
      'title: T\ntype: scene\nscene_number: "14"\ncharacter_ids: [char_lan]',
    );
    const finding = storyDiagnostics(script, [capsule, lan]).find(
      (f) => f.category === 'no-intent',
    );
    expect(finding?.severity).toBe('advisory');
  });

  it('sorts warnings before advisories', () => {
    const orphan = note('Story/Scenes/cut.md', 'title: "INT. GONE"\ntype: scene');
    const severities = storyDiagnostics(script, [orphan]).map((f) => f.severity);
    expect(severities.indexOf('warning')).toBeLessThan(severities.indexOf('advisory'));
  });

  it('reports nothing for an empty screenplay and no capsules', () => {
    expect(storyDiagnostics(parseFountain(''), [])).toEqual([]);
  });
});

describe('createSceneCapsule', () => {
  const scenes = sceneSummaries(script);

  it('produces a note whose frontmatter parses cleanly', () => {
    const scene = scenes[0];
    if (!scene) throw new Error('missing scene');
    const capsule = createSceneCapsule(scene, 14, '2026-08-10T00:00:00Z');
    const parsed = parseFrontmatter(capsule.source);
    expect(parsed.errors).toEqual([]);
    expect(parsed.frontmatter).toMatchObject({
      type: 'scene',
      heading: 'INT. COCKPIT - NIGHT',
      scene_number: '14',
      order: 14,
    });
  });

  it('lands in Story/Scenes and is named for the scene number', () => {
    const scene = scenes[0];
    if (!scene) throw new Error('missing scene');
    expect(createSceneCapsule(scene, 14, 'now').path).toBe('Story/Scenes/14.md');
  });

  it('falls back to the order when a scene has no number', () => {
    const unnumbered = sceneSummaries(parseFountain('INT. ROOM - DAY\n\nAction.'))[0];
    if (!unnumbered) throw new Error('missing scene');
    expect(createSceneCapsule(unnumbered, 7, 'now').path).toBe('Story/Scenes/007.md');
  });

  it('seeds character_ids from the scene speakers', () => {
    const scene = scenes[0];
    if (!scene) throw new Error('missing scene');
    const parsed = parseFrontmatter(createSceneCapsule(scene, 14, 'now').source);
    expect(parsed.frontmatter.character_ids).toEqual(['LAN']);
  });

  it('prefers explicitly supplied character ids over raw cue names', () => {
    const scene = scenes[0];
    if (!scene) throw new Error('missing scene');
    const parsed = parseFrontmatter(createSceneCapsule(scene, 14, 'now', ['char_lan']).source);
    expect(parsed.frontmatter.character_ids).toEqual(['char_lan']);
  });

  it('links back to the scene it was made from', () => {
    const scene = scenes[0];
    if (!scene) throw new Error('missing scene');
    const capsule = createSceneCapsule(scene, 14, 'now');
    const parsed = parseNote({ path: capsule.path, source: capsule.source });
    expect(linkScenes(script, [parsed])[0]?.capsule?.path).toBe(capsule.path);
  });
});
