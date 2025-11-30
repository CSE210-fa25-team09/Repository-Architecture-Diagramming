import { describe, it, expect, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { Home } from "@/pages/Home"
import { SAMPLE_REPOS } from "@/lib/repoData"
import { WorkspaceProvider } from "@/lib/workspaceContext"

const HISTORY_KEY = "repo-history"
const ROW_VISIBLE = 4

beforeEach(() => {
  window.localStorage.clear()
  window.localStorage.removeItem(HISTORY_KEY)
})

const renderHome = () =>
  render(
    <MemoryRouter>
      <WorkspaceProvider>
        <Home />
      </WorkspaceProvider>
    </MemoryRouter>,
  )

describe("Home UI", () => {
  it("renders only the first row sample repos initially", () => {
    renderHome()
    const visibleRepos = SAMPLE_REPOS.slice(0, ROW_VISIBLE)
    const hiddenRepos = SAMPLE_REPOS.slice(ROW_VISIBLE)

    visibleRepos.forEach((repo) => {
      const titleNode = screen.queryByText(repo.name)
      const descNode = screen.queryByText(repo.description)
      expect(titleNode).not.toBeNull()
      expect(descNode).not.toBeNull()
    })
    hiddenRepos.forEach((repo) => {
      const titleNode = screen.queryByText(repo.name)
      expect(titleNode).toBeNull()
    })
  })

  it("clicking a sample repo increases its occurrences in history", () => {
    renderHome()

    const target = SAMPLE_REPOS[0]

    const before = screen.queryAllByText(target.name).length

    const titleElements = screen.getAllByText(target.name)
    fireEvent.click(titleElements[0])

    const after = screen.getAllByText(target.name).length
    expect(after).toBeGreaterThan(before)
  })

  it("renders search box and allows typing", () => {
    renderHome()

    const input = screen.getAllByRole("textbox", {
      name: "Search repos",
    })[0] as HTMLInputElement
    expect(input).not.toBeNull()

    fireEvent.change(input, { target: { value: "repo-1" } })
    expect((input as HTMLInputElement).value).toBe("repo-1")
  })
})
