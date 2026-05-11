import { useEffect } from 'react';
import { GraphView } from './GraphView';
import { NoteEditor } from './NoteEditor';
import { NoteList } from './NoteList';
import { Toolbar } from './Toolbar';
import { useStore } from './store';

export default function App() {
  const createNote = useStore((s) => s.createNote);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (inField) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        createNote({ title: 'New note' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [createNote]);

  return (
    <div className="app">
      <Toolbar />
      <div className="body">
        <NoteList />
        <main className="graph">
          <GraphView />
        </main>
        <NoteEditor />
      </div>
    </div>
  );
}
