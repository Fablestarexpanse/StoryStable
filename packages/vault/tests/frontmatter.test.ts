import { describe, expect, it } from 'vitest';
import { parseFrontmatter, serializeNote } from '../src/frontmatter.js';

describe('parseFrontmatter', () => {
  it('parses a valid block and returns the body', () => {
    const src = '---\ntitle: Lan\ntags: [conduit]\n---\n# Lan\n\nBody text.';
    const r = parseFrontmatter(src);
    expect(r.errors).toEqual([]);
    expect(r.frontmatter).toEqual({ title: 'Lan', tags: ['conduit'] });
    expect(r.body).toBe('# Lan\n\nBody text.');
  });

  it('returns empty frontmatter when there is no block', () => {
    const r = parseFrontmatter('# Just a note');
    expect(r.frontmatter).toEqual({});
    expect(r.body).toBe('# Just a note');
    expect(r.raw).toBeNull();
  });

  it('handles CRLF sources', () => {
    const r = parseFrontmatter('---\r\ntitle: Lan\r\n---\r\nBody');
    expect(r.frontmatter).toEqual({ title: 'Lan' });
    expect(r.body).toBe('Body');
  });

  it('never throws on malformed YAML — note stays usable', () => {
    const src = '---\ntitle: [unclosed\n---\nBody';
    const r = parseFrontmatter(src);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.body).toBe('Body');
  });

  it('reports an unclosed block without eating the body', () => {
    const src = '---\ntitle: Lan\nno closing delimiter';
    const r = parseFrontmatter(src);
    expect(r.errors).toEqual(['frontmatter block is not closed with ---']);
    expect(r.body).toBe(src);
  });

  it('a --- horizontal rule later in the body is not frontmatter', () => {
    const src = 'Intro\n\n---\n\nMore';
    const r = parseFrontmatter(src);
    expect(r.frontmatter).toEqual({});
    expect(r.body).toBe(src);
  });

  it('frontmatter closing at end of file works', () => {
    const r = parseFrontmatter('---\ntitle: X\n---');
    expect(r.frontmatter).toEqual({ title: 'X' });
    expect(r.body).toBe('');
  });
});

describe('serializeNote', () => {
  it('round-trips frontmatter + body', () => {
    const out = serializeNote({ title: 'Lan', tags: ['conduit'] }, '# Lan\n');
    const r = parseFrontmatter(out);
    expect(r.frontmatter).toEqual({ title: 'Lan', tags: ['conduit'] });
    expect(r.body).toBe('# Lan\n');
  });

  it('omits the block entirely for empty frontmatter', () => {
    expect(serializeNote({}, 'Body')).toBe('Body');
  });
});
