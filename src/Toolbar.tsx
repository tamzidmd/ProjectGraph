import { useRef } from 'react';
import { useStore } from './store';
import type { Vault } from './types';

export function Toolbar() {
  const physics = useStore((s) => s.physics);
  const setPhysics = useStore((s) => s.setPhysics);
  const layout = useStore((s) => s.layout);
  const setLayout = useStore((s) => s.setLayout);
  const forces = useStore((s) => s.forces);
  const setForce = useStore((s) => s.setForce);
  const resetForces = useStore((s) => s.resetForces);
  const relayout = useStore((s) => s.relayout);
  const exportVault = useStore((s) => s.exportVault);
  const importVault = useStore((s) => s.importVault);
  const resetDemo = useStore((s) => s.resetDemo);

  const fileRef = useRef<HTMLInputElement>(null);

  const onExport = () => {
    const data = exportVault();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `projectgraph-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onImport = (file?: File) => {
    if (!file) return;
    file.text().then((text) => {
      try {
        const parsed = JSON.parse(text) as Vault;
        importVault(parsed);
      } catch {
        alert('Invalid vault file.');
      }
    });
  };

  return (
    <header className="toolbar">
      {physics ? (
        <div className="forces">
          <label className="slider">
            <span>Repel</span>
            <input
              type="range"
              min={-600}
              max={-40}
              step={10}
              value={forces.charge}
              onChange={(e) => setForce('charge', Number(e.target.value))}
            />
          </label>
          <label className="slider">
            <span>Link</span>
            <input
              type="range"
              min={30}
              max={220}
              step={5}
              value={forces.linkDistance}
              onChange={(e) => setForce('linkDistance', Number(e.target.value))}
            />
          </label>
          <label className="slider">
            <span>Collide</span>
            <input
              type="range"
              min={8}
              max={60}
              step={1}
              value={forces.collide}
              onChange={(e) => setForce('collide', Number(e.target.value))}
            />
          </label>
          <label className="slider">
            <span>Center</span>
            <input
              type="range"
              min={0}
              max={0.3}
              step={0.005}
              value={forces.center}
              onChange={(e) => setForce('center', Number(e.target.value))}
            />
          </label>
          <button className="ghost" onClick={resetForces}>
            Reset
          </button>
        </div>
      ) : (
        <div className="forces">
          <div className="seg">
            <button
              className={`segbtn ${layout.direction === 'LR' ? 'active' : ''}`}
              onClick={() => setLayout('direction', 'LR')}
              title="Left to right"
            >
              → LR
            </button>
            <button
              className={`segbtn ${layout.direction === 'TB' ? 'active' : ''}`}
              onClick={() => setLayout('direction', 'TB')}
              title="Top to bottom"
            >
              ↓ TB
            </button>
          </div>
          <label className="slider">
            <span>Node gap</span>
            <input
              type="range"
              min={10}
              max={80}
              step={2}
              value={layout.nodeSep}
              onChange={(e) => setLayout('nodeSep', Number(e.target.value))}
            />
          </label>
          <label className="slider">
            <span>Rank gap</span>
            <input
              type="range"
              min={40}
              max={240}
              step={5}
              value={layout.rankSep}
              onChange={(e) => setLayout('rankSep', Number(e.target.value))}
            />
          </label>
          <button className="ghost" onClick={relayout} title="Re-run auto layout">
            Re-layout
          </button>
        </div>
      )}
      <div className="spacer" />
      <label className="toggle">
        <input type="checkbox" checked={physics} onChange={(e) => setPhysics(e.target.checked)} />
        Enable physics
      </label>
      <button className="ghost" onClick={onExport}>
        Export
      </button>
      <button className="ghost" onClick={() => fileRef.current?.click()}>
        Import
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={(e) => onImport(e.target.files?.[0])}
      />
      <button
        className="ghost danger"
        onClick={() => {
          if (confirm('Reset to demo vault? This replaces all notes.')) resetDemo();
        }}
      >
        Reset demo
      </button>
    </header>
  );
}
