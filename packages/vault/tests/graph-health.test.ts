import { describe, expect, it } from 'vitest';
import { parseNote, buildLinkIndex } from '../src/links.js';
import { buildGraph } from '../src/graph.js';
import { computeHealth } from '../src/health.js';

const note = (path: string, source: string) => parseNote({ path, source });

const notes = [
  note('World/Characters/Lan.md', '---\ntitle: Lan\nid: char_lan\n---\n[[Mira]] [[Mira]] [[Ring]]'),
  note('World/Characters/Mira.md', '---\ntitle: Mira\nid: char_mira\n---\n[[Lan]]'),
  note('World/Locations/Ring.md', '---\ntitle: Ring\nentity_type: location\n---\n'),
  note('World/Loose.md', '---\ntitle: Loose\n---\nNo links at all.'),
  note('World/Bad.md', '---\ntitle: [broken\n---\n[[Nowhere]]'),
];
const linkIndex = buildLinkIndex(notes);

describe('buildGraph', () => {
  const graph = buildGraph(notes, linkIndex);

  it('deduplicates repeated links between the same pair', () => {
    const lanToMira = graph.edges.filter(
      (e) => e.from === 'World/Characters/Lan.md' && e.to === 'World/Characters/Mira.md',
    );
    expect(lanToMira).toHaveLength(1);
  });

  it('computes degree and orphan flags', () => {
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    expect(byId.get('World/Characters/Lan.md')?.degree).toBe(3); // Mira both ways + Ring
    expect(byId.get('World/Loose.md')?.orphan).toBe(true);
    expect(byId.get('World/Characters/Lan.md')?.orphan).toBe(false);
  });

  it('kinds come from entity_type, falling back to top folder', () => {
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    expect(byId.get('World/Locations/Ring.md')?.kind).toBe('location');
    expect(byId.get('World/Characters/Lan.md')?.kind).toBe('world');
  });
});

describe('computeHealth', () => {
  const findings = computeHealth(notes, linkIndex);

  it('reports frontmatter errors as errors', () => {
    expect(findings.some((f) => f.severity === 'error' && f.category === 'frontmatter')).toBe(true);
  });

  it('reports unresolved links as warnings', () => {
    const broken = findings.find((f) => f.category === 'broken-link');
    expect(broken?.severity).toBe('warning');
    expect(broken?.message).toContain('Nowhere');
  });

  it('reports orphans as advisories, skipping README', () => {
    const orphanPaths = findings.filter((f) => f.category === 'orphan').map((f) => f.path);
    expect(orphanPaths).toContain('World/Loose.md');
    const withReadme = computeHealth(
      [...notes, note('README.md', 'no links')],
      buildLinkIndex([...notes, note('README.md', 'no links')]),
    );
    expect(withReadme.filter((f) => f.category === 'orphan').map((f) => f.path)).not.toContain(
      'README.md',
    );
  });

  it('detects duplicate stable IDs', () => {
    const dup = note('World/Copy.md', '---\ntitle: Copy\nid: char_lan\n---\n');
    const all = [...notes, dup];
    const found = computeHealth(all, buildLinkIndex(all));
    const finding = found.find((f) => f.category === 'duplicate-id');
    expect(finding?.severity).toBe('error');
    expect(finding?.message).toContain('char_lan');
  });

  it('sorts errors before warnings before advisories', () => {
    const severities = findings.map((f) => f.severity);
    const firstWarning = severities.indexOf('warning');
    const firstAdvisory = severities.indexOf('advisory');
    expect(severities.indexOf('error')).toBeLessThan(firstWarning);
    expect(firstWarning).toBeLessThan(firstAdvisory);
  });

  it('heading-only links are not broken links', () => {
    const local = note('World/Solo.md', '[[#Section]]');
    const idx = buildLinkIndex([local]);
    expect(computeHealth([local], idx).filter((f) => f.category === 'broken-link')).toHaveLength(0);
  });
});
