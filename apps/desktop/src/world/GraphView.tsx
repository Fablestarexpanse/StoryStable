import { useEffect, useMemo, useRef, useState } from 'react';
import type { KnowledgeGraph } from '@storystable/vault';

interface Props {
  graph: KnowledgeGraph;
  onOpen: (path: string) => void;
}

interface Sim {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const KIND_COLORS: Record<string, string> = {
  character: '#7896ff',
  location: '#4cc38a',
  faction: '#e5484d',
  world: '#8ea0b8',
  story: '#f2b64c',
  production: '#b98cf2',
};

const W = 900;
const H = 600;

/**
 * Lightweight force-directed layout: repulsion + spring edges + centering,
 * run for a fixed number of ticks per graph change. Adequate for hundreds of
 * nodes; a WebGL library replaces this if vaults outgrow it (spec §27).
 */
function layout(graph: KnowledgeGraph): Map<string, Sim> {
  const nodes = new Map<string, Sim>();
  graph.nodes.forEach((n, i) => {
    const angle = (i / Math.max(graph.nodes.length, 1)) * Math.PI * 2;
    nodes.set(n.id, {
      id: n.id,
      x: W / 2 + Math.cos(angle) * 180,
      y: H / 2 + Math.sin(angle) * 180,
      vx: 0,
      vy: 0,
    });
  });
  const list = [...nodes.values()];
  for (let tick = 0; tick < 250; tick++) {
    // Repulsion
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (!a || !b) continue;
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        const d2 = Math.max(dx * dx + dy * dy, 25);
        const f = 2600 / d2;
        const d = Math.sqrt(d2);
        dx /= d;
        dy /= d;
        a.vx += dx * f;
        a.vy += dy * f;
        b.vx -= dx * f;
        b.vy -= dy * f;
      }
    }
    // Springs
    for (const e of graph.edges) {
      const a = nodes.get(e.from);
      const b = nodes.get(e.to);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const f = (d - 110) * 0.02;
      a.vx += (dx / d) * f;
      a.vy += (dy / d) * f;
      b.vx -= (dx / d) * f;
      b.vy -= (dy / d) * f;
    }
    // Centering + integrate with damping
    for (const n of list) {
      n.vx += (W / 2 - n.x) * 0.004;
      n.vy += (H / 2 - n.y) * 0.004;
      n.x += n.vx * 0.85;
      n.y += n.vy * 0.85;
      n.vx *= 0.6;
      n.vy *= 0.6;
      n.x = Math.min(Math.max(n.x, 30), W - 30);
      n.y = Math.min(Math.max(n.y, 24), H - 24);
    }
  }
  return nodes;
}

export function GraphView({ graph, onOpen }: Props) {
  const positions = useMemo(() => layout(graph), [graph]);
  const [hover, setHover] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Keep the viewBox stable; the SVG scales with its container.
  useEffect(() => {
    setHover(null);
  }, [graph]);

  const neighbors = useMemo(() => {
    if (!hover) return null;
    const set = new Set<string>([hover]);
    for (const e of graph.edges) {
      if (e.from === hover) set.add(e.to);
      if (e.to === hover) set.add(e.from);
    }
    return set;
  }, [hover, graph]);

  return (
    <div className="graph-wrap">
      <svg ref={svgRef} viewBox={`0 0 ${String(W)} ${String(H)}`} className="graph">
        {graph.edges.map((e, i) => {
          const a = positions.get(e.from);
          const b = positions.get(e.to);
          if (!a || !b) return null;
          const dim = neighbors ? !(neighbors.has(e.from) && neighbors.has(e.to)) : false;
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={dim ? 'edge dim' : 'edge'}
            />
          );
        })}
        {graph.nodes.map((n) => {
          const p = positions.get(n.id);
          if (!p) return null;
          const r = 6 + Math.min(n.degree, 8) * 1.5;
          const dim = neighbors ? !neighbors.has(n.id) : false;
          return (
            <g
              key={n.id}
              transform={`translate(${String(p.x)}, ${String(p.y)})`}
              className={dim ? 'node dim' : 'node'}
              onMouseEnter={() => {
                setHover(n.id);
              }}
              onMouseLeave={() => {
                setHover(null);
              }}
              onClick={() => {
                onOpen(n.id);
              }}
            >
              <circle r={r} fill={KIND_COLORS[n.kind] ?? '#8ea0b8'} opacity={n.orphan ? 0.45 : 1} />
              <text y={r + 12}>{n.title}</text>
            </g>
          );
        })}
      </svg>
      <div className="graph-legend">
        {Object.entries(KIND_COLORS).map(([kind, color]) => (
          <span key={kind}>
            <i style={{ background: color }} /> {kind}
          </span>
        ))}
      </div>
    </div>
  );
}
