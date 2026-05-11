import type { Note } from './types';

const RE = /\[\[([^\]|\n]+?)(?:\|[^\]\n]*)?\]\]/g;

export function extractLinks(body: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of body.matchAll(RE)) {
    const t = m[1].trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export interface DerivedEdge {
  id: string;
  source: string;
  target: string;
}

export interface DerivedGraph {
  edges: DerivedEdge[];
  degree: Map<string, number>;
  outgoing: Map<string, string[]>;
  incoming: Map<string, string[]>;
  unresolved: Map<string, string[]>;
}

export function deriveGraph(notes: Note[]): DerivedGraph {
  const byTitle = new Map<string, Note>();
  for (const n of notes) byTitle.set(n.title.trim().toLowerCase(), n);

  const edges: DerivedEdge[] = [];
  const degree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  const unresolved = new Map<string, string[]>();
  const edgeKeys = new Set<string>();

  for (const n of notes) {
    for (const link of extractLinks(n.body)) {
      const target = byTitle.get(link.toLowerCase());
      if (!target) {
        const list = unresolved.get(n.id) ?? [];
        list.push(link);
        unresolved.set(n.id, list);
        continue;
      }
      if (target.id === n.id) continue;
      const key = `${n.id}->${target.id}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      edges.push({ id: key, source: n.id, target: target.id });
      degree.set(n.id, (degree.get(n.id) ?? 0) + 1);
      degree.set(target.id, (degree.get(target.id) ?? 0) + 1);
      const out = outgoing.get(n.id) ?? [];
      out.push(target.id);
      outgoing.set(n.id, out);
      const inc = incoming.get(target.id) ?? [];
      inc.push(n.id);
      incoming.set(target.id, inc);
    }
  }
  return { edges, degree, outgoing, incoming, unresolved };
}
