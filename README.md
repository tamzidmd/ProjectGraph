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

