import { create } from 'zustand';
import { demoVault } from './demo';
import type { Note, Priority, Status, Vault } from './types';

const KEY = 'projectgraph-vault-v1';

export type Direction = 'LR' | 'TB';

interface LayoutSettings {
  direction: Direction;
  nodeSep: number;
  rankSep: number;
}

interface Forces {
  charge: number;
  linkDistance: number;
  collide: number;
  center: number;
}

interface UIState {
  selectedId?: string;
  query: string;
  activeTag?: string;
  hideStatuses: Status[];
  showOrphans: boolean;
  physics: boolean;
  layout: LayoutSettings;
  forces: Forces;
  layoutNonce: number;
}

const defaultLayout: LayoutSettings = { direction: 'LR', nodeSep: 30, rankSep: 110 };
const defaultForces: Forces = { charge: -240, linkDistance: 90, collide: 28, center: 0.04 };

const defaultUI: UIState = {
  selectedId: undefined,
  query: '',
  activeTag: undefined,
  hideStatuses: [],
  showOrphans: true,
  physics: false,
  layout: defaultLayout,
  forces: defaultForces,
  layoutNonce: 0,
};

interface State extends Vault, UIState {
  createNote: (partial?: Partial<Note>) => string;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  setSelected: (id?: string) => void;
  setQuery: (q: string) => void;
  setActiveTag: (tag?: string) => void;
  toggleHideStatus: (s: Status) => void;
  setShowOrphans: (v: boolean) => void;
  setPhysics: (v: boolean) => void;
  setLayout: <K extends keyof LayoutSettings>(key: K, value: LayoutSettings[K]) => void;
  resetLayout: () => void;
  setForce: <K extends keyof Forces>(key: K, value: Forces[K]) => void;
  resetForces: () => void;
  relayout: () => void;
  importVault: (v: Vault) => void;
  exportVault: () => Vault;
  resetDemo: () => void;
}

function loadVault(): Vault {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return demoVault;
    const parsed = JSON.parse(raw) as Vault;
    if (!parsed || typeof parsed !== 'object' || !parsed.notes || !parsed.order) return demoVault;
    return parsed;
  } catch {
    return demoVault;
  }
}

function persist(v: Vault) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    // storage full or unavailable — skip
  }
}

function uid() {
  return 'n-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function uniqueTitle(notes: Record<string, Note>, base: string): string {
  const taken = new Set(Object.values(notes).map((n) => n.title.trim().toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  let i = 2;
  while (taken.has(`${base} ${i}`.toLowerCase())) i++;
  return `${base} ${i}`;
}

export const useStore = create<State>((set, get) => {
  const initial = loadVault();
  return {
    ...initial,
    ...defaultUI,
    createNote: (partial) => {
      const id = partial?.id ?? uid();
      const now = Date.now();
      const title = uniqueTitle(get().notes, partial?.title?.trim() || 'Untitled');
      const note: Note = {
        id,
        title,
        body: partial?.body ?? '',
        status: partial?.status ?? 'todo',
        priority: partial?.priority ?? 'medium',
        due: partial?.due ?? '',
        tags: partial?.tags ?? [],
        createdAt: now,
        updatedAt: now,
      };
      set((s) => {
        const notes = { ...s.notes, [id]: note };
        const order = [id, ...s.order];
        persist({ notes, order });
        return { notes, order, selectedId: id };
      });
      return id;
    },
    updateNote: (id, patch) => {
      set((s) => {
        const existing = s.notes[id];
        if (!existing) return s;
        const merged: Note = { ...existing, ...patch, id, updatedAt: Date.now() };
        const notes = { ...s.notes, [id]: merged };
        persist({ notes, order: s.order });
        return { notes };
      });
    },
    deleteNote: (id) => {
      set((s) => {
        if (!s.notes[id]) return s;
        const notes = { ...s.notes };
        delete notes[id];
        const order = s.order.filter((x) => x !== id);
        persist({ notes, order });
        return { notes, order, selectedId: s.selectedId === id ? undefined : s.selectedId };
      });
    },
    setSelected: (id) => set({ selectedId: id }),
    setQuery: (q) => set({ query: q }),
    setActiveTag: (tag) => set({ activeTag: tag }),
    toggleHideStatus: (s) =>
      set((state) => {
        const has = state.hideStatuses.includes(s);
        return { hideStatuses: has ? state.hideStatuses.filter((x) => x !== s) : [...state.hideStatuses, s] };
      }),
    setShowOrphans: (v) => set({ showOrphans: v }),
    setPhysics: (v) => set({ physics: v }),
    setLayout: (key, value) => set((s) => ({ layout: { ...s.layout, [key]: value } })),
    resetLayout: () => set({ layout: defaultLayout }),
    setForce: (key, value) => set((s) => ({ forces: { ...s.forces, [key]: value } })),
    resetForces: () => set({ forces: defaultForces }),
    relayout: () => set((s) => ({ layoutNonce: s.layoutNonce + 1 })),
    importVault: (v) => {
      const notes = v.notes ?? {};
      const order = v.order && v.order.length ? v.order.filter((id) => notes[id]) : Object.keys(notes);
      const vault = { notes, order };
      persist(vault);
      set({ ...vault, selectedId: undefined });
    },
    exportVault: () => ({ notes: get().notes, order: get().order }),
    resetDemo: () => {
      persist(demoVault);
      set({ ...demoVault, selectedId: undefined });
    },
  };
});

export const allTags = (notes: Record<string, Note>): string[] => {
  const counts = new Map<string, number>();
  for (const n of Object.values(notes)) {
    for (const t of n.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
};

export const filterNotes = (
  notes: Record<string, Note>,
  order: string[],
  query: string,
  activeTag: string | undefined,
  hideStatuses: Status[],
): Note[] => {
  const q = query.trim().toLowerCase();
  const hidden = new Set(hideStatuses);
  return order
    .map((id) => notes[id])
    .filter((n): n is Note => Boolean(n))
    .filter((n) => !hidden.has(n.status))
    .filter((n) => (activeTag ? n.tags.includes(activeTag) : true))
    .filter((n) => {
      if (!q) return true;
      const hay = `${n.title} ${n.body} ${n.tags.join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
};

export const STATUS_LABEL: Record<Status, string> = {
  todo: 'To do',
  doing: 'Doing',
  done: 'Done',
  blocked: 'Blocked',
  someday: 'Someday',
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};
