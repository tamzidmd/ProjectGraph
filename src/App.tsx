import { useCallback, useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap, type NodeMouseHandler } from '@xyflow/react';
import { forceCollide, forceLink, forceManyBody, forceSimulation } from 'd3-force';
import { useTaskMeshStore } from './store/useTaskMeshStore';
import type { TaskMeshProject } from './types/taskmesh';

const nodeKinds = ['task', 'milestone', 'decision', 'risk', 'blocker', 'note', 'deliverable'] as const;

export default function App() {
  const s = useTaskMeshStore();
  const selectedNode = s.nodes.find((n) => n.id === s.selectedNodeId);
  const selectedEdge = s.edges.find((e) => e.id === s.selectedEdgeId);
  const neighbors = useMemo(() => new Set(s.edges.filter((e) => e.source === s.selectedNodeId || e.target === s.selectedNodeId).flatMap((e) => [e.source, e.target])), [s.edges, s.selectedNodeId]);

  const reorganize = () => {
    const simNodes = s.nodes.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }));
    const sim = forceSimulation(simNodes).force('link', forceLink(s.edges.map((e) => ({ source: e.source, target: e.target }))).id((d: any) => d.id).distance(140)).force('charge', forceManyBody().strength(-300)).force('collide', forceCollide(58)).stop();
    for (let i = 0; i < 180; i++) sim.tick();
    sim.stop();
    const next = s.nodes.map((n) => ({ ...n, position: { x: simNodes.find((x) => x.id === n.id)?.x ?? 0, y: simNodes.find((x) => x.id === n.id)?.y ?? 0 } }));
    s.onNodesChange(next.map((n) => ({ id: n.id, type: 'position', position: n.position })) as any);
  };

  const exportJson = () => {
    const data: TaskMeshProject = { nodes: s.nodes, edges: s.edges, viewport: s.viewport, settings: s.settings, filters: s.filters };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'project.taskmesh.json'; a.click();
  };

  const importJson = useCallback((file?: File) => {
    if (!file) return;
    file.text().then((text) => {
      const data = JSON.parse(text) as TaskMeshProject;
      localStorage.setItem('taskmesh-project-v1', JSON.stringify(data));
      window.location.reload();
    });
  }, []);

  const onNodeClick: NodeMouseHandler = (_, node) => s.selectNode(node.id);

  return <div className="app"><aside>{nodeKinds.map((k) => <button key={k} onClick={() => s.addNode(k)}>{`Add ${k[0].toUpperCase()}${k.slice(1)}`}</button>)}
  <button onClick={() => s.setEdgeMode(!s.settings.edgeMode)}>Add Edge mode: {s.settings.edgeMode ? 'On' : 'Off'}</button>
  <button onClick={reorganize}>Reorganize Graph</button><button onClick={exportJson}>Export Project JSON</button>
  <label className="import">Import Project JSON<input type="file" accept=".json,.taskmesh.json" onChange={(e) => importJson(e.target.files?.[0])} /></label>
  <button onClick={s.resetDemo}>Reset Demo</button></aside>
  <main><ReactFlow nodes={s.nodes.map((n) => ({ ...n, className: `${n.data.status === 'blocked' ? 'blocked' : ''} ${['done','archived'].includes(n.data.status) ? 'muted' : ''} ${neighbors.has(n.id) ? 'connected' : ''}` }))} edges={s.edges}
    onNodesChange={s.onNodesChange} onEdgesChange={s.onEdgesChange} onConnect={s.settings.edgeMode ? s.connectNodes : undefined} onNodeClick={onNodeClick}
    onEdgeClick={(_, e) => s.selectEdge(e.id)} onPaneClick={() => { s.selectNode(); s.selectEdge(); }} fitView>
    <Background /><MiniMap /><Controls /></ReactFlow></main>
  <aside>{selectedNode && <div><h3>Node Inspector</h3><input value={selectedNode.data.title} onChange={(e) => s.updateNode(selectedNode.id, { title: e.target.value })} />
  <textarea value={selectedNode.data.description} onChange={(e) => s.updateNode(selectedNode.id, { description: e.target.value })} />
  <input placeholder="owner" value={selectedNode.data.owner} onChange={(e) => s.updateNode(selectedNode.id, { owner: e.target.value })} /></div>}
  {selectedEdge && <div><h3>Edge Inspector</h3><input value={selectedEdge.data?.label ?? ''} onChange={(e) => s.updateEdge(selectedEdge.id, { label: e.target.value })} /></div>}</aside></div>;
}
