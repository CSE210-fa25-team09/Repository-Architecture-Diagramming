# DiagAI

![Frontend Coverage Badge](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/elaine-ch/950ea96d8c81479a2fc3e12d3ca71532/raw/Repository-Architecture-Diagramming__heads_main.json)
![Backend Coverage Badge](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/elaine-ch/950ea96d8c81479a2fc3e12d3ca71532/raw/Repository-Architecture-Diagramming-backend__heads_main.json)

Repository Architecture Diagramming: visualization tool for teams and creators

## How to Use the App

Drop in a GitHub repo link or start with one of our sample repositories. The tool automatically analyzes its structure, mapping out modules, dependencies, and interactions as a visual architecture diagram. Once the diagram appears, you can explore it by zooming, clicking into nodes, and highlighting relationships to understand how different parts of the system fit together. You can even add multiple diagrams and move to separate branches. Use it to reason about design, spot coupling issues, plan refactors, or communicate architecture to teammates. When you're satisfied, export the diagram for documentation or share it as part of your workflow.

## Read this first for Development (ADRs)
- Frontend stack/build: `specs/adr/ADR_Frontend_Stack_2.md`, `specs/adr/ADR_Frontend_Build_Tool_4.md`
- Frontend refinements: `frontend/docs/ADR_Frontend_Refinements.md`
- Backend stack/deployment: `specs/adr/ADR-backend-stack.md`, `specs/adr/ADR-backend-delployment`

## Frontend (Vite/React)
**Prerequisites**
- Node.js 20.19+ or 22.12+ ([install](https://nodejs.org/en/download))
- npm

**Install**
```bash
cd frontend
npm install
```

**Start dev server**
```bash
npm run dev
```
Then open the printed local URL (defaults to `http://localhost:5173`).

## Backend (Express)
**Prerequisites**
- Node.js 20+ (align with frontend version)
- npm

**Environment (optional but recommended)**
- `PORT` (default `3000`)
- `GITHUB_TOKEN` for higher GitHub API limits
- LLM (optional): `LLM_PROVIDER` (`huggingface`|`openai`), `LLM_MODEL`, `LLM_API_URL`, `LLM_API_KEY`/`HF_TOKEN`, `LLM_MAX_NEW_TOKENS`, `LLM_MAX_BRANCHES`, `LLM_MAX_TREE_LINES`, `LLM_MAX_README_CHARS`, `FETCH_CONCURRENCY`, `MAX_ANALYZE_FILES`

**Install**
```bash
cd backend
npm install
```

**Start dev server**
```bash
npm run dev
```
API will start at `http://localhost:3000` (or your `PORT`).

**Run tests**
```bash
cd backend
npm test
```
