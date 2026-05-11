import { memo, useEffect, useMemo, useRef } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
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
import { useStore, filterNotes } from './store';
import { deriveGraph } from './wikilinks';
import type { Status } from './types';

interface SimNode extends SimulationNodeDatum {
  id: string;
}
type SimLink = SimulationLinkDatum<SimNode>;

type NodeData = {
  title: string;
  status: Status;
  degree: number;
  dim: boolean;
  glow: boolean;
};

type RFNode = Node<NodeData>;

const STATUS_COLOR: Record<Status, string> = {
  todo: '#8b949e',
  doing: '#58a6ff',
  done: '#3fb950',
  blocked: '#f85149',
  someday: '#a371f7',
};

const GraphNode = memo(({ data, selected }: NodeProps<RFNode>) => {
  const size = Math.max(12, Math.min(48, 12 + data.degree * 3));
  const color = STATUS_COLOR[data.status];
  return (
    <div className={`gnode ${data.dim ? 'dim' : ''} ${data.glow ? 'glow' : ''} ${selected ? 'sel' : ''}`}>
      <Handle type="target" position={Position.Top} className="ghandle" isConnectable={false} />
      <div
        className="gdot"
        style={{
          width: size,
          height: size,
          background: color,
          boxShadow: selected || data.glow ? `0 0 0 2px ${color}66, 0 0 18px ${color}55` : undefined,
        }}
      />
      <div className="glabel">{data.title}</div>
      <Handle type="source" position={Position.Bottom} className="ghandle" isConnectable={false} />
    </div>
  );
});
GraphNode.displayName = 'GraphNode';

const nodeTypes = { graph: GraphNode };

export function GraphView() {
  const notes = useStore((s) => s.notes);
  const order = useStore((s) => s.order);
  const query = useStore((s) => s.query);
  const activeTag = useStore((s) => s.activeTag);
  const hideStatuses = useStore((s) => s.hideStatuses);
  const showOrphans = useStore((s) => s.showOrphans);
  const selectedId = useStore((s) => s.selectedId);
  const live = useStore((s) => s.live);
  const forces = useStore((s) => s.forces);
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

  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const simNodesRef = useRef<Map<string, SimNode>>(new Map());
  const { fitView } = useReactFlow();

  useEffect(() => {
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
          return { ...n, position: { x: p.x, y: p.y } };
        }),
      );
    });
    simRef.current = sim;
    return () => {
      sim.stop();
      simRef.current = null;
    };
  }, [setRfNodes]);

  useEffect(() => {
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
        next.set(n.id, {
          id: n.id,
          x: (Math.random() - 0.5) * spread,
          y: (Math.random() - 0.5) * spread,
        });
      }
    }
    simNodesRef.current = next;

    sim.nodes([...next.values()]);
    const linkForce = sim.force<ReturnType<typeof forceLink<SimNode, SimLink>>>('link');
    if (linkForce) linkForce.links(finalEdges.map((e) => ({ source: e.source, target: e.target })));

    setRfNodes(
      finalNotes.map((n) => {
        const p = next.get(n.id)!;
        return {
          id: n.id,
          type: 'graph',
          position: { x: p.x ?? 0, y: p.y ?? 0 },
          data: {
            title: n.title,
            status: n.status,
            degree: derived.degree.get(n.id) ?? 0,
            dim: !!neighborhood && !neighborhood.has(n.id),
            glow: !!neighborhood && neighborhood.has(n.id) && n.id !== selectedId,
          },
        };
      }),
    );

    setRfEdges(
      finalEdges.map((e) => {
        const hot = neighborhood && (neighborhood.has(e.source) || neighborhood.has(e.target));
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'straight',
          style: {
            stroke: hot ? '#c9d1d9' : '#30363d',
            strokeWidth: hot ? 1.5 : 1,
            opacity: neighborhood && !hot ? 0.18 : 0.7,
          },
        };
      }),
    );

    sim.alpha(0.9).restart();
  }, [finalNotes, finalEdges, derived.degree, neighborhood, selectedId, setRfNodes, setRfEdges]);

  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;
    (sim.force('charge') as ReturnType<typeof forceManyBody<SimNode>>).strength(forces.charge);
    (sim.force('collide') as ReturnType<typeof forceCollide<SimNode>>).radius(forces.collide);
    (sim.force('center') as ReturnType<typeof forceCenter<SimNode>>).strength(forces.center);
    const linkForce = sim.force<ReturnType<typeof forceLink<SimNode, SimLink>>>('link');
    if (linkForce) linkForce.distance(forces.linkDistance);
    sim.alpha(Math.max(sim.alpha(), 0.6)).restart();
  }, [forces.charge, forces.collide, forces.center, forces.linkDistance]);

  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;
    sim.alphaTarget(live ? 0.05 : 0).restart();
  }, [live]);

  const onNodeClick: NodeMouseHandler = (_, node) => setSelected(node.id);
  const onPaneClick = () => setSelected(undefined);

  const onNodeDragStart: OnNodeDrag = (_, node) => {
    const s = simNodesRef.current.get(node.id);
    if (!s) return;
    s.fx = node.position.x;
    s.fy = node.position.y;
    simRef.current?.alphaTarget(0.3).restart();
  };
  const onNodeDrag: OnNodeDrag = (_, node) => {
    const s = simNodesRef.current.get(node.id);
    if (!s) return;
    s.fx = node.position.x;
    s.fy = node.position.y;
  };
  const onNodeDragStop: OnNodeDrag = (_, node) => {
    const s = simNodesRef.current.get(node.id);
    if (!s) return;
    s.fx = null;
    s.fy = null;
    simRef.current?.alphaTarget(live ? 0.05 : 0);
  };

  useEffect(() => {
    const t = setTimeout(() => fitView({ duration: 400, padding: 0.2 }), 600);
    return () => clearTimeout(t);
  }, [fitView]);

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
