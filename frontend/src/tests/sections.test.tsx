import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { HistorySection } from "@/components/shared/HistorySection"
import { SampleSection } from "@/components/shared/SampleSection"
import type { Repo } from "@/lib/repoData"
import { WorkspaceProvider } from "@/lib/workspaceContext"
import type { ReactNode } from "react"

const mockNavigate = vi.fn()
const mockFetchWorkspace = vi.fn()

vi.mock("@/api/diagram", () => ({
  fetchInitialWorkspace: (...args: unknown[]) => mockFetchWorkspace(...args),
}))

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>("react-router-dom")
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const renderWithProviders = (ui: ReactNode) =>
  render(
    <MemoryRouter>
      <WorkspaceProvider>{ui}</WorkspaceProvider>
    </MemoryRouter>,
  )

const makeRepo = (id: string): Repo => ({
  id,
  name: `${id}-name`,
  description: `${id}-description`,
  url: `https://github.com/${id}`,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe("HistorySection", () => {
  it("shows placeholder when empty", () => {
    renderWithProviders(<HistorySection history={[]} />)

    expect(
      screen.getByText("No visualization history yet. Click a repo to see it here."),
    ).toBeTruthy()
  })

  it("renders show more button and extra cards when expanded", () => {
    const repos = Array.from({ length: 5 }, (_, idx) => makeRepo(`repo-${idx}`))
    renderWithProviders(<HistorySection history={repos} />)

    const toggle = screen.getByText("Show more")
    fireEvent.click(toggle)

    expect(screen.getByText(repos[4].name)).toBeTruthy()
    expect(screen.getByText("Show less")).toBeTruthy()
  })

  it("clicking a card triggers navigation and prefetch", async () => {
    const repo = makeRepo("clicked-repo")
    const onRepoClick = vi.fn()
    mockFetchWorkspace.mockResolvedValue({
      repo: { name: repo.name, description: repo.description },
      branches: [],
    })

    renderWithProviders(<HistorySection history={[repo]} onRepoClick={onRepoClick} />)

    fireEvent.click(screen.getByText(repo.name))

    await waitFor(() => expect(mockFetchWorkspace).toHaveBeenCalledWith(repo.url))
    expect(onRepoClick).toHaveBeenCalledWith(repo)
    expect(mockNavigate).toHaveBeenCalledWith(
      `/diagram?repo=${encodeURIComponent(repo.url)}`,
    )
  })
})

describe("SampleSection", () => {
  it("shows placeholder when no repos provided", () => {
    renderWithProviders(<SampleSection repos={[]} />)

    expect(screen.getByText("No sample repositories available.")).toBeTruthy()
  })

  it("renders extra sample repos when expanded", () => {
    const repos = Array.from({ length: 6 }, (_, idx) => makeRepo(`sample-${idx}`))
    renderWithProviders(<SampleSection repos={repos} />)

    fireEvent.click(screen.getByText("Show more"))

    expect(screen.getByText(repos[5].name)).toBeTruthy()
    const toggles = screen.getAllByText("Show less")
    expect(toggles.length).toBeGreaterThan(0)
  })

  it("clicking a sample repo prefetches and navigates", async () => {
    const repo = makeRepo("sample-click")
    const onRepoClick = vi.fn()
    mockFetchWorkspace.mockResolvedValue({
      repo: { name: repo.name, description: repo.description },
      branches: [],
    })

    renderWithProviders(<SampleSection repos={[repo]} onRepoClick={onRepoClick} />)

    fireEvent.click(screen.getByText(repo.name))

    await waitFor(() => expect(mockFetchWorkspace).toHaveBeenCalledWith(repo.url))
    expect(onRepoClick).toHaveBeenCalledWith(repo)
    expect(mockNavigate).toHaveBeenCalledWith(
      `/diagram?repo=${encodeURIComponent(repo.url)}`,
    )
  })
})
