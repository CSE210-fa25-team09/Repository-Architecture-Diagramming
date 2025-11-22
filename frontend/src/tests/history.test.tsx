import { describe, it, expect, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { Home } from "@/pages/Home"
import { SAMPLE_REPOS } from "@/lib/repoData"

const HISTORY_KEY = "repo-history"

beforeEach(() => {
  window.localStorage.clear()
  window.localStorage.removeItem(HISTORY_KEY)
})

describe("History behavior", () => {
  it("shows placeholder when there is no history", () => {
    render(<Home />)

    const placeholder = screen.getByText(
      "No visualization history yet. Click a repo to see it here.",
    )
    expect(placeholder).not.toBeNull()
  })

  it("loads valid history from localStorage without breaking and keeps data intact", () => {
    const seedHistory = SAMPLE_REPOS.slice(0, 2)
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(seedHistory))

    render(<Home />)

    const storedRaw = window.localStorage.getItem(HISTORY_KEY) || "[]"
    const stored = JSON.parse(storedRaw)

    expect(stored.length).toBe(seedHistory.length)
    expect(stored[0].id).toBe(seedHistory[0].id)
    expect(stored[1].id).toBe(seedHistory[1].id)
  })

  it("handles invalid JSON in localStorage by falling back to placeholder", () => {
    window.localStorage.setItem(HISTORY_KEY, "not-json")

    render(<Home />)

    const placeholders = screen.queryAllByText(
      "No visualization history yet. Click a repo to see it here.",
    )
    expect(placeholders.length).toBeGreaterThan(0)
  })

  it("clicking sample repos writes history to localStorage with most recent first", () => {
    render(<Home />)

    const [first, second] = SAMPLE_REPOS.slice(0, 2)

    const firstNodes = screen.getAllByText(first.name)
    fireEvent.click(firstNodes[0])

    const secondNodes = screen.getAllByText(second.name)
    fireEvent.click(secondNodes[0])

    const storedRaw = window.localStorage.getItem(HISTORY_KEY) || "[]"
    const stored = JSON.parse(storedRaw)

    expect(stored.length).toBeGreaterThanOrEqual(2)
    expect(stored[0].name).toBe(second.name)
    expect(stored[1].name).toBe(first.name)
  })

  it("clicking the same repo again moves it to the front without duplicates", () => {
    render(<Home />)

    const first = SAMPLE_REPOS[0]
    const second = SAMPLE_REPOS[1]

    const firstNodes = screen.getAllByText(first.name)
    fireEvent.click(firstNodes[0])

    const secondNodes = screen.getAllByText(second.name)
    fireEvent.click(secondNodes[0])

    const firstAgainNodes = screen.getAllByText(first.name)
    fireEvent.click(firstAgainNodes[0])

    const storedRaw = window.localStorage.getItem(HISTORY_KEY) || "[]"
    const stored = JSON.parse(storedRaw)

    expect(stored.length).toBe(2)
    expect(stored[0].name).toBe(first.name)
    expect(stored[1].name).toBe(second.name)
  })

  it("history persists across re-renders via localStorage", () => {
    const { unmount } = render(<Home />)

    const target = SAMPLE_REPOS[0]
    const titleNodes = screen.getAllByText(target.name)
    fireEvent.click(titleNodes[0])

    unmount()

    const storedRaw = window.localStorage.getItem(HISTORY_KEY) || "[]"
    const stored = JSON.parse(storedRaw)
    expect(stored.length).toBeGreaterThan(0)
    expect(stored[0].name).toBe(target.name)

    render(<Home />)

    const matches = screen.queryAllByText(target.name)
    expect(matches.length).toBeGreaterThan(0)
  })

  it("keeps history unique and moves most recently clicked repo to the front", () => {
    render(<Home />)

    const [first, second, third] = SAMPLE_REPOS.slice(0, 3)

    const firstNodes = screen.getAllByText(first.name)
    fireEvent.click(firstNodes[0])

    const secondNodes = screen.getAllByText(second.name)
    fireEvent.click(secondNodes[0])

    const thirdNodes = screen.getAllByText(third.name)
    fireEvent.click(thirdNodes[0])

    const firstAgainNodes = screen.getAllByText(first.name)
    fireEvent.click(firstAgainNodes[0])

    const storedRaw = window.localStorage.getItem(HISTORY_KEY) || "[]"
    const stored = JSON.parse(storedRaw)

    const ids = stored.map((r: { id: string }) => r.id)
    const uniqueIds = new Set(ids)

    expect(ids.length).toBe(uniqueIds.size)
    expect(stored[0].id).toBe(first.id)
  })
})
