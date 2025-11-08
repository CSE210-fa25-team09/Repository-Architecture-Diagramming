# Architecture Decision Record (ADR)

**ADR #:** 004  
**Title:** Build Tool: Vite for Frontend  
**Date:** 2025-11-07  
**Status:** Accepted

## 1. Context

We need a fast, modern build tool that optimizes **developer experience (DX)** and **production performance** for a React + TypeScript + Tailwind/Shadcn UI stack. Requirements:

- Fast dev server start and **HMR** to speed iteration.
- Optimized production builds with code-splitting and asset hashing.
- Simple config, minimal boilerplate, and healthy plugin ecosystem.
- Easy integration with unit/integration testing and CI.

## 2. Decision

Adopt **Vite** (with `@vitejs/plugin-react`) as the frontend dev server and build system.

### Rationale

- **Fast DX:** near-instant cold starts, reliable HMR; reduces feedback loop during UI work.
- **Modern build:** Rollup-powered production builds with code-splitting and tree-shaking.
- **Plugin ecosystem:** official React plugin, SVGR, bundle visualizer, PWA, etc.
- **Simplicity:** small config surface vs. Webpack; fewer custom loaders.
- **Testing fit:** Native alignment with **Vitest** for unit/integration tests.

This address our problems via:

- **Rapid iteration:** HMR preserves component state and speeds up UI development cycles.
- **Small, fast builds:** code-splitting + tree-shaking keep initial JS bundle size small, with **dynamic imports** for heavy libs like Mermaid.
- **Seamless React/Tailwind/Shadcn integration:** official React plugin and straightforward CSS pipeline reduce setup and override churn.
- **Reliable testing setup:** first-class compatibility with **Vitest** enables fast unit/integration tests and easy CI wiring.
- **Performance guardrails:** easy bundle analysis (e.g., Rollup visualizer) and CI checks for size/TTI budgets.
- **Lower maintenance:** minimal, readable config compared to Webpack; fewer bespoke loaders and less boilerplate.

## 3. Alternatives Considered

- **Webpack (custom config)**

  - **Pros:** Massive plugin/loader ecosystem, highly flexible, great compatibility with legacy setups, supports module federation and complex build graphs.
  - **Cons:** Heavier configuration/maintenance, slower cold starts and HMR than Vite for typical React apps, more boilerplate and bespoke tuning.

- **Create React App (CRA)**

  - **Pros:** One‑command bootstrap.
  - **Cons:** Deprecated/lagging behind modern ESM features, locked to Webpack with limited customization, slower builds and DX vs Vite.

- **Turbopack**

  - **Pros:** Fast incremental dev, modern Rust engine, strong HMR—excellent inside Next.js apps.
  - **Cons:** Best supported within the Next.js ecosystem; vanilla React SPA support and broader plugin ecosystem are still maturing for our needs.

- **esbuild‑only**
  - **Pros:** Fast TS/JS transforms, simple setup—great for tooling and libraries.
  - **Cons:** Not a full app platform by itself (limited dev server/HMR conventions, HTML handling, SSR pipelines); you end up rebuilding what Vite already provides; fewer high‑level plugins.

## 4. Consequences

### Positive

- Short feedback cycles (cold start < 500ms on mid-range laptops; HMR typically < 150ms).
- Smaller, optimized production bundles with automatic code-splitting.
- Cleaner configuration, fewer custom plugins to maintain.
- Seamless testing with Vitest.

### Negative / Risks

- Requires **Node 20.19+ or 22.12+**.
- Some legacy plugins/loaders from the Webpack ecosystem may not have direct Vite equivalents.

### Mitigations

- Enforce Node version via `.nvmrc` and CI; document setup in `CONTRIBUTING.md`.
- Use official Vite plugins where possible; evaluate compatibility early when adding new tooling.

---

## 5. Implementation Notes

### Packages

- `vite`, `@vitejs/plugin-react`, `typescript`, `tslib`

### Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest"
  }
}
```

### Config skeleton

```ts
// vite.config.ts
/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/tests/setup.ts",
  },
});
```

### Node policy

- Add `.nvmrc` with `22` (or `20.19.0`) and document `nvm use`.
- CI job validates Node version and runs `pnpm i && pnpm build && pnpm test`.

### Performance budgets (targets)

- **Dev:** cold start < 0.5s; HMR < 150ms on mid-range devices.
- **Prod:** initial JS < **500KB gzipped**; lazy-load diagram libraries.

## 6. References

- Internal Design Doc: <https://github.com/CSE210-fa25-team09/Repository-Architecture-Diagramming/tree/main/specs/design>
- [Frontend Stack ADR](frontendStack.md)
- Vite docs: https://vitejs.dev/
- React plugin: https://github.com/vitejs/vite/tree/main/packages/plugin-react
- Vitest: https://vitest.dev/
- Node downloads: https://nodejs.org/
