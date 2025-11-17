import "@testing-library/jest-dom/vitest"

import { fireEvent, render, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

import App from "../App"

type MatchMediaMock = MediaQueryList & { dispatch: (matches: boolean) => void }

const createMatchMediaMock = (initialMatches: boolean): MatchMediaMock => {
  const listeners = new Set<EventListenerOrEventListenerObject>()
  let currentMatches = initialMatches

  const mock: Partial<MatchMediaMock> = {
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: (
      _eventName: string,
      callback: EventListenerOrEventListenerObject,
    ) => {
      listeners.add(callback)
    },
    removeEventListener: (
      _eventName: string,
      callback: EventListenerOrEventListenerObject,
    ) => {
      listeners.delete(callback)
    },
    dispatchEvent: vi.fn(),
    dispatch: (nextMatches: boolean) => {
      currentMatches = nextMatches
      listeners.forEach((listener) => {
        const event = { matches: nextMatches } as MediaQueryListEvent
        if (typeof listener === "function") {
          listener(event)
          return
        }
        listener.handleEvent?.(event)
      })
    },
  }

  Object.defineProperty(mock, "matches", {
    get: () => currentMatches,
  })

  return mock as MatchMediaMock
}

const mockMatchMedia = (initialMatches: boolean) => {
  const mock = createMatchMediaMock(initialMatches)
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn(),
    })
  }

  vi.spyOn(window, "matchMedia").mockImplementation((query: string) => {
    if (query === "(prefers-color-scheme: dark)") {
      return mock
    }
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as MediaQueryList
  })

  return mock
}

const getLatest = <T,>(items: T[]): T => items[items.length - 1]

const renderApp = (initialEntries: string[] = ["/"]) => {
  const utils = render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>,
  )
  const getRoot = () => {
    const roots = utils.container.querySelectorAll(":scope > div")
    if (roots.length === 0) return null
    return getLatest(Array.from(roots)) as HTMLElement
  }
  const getRootQueries = () => {
    const root = getRoot()
    if (!root) throw new Error("App root not found")
    return within(root)
  }
  return { ...utils, getRoot, getRootQueries }
}

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("initializes with the system dark theme when preferred", () => {
    mockMatchMedia(true)

    const { getRoot } = renderApp()

    expect(getRoot()).toHaveClass("dark")
  })

  it("responds to system theme changes emitted by matchMedia", async () => {
    const media = mockMatchMedia(false)

    const { getRoot } = renderApp()
    expect(getRoot()).not.toHaveClass("dark")

    media.dispatch(true)
    await waitFor(() => expect(getRoot()).toHaveClass("dark"))

    media.dispatch(false)
    await waitFor(() => expect(getRoot()).not.toHaveClass("dark"))
  })

  it("allows the user to toggle the theme via the header button", async () => {
    mockMatchMedia(false)

    const { getRoot, getRootQueries } = renderApp()
    const toggleButton = getLatest(
      getRootQueries().getAllByRole("button", { name: /toggle color theme/i }),
    )

    fireEvent.click(toggleButton)
    await waitFor(() => expect(getRoot()).toHaveClass("dark"))

    fireEvent.click(toggleButton)
    await waitFor(() => expect(getRoot()).not.toHaveClass("dark"))
  })

  it("renders the header actions in a mobile viewport", () => {
    mockMatchMedia(false)
    const originalInnerWidth = window.innerWidth
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 })

    const { getRootQueries } = renderApp()
    const queries = getRootQueries()

    const [homeLogoLink] = queries.getAllByLabelText(/go to homepage/i)
    expect(homeLogoLink).toBeVisible()
    expect(queries.getAllByText("SWE Diagramming")[0]).toBeVisible()
    const toggleButton = getLatest(
      queries.getAllByRole("button", { name: /toggle color theme/i }),
    )
    expect(toggleButton).toBeVisible()
    const homeCtaLink = getLatest(queries.getAllByRole("link", { name: /home/i }))
    expect(homeCtaLink).toBeVisible()

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: originalInnerWidth,
    })
  })

  it("navigates home when clicking the header Btn", async () => {
    mockMatchMedia(false)
    const { getRootQueries } = renderApp(["/missing"])
    const queries = getRootQueries()

    expect(queries.getByText(/page not found/i)).toBeVisible()

    const homeCtaLink = getLatest(queries.getAllByRole("link", { name: /home/i }))
    fireEvent.click(homeCtaLink)

    await waitFor(() =>
      expect(queries.queryByText(/page not found/i)).not.toBeInTheDocument(),
    )
  })

  it("navigates home when clicking the header logo", async () => {
    mockMatchMedia(false)
    const { getRootQueries } = renderApp(["/missing"])
    const queries = getRootQueries()

    expect(queries.getByText(/page not found/i)).toBeVisible()

    const logoLink = getLatest(queries.getAllByLabelText(/go to homepage/i))
    fireEvent.click(logoLink)

    await waitFor(() =>
      expect(queries.queryByText(/page not found/i)).not.toBeInTheDocument(),
    )
  })
})
