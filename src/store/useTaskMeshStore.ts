import { MarkerType, addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange, type Viewport } from '@xyflow/react';
import { create } from 'zustand';
import { demoProject } from '../utils/demo';
import type { EdgeType, NodeType, TaskMeshEdge, TaskMeshNode, TaskMeshProject } from '../types/taskmesh';

const KEY = 'taskmesh-project-v1';

interface State extends TaskMeshProject {
  selectedNodeId?: string;
  selectedEdgeId?: string;
  addNode: (type: NodeType) => void;
  setEdgeMode: (v: boolean) => void;
  connectNodes: (c: Connection) => void;
  onNodesChange: (changes: NodeChange<TaskMeshNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<TaskMeshEdge>[]) => void;
  setViewport: (viewport: Viewport) => void;
  updateNode: (id: string, patch: Partial<TaskMeshNode['data']>) => void;
  updateEdge: (id: string, patch: Partial<TaskMeshEdge['data']>) => void;
  selectNode: (id?: string) => void;
  selectEdge: (id?: string) => void;
  resetDemo: () => void;
}
const persist = (state: TaskMeshProject) => localStorage.setItem(KEY, JSON.stringify(state));
const read = (): TaskMeshProject => JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? demoProject;

export const useTaskMeshStore = create<State>((set, get) => ({
  ...read(),
  addNode: (type) => set((s) => {
    const id = `n-${crypto.randomUUID()}`;
    const n: TaskMeshNode = { id, position: { x: 150, y: 120 }, data: { title: `New ${type}`, description: '', type, status: 'not_started', priority: 'medium', owner: '', dueDate: '', tags: [] } };
    const next = { ...s, nodes: [...s.nodes, n] }; persist(next); return next;
  }),
  setEdgeMode: (edgeMode) => set((s) => { const next = { ...s, settings: { ...s.settings, edgeMode } }; persist(next); return next; }),
  connectNodes: (c) => set((s) => { const edge = { ...c, id: `e-${crypto.randomUUID()}`, data: { type: 'relates_to' as EdgeType, label: 'relates_to', description: '' }, markerEnd: { type: MarkerType.ArrowClosed } }; const next = { ...s, edges: addEdge(edge, s.edges) }; persist(next); return next; }),
  onNodesChange: (changes) => set((s) => { const next = { ...s, nodes: applyNodeChanges(changes, s.nodes) }; persist(next); return next; }),
  onEdgesChange: (changes) => set((s) => { const next = { ...s, edges: applyEdgeChanges(changes, s.edges) }; persist(next); return next; }),
  setViewport: (viewport) => set((s) => { const next = { ...s, viewport }; persist(next); return next; }),
  updateNode: (id, patch) => set((s) => { const next = { ...s, nodes: s.nodes.map((n) => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n) }; persist(next); return next; }),
  updateEdge: (id, patch) => set((s) => { const next = { ...s, edges: s.edges.map((e) => e.id === id ? { ...e, data: { ...e.data, ...patch }, label: patch.label ?? e.label } : e) }; persist(next); return next; }),
  selectNode: (selectedNodeId) => set({ selectedNodeId, selectedEdgeId: undefined }),
  selectEdge: (selectedEdgeId) => set({ selectedEdgeId, selectedNodeId: undefined }),
  resetDemo: () => set(() => { persist(demoProject); return demoProject; })
}));
