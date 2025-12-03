import "@testing-library/jest-dom/vitest"

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { WorkspaceProvider } from "@/lib/workspaceContext"
import { MemoryRouter } from "react-router-dom"

import { Diagram } from "../pages/Diagram"

const mockFetchInitialWorkspace = vi.fn(async () => ({
  repo: { name: "test-owner/test-repo", description: "Repo description" },
  branches: [
    { id: "main", name: "main" },
    { id: "dev", name: "dev" },
  ],
}))

const mockFetchBranchDiagram = vi.fn(
  (branchId: string) =>
    new Promise((resolve) =>
      setTimeout(
        () =>
          resolve({
            branchId,
            allDependencies: `graph TD; ${branchId}-->external;`,
            internalDependencies: `graph TD; ${branchId}-->internal;`,
            timestamp: 1700000000,
            repoDescription: "Desc",
            commitId: `commit-${branchId}`,
            commitMessage: `message-${branchId}`,
          }),
        15,
      ),
    ),
)

const mockFetchArchitectureDiagram = vi.fn(async (_repoUrl: string, branch = "main") => ({
  success: true,
  diagram: `graph TD; ${branch}-->llm;`,
  metadata: {
    latestCommit: {
      sha: `arch-${branch}`,
      message: `arch-message-${branch}`,
      date: "2025-01-01T00:00:00Z",
    },
  },
}))

const mockFetchRepoTree = vi.fn(async (branchId: string) => ({
  branchId,
  tree: [
    {
      name: "src",
      type: "dir",
      path: "src",
      children: [{ name: "index.ts", type: "file", path: "src/index.ts" }],
    },
  ],
}))

vi.mock("@/api/diagram", () => ({
  __esModule: true,
  fetchInitialWorkspace: (...args: Parameters<typeof mockFetchInitialWorkspace>) =>
    mockFetchInitialWorkspace(...args),
  fetchBranchDiagram: (...args: Parameters<typeof mockFetchBranchDiagram>) =>
    mockFetchBranchDiagram(...args),
  fetchArchitectureDiagram: (...args: Parameters<typeof mockFetchArchitectureDiagram>) =>
    mockFetchArchitectureDiagram(...args),
  fetchRepoTree: (...args: Parameters<typeof mockFetchRepoTree>) =>
    mockFetchRepoTree(...args),
}))

vi.mock("@/components/shared/MermaidDiagram", () => ({
  MermaidDiagram: ({ definition }: { definition: string }) => (
    <div data-testid="mock-mermaid">Mock Diagram: {definition}</div>
  ),
}))

const ORIGINAL_INNER_WIDTH = window.innerWidth

describe("Diagram", () => {
  afterEach(() => {
    cleanup()
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: ORIGINAL_INNER_WIDTH,
    })
    vi.clearAllMocks()
  })

  const renderDiagram = () => {
    window.history.pushState({}, "", "/diagram?repo=test-owner/test-repo")
    return render(
      <MemoryRouter initialEntries={["/diagram?repo=test-owner/test-repo"]}>
        <WorkspaceProvider>
          <Diagram />
        </WorkspaceProvider>
      </MemoryRouter>,
    )
  }

  it("disables the add button once every tracked branch has been added", async () => {
    renderDiagram()

    // Wait for initial workspace fetch to settle so branches are the mocked two (main + dev)
    await waitFor(() => {
      expect(mockFetchInitialWorkspace).toHaveBeenCalled()
    })

    const addButton = screen.getByRole("button", {
      name: /add a new diagram for a branch/i,
    })
    expect(addButton).toBeEnabled()

    // 1. Open the menu after data load and capture the available branch(es)
    fireEvent.pointerDown(addButton)
    const menuItems = await screen.findAllByRole("menuitem")
    expect(menuItems).toHaveLength(1)
    const firstTarget = menuItems[0]

    expect(
      within(firstTarget).getByTestId("dropdown-item-last-generated"),
    ).toHaveTextContent(/Last generated|Not generated/i)

    // 2. Click the only remaining branch ("dev")
    fireEvent.click(firstTarget)

    // 4. Now that all branches are added, the button should be disabled
    await waitFor(() => {
      expect(addButton).toBeDisabled()
      expect(addButton).toHaveTextContent(/all tracked branches already visible/i)
    })
  })

  it("renders the key layout elements when viewed on a mobile viewport", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 360 })

    renderDiagram()

    expect(screen.getByTestId("repo-name")).toBeVisible()
    expect(screen.getByTestId("repo-summary")).toBeVisible()
    const addButton = screen.getByRole("button", { name: /branches/i })
    expect(addButton).toBeVisible()
    expect(
      await screen.findByText(/pick a branch to generate a new diagram workspace card/i),
    ).toBeVisible()
  })

  it("shows commit info and diagrams after data loads, using architecture commit when it arrives first", async () => {
    renderDiagram()

    await waitFor(() => {
      expect(mockFetchInitialWorkspace).toHaveBeenCalledWith("test-owner/test-repo")
    })

    // commit info from architecture diagram wins
    await waitFor(() => {
      expect(screen.getByText("arch-main:")).toBeInTheDocument()
      expect(screen.getByText("arch-message-main")).toBeInTheDocument()
    })

    // LLM graph renders by default in the panel
    expect(
      await screen.findByText(/Mock Diagram:.*graph TD; main-->llm;/),
    ).toBeInTheDocument()

    // Repo tree rendered
    expect(screen.getByText(/index\.ts/i)).toBeInTheDocument()
  })

  it("loads a new branch when switching via the branch dropdown", async () => {
    renderDiagram()

    // Wait for initial data
    await screen.findByText(/arch-main:/)

    // Open branch switcher
    const switchLabel = screen.getByText("Switch branch")
    const trigger =
      switchLabel.closest('[data-slot="dropdown-menu-trigger"]') || switchLabel
    fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse" })

    const devOption = await screen.findByText("dev")
    fireEvent.click(devOption)

    await waitFor(() => {
      expect(mockFetchBranchDiagram).toHaveBeenCalledWith("dev")
      expect(mockFetchArchitectureDiagram).toHaveBeenCalledWith(
        expect.stringContaining("https://github.com"),
        "dev",
      )
    })

    // New branch data shows up
    await waitFor(() => {
      expect(screen.getByText("arch-dev:")).toBeInTheDocument()
      expect(screen.getByText("arch-message-dev")).toBeInTheDocument()
    })
  })

  it("renders NotFound when repo query param is missing", () => {
    render(
      <MemoryRouter initialEntries={["/diagram"]}>
        <WorkspaceProvider>
          <Diagram />
        </WorkspaceProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText(/page not found/i)).toBeInTheDocument()
  })

  it("surfaces branch diagram errors when internal view is selected", async () => {
    mockFetchBranchDiagram.mockRejectedValueOnce(new Error("diagram fail"))

    renderDiagram()

    // Wait for base load and LLM graph
    await screen.findByText(/Mock Diagram:.*main-->llm/)

    // Open diagram view dropdown and switch to internal
    const trigger = screen.getByRole("button", { name: "SWE Graph" })
    fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse" })
    const internal = await screen.findByText("Internal Dependency Graph")
    fireEvent.click(internal)

    await screen.findByText("diagram fail")
  })

  it("shows llm diagram errors on default view", async () => {
    mockFetchArchitectureDiagram.mockRejectedValueOnce(new Error("llm fail"))

    renderDiagram()

    await screen.findByText("llm fail")
  })

  it("removes a panel when the remove button is clicked", async () => {
    renderDiagram()

    await screen.findByText(/arch-main:/)

    const addButton = screen.getByRole("button", {
      name: /add a new diagram for a branch/i,
    })
    fireEvent.pointerDown(addButton)
    const devItem = await screen.findByText("dev")
    fireEvent.click(devItem)

    // Remove the dev panel
    const removeBtns = await screen.findAllByLabelText("Remove dev diagram")
    fireEvent.click(removeBtns[0])

    await waitFor(() => {
      expect(screen.queryByText("dev")).not.toBeInTheDocument()
    })
  })
})
