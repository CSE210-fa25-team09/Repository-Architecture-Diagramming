# Frontend Testing Playbook

Vitest + Testing Library power all unit and integration coverage in this repo. Follow this guide to stay consistent with the existing setup.

## Commands

```bash
# watch mode with coverage enabled
npm run test

# single run (CI) with coverage
npm run test:run
```

Coverage reports land under `frontend/coverage/` (text summary in the console, HTML/LCOV on disk). Shadcn-generated files and `main.tsx` are excluded via `vite.config.ts`.

## File Locations

- `src/tests/` – colocate UI/component tests (e.g., `src/tests/App.test.tsx`).
- `src/lib/__tests__/` – pure utilities if/when we add them.
- Avoid putting tests inside `src/components/ui` (ignored) or alongside Shadcn files.

## Writing Unit Tests

Use them for isolated helpers or leaf components.

```ts
// src/lib/branch.ts
export const mergeBranches = (a: string, b: string) => `${a}-${b}`

// src/lib/__tests__/branch.test.ts
import { describe, expect, it } from "vitest"
import { mergeBranches } from "../branch"

describe("mergeBranches", () => {
  it("joins names with a dash", () => {
    expect(mergeBranches("main", "feature")).toBe("main-feature")
  })
})
```

Component example (matches the current landing page style):

```tsx
// src/tests/App.test.tsx
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import App from "@/App"

describe("App landing view", () => {
  it("shows the headline text", () => {
    render(<App />)
    expect(
      screen.getByRole("heading", { name: /repository architecture/i }),
    ).toBeVisible()
  })

  it("links logos to correct docs", () => {
    render(<App />)
    const viteLink = screen.getAllByRole("link", { name: /vite logo/i })[0]
    expect(viteLink).toHaveAttribute("href", "https://vite.dev")
  })
})
```

## Integration Tests

Reserve these for flows that span multiple components (forms, dialogs, sidebar interactions). Guidelines:

- Render the smallest tree that still mimics real behavior (e.g., component + context provider).
- Interact the way a user would (labels, roles, visible text); avoid `.querySelector`.
- Mock network calls with `vi.mock` / `vi.fn`.
- Assert on visible output or dispatched callbacks, not internal state.

Example snippet:

```tsx
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { RepoForm } from "@/views/RepoForm"

describe("RepoForm integration", () => {
  it("submits typed URL", () => {
    const onSubmit = vi.fn()
    render(<RepoForm onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText(/github repo/i), {
      target: { value: "https://github.com/acme/demo" },
    })
    fireEvent.click(screen.getByRole("button", { name: /generate diagram/i }))
    expect(onSubmit).toHaveBeenCalledWith("https://github.com/acme/demo")
  })
})
```

## Best Practices

- Keep tests fast—prefer unit tests for helpers and focused components.
- One assertion block per behavior; descriptive test names double as documentation.
- Snapshot tests are discouraged; prefer explicit expectations on DOM/text.
- Update `vite.config.ts` if you need additional coverage excludes (e.g., generated files).
- Commit failing tests first when fixing bugs; then make them pass.
