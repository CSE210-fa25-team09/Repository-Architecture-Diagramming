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
- Adopt a lightweight but robust testing framework that enables unit and integration testing without complex configuration.

### Current state

- No finalized frontend or testing framework has been committed; we must select a stack that balances performance, maintainability, and velocity while also ensuring test coverage for key user flows.

## 2. Decision

We will adopt **React + Vite + TypeScript + Shadcn/UI** as the frontend stack, and use **Vitest + React Testing Library** as our testing framework.

- **React** for a **component-based, modular** UI that enables parallel development and reduces merge conflicts.
- **Vite** for fast dev server, HMR, and optimized builds, ensuring excellent developer feedback cycles and efficient production bundling. (detailed in ADR 004)
- **Shadcn/UI** for accessible, composable **dropdowns, inputs, buttons** with tree-shakable imports.
- **TypeScript** for maintainability and safer refactoring as the codebase grows.
- **Vitest + React Testing Library** for fast, framework-native testing. Vitest integrates directly with Vite for zero-config test execution, and React Testing Library encourages testing user interactions rather than implementation details. This ensures robust coverage for UI behavior, state transitions, and accessibility.

This address our problems via:

- Modularity improves collaboration and sprint planning.
- Developer performance (fast rebuilds/HMR) is maximized with Vite.
- Testing confidence comes from Vitest’s tight integration with Vite and React Testing Library focuses on testing the application’s behavior from a user’s perspective, ensuring components work together as expected rather than testing implementation details.
- UI consistency and accessibility are achieved via Shadcn/UI.

## 3. Alternatives Considered

### Frontend Stack

- **Plain HTML/CSS/JavaScript**

  - **Pros**: zero framework overhead, simplest hosting.
  - **Cons**: poor modularity and state management, harder automated testing, more merge conflicts as UI scales.

- **React + Vite + Custom CSS (no UI lib)**

  - **Pros**: very light; full control.
  - **Cons**: repetitive primitives (dropdowns/inputs) and accessibility handled manually; inconsistent look without extra discipline.

- **React + Vite + Bootstrap**

  - **Pros**: mature, fast to prototype, widely known.
  - **Cons**: heavier CSS unless aggressively purged; higher override/specificity maintenance; risk of shipping two styling systems and larger bundles.

### Testing framework

- **Jest + Enzyme**

  - **Pros**: Established ecosystem with rich plugin support; powerful mocking and snapshot testing; Enzyme provides direct access to component internals.
  - **Cons**: Enzyme’s model of testing component internals encourages brittle, implementation-specific tests; Jest’s setup is heavier compared to Vitest; slower test runs for Vite-based projects.

- **Playwright / Cypress**

  - **Pros**: Excellent for **end-to-end (E2E)** testing; provides full browser simulation and screenshot/video capture; useful for integration tests across pages.
  - **Cons**: Heavy runtime dependencies, slower feedback loops; overkill for unit-level and component tests; more complex setup for CI.

- **Jest + React Testing Library**

  - **Pros**: Stable, well-known testing combo; Jest provides good mocks, coverage, and snapshot support; RTL enforces behavior-driven testing principles.
  - **Cons**: Slower than Vitest for projects using Vite; requires more configuration to align Jest’s module resolution with ESM; longer test startup times.

## 4. Consequences

### Positive outcomes

- Modular components enable **parallel work**, clearer ownership, and fewer merge conflicts.
- **Fast DX** via Vite (HMR, quick builds) improves iteration speed.
- **Accessible, consistent UI** using Shadcn (Radix primitives) for dropdowns/inputs.
- **Improved testability** with Vitest and React Testing Library since tests run natively within Vite’s dev environment, providing realistic feedback loops for both unit and integration coverage.

### Negative outcomes / risks

- Initial setup for Tailwind, Shadcn, and Vitest.
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
- `vitest, @testing-library/react, @testing-library/jest-dom` for unit and integration test
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

### Testing Integration

Testing will be implemented using Vitest as the primary test runner with React Testing Library for component interaction tests.

- **Unit tests**: Verify isolated component logic (inputs, toggles, rendering conditions).
- **Integration tests**: Simulate real user actions such as entering a repo URL, submitting, and verifying that history hides and results render.

### Performance/testing notes

- Defer heavy libraries; use dynamic import for rarely used views.
- Track bundle size in CI
- Aim for ~80% coverage of core UI components and logic; focus on repo input, diagram rendering, and interaction flow.
- Initial load under 2 seconds on mid-range devices; lazy-load heavy dependencies like Mermaid.js.
- Vitest + React Testing Library tests will run in CI with coverage reports, ensuring regression tracking and accessibility validation.

## 6. References

- Internal Design Doc: <https://github.com/CSE210-fa25-team09/Repository-Architecture-Diagramming/tree/main/specs/design>
- Shadcn/UI: <https://ui.shadcn.com/>
- Vite: <https://vitejs.dev/>
- React: <https://react.dev/>
- Mermaid: <https://mermaid.js.org/>
- Vitest: <https://vitest.dev/>
- React Testing Library: <https://testing-library.com/docs/react-testing-library/intro/>
- ADR guidance: [AWS ADR best practices](https://aws.amazon.com/blogs/architecture/master-architecture-decision-records-adrs-best-practices-for-effective-decision-making/), [Red Hat ADR overview](https://www.redhat.com/en/blog/architecture-decision-records), [Bombay Softwares ADR guide](https://www.bombaysoftwares.com/blog/the-ultimate-guide-to-architectural-decision-records-adr).
