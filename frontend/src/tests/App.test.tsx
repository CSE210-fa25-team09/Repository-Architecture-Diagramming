import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import App from "../App"

describe("App landing view", () => {
  it("shows the main headline text", () => {
    render(<App />)
    const heading = screen.getByRole("heading", {
      name: /repository architecture diagramming/i,
    })
    expect(heading.textContent).toMatch(/repository architecture/i)
  })

  it("links each logo to the correct documentation site", () => {
    render(<App />)

    const viteLink = screen.getAllByRole("link", { name: /vite logo/i })[0]
    const reactLink = screen.getAllByRole("link", { name: /react logo/i })[0]

    expect(viteLink.getAttribute("href")).toBe("https://vite.dev")
    expect(viteLink.getAttribute("target")).toBe("_blank")

    expect(reactLink.getAttribute("href")).toBe("https://react.dev")
    expect(reactLink.getAttribute("target")).toBe("_blank")
  })
})
