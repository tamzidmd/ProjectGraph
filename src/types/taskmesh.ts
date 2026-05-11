import type { Edge, Node, Viewport } from '@xyflow/react';

export type NodeType = 'task' | 'milestone' | 'decision' | 'risk' | 'blocker' | 'note' | 'deliverable';
export type NodeStatus = 'not_started' | 'active' | 'blocked' | 'done' | 'archived';
export type NodePriority = 'low' | 'medium' | 'high' | 'critical';
export type EdgeType = 'blocks' | 'enables' | 'depends_on' | 'relates_to' | 'informs' | 'resolves';

export interface TaskMeshNodeData {
  title: string;
  description: string;
  type: NodeType;
  status: NodeStatus;
  priority: NodePriority;
  owner: string;
  dueDate: string;
  tags: string[];
}

export interface TaskMeshEdgeData {
  type: EdgeType;
  label: string;
  description: string;
}

export type TaskMeshNode = Node<TaskMeshNodeData>;
export type TaskMeshEdge = Edge<TaskMeshEdgeData>;

export interface TaskMeshProject {
  nodes: TaskMeshNode[];
  edges: TaskMeshEdge[];
  viewport: Viewport;
  settings: { edgeMode: boolean };
  filters: { statuses: NodeStatus[]; priorities: NodePriority[] };
}
