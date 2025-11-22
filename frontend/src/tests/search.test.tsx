import { describe, it, beforeEach, expect } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { Home } from "@/pages/Home"
import { SAMPLE_REPOS } from "@/lib/repoData"

const HISTORY_KEY = "repo-history"

beforeEach(() => {
  window.localStorage.clear()
  window.localStorage.removeItem(HISTORY_KEY)
})

describe("Search behavior", () => {
  it("shows Sample and History when not searching", () => {
    render(<Home />)
    const sampleHeadings = screen.queryAllByText("Sample")
    const historyHeadings = screen.queryAllByText("History")
    const searchResultsHeadings = screen.queryAllByText("Search results")

    expect(sampleHeadings.length).toBeGreaterThan(0)
    expect(historyHeadings.length).toBeGreaterThan(0)
    expect(searchResultsHeadings.length).toBe(0)
  })

  it("shows search results with matching repos while searching", async () => {
    render(<Home />)

    const input = screen.getAllByRole("textbox", {
      name: "Search repos",
    })[0] as HTMLInputElement
    const [targetRepo] = SAMPLE_REPOS
    fireEvent.change(input, { target: { value: targetRepo.name } })

    await waitFor(() => {
      const searchHeading = screen.queryByText("Search results")
      expect(searchHeading).not.toBeNull()
      const matches = screen.queryAllByText(targetRepo.name)
      expect(matches.length).toBeGreaterThan(0)
    })
  })

  it("restores Sample and History when search is cleared", async () => {
    render(<Home />)

    const input = screen.getAllByRole("textbox", {
      name: "Search repos",
    })[0] as HTMLInputElement
    fireEvent.change(input, { target: { value: "repo-1" } })
    fireEvent.change(input, { target: { value: "" } })

    await waitFor(() => {
      const sampleHeadings = screen.queryAllByText("Sample")
      const historyHeadings = screen.queryAllByText("History")
      const searchResultsHeadings = screen.queryAllByText("Search results")

      expect(sampleHeadings.length).toBeGreaterThan(0)
      expect(historyHeadings.length).toBeGreaterThan(0)
      expect(searchResultsHeadings.length).toBe(0)
    })
  })
})
