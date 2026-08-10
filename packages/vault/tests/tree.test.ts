import { describe, expect, it } from 'vitest';
import { buildFileTree, folderPaths, ancestorsOf, type TreeFolder } from '../src/tree.js';

const paths = [
  'README.md',
  'World/Characters/Lan.md',
  'World/Characters/Mira.md',
  'World/Locations/Outer Ring.md',
  'Story/Scenes/Scene 014.md',
  'Canvases/board.canvas',
  'Media/Images/board_014.png',
];

const tree = buildFileTree(paths.map((path) => ({ path })));

const folder = (parent: TreeFolder, name: string): TreeFolder => {
  const found = parent.children.find((c) => c.kind === 'folder' && c.name === name);
  if (found?.kind !== 'folder') throw new Error(`missing folder ${name}`);
  return found;
};

describe('buildFileTree', () => {
  it('nests files under their folders', () => {
    const characters = folder(folder(tree, 'World'), 'Characters');
    expect(characters.children.map((c) => c.kind === 'file' && c.label)).toEqual(['Lan', 'Mira']);
  });

  it('sorts folders before files', () => {
    const kinds = tree.children.map((c) => c.kind);
    expect(kinds.indexOf('file')).toBeGreaterThan(kinds.lastIndexOf('folder'));
  });

  it('sorts case-insensitively and numerically', () => {
    const mixed = buildFileTree(
      ['b/Zebra.md', 'b/apple.md', 'b/item10.md', 'b/item2.md'].map((path) => ({ path })),
    );
    expect(folder(mixed, 'b').children.map((c) => c.kind === 'file' && c.label)).toEqual([
      'apple',
      'item2',
      'item10',
      'Zebra',
    ]);
  });

  it('strips the .md extension for display but keeps the real path', () => {
    const readme = tree.children.find((c) => c.kind === 'file' && c.label === 'README');
    expect(readme?.kind === 'file' && readme.path).toBe('README.md');
    expect(readme?.kind === 'file' && readme.name).toBe('README.md');
  });

  it('keeps non-markdown names intact', () => {
    const canvas = folder(tree, 'Canvases').children[0];
    expect(canvas?.kind === 'file' && canvas.label).toBe('board.canvas');
    expect(canvas?.kind === 'file' && canvas.fileKind).toBe('canvas');
  });

  it('honours an explicit kind over the extension', () => {
    const t = buildFileTree([{ path: 'Media/x.png', kind: 'image' }]);
    const file = folder(t, 'Media').children[0];
    expect(file?.kind === 'file' && file.fileKind).toBe('image');
  });

  it('counts files recursively', () => {
    expect(tree.fileCount).toBe(paths.length);
    expect(folder(tree, 'World').fileCount).toBe(3);
    expect(folder(folder(tree, 'World'), 'Characters').fileCount).toBe(2);
  });

  it('handles an empty vault', () => {
    const empty = buildFileTree([]);
    expect(empty.children).toEqual([]);
    expect(empty.fileCount).toBe(0);
  });

  it('ignores empty and malformed paths rather than creating blank nodes', () => {
    const t = buildFileTree([{ path: '' }, { path: '///' }, { path: 'a//b.md' }]);
    expect(t.children).toHaveLength(1);
    expect(folder(t, 'a').children[0]?.kind === 'file').toBe(true);
  });

  it('does not create duplicate folders for siblings', () => {
    const characters = folder(tree, 'World').children.filter(
      (c) => c.kind === 'folder' && c.name === 'Characters',
    );
    expect(characters).toHaveLength(1);
  });
});

describe('folderPaths', () => {
  it('lists every folder path depth-first', () => {
    expect(folderPaths(tree)).toEqual([
      'Canvases',
      'Media',
      'Media/Images',
      'Story',
      'Story/Scenes',
      'World',
      'World/Characters',
      'World/Locations',
    ]);
  });
});

describe('ancestorsOf', () => {
  it('returns each ancestor folder, nearest last', () => {
    expect(ancestorsOf('World/Characters/Lan.md')).toEqual(['World', 'World/Characters']);
  });

  it('returns nothing for a root-level file', () => {
    expect(ancestorsOf('README.md')).toEqual([]);
  });
});
