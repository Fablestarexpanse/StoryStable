import { describe, expect, it } from 'vitest';
import { extractWikilinks } from '../src/wikilinks.js';

describe('extractWikilinks', () => {
  it('extracts plain links', () => {
    const links = extractWikilinks('Lan meets [[Mira]] at [[Outer Ring]].');
    expect(links.map((l) => l.target)).toEqual(['Mira', 'Outer Ring']);
  });

  it('parses alias and heading parts', () => {
    const [link] = extractWikilinks('See [[Lan#History|the pilot]].');
    expect(link).toMatchObject({
      target: 'Lan',
      heading: 'History',
      alias: 'the pilot',
      embed: false,
    });
  });

  it('marks embeds', () => {
    const [link] = extractWikilinks('![[board_014.png]]');
    expect(link).toMatchObject({ target: 'board_014.png', embed: true });
  });

  it('ignores links inside fenced code blocks', () => {
    const src = 'Before [[Real]]\n```\n[[NotALink]]\n```\nAfter [[AlsoReal]]';
    expect(extractWikilinks(src).map((l) => l.target)).toEqual(['Real', 'AlsoReal']);
  });

  it('ignores links inside inline code', () => {
    const src = 'Use `[[template]]` syntax to link [[Lan]].';
    expect(extractWikilinks(src).map((l) => l.target)).toEqual(['Lan']);
  });

  it('reports correct offsets', () => {
    const src = 'ab [[X]]';
    const [link] = extractWikilinks(src);
    expect(link?.offset).toBe(3);
    const offset = link?.offset ?? 0;
    expect(src.slice(offset, offset + 5)).toBe('[[X]]');
  });

  it('handles heading-only links', () => {
    const [link] = extractWikilinks('[[#Local Heading]]');
    expect(link).toMatchObject({ target: '', heading: 'Local Heading' });
  });

  it('does not match single brackets or empty links', () => {
    expect(extractWikilinks('[not a link] [[]]')).toEqual([]);
  });
});
