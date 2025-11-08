# Repository Architecture Diagramming Frontend

Client-side SPA for exploring repository architecture diagrams and related controls.

## Prerequisites

- Node.js 20.19+ (or 22.12+)
- npm 10+ (bundled with supported Node versions)
- Optional: `nvm` to match the CI Node version (see `.nvmrc`)

Verify your versions:

```bash
node --version
npm --version
```

## Install

From the repo root:

```bash
cd frontend
npm install
```

## Run

```bash
npm run dev     # start Vite dev server (default http://localhost:5173)
npm run build   # type-check + production build
npm run preview # preview the production build locally
npm run lint    # run ESLint (type-aware rules configured in eslint.config.js)
```

## Project Layout

```bash
frontend/
├─ public/          # static assets copied as-is
├─ src/
│  ├─ components/   # shared + Shadcn components
│  ├─ views/        # page-level containers
│  ├─ utils/        # helpers (Mermaid parsing, data mappers, etc.)
│  ├─ App.tsx
│  └─ main.tsx
├─ vite.config.ts
├─ tsconfig*.json
└─ eslint.config.js
```

## UI Library (Shadcn/UI)

Shadcn builds on Radix primitives and Tailwind utilities. Components are copied into `src/components/ui` so you can customize them freely.

### Adding a component

```bash
npx shadcn-ui@latest add button
```

- Keep generated files under `src/components/ui`.
- Re-run the command to update a component when Shadcn releases fixes.

### Best practices

- Prefer granular imports (`import { Button } from "@/components/ui/button";`) to avoid bundling unused widgets.
- Stick to Tailwind tokens from `tailwind.config.ts`; centralize colors/radii there.
- Keep Shadcn overrides small—extend via wrapper components instead of editing vendor files heavily.
- Favor controlled, accessible patterns (Radix state props) over custom DOM hacks.
- Document any bespoke variants in `src/components/ui/README.md` (create if missing) so future contributors know how to use them.

## References

- Stack ADR: `specs/adr/ADR_Frontend_Stack_2.md`
- Build tool ADR: `specs/adr/ADR_Frontend_Build_Tool_4.md`
- Vite docs: <https://vitejs.dev/>
- Shadcn/UI: <https://ui.shadcn.com/>
