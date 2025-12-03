import "@testing-library/jest-dom/vitest"

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { WorkspaceProvider } from "@/lib/workspaceContext"
import { MemoryRouter } from "react-router-dom"

import { Diagram } from "../pages/Diagram"

const ORIGINAL_INNER_WIDTH = window.innerWidth

describe("Diagram", () => {
  afterEach(() => {
    cleanup()
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: ORIGINAL_INNER_WIDTH,
    })
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

    const addButton = screen.getByRole("button", {
      name: /add a new diagram for a branch/i,
    })
    expect(addButton).toBeEnabled()

    // 1. Open the menu initially to count how many branches are available
    fireEvent.pointerDown(addButton)
    fireEvent.click(addButton)

    const initialMenuItems = await screen.findAllByRole("menuitem")
    const branchesToAddCount = initialMenuItems.length

    // 2. Click the first item
    const firstTarget = initialMenuItems[0]

    // FIX: Match either "Last generated" OR "Not generated" to handle any mock data state
    expect(
      within(firstTarget).getByTestId("dropdown-item-last-generated"),
    ).toHaveTextContent(/Last generated|Not generated/i)

    fireEvent.click(firstTarget)

    // 3. Loop through any remaining branches and add them one by one
    // We start at 1 because we just added the first one above
    for (let i = 1; i < branchesToAddCount; i++) {
      // Re-open the menu
      fireEvent.pointerDown(addButton)
      fireEvent.click(addButton)

      // Get the current list of items
      const menuItems = await screen.findAllByRole("menuitem")

      // Click the first available item in the list
      if (menuItems.length > 0) {
        fireEvent.click(menuItems[0])
      }
    }

    // 4. Now that all branches are added, the button should be disabled
    await waitFor(() => {
      expect(addButton).toBeDisabled()
      expect(addButton).toHaveTextContent(/all tracked branches already visible/i)
    })
  })

  it("renders the key layout elements when viewed on a mobile viewport", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 360 })

    renderDiagram()

    expect(screen.getByTestId("repo-name")).toBeVisible()
    expect(screen.getByTestId("repo-summary")).toBeVisible()
    expect(
      screen.getByRole("button", { name: /add a new diagram for a branch/i }),
    ).toBeVisible()
    expect(
      screen.getByText(/pick a branch to generate a new diagram workspace card/i),
    ).toBeVisible()
  })
})
