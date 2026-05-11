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
# TaskMesh

TaskMesh is a graph-first, local-first project management prototype built with React + TypeScript + Vite.

## Zero local setup workflow
You do **not** need to install anything locally.
- Build and test run in **GitHub Actions**.
- Deploy runs in **GitHub Actions**.
- Hosting is **GitHub Pages**.

## Stack
- React, TypeScript, Vite
- @xyflow/react (React Flow)
- Zustand state store
- d3-force graph reorganization
- lucide-react icons

## GitHub Pages
- Vite `base` is set to `/ProjectGraph/`.
- Enable Pages in GitHub: **Settings → Pages → Source: GitHub Actions**.
- Push to `main` triggers `.github/workflows/deploy-pages.yml`.
- URL will be `https://<your-username>.github.io/ProjectGraph/`.

## App features (MVP)
- Full-screen graph canvas
- Left control sidebar for adding nodes, edge mode, reorganize, export/import, reset demo
- Right inspector for selected node/edge
- LocalStorage autosave
- Directed edges and drag support
- Force-directed reorganize

## Development scripts
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`

