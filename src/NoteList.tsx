import { useMemo } from 'react';
import { allTags, filterNotes, STATUS_LABEL, useStore } from './store';
import { deriveGraph } from './wikilinks';
import { STATUSES } from './types';

export function NoteList() {
  const notes = useStore((s) => s.notes);
  const order = useStore((s) => s.order);
  const query = useStore((s) => s.query);
  const activeTag = useStore((s) => s.activeTag);
  const hideStatuses = useStore((s) => s.hideStatuses);
  const selectedId = useStore((s) => s.selectedId);
  const showOrphans = useStore((s) => s.showOrphans);
  const setQuery = useStore((s) => s.setQuery);
  const setActiveTag = useStore((s) => s.setActiveTag);
  const toggleHideStatus = useStore((s) => s.toggleHideStatus);
  const setShowOrphans = useStore((s) => s.setShowOrphans);
  const setSelected = useStore((s) => s.setSelected);
  const createNote = useStore((s) => s.createNote);

  const visible = useMemo(
    () => filterNotes(notes, order, query, activeTag, hideStatuses),
    [notes, order, query, activeTag, hideStatuses],
  );
  const derived = useMemo(() => deriveGraph(Object.values(notes)), [notes]);
  const tags = useMemo(() => allTags(notes), [notes]);

  return (
    <aside className="pane left">
      <div className="pane-head">
        <div className="brand">ProjectGraph</div>
        <button className="primary" onClick={() => createNote({ title: 'New note' })} title="New note (ctrl+n)">
          + New
        </button>
      </div>

      <input
        className="search"
        placeholder="Search notes…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="section">
        <div className="section-head">Filter by status</div>
        <div className="chips">
          {STATUSES.map((s) => {
            const off = hideStatuses.includes(s);
            return (
              <button
                key={s}
                className={`chip status-${s} ${off ? 'off' : ''}`}
                onClick={() => toggleHideStatus(s)}
              >
                {STATUS_LABEL[s]}
              </button>
            );
          })}
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={showOrphans}
            onChange={(e) => setShowOrphans(e.target.checked)}
          />
          Show orphans
        </label>
      </div>

      {tags.length > 0 && (
        <div className="section">
          <div className="section-head">Tags</div>
          <div className="chips">
            <button
              className={`chip ${!activeTag ? 'active' : ''}`}
              onClick={() => setActiveTag(undefined)}
            >
              all
            </button>
            {tags.map((t) => (
              <button
                key={t}
                className={`chip ${activeTag === t ? 'active' : ''}`}
                onClick={() => setActiveTag(activeTag === t ? undefined : t)}
              >
                #{t}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="section grow">
        <div className="section-head">
          Notes <span className="muted">{visible.length}</span>
        </div>
        <ul className="notelist">
          {visible.map((n) => {
            const degree = derived.degree.get(n.id) ?? 0;
            return (
              <li
                key={n.id}
                className={`noteitem ${selectedId === n.id ? 'sel' : ''}`}
                onClick={() => setSelected(n.id)}
              >
                <span className={`statusdot status-${n.status}`} />
                <span className="title">{n.title}</span>
                <span className="degree" title={`${degree} link${degree === 1 ? '' : 's'}`}>
                  {degree || ''}
                </span>
              </li>
            );
          })}
          {visible.length === 0 && <li className="muted empty">No notes match.</li>}
        </ul>
      </div>
    </aside>
  );
}
