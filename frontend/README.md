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
npm run test    # Vitest + coverage (watch)
npm run test:run # Vitest + coverage (single run / CI)
npm run format  # Prettier write
npm run format:check # Prettier verify-only
```

## Project Layout

```bash
frontend/
├─ public/          # static assets copied as-is
├─ src/
│  ├─ components/
│  │  ├─ ui/        # Shadcn-generated primitives (do not edit heavily)
│  │  └─ shared/    # project-specific components built on top of Shadcn
│  ├─ views/        # page-level containers
│  ├─ utils/        # helpers (Mermaid parsing, data mappers, etc.)
│  ├─ tests/        # Vitest + Testing Library suites (coverage-enabled)
│  ├─ App.tsx
│  └─ main.tsx
├─ vite.config.ts
├─ tsconfig*.json
└─ eslint.config.js
```

## Testing

Please refer to [testing guide](docs/testing.md) for detailed instruction. Maintain at least **80%** coverage for any new pushed code.

## UI Library (Shadcn/UI)

Shadcn builds on Radix primitives and Tailwind utilities. Components are copied into `src/components/ui` so you can customize them freely.

### Installed components

- `button` – primary/secondary CTAs (generate diagram, navbar actions)
- `input` – GitHub URL + repo search fields
- `label` – helper text like “Sample”/“History”
- `card` – sample/history repo tiles
- `dropdown-menu` – navbar environment/user switcher
- `separator` – subtle dividers (e.g., header vs content)
- `scroll-area` – scrollable panels when repo lists overflow

### Adding a component

Please refer to [Shadcn](https://ui.shadcn.com/docs/components) for corresponding component installation guide

eg:

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
- Testing guide: `frontend/docs/testing.md`
- Vite docs: <https://vitejs.dev/>
- Shadcn/UI: <https://ui.shadcn.com/>
