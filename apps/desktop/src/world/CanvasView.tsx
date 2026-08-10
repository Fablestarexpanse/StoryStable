import { useCallback, useEffect, useRef, useState } from 'react';
import {
  parseCanvas,
  serializeCanvas,
  emptyCanvas,
  type Canvas,
  type CanvasNode,
} from '@storystable/vault';
import { listCanvases, readCanvas, writeCanvas } from '../services/vault.js';

interface Props {
  root: string;
  /** Notes available to drop onto the canvas as file nodes. */
  notePaths: string[];
  onOpenNote: (path: string) => void;
}

const DEFAULT_CANVAS = 'Canvases/board.canvas';

export function CanvasView({ root, notePaths, onOpenNote }: Props) {
  const [available, setAvailable] = useState<string[]>([]);
  const [path, setPath] = useState(DEFAULT_CANVAS);
  const [canvas, setCanvas] = useState<Canvas>(emptyCanvas());
  const [errors, setErrors] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: string;
    startX: number;
    startY: number;
    nodeX: number;
    nodeY: number;
  } | null>(null);
  const panDrag = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(
    null,
  );

  useEffect(() => {
    listCanvases(root).then(setAvailable, () => {
      setAvailable([]);
    });
  }, [root]);

  const load = useCallback(
    (target: string) => {
      readCanvas(root, target).then(
        (text) => {
          const result = parseCanvas(text);
          setCanvas(result.canvas);
          setErrors(result.errors);
          setDirty(false);
          setStatus(text === '' ? 'new canvas (not yet saved)' : null);
        },
        (e: unknown) => {
          setErrors([typeof e === 'string' ? e : String(e)]);
        },
      );
    },
    [root],
  );

  useEffect(() => {
    load(path);
  }, [path, load]);

  const save = () => {
    writeCanvas(root, path, serializeCanvas(canvas)).then(
      () => {
        setDirty(false);
        setStatus('saved');
        listCanvases(root).then(setAvailable, () => undefined);
      },
      (e: unknown) => {
        setErrors([typeof e === 'string' ? e : String(e)]);
      },
    );
  };

  const mutate = (next: Canvas) => {
    setCanvas(next);
    setDirty(true);
    setStatus(null);
  };

  const addTextCard = () => {
    const id = `text-${String(Date.now())}`;
    const node: CanvasNode = {
      id,
      type: 'text',
      x: Math.round(-pan.x / zoom) + 60,
      y: Math.round(-pan.y / zoom) + 60,
      width: 240,
      height: 120,
      text: 'New card',
      extra: {},
    };
    mutate({ ...canvas, nodes: [...canvas.nodes, node] });
    setSelected(id);
  };

  const addFileCard = (file: string) => {
    if (file === '') return;
    const id = `file-${String(Date.now())}`;
    mutate({
      ...canvas,
      nodes: [
        ...canvas.nodes,
        {
          id,
          type: 'file',
          x: Math.round(-pan.x / zoom) + 60,
          y: Math.round(-pan.y / zoom) + 200,
          width: 260,
          height: 90,
          file,
          extra: {},
        },
      ],
    });
    setSelected(id);
  };

  const removeSelected = () => {
    if (!selected) return;
    mutate({
      ...canvas,
      nodes: canvas.nodes.filter((n) => n.id !== selected),
      edges: canvas.edges.filter((e) => e.fromNode !== selected && e.toNode !== selected),
    });
    setSelected(null);
  };

  const onNodePointerDown = (e: React.PointerEvent, node: CanvasNode) => {
    e.stopPropagation();
    setSelected(node.id);
    drag.current = {
      id: node.id,
      startX: e.clientX,
      startY: e.clientY,
      nodeX: node.x,
      nodeY: node.y,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (drag.current) {
      const d = drag.current;
      const dx = (e.clientX - d.startX) / zoom;
      const dy = (e.clientY - d.startY) / zoom;
      setCanvas((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === d.id ? { ...n, x: Math.round(d.nodeX + dx), y: Math.round(d.nodeY + dy) } : n,
        ),
      }));
      setDirty(true);
      return;
    }
    if (panDrag.current) {
      const p = panDrag.current;
      setPan({ x: p.panX + (e.clientX - p.startX), y: p.panY + (e.clientY - p.startY) });
    }
  };

  const endDrag = () => {
    drag.current = null;
    panDrag.current = null;
  };

  const onSurfacePointerDown = (e: React.PointerEvent) => {
    setSelected(null);
    panDrag.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  };

  const onWheel = (e: React.WheelEvent) => {
    const next = Math.min(2.5, Math.max(0.25, zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
    setZoom(Number(next.toFixed(3)));
  };

  const selectedNode = canvas.nodes.find((n) => n.id === selected) ?? null;

  return (
    <div className="canvas-view">
      <div className="canvas-toolbar">
        <select
          value={available.includes(path) ? path : ''}
          onChange={(e) => {
            setPath(e.target.value === '' ? DEFAULT_CANVAS : e.target.value);
          }}
        >
          <option value="">{DEFAULT_CANVAS} (new)</option>
          {available.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button onClick={addTextCard}>+ Text</button>
        <select
          value=""
          onChange={(e) => {
            addFileCard(e.target.value);
          }}
        >
          <option value="">+ Note…</option>
          {notePaths.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button disabled={!selected} onClick={removeSelected}>
          Delete
        </button>
        <span className="spacer" />
        <span className="zoom">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          Reset view
        </button>
        {dirty && <span className="dirty-dot" title="Unsaved changes" />}
        {!dirty && status && <span className="saved">{status}</span>}
        <button disabled={!dirty} onClick={save}>
          Save
        </button>
      </div>
      {errors.length > 0 && <p className="error">canvas: {errors.join('; ')}</p>}
      <div
        className="canvas-surface"
        ref={surface}
        onPointerDown={onSurfacePointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onWheel={onWheel}
      >
        <div
          className="canvas-plane"
          style={{
            transform: `translate(${String(pan.x)}px, ${String(pan.y)}px) scale(${String(zoom)})`,
          }}
        >
          {canvas.nodes.map((node) => (
            <div
              key={node.id}
              className={[
                'canvas-node',
                `kind-${node.type}`,
                node.id === selected ? 'selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
                ...(node.color ? { borderColor: node.color } : {}),
              }}
              onPointerDown={(e) => {
                onNodePointerDown(e, node);
              }}
              onDoubleClick={() => {
                if (node.type === 'file') onOpenNote(node.file);
              }}
            >
              {node.type === 'text' && <p className="canvas-text">{node.text}</p>}
              {node.type === 'file' && (
                <>
                  <span className="canvas-badge">note</span>
                  <p className="canvas-text">{node.file}</p>
                  <span className="hint">double-click to open</span>
                </>
              )}
              {node.type === 'link' && (
                <>
                  <span className="canvas-badge">link</span>
                  <p className="canvas-text">{node.url}</p>
                </>
              )}
              {node.type === 'group' && <span className="canvas-group-label">{node.label}</span>}
            </div>
          ))}
        </div>
      </div>
      {selectedNode?.type === 'text' && (
        <textarea
          className="canvas-editor"
          value={selectedNode.text}
          onChange={(e) => {
            mutate({
              ...canvas,
              nodes: canvas.nodes.map((n) =>
                n.id === selectedNode.id && n.type === 'text' ? { ...n, text: e.target.value } : n,
              ),
            });
          }}
        />
      )}
    </div>
  );
}
