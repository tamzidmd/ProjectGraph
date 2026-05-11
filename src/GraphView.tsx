import { memo, useEffect, useMemo, useRef } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeProps,
  type OnNodeDrag,
} from '@xyflow/react';
import dagre from 'dagre';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import { useStore, filterNotes, type Direction } from './store';
import { deriveGraph } from './wikilinks';
import type { Priority, Status } from './types';

interface SimNode extends SimulationNodeDatum {
  id: string;
}
type SimLink = SimulationLinkDatum<SimNode>;

type NodeData = {
  title: string;
  status: Status;
  priority: Priority;
  degree: number;
  dim: boolean;
  glow: boolean;
  direction: Direction;
  physics: boolean;
};

type RFNode = Node<NodeData>;

const NODE_W = 200;
const NODE_H = 44;
const DOT_R = 6;

const STATUS_COLOR: Record<Status, string> = {
  todo: '#8b949e',
  doing: '#58a6ff',
  done: '#3fb950',
  blocked: '#f85149',
  someday: '#a371f7',
};

const PRIORITY_GLYPH: Record<Priority, string> = {
  low: '',
  medium: '',
  high: '↑',
  urgent: '!',
};

const FlowNode = memo(({ data, selected }: NodeProps<RFNode>) => {
  const color = STATUS_COLOR[data.status];
  const isLR = data.direction === 'LR';
  if (data.physics) {
    const r = Math.max(10, Math.min(28, 10 + data.degree * 2));
    return (
      <div className={`pnode ${data.dim ? 'dim' : ''} ${data.glow ? 'glow' : ''} ${selected ? 'sel' : ''}`}>
        <Handle type="target" position={Position.Top} className="ghandle" isConnectable={false} />
        <div
          className="pdot"
          style={{
            width: r * 2,
            height: r * 2,
            background: color,
            boxShadow: selected || data.glow ? `0 0 0 2px ${color}66, 0 0 18px ${color}55` : undefined,
          }}
        />
        <div className="plabel">{data.title}</div>
        <Handle type="source" position={Position.Bottom} className="ghandle" isConnectable={false} />
      </div>
    );
  }
  return (
    <div
      className={`fnode status-${data.status} ${data.dim ? 'dim' : ''} ${data.glow ? 'glow' : ''} ${selected ? 'sel' : ''}`}
      style={{ width: NODE_W, height: NODE_H, borderLeftColor: color }}
    >
      <Handle
        type="target"
        position={isLR ? Position.Left : Position.Top}
        className="ghandle"
        isConnectable={false}
      />
      <span className="fdot" style={{ background: color, width: DOT_R * 2, height: DOT_R * 2 }} />
      <span className="ftitle">{data.title}</span>
      {data.priority !== 'low' && data.priority !== 'medium' && (
        <span className={`fpri pri-${data.priority}`}>{PRIORITY_GLYPH[data.priority]}</span>
      )}
      <Handle
        type="source"
        position={isLR ? Position.Right : Position.Bottom}
        className="ghandle"
        isConnectable={false}
      />
    </div>
  );
});
FlowNode.displayName = 'FlowNode';

const nodeTypes = { flow: FlowNode };

function dagreLayout(
  nodes: { id: string }[],
  edges: { id: string; source: string; target: string }[],
  direction: Direction,
  nodeSep: number,
  rankSep: number,
): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, nodesep: nodeSep, ranksep: rankSep, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of nodes) g.setNode(n.id, { width: NODE_W, height: NODE_H });
  for (const e of edges) g.setEdge(e.source, e.target);
  dagre.layout(g);
  const out = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    const node = g.node(n.id);
    if (!node) continue;
    out.set(n.id, { x: node.x - NODE_W / 2, y: node.y - NODE_H / 2 });
  }
  return out;
}

export function GraphView() {
  const notes = useStore((s) => s.notes);
  const order = useStore((s) => s.order);
  const query = useStore((s) => s.query);
  const activeTag = useStore((s) => s.activeTag);
  const hideStatuses = useStore((s) => s.hideStatuses);
  const showOrphans = useStore((s) => s.showOrphans);
  const selectedId = useStore((s) => s.selectedId);
  const physics = useStore((s) => s.physics);
  const layout = useStore((s) => s.layout);
  const forces = useStore((s) => s.forces);
  const layoutNonce = useStore((s) => s.layoutNonce);
  const setSelected = useStore((s) => s.setSelected);

  const visibleNotes = useMemo(
    () => filterNotes(notes, order, query, activeTag, hideStatuses),
    [notes, order, query, activeTag, hideStatuses],
  );

  const derived = useMemo(() => deriveGraph(visibleNotes), [visibleNotes]);

  const finalNotes = useMemo(() => {
    if (showOrphans) return visibleNotes;
    return visibleNotes.filter((n) => (derived.degree.get(n.id) ?? 0) > 0);
  }, [visibleNotes, derived.degree, showOrphans]);

  const finalEdges = useMemo(() => {
    if (showOrphans) return derived.edges;
    const ids = new Set(finalNotes.map((n) => n.id));
    return derived.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  }, [derived.edges, finalNotes, showOrphans]);

  const neighborhood = useMemo(() => {
    if (!selectedId) return null;
    const set = new Set<string>([selectedId]);
    for (const id of derived.outgoing.get(selectedId) ?? []) set.add(id);
    for (const id of derived.incoming.get(selectedId) ?? []) set.add(id);
    return set;
  }, [selectedId, derived.outgoing, derived.incoming]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const { fitView } = useReactFlow();
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const simNodesRef = useRef<Map<string, SimNode>>(new Map());
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const structuralKey = useMemo(() => {
    const nodeIds = finalNotes.map((n) => n.id).sort().join(',');
    const edgeKeys = finalEdges.map((e) => e.id).sort().join(',');
    return `${nodeIds}|${edgeKeys}`;
  }, [finalNotes, finalEdges]);

  useEffect(() => {
    if (!physics) {
      simRef.current?.stop();
      simRef.current = null;
      return;
    }
    const sim = forceSimulation<SimNode, SimLink>([])
      .force('charge', forceManyBody<SimNode>())
      .force('link', forceLink<SimNode, SimLink>().id((d) => d.id))
      .force('collide', forceCollide<SimNode>())
      .force('center', forceCenter<SimNode>(0, 0))
      .alphaDecay(0.035)
      .velocityDecay(0.45);
    sim.on('tick', () => {
      const positions = simNodesRef.current;
      setRfNodes((prev) =>
        prev.map((n) => {
          const p = positions.get(n.id);
          if (!p || p.x == null || p.y == null) return n;
          positionsRef.current.set(n.id, { x: p.x, y: p.y });
          return { ...n, position: { x: p.x, y: p.y } };
        }),
      );
    });
    simRef.current = sim;
    return () => {
      sim.stop();
      simRef.current = null;
    };
  }, [physics, setRfNodes]);

  useEffect(() => {
    if (physics) {
      const sim = simRef.current;
      if (!sim) return;
      const prev = simNodesRef.current;
      const next = new Map<string, SimNode>();
      const spread = Math.max(40, Math.sqrt(finalNotes.length) * 30);
      for (const n of finalNotes) {
        const existing = prev.get(n.id);
        if (existing) {
          next.set(n.id, existing);
        } else {
          const seed = positionsRef.current.get(n.id);
          next.set(n.id, {
            id: n.id,
            x: seed?.x ?? (Math.random() - 0.5) * spread,
            y: seed?.y ?? (Math.random() - 0.5) * spread,
          });
        }
      }
      simNodesRef.current = next;
      sim.nodes([...next.values()]);
      const linkForce = sim.force<ReturnType<typeof forceLink<SimNode, SimLink>>>('link');
      if (linkForce) linkForce.links(finalEdges.map((e) => ({ source: e.source, target: e.target })));
      sim.alpha(0.9).alphaTarget(0.05).restart();
    } else {
      const positions = dagreLayout(finalNotes, finalEdges, layout.direction, layout.nodeSep, layout.rankSep);
      for (const [id, p] of positions) positionsRef.current.set(id, p);
    }

    setRfNodes(
      finalNotes.map((n) => {
        const p = positionsRef.current.get(n.id) ?? { x: 0, y: 0 };
        return {
          id: n.id,
          type: 'flow',
          position: p,
          data: {
            title: n.title,
            status: n.status,
            priority: n.priority,
            degree: derived.degree.get(n.id) ?? 0,
            dim: !!neighborhood && !neighborhood.has(n.id),
            glow: !!neighborhood && neighborhood.has(n.id) && n.id !== selectedId,
            direction: layout.direction,
            physics,
          },
        };
      }),
    );

    setRfEdges(
      finalEdges.map((e) => {
        const hot = !!neighborhood && (neighborhood.has(e.source) || neighborhood.has(e.target));
        const stroke = hot ? '#c9d1d9' : '#3a4250';
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: physics ? 'straight' : 'smoothstep',
          style: {
            stroke,
            strokeWidth: hot ? 1.6 : 1.1,
            opacity: neighborhood && !hot ? 0.2 : 0.85,
          },
          markerEnd: physics
            ? undefined
            : { type: MarkerType.ArrowClosed, color: stroke, width: 14, height: 14 },
        };
      }),
    );

    const t = setTimeout(() => {
      if (!physics) fitView({ duration: 350, padding: 0.2 });
    }, 50);
    return () => clearTimeout(t);
  }, [
    physics,
    structuralKey,
    layout.direction,
    layout.nodeSep,
    layout.rankSep,
    layoutNonce,
    neighborhood,
    selectedId,
    derived.degree,
    fitView,
    finalNotes,
    finalEdges,
    setRfNodes,
    setRfEdges,
  ]);

  useEffect(() => {
    if (!physics) return;
    const sim = simRef.current;
    if (!sim) return;
    (sim.force('charge') as ReturnType<typeof forceManyBody<SimNode>>).strength(forces.charge);
    (sim.force('collide') as ReturnType<typeof forceCollide<SimNode>>).radius(forces.collide);
    (sim.force('center') as ReturnType<typeof forceCenter<SimNode>>).strength(forces.center);
    const linkForce = sim.force<ReturnType<typeof forceLink<SimNode, SimLink>>>('link');
    if (linkForce) linkForce.distance(forces.linkDistance);
    sim.alpha(Math.max(sim.alpha(), 0.6)).restart();
  }, [physics, forces.charge, forces.collide, forces.center, forces.linkDistance]);

  const onNodeClick: NodeMouseHandler = (_, node) => setSelected(node.id);
  const onPaneClick = () => setSelected(undefined);

  const onNodeDragStart: OnNodeDrag = (_, node) => {
    if (!physics) return;
    const s = simNodesRef.current.get(node.id);
    if (!s) return;
    s.fx = node.position.x;
    s.fy = node.position.y;
    simRef.current?.alphaTarget(0.3).restart();
  };
  const onNodeDrag: OnNodeDrag = (_, node) => {
    if (physics) {
      const s = simNodesRef.current.get(node.id);
      if (!s) return;
      s.fx = node.position.x;
      s.fy = node.position.y;
    } else {
      positionsRef.current.set(node.id, { x: node.position.x, y: node.position.y });
    }
  };
  const onNodeDragStop: OnNodeDrag = (_, node) => {
    if (physics) {
      const s = simNodesRef.current.get(node.id);
      if (!s) return;
      s.fx = null;
      s.fy = null;
      simRef.current?.alphaTarget(0.05);
    } else {
      positionsRef.current.set(node.id, { x: node.position.x, y: node.position.y });
    }
  };

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      onNodeDragStart={onNodeDragStart}
      onNodeDrag={onNodeDrag}
      onNodeDragStop={onNodeDragStop}
      nodesConnectable={false}
      edgesFocusable={false}
      panOnScroll
      selectionOnDrag={false}
      minZoom={0.1}
      maxZoom={3}
      proOptions={{ hideAttribution: true }}
      fitView
    >
      <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#1f242c" />
      <Controls position="bottom-right" showInteractive={false} />
    </ReactFlow>
  );
}
