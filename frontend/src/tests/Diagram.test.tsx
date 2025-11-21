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

  const renderDiagram = () => render(<Diagram />)

  it("disables the add button once every tracked branch has been added", async () => {
    renderDiagram()

    const addButton = screen.getByRole("button", {
      name: /add a new diagram for a branch/i,
    })
    expect(addButton).toBeEnabled()

    fireEvent.pointerDown(addButton)
    fireEvent.click(addButton)

    const menuItems = await screen.findAllByRole("menuitem")
    expect(menuItems.length).toBeGreaterThan(0)
    const target = menuItems[0]
    expect(within(target).getByTestId("dropdown-item-last-generated")).toHaveTextContent(
      /not generated yet/i,
    )
    expect(within(target).getByText(/not generated yet/i)).toBeVisible()
    fireEvent.click(target)

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
