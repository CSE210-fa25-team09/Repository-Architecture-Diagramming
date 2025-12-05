import "@testing-library/jest-dom/vitest"
import { render, screen, waitFor, cleanup } from "@testing-library/react"
import { MermaidDiagram } from "@/components/shared/MermaidDiagram"
import mermaid from "mermaid"
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"

// Mock mermaid library
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}))

describe("MermaidDiagram", () => {
  const mockDefinition = "graph TD; A-->B;"

  beforeEach(() => {
    vi.clearAllMocks()
    cleanup()

    vi.mocked(mermaid.render).mockResolvedValue({
      svg: '<svg id="mock-svg" width="100" height="100"></svg>',
      diagramType: "flowchart",
    })
  })

  afterEach(() => {
    cleanup()
  })

  it("initializes mermaid on mount", () => {
    render(<MermaidDiagram definition={mockDefinition} />)
    expect(mermaid.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ maxEdges: 1000, maxTextSize: 200000 }),
    )
  })

  it("renders the diagram SVG successfully", async () => {
    render(<MermaidDiagram definition={mockDefinition} />)

    await waitFor(() => {
      expect(mermaid.render).toHaveBeenCalledWith(
        expect.stringContaining("mermaid-diagram"),
        mockDefinition,
      )

      const svg = document.querySelector("svg")

      // Check for existence
      expect(svg).not.toBeNull()
      expect(svg?.getAttribute("id")).toBe("mock-svg")
    })
  })

  it("displays an error message if mermaid fails to render", async () => {
    vi.mocked(mermaid.render).mockRejectedValue(new Error("Syntax error"))

    render(<MermaidDiagram definition="invalid code" />)

    await waitFor(() => {
      expect(screen.getByText("Unable to render diagram.")).toBeInTheDocument()
    })
  })

  it("calls onRender callback with dimensions after rendering", async () => {
    const onRenderMock = vi.fn()

    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 200,
      height: 150,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON: () => {},
    }))

    render(<MermaidDiagram definition={mockDefinition} onRender={onRenderMock} />)

    await waitFor(() => {
      expect(onRenderMock).toHaveBeenCalledWith({ width: 200, height: 150 })
    })
  })
})
