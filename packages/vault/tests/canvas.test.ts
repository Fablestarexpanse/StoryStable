import { describe, expect, it } from 'vitest';
import { parseCanvas, serializeCanvas, canvasFileReferences, emptyCanvas } from '../src/canvas.js';

const sample = JSON.stringify({
  nodes: [
    { id: 'a', type: 'text', x: 0, y: 0, width: 200, height: 100, text: 'Hello' },
    { id: 'b', type: 'file', x: 300, y: 0, width: 200, height: 100, file: 'World/Lan.md' },
    { id: 'g', type: 'group', x: -20, y: -20, width: 600, height: 300, label: 'Act I' },
  ],
  edges: [{ id: 'e1', fromNode: 'a', toNode: 'b', fromSide: 'right', toSide: 'left' }],
});

describe('parseCanvas', () => {
  it('parses nodes and edges', () => {
    const { canvas, errors } = parseCanvas(sample);
    expect(errors).toEqual([]);
    expect(canvas.nodes.map((n) => n.type)).toEqual(['text', 'file', 'group']);
    expect(canvas.edges[0]).toMatchObject({ fromNode: 'a', toNode: 'b', fromSide: 'right' });
  });

  it('treats empty source as an empty canvas', () => {
    expect(parseCanvas('').canvas).toEqual(emptyCanvas());
  });

  it('never throws on invalid JSON', () => {
    const { canvas, errors } = parseCanvas('{ not json');
    expect(canvas.nodes).toEqual([]);
    expect(errors[0]).toContain('invalid JSON');
  });

  it('skips malformed nodes but keeps the rest', () => {
    const src = JSON.stringify({
      nodes: [
        { type: 'text', x: 0, y: 0, width: 1, height: 1, text: 'no id' },
        { id: 'ok', type: 'text', x: 0, y: 0, width: 1, height: 1, text: 'fine' },
        { id: 'badfile', type: 'file', x: 0, y: 0, width: 1, height: 1 },
        { id: 'weird', type: 'diagram', x: 0, y: 0, width: 1, height: 1 },
      ],
    });
    const { canvas, errors } = parseCanvas(src);
    expect(canvas.nodes.map((n) => n.id)).toEqual(['ok']);
    expect(errors).toHaveLength(3);
  });

  it('rejects duplicate node ids and dangling edges', () => {
    const src = JSON.stringify({
      nodes: [
        { id: 'x', type: 'text', x: 0, y: 0, width: 1, height: 1, text: '1' },
        { id: 'x', type: 'text', x: 0, y: 0, width: 1, height: 1, text: '2' },
      ],
      edges: [{ id: 'e', fromNode: 'x', toNode: 'ghost' }],
    });
    const { canvas, errors } = parseCanvas(src);
    expect(canvas.nodes).toHaveLength(1);
    expect(canvas.edges).toHaveLength(0);
    expect(errors.some((e) => e.includes('duplicate node id'))).toBe(true);
    expect(errors.some((e) => e.includes('missing node'))).toBe(true);
  });

  it('supplies defaults for missing geometry', () => {
    const { canvas } = parseCanvas(JSON.stringify({ nodes: [{ id: 'a', type: 'text' }] }));
    expect(canvas.nodes[0]).toMatchObject({ x: 0, y: 0, width: 240, height: 120 });
  });
});

describe('round-trip', () => {
  it('preserves namespaced/unknown keys on nodes, edges and root', () => {
    const src = JSON.stringify({
      schemaVersion: '1.0',
      'storystable:view': { zoom: 2 },
      nodes: [
        {
          id: 'a',
          type: 'text',
          x: 1,
          y: 2,
          width: 3,
          height: 4,
          text: 't',
          'storystable:entityId': 'char_lan',
        },
      ],
      edges: [{ id: 'e', fromNode: 'a', toNode: 'a', 'obsidian:custom': true }],
    });
    const { canvas } = parseCanvas(src);
    const out = JSON.parse(serializeCanvas(canvas)) as Record<string, unknown>;
    expect(out.schemaVersion).toBe('1.0');
    expect(out['storystable:view']).toEqual({ zoom: 2 });
    const nodes = out.nodes as Record<string, unknown>[];
    expect(nodes[0]?.['storystable:entityId']).toBe('char_lan');
    const edges = out.edges as Record<string, unknown>[];
    expect(edges[0]?.['obsidian:custom']).toBe(true);
  });

  it('parse → serialize → parse is stable', () => {
    const first = parseCanvas(sample).canvas;
    const second = parseCanvas(serializeCanvas(first)).canvas;
    expect(second).toEqual(first);
  });

  it('never emits the internal extra key', () => {
    const text = serializeCanvas(parseCanvas(sample).canvas);
    expect(text).not.toContain('"extra"');
  });
});

describe('canvasFileReferences', () => {
  it('lists vault paths referenced by file nodes', () => {
    expect(canvasFileReferences(parseCanvas(sample).canvas)).toEqual(['World/Lan.md']);
  });
});
