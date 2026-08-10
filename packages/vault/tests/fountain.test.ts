import { describe, expect, it } from 'vitest';
import {
  parseFountain,
  serializeFountain,
  sceneSummaries,
  speakingCharacters,
} from '../src/fountain.js';

const kinds = (source: string) => parseFountain(source).elements.map((e) => e.kind);
const texts = (source: string) => parseFountain(source).elements.map((e) => e.text);

describe('title page', () => {
  it('parses key/value pairs and lowercases keys', () => {
    const { titlePage } = parseFountain('Title: First Recognition\nAuthor: Brian\n\nINT. COCKPIT');
    expect(titlePage.title).toBe('First Recognition');
    expect(titlePage.author).toBe('Brian');
  });

  it('does not treat body text as a title page', () => {
    const { titlePage, elements } = parseFountain('INT. COCKPIT - NIGHT\n\nLan waits.');
    expect(titlePage).toEqual({});
    expect(elements[0]?.kind).toBe('scene_heading');
  });

  it('keeps indented continuation lines with their key', () => {
    const { titlePage } = parseFountain('Contact:\n\tOne line\n\tTwo line\n\nAction.');
    expect(titlePage.contact).toBe('One line\nTwo line');
  });
});

describe('scene headings', () => {
  it('recognizes the standard prefixes', () => {
    for (const heading of [
      'INT. COCKPIT - NIGHT',
      'EXT. RING - DAY',
      'INT./EXT. SHIP',
      'EST. STATION',
      'I/E. AIRLOCK',
    ]) {
      expect(kinds(`${heading}\n\nAction.`)[0], heading).toBe('scene_heading');
    }
  });

  it('supports a forced heading with a leading dot', () => {
    const parsed = parseFountain('.THE VOID\n\nAction.');
    expect(parsed.elements[0]?.kind).toBe('scene_heading');
    expect(parsed.elements[0]?.text).toBe('THE VOID');
  });

  it('does not treat an ellipsis as a forced heading', () => {
    expect(kinds('...and then silence.')[0]).toBe('action');
  });

  it('captures a trailing scene number', () => {
    const parsed = parseFountain('INT. COCKPIT - NIGHT #14A#\n\nAction.');
    expect(parsed.elements[0]?.sceneNumber).toBe('14A');
    expect(parsed.elements[0]?.text).toBe('INT. COCKPIT - NIGHT');
  });
});

describe('dialogue', () => {
  const scene = 'INT. COCKPIT - NIGHT\n\nLAN\n(quietly)\nIt sees me.\n\nAction resumes.';

  it('parses character, parenthetical and dialogue', () => {
    expect(kinds(scene)).toEqual([
      'scene_heading',
      'character',
      'parenthetical',
      'dialogue',
      'action',
    ]);
  });

  it('treats an uppercase line with nothing after it as action', () => {
    // A lone shout is not a character cue.
    expect(kinds('INT. ROOM\n\nSILENCE.\n\n')).toEqual(['scene_heading', 'action']);
  });

  it('supports a forced character cue with @', () => {
    const parsed = parseFountain('INT. ROOM\n\n@McAvoy\nHello.');
    expect(parsed.elements[1]).toMatchObject({ kind: 'character', text: 'McAvoy' });
  });

  it('marks dual dialogue and strips the caret', () => {
    const parsed = parseFountain('INT. ROOM\n\nLAN\nNow.\n\nMIRA ^\nNow.');
    const mira = parsed.elements.find((e) => e.kind === 'character' && e.text === 'MIRA');
    expect(mira?.dual).toBe(true);
  });

  it('ends the dialogue block at a blank line', () => {
    const parsed = parseFountain('INT. ROOM\n\nLAN\nOne.\n\nThe ship groans.');
    expect(parsed.elements[parsed.elements.length - 1]).toMatchObject({
      kind: 'action',
      text: 'The ship groans.',
    });
  });
});

describe('transitions', () => {
  it('recognizes an uppercase TO: transition', () => {
    expect(kinds('INT. ROOM\n\nCUT TO:')).toContain('transition');
  });

  it('supports a forced transition with >', () => {
    const parsed = parseFountain('> FADE OUT.');
    expect(parsed.elements[0]).toMatchObject({ kind: 'transition', text: 'FADE OUT.' });
  });

  it('does not treat centered text as a transition', () => {
    expect(kinds('> THE END <')[0]).toBe('action');
  });
});

describe('structure markers', () => {
  it('parses sections with depth', () => {
    const parsed = parseFountain('# Act One\n\n## Sequence A\n\nAction.');
    expect(parsed.elements[0]).toMatchObject({ kind: 'section', text: 'Act One', depth: 1 });
    expect(parsed.elements[1]).toMatchObject({ kind: 'section', text: 'Sequence A', depth: 2 });
  });

  it('parses a synopsis', () => {
    const parsed = parseFountain('= Lan realizes he is seen.\n\nAction.');
    expect(parsed.elements[0]).toMatchObject({
      kind: 'synopsis',
      text: 'Lan realizes he is seen.',
    });
  });

  it('parses a page break', () => {
    expect(kinds('Action.\n\n===\n\nMore.')).toContain('page_break');
  });
});

describe('notes and boneyard', () => {
  it('extracts inline notes without leaving them in the text', () => {
    const parsed = parseFountain('INT. ROOM\n\nHe waits. [[check the glove]]');
    expect(parsed.elements.some((e) => e.kind === 'note' && e.text === 'check the glove')).toBe(
      true,
    );
    const action = parsed.elements.find((e) => e.kind === 'action');
    expect(action?.text).not.toContain('check the glove');
  });

  it('removes boneyard comments entirely', () => {
    const parsed = parseFountain('INT. ROOM\n\n/* cut this whole beat */\n\nHe waits.');
    expect(texts('INT. ROOM\n\n/* cut this */\n\nHe waits.')).not.toContain('cut this');
    expect(parsed.elements.some((e) => e.text === 'He waits.')).toBe(true);
  });

  it('keeps line offsets stable across a multi-line boneyard', () => {
    const parsed = parseFountain('INT. ROOM\n\n/* one\ntwo\nthree */\n\nHe waits.');
    const action = parsed.elements.find((e) => e.text === 'He waits.');
    // Source line 6, not shifted up by the removed comment.
    expect(action?.line).toBe(6);
  });
});

describe('sceneSummaries', () => {
  const script = [
    'INT. COCKPIT - NIGHT #14#',
    '',
    'LAN',
    'It sees me.',
    '',
    'MIRA',
    'What does?',
    '',
    'EXT. OUTER RING - DAY',
    '',
    'Debris turns.',
  ].join('\n');

  it('splits the screenplay into scenes', () => {
    const scenes = sceneSummaries(parseFountain(script));
    expect(scenes.map((s) => s.heading)).toEqual(['INT. COCKPIT - NIGHT', 'EXT. OUTER RING - DAY']);
  });

  it('collects speaking characters per scene, in order', () => {
    const scenes = sceneSummaries(parseFountain(script));
    expect(scenes[0]?.characters).toEqual(['LAN', 'MIRA']);
    expect(scenes[1]?.characters).toEqual([]);
  });

  it('extracts setting, time of day and scene number', () => {
    const scene = sceneSummaries(parseFountain(script))[0];
    expect(scene?.setting?.toUpperCase()).toContain('INT');
    expect(scene?.timeOfDay).toBe('NIGHT');
    expect(scene?.sceneNumber).toBe('14');
  });

  it('ignores content before the first heading rather than crashing', () => {
    expect(sceneSummaries(parseFountain('Orphan action.\n\nINT. ROOM'))).toHaveLength(1);
  });
});

describe('speakingCharacters', () => {
  it('lists each character once, in first-appearance order', () => {
    const parsed = parseFountain('INT. A\n\nMIRA\nHi.\n\nLAN\nHi.\n\nMIRA\nAgain.');
    expect(speakingCharacters(parsed)).toEqual(['MIRA', 'LAN']);
  });
});

describe('serializeFountain', () => {
  it('round-trips structure through parse → serialize → parse', () => {
    const source = [
      'Title: Test',
      '',
      '# Act One',
      '',
      'INT. COCKPIT - NIGHT #14#',
      '',
      'LAN',
      '(quietly)',
      'It sees me.',
      '',
      'CUT TO:',
    ].join('\n');
    const first = parseFountain(source);
    const second = parseFountain(serializeFountain(first));
    expect(second.elements.map((e) => ({ kind: e.kind, text: e.text }))).toEqual(
      first.elements.map((e) => ({ kind: e.kind, text: e.text })),
    );
    expect(second.titlePage).toEqual(first.titlePage);
  });

  it('keeps a dialogue block together without blank lines inside it', () => {
    const parsed = parseFountain('INT. A\n\nLAN\n(quietly)\nNow.');
    const out = serializeFountain(parsed);
    expect(out).toContain('LAN\n(quietly)\nNow.');
  });

  it('preserves the dual-dialogue caret', () => {
    const parsed = parseFountain('INT. A\n\nLAN\nNow.\n\nMIRA ^\nNow.');
    expect(serializeFountain(parsed)).toContain('MIRA ^');
  });

  it('handles an empty screenplay', () => {
    expect(parseFountain('').elements).toEqual([]);
    expect(serializeFountain({ titlePage: {}, elements: [] })).toBe('\n');
  });
});
