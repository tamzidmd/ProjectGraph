# TaskMesh (Static GitHub Pages Prototype)

TaskMesh is a graph-first project management prototype served as a **static site**.

## No build step
- No npm
- No Vite
- No React
- No TypeScript
- No GitHub Actions

This app runs directly from `index.html` at the repository root.

## Deploy on GitHub Pages
1. Open repository **Settings → Pages**.
2. Set **Source: Deploy from a branch**.
3. Set **Branch: main**.
4. Set **Folder: / root**.
5. Save.

After deployment, open your GitHub Pages URL to use the app.

## Included files
- `index.html` – complete app (HTML/CSS/JS) using Cytoscape.js CDN.
- `sample-project.taskmesh.json` – sample importable project file.

## Features
- Full-screen graph canvas
- Node and edge editing via inspector
- Add node / add edge mode / delete selected
- Search + filter by status + filter by type
- Directed relationships, manual dragging, reorganize layout
- Upstream/downstream dependency highlighting
- localStorage autosave
- Export/import `.taskmesh.json`
- Reset demo data
