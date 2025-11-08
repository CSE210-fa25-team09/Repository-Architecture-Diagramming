# Architecture Decision Record (ADR)

**ADR #:** 002  
**Title:** Frontend Stack: React + Vite + Shadcn/UI  
**Date:** 2025-11-04  
**Status:** Accepted

---

## 1. Context

- We need an interactive, responsive frontend that renders architecture diagrams (based from Mermaid.js), supports user inputs (dropdowns, filters, text inputs), and remains lightweight.
- Team goals emphasize **minimal dependencies**, **fast developer feedback loops**, **clean repo structure**, and **easy testability (unit + integration)**.
- Current alternatives (plain HTML/CSS/JS) make modularity, collaboration, and automated testing harder as the UI grows.

### Constraints / requirements

- Keep bundle size small; avoid heavy, monolithic UI frameworks.
- Ensure components are **modular** to reduce merge conflicts and enable parallel work in sprints.
- Prefer tools that provide fast developer experience and straightforward CI.
- Provide accessible, consistent primitives for dropdowns and inputs.

### Current state

- No finalized frontend framework has been committed; we must select a stack that balances performance, maintainability, and velocity.

## 2. Decision

We will adopt **React + Vite + TypeScript + Shadcn/UI** as the frontend stack.

- **React** for a **component-based, modular** UI that enables parallel development and reduces merge conflicts.
- **Vite** for fast dev server, HMR, and optimized builds, ensuring excellent developer feedback cycles and efficient production bundling. (detailed in ADR 004)
- **Shadcn/UI** for accessible, composable **dropdowns, inputs, buttons** with tree-shakable imports.
- **TypeScript** for maintainability and safer refactoring as the codebase grows.

This address our problems via:

- Modularity improves collaboration and sprint planning.
- Developer performance (fast rebuilds/HMR) is maximized with Vite.
- Testability: React components are easier to unit/integration test than static HTML/JS.
- UI consistency and accessibility are achieved via Shadcn/UI.

## 3. Alternatives Considered

- **Plain HTML/CSS/JavaScript**

  - **Pros**: zero framework overhead, simplest hosting.
  - **Cons**: poor modularity and state management, harder automated testing, more merge conflicts as UI scales.

- **React + Vite + Custom CSS (no UI lib)**

  - **Pros**: very light; full control.
  - **Cons**: repetitive primitives (dropdowns/inputs) and accessibility handled manually; inconsistent look without extra discipline.

- **React + Vite + Bootstrap**

  - **Pros**: mature, fast to prototype, widely known.
  - **Cons**: heavier CSS unless aggressively purged; higher override/specificity maintenance; risk of shipping two styling systems and larger bundles.

## 4. Consequences

### Positive outcomes

- Modular components enable **parallel work**, clearer ownership, and fewer merge conflicts.
- **Fast DX** via Vite (HMR, quick builds) improves iteration speed.
- **Accessible, consistent UI** using Shadcn (Radix primitives) for dropdowns/inputs.
- **Improved testability** for unit/integration tests versus raw HTML/JS.

### Negative outcomes / risks

- Initial setup for Tailwind and Shadcn.
- Dependency footprint greater than plain HTML/JS; risk of bundle bloat if imports are not granular.
- React introduces some runtime overhead compared to direct DOM manipulation.

### Mitigations

- Enforce granular imports from Shadcn/UI.
- Establish performance guidelines (memoization, keyed lists, code-splitting).
- Document pattern library and usage in `/docs/ui` to avoid divergence.
- Use Lighthouse and bundle analysis to monitor impact.

## 5. Implementation Notes

### Packages

- `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `typescript`
- `tailwindcss`, `postcss`, `autoprefixer`
- `@radix-ui/react-*` via Shadcn/UI generators; shared primitives (DropdownMenu, Input, Button)
- (Visualization handled separately by `mermaid`)

### Project layout

```bash
/frontend
  ├─ src/
  │  ├─ assets/
  │  ├─ components/   # Shadcn + app components
  │  ├─ views/
  │  ├─ utils/
  │  ├─ App.tsx
  │  └─ main.tsx
  ├─ index.html
  ├─ vite.config.ts
  └─ tailwind.config.ts
```

### Rollout plan

1. Scaffold Vite + React + TS.
2. Add Shadcn components (DropdownMenu, Input, Button) used by initial views.
3. Two main pages: Homepage and Visualization Page:

- **Homepage**: repo input, sample repos, history section, navbar, footer.
- **Visualization**: diagram view (placeholder), add/remove diagram buttons, repo structure sidebar, branch dropdown (non-functional MVP).

4. Add CI for build + unit/integration tests

### Performance/testing notes

- Defer heavy libraries; use dynamic import for rarely used views.
- Track bundle size in CI
- Aim for ~80% coverage of core UI components and logic; focus on repo input, diagram rendering, and interaction flow.
- Initial load under 2 seconds on mid-range devices; lazy-load heavy dependencies like Mermaid.js.

## 6. References

- Internal Design Doc: <https://github.com/CSE210-fa25-team09/Repository-Architecture-Diagramming/tree/main/specs/design>
- Shadcn/UI: <https://ui.shadcn.com/>
- Vite: <https://vitejs.dev/>
- React: <https://react.dev/>
- Mermaid: <https://mermaid.js.org/>
- ADR guidance: [AWS ADR best practices](https://aws.amazon.com/blogs/architecture/master-architecture-decision-records-adrs-best-practices-for-effective-decision-making/), [Red Hat ADR overview](https://www.redhat.com/en/blog/architecture-decision-records), [Bombay Softwares ADR guide](https://www.bombaysoftwares.com/blog/the-ultimate-guide-to-architectural-decision-records-adr).
