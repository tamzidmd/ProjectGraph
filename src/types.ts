export type Status = 'todo' | 'doing' | 'done' | 'blocked' | 'someday';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export const STATUSES: Status[] = ['todo', 'doing', 'done', 'blocked', 'someday'];
export const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent'];

export interface Note {
  id: string;
  title: string;
  body: string;
  status: Status;
  priority: Priority;
  due: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Vault {
  notes: Record<string, Note>;
  order: string[];
}
