/**
 * JSON Canvas (jsoncanvas.org) support.
 *
 * Spec §"Open interchange": canvas files stay JSON Canvas compatible.
 * Application-specific extensions must be namespaced and degradable, so
 * unknown keys on nodes/edges are preserved verbatim on round-trip rather
 * than dropped — another editor's data survives our save.
 */

export type CanvasNodeType = 'text' | 'file' | 'link' | 'group';

export interface CanvasNodeBase {
  id: string;
  type: CanvasNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  /** Unrecognized keys, preserved on round-trip. */
  extra: Record<string, unknown>;
}

export interface CanvasTextNode extends CanvasNodeBase {
  type: 'text';
  text: string;
}

export interface CanvasFileNode extends CanvasNodeBase {
  type: 'file';
  file: string;
  subpath?: string;
}

export interface CanvasLinkNode extends CanvasNodeBase {
  type: 'link';
  url: string;
}

export interface CanvasGroupNode extends CanvasNodeBase {
  type: 'group';
  label?: string;
  background?: string;
  backgroundStyle?: string;
}

export type CanvasNode = CanvasTextNode | CanvasFileNode | CanvasLinkNode | CanvasGroupNode;

export type CanvasSide = 'top' | 'right' | 'bottom' | 'left';

export interface CanvasEdge {
  id: string;
  fromNode: string;
  toNode: string;
  fromSide?: CanvasSide;
  toSide?: CanvasSide;
  color?: string;
  label?: string;
  extra: Record<string, unknown>;
}

export interface Canvas {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  /** Top-level keys we do not model, preserved on round-trip. */
  extra: Record<string, unknown>;
}

export interface CanvasParseResult {
  canvas: Canvas;
  /** Problems encountered; malformed entries are skipped, never thrown. */
  errors: string[];
}

export const emptyCanvas = (): Canvas => ({ nodes: [], edges: [], extra: {} });

const NODE_KEYS = new Set([
  'id',
  'type',
  'x',
  'y',
  'width',
  'height',
  'color',
  'text',
  'file',
  'subpath',
  'url',
  'label',
  'background',
  'backgroundStyle',
]);
const EDGE_KEYS = new Set(['id', 'fromNode', 'toNode', 'fromSide', 'toSide', 'color', 'label']);
const SIDES = new Set<CanvasSide>(['top', 'right', 'bottom', 'left']);

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const num = (v: unknown, fallback: number): number => (typeof v === 'number' ? v : fallback);
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const side = (v: unknown): CanvasSide | undefined =>
  typeof v === 'string' && SIDES.has(v as CanvasSide) ? (v as CanvasSide) : undefined;

function collectExtra(source: Record<string, unknown>, known: Set<string>) {
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (!known.has(key)) extra[key] = value;
  }
  return extra;
}

/** Parse canvas JSON. Never throws — invalid entries are reported and skipped. */
export function parseCanvas(source: string): CanvasParseResult {
  const errors: string[] = [];
  let root: unknown;
  try {
    root = JSON.parse(source === '' ? '{}' : source);
  } catch (e) {
    return {
      canvas: emptyCanvas(),
      errors: [`invalid JSON: ${e instanceof Error ? e.message : String(e)}`],
    };
  }
  if (!isRecord(root)) {
    return { canvas: emptyCanvas(), errors: ['canvas root must be an object'] };
  }

  const nodes: CanvasNode[] = [];
  const seenIds = new Set<string>();
  const rawNodes = Array.isArray(root.nodes) ? root.nodes : [];
  if (root.nodes !== undefined && !Array.isArray(root.nodes)) errors.push('nodes must be an array');

  for (const [i, raw] of rawNodes.entries()) {
    if (!isRecord(raw)) {
      errors.push(`node ${String(i)} is not an object`);
      continue;
    }
    const id = str(raw.id);
    if (id === undefined || id === '') {
      errors.push(`node ${String(i)} is missing an id`);
      continue;
    }
    if (seenIds.has(id)) {
      errors.push(`duplicate node id "${id}"`);
      continue;
    }
    seenIds.add(id);
    const color = str(raw.color);
    const base = {
      id,
      x: num(raw.x, 0),
      y: num(raw.y, 0),
      width: num(raw.width, 240),
      height: num(raw.height, 120),
      ...(color !== undefined ? { color } : {}),
      extra: collectExtra(raw, NODE_KEYS),
    };
    switch (raw.type) {
      case 'text':
        nodes.push({ ...base, type: 'text', text: str(raw.text) ?? '' });
        break;
      case 'file': {
        const file = str(raw.file);
        if (file === undefined) {
          errors.push(`file node "${id}" is missing "file"`);
          continue;
        }
        const subpath = str(raw.subpath);
        nodes.push({
          ...base,
          type: 'file',
          file,
          ...(subpath !== undefined ? { subpath } : {}),
        });
        break;
      }
      case 'link': {
        const url = str(raw.url);
        if (url === undefined) {
          errors.push(`link node "${id}" is missing "url"`);
          continue;
        }
        nodes.push({ ...base, type: 'link', url });
        break;
      }
      case 'group': {
        const label = str(raw.label);
        const background = str(raw.background);
        const backgroundStyle = str(raw.backgroundStyle);
        nodes.push({
          ...base,
          type: 'group',
          ...(label !== undefined ? { label } : {}),
          ...(background !== undefined ? { background } : {}),
          ...(backgroundStyle !== undefined ? { backgroundStyle } : {}),
        });
        break;
      }
      default:
        errors.push(`node "${id}" has unsupported type ${JSON.stringify(raw.type)}`);
    }
  }

  const edges: CanvasEdge[] = [];
  const rawEdges = Array.isArray(root.edges) ? root.edges : [];
  if (root.edges !== undefined && !Array.isArray(root.edges)) errors.push('edges must be an array');
  for (const [i, raw] of rawEdges.entries()) {
    if (!isRecord(raw)) {
      errors.push(`edge ${String(i)} is not an object`);
      continue;
    }
    const id = str(raw.id);
    const fromNode = str(raw.fromNode);
    const toNode = str(raw.toNode);
    if (id === undefined || fromNode === undefined || toNode === undefined) {
      errors.push(`edge ${String(i)} needs id, fromNode and toNode`);
      continue;
    }
    if (!seenIds.has(fromNode) || !seenIds.has(toNode)) {
      errors.push(`edge "${id}" references a missing node`);
      continue;
    }
    const fromSide = side(raw.fromSide);
    const toSide = side(raw.toSide);
    const edgeColor = str(raw.color);
    const edgeLabel = str(raw.label);
    edges.push({
      id,
      fromNode,
      toNode,
      ...(fromSide !== undefined ? { fromSide } : {}),
      ...(toSide !== undefined ? { toSide } : {}),
      ...(edgeColor !== undefined ? { color: edgeColor } : {}),
      ...(edgeLabel !== undefined ? { label: edgeLabel } : {}),
      extra: collectExtra(raw, EDGE_KEYS),
    });
  }

  return {
    canvas: { nodes, edges, extra: collectExtra(root, new Set(['nodes', 'edges'])) },
    errors,
  };
}

/** Serialize to JSON Canvas text, restoring preserved unknown keys. */
export function serializeCanvas(canvas: Canvas): string {
  const nodes = canvas.nodes.map((node) => {
    const { extra, ...rest } = node;
    return { ...rest, ...extra };
  });
  const edges = canvas.edges.map((edge) => {
    const { extra, ...rest } = edge;
    return { ...rest, ...extra };
  });
  return `${JSON.stringify({ ...canvas.extra, nodes, edges }, null, 2)}\n`;
}

/** File nodes referencing vault paths — used for graph/health integration. */
export function canvasFileReferences(canvas: Canvas): string[] {
  return canvas.nodes.filter((n): n is CanvasFileNode => n.type === 'file').map((n) => n.file);
}
