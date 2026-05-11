import { MarkerType } from '@xyflow/react';
import type { TaskMeshProject } from '../types/taskmesh';

export const demoProject: TaskMeshProject = {
  nodes: [
    { id: 'n1', position: { x: 80, y: 80 }, data: { title: 'Define scope', description: 'Set boundaries', type: 'task', status: 'active', priority: 'high', owner: 'Alex', dueDate: '', tags: ['planning'] } },
    { id: 'n2', position: { x: 340, y: 120 }, data: { title: 'MVP milestone', description: 'First release', type: 'milestone', status: 'not_started', priority: 'critical', owner: 'Riley', dueDate: '', tags: ['release'] } },
    { id: 'n3', position: { x: 200, y: 280 }, data: { title: 'UI risk', description: 'Complex editor interactions', type: 'risk', status: 'blocked', priority: 'medium', owner: 'Jordan', dueDate: '', tags: ['ux'] } }
  ],
  edges: [
    { id: 'e1-2', source: 'n1', target: 'n2', data: { type: 'enables', label: 'enables', description: '' }, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e3-2', source: 'n3', target: 'n2', data: { type: 'blocks', label: 'blocks', description: '' }, markerEnd: { type: MarkerType.ArrowClosed } }
  ],
  viewport: { x: 0, y: 0, zoom: 1 },
  settings: { edgeMode: false },
  filters: { statuses: ['not_started', 'active', 'blocked', 'done', 'archived'], priorities: ['low', 'medium', 'high', 'critical'] }
};
