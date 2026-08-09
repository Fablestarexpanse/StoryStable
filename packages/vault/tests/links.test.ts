import { describe, expect, it } from 'vitest';
import { parseNote, buildLinkIndex } from '../src/links.js';

const note = (path: string, source: string) => parseNote({ path, source });

describe('parseNote', () => {
  it('derives stem and title, preferring frontmatter title', () => {
    const n = note('World/Characters/Lan.md', '---\ntitle: Lan the Pilot\n---\nBody');
    expect(n.stem).toBe('Lan');
    expect(n.title).toBe('Lan the Pilot');
  });

  it('collects string aliases only', () => {
    const n = note('a.md', '---\naliases: [Pilot, 7]\n---\n');
    expect(n.aliases).toEqual(['Pilot']);
  });
});

describe('buildLinkIndex', () => {
  const lan = note(
    'World/Characters/Lan.md',
    '---\ntitle: Lan\naliases: [The Conduit]\n---\nAllied with [[Mira]]. Flies near [[Outer Ring]].',
  );
  const mira = note('World/Characters/Mira.md', '---\ntitle: Mira\n---\nKnows [[The Conduit]].');
  const ring = note('World/Locations/Outer Ring.md', '---\ntitle: Outer Ring\n---\n');

  const index = buildLinkIndex([lan, mira, ring]);

  it('resolves by stem/title', () => {
    const targets = index.resolved.filter((r) => r.from === lan.path).map((r) => r.to);
    expect(targets).toEqual(['World/Characters/Mira.md', 'World/Locations/Outer Ring.md']);
  });

  it('resolves by alias', () => {
    const viaAlias = index.resolved.find((r) => r.from === mira.path);
    expect(viaAlias?.to).toBe('World/Characters/Lan.md');
  });

  it('builds backlinks', () => {
    expect(index.backlinks.get('World/Characters/Lan.md')).toEqual(['World/Characters/Mira.md']);
    expect(index.backlinks.get('World/Characters/Mira.md')).toEqual(['World/Characters/Lan.md']);
  });

  it('collects unresolved links', () => {
    const broken = note('x.md', '[[Nobody Home]]');
    const idx = buildLinkIndex([broken]);
    expect(idx.unresolved).toHaveLength(1);
    expect(idx.unresolved[0]?.link.target).toBe('Nobody Home');
  });

  it('resolution is case-insensitive', () => {
    const a = note('A.md', '[[mira]]');
    const idx = buildLinkIndex([a, mira]);
    expect(idx.resolved[0]?.to).toBe('World/Characters/Mira.md');
  });

  it('exact path beats stem collision', () => {
    const one = note('Notes/Ring.md', '');
    const two = note('Other/Ring.md', '');
    const src = note('src.md', '[[Other/Ring]]');
    const idx = buildLinkIndex([one, two, src]);
    expect(idx.resolved[0]?.to).toBe('Other/Ring.md');
  });

  it('ambiguous stems resolve deterministically to the shortest path', () => {
    const one = note('B/Ring.md', '');
    const two = note('Longer/Ring.md', '');
    const src = note('src.md', '[[Ring]]');
    const idx = buildLinkIndex([src, two, one]);
    expect(idx.resolved[0]?.to).toBe('B/Ring.md');
  });
});
