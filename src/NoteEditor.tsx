import { useMemo } from 'react';
import { PRIORITY_LABEL, STATUS_LABEL, useStore } from './store';
import { PRIORITIES, STATUSES, type Note } from './types';
import { deriveGraph, extractLinks } from './wikilinks';

export function NoteEditor() {
  const notes = useStore((s) => s.notes);
  const selectedId = useStore((s) => s.selectedId);
  const updateNote = useStore((s) => s.updateNote);
  const deleteNote = useStore((s) => s.deleteNote);
  const createNote = useStore((s) => s.createNote);
  const setSelected = useStore((s) => s.setSelected);

  const note: Note | undefined = selectedId ? notes[selectedId] : undefined;

  const derived = useMemo(() => deriveGraph(Object.values(notes)), [notes]);
  const byTitleId = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of Object.values(notes)) m.set(n.title.trim().toLowerCase(), n.id);
    return m;
  }, [notes]);

  if (!note) {
    return (
      <aside className="pane right">
        <div className="empty-pane">
          <h3>Nothing selected</h3>
          <p className="muted">
            Click a node in the graph or a note in the list. Link notes with <code>[[Note Title]]</code>.
          </p>
        </div>
      </aside>
    );
  }

  const outgoing = derived.outgoing.get(note.id) ?? [];
  const incoming = derived.incoming.get(note.id) ?? [];
  const unresolved = derived.unresolved.get(note.id) ?? [];
  const outgoingTitles = extractLinks(note.body);

  const openByTitle = (title: string) => {
    const id = byTitleId.get(title.trim().toLowerCase());
    if (id) setSelected(id);
  };
  const createFromUnresolved = (title: string) => {
    createNote({ title });
  };

  return (
    <aside className="pane right">
      <div className="pane-head">
        <input
          className="title-input"
          value={note.title}
          onChange={(e) => updateNote(note.id, { title: e.target.value })}
          placeholder="Untitled"
        />
        <button
          className="danger"
          onClick={() => {
            if (confirm(`Delete "${note.title}"?`)) deleteNote(note.id);
          }}
        >
          Delete
        </button>
      </div>

      <div className="row">
        <label className="field">
          <span>Status</span>
          <select
            className={`status-${note.status}`}
            value={note.status}
            onChange={(e) => updateNote(note.id, { status: e.target.value as Note['status'] })}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Priority</span>
          <select
            value={note.priority}
            onChange={(e) => updateNote(note.id, { priority: e.target.value as Note['priority'] })}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span>Due</span>
        <input
          type="date"
          value={note.due}
          onChange={(e) => updateNote(note.id, { due: e.target.value })}
        />
      </label>

      <label className="field">
        <span>Tags <span className="muted">(comma separated)</span></span>
        <input
          value={note.tags.join(', ')}
          onChange={(e) =>
            updateNote(note.id, {
              tags: e.target.value
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
            })
          }
        />
      </label>

      <label className="field grow">
        <span>Body <span className="muted">— use [[Note Title]] to link</span></span>
        <textarea
          className="body"
          value={note.body}
          onChange={(e) => updateNote(note.id, { body: e.target.value })}
          placeholder="Write here. Reference other notes with [[Title]]."
        />
      </label>

      <div className="section">
        <div className="section-head">Outgoing links <span className="muted">{outgoing.length}</span></div>
        <ul className="linklist">
          {outgoingTitles.map((t) => {
            const id = byTitleId.get(t.toLowerCase());
            return (
              <li key={t} className={id ? 'resolved' : 'unresolved'}>
                <button onClick={() => (id ? openByTitle(t) : createFromUnresolved(t))}>
                  {id ? t : <><span>{t}</span> <em>+ create</em></>}
                </button>
              </li>
            );
          })}
          {outgoingTitles.length === 0 && <li className="muted empty">No links yet.</li>}
          {unresolved.length === 0 && outgoingTitles.length === outgoing.length ? null : null}
        </ul>
      </div>

      <div className="section">
        <div className="section-head">Backlinks <span className="muted">{incoming.length}</span></div>
        <ul className="linklist">
          {incoming.map((id) => {
            const back = notes[id];
            if (!back) return null;
            return (
              <li key={id} className="resolved">
                <button onClick={() => setSelected(id)}>{back.title}</button>
              </li>
            );
          })}
          {incoming.length === 0 && <li className="muted empty">Nothing links here yet.</li>}
        </ul>
      </div>
    </aside>
  );
}
