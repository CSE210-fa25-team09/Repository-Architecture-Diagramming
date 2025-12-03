import "@testing-library/jest-dom/vitest"
import {
  render,
  screen,
  within,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  DiagramPanel,
  type BranchInfo,
  type BranchLibrary,
} from "@/components/shared/DiagramPanel"
import { vi, describe, it, expect, beforeEach, beforeAll, afterEach } from "vitest"
import { toPng } from "html-to-image"

// Mock MermaidDiagram
vi.mock("@/components/shared/MermaidDiagram", () => ({
  MermaidDiagram: ({
    definition,
    onClick,
  }: {
    definition: string
    onClick?: () => void
  }) => (
    <div data-testid="mock-mermaid" onClick={onClick}>
      Mock Diagram: {definition}
      <svg>Mock SVG content</svg>
    </div>
  ),
}))

// Mock html-to-image
vi.mock("html-to-image", () => ({
  toPng: vi.fn().mockResolvedValue("data:image/png;base64,fake-image-data"),
}))

// Mock ResizeObserver
const ResizeObserverMock = vi.fn(
  class ResizeObserver {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  },
)
vi.stubGlobal("ResizeObserver", ResizeObserverMock)

//DOM & Radix UI Mocks
function setupDomMocks() {
  const noop = () => {}

  if (typeof globalThis.PointerEvent === "undefined") {
    class MockPointerEvent extends Event {
      button: number
      ctrlKey: boolean
      pointerType: string
      constructor(type: string, props: PointerEventInit = {}) {
        super(type, props)
        this.button = props.button || 0
        this.ctrlKey = props.ctrlKey || false
        this.pointerType = props.pointerType || "mouse"
      }
    }
    vi.stubGlobal("PointerEvent", MockPointerEvent)
  }

  const prototypes = [window.HTMLElement.prototype, window.Element.prototype]

  prototypes.forEach((proto) => {
    Object.defineProperty(proto, "setPointerCapture", {
      configurable: true,
      value: noop,
    })
    Object.defineProperty(proto, "releasePointerCapture", {
      configurable: true,
      value: noop,
    })
    Object.defineProperty(proto, "hasPointerCapture", {
      configurable: true,
      value: () => false,
    })
    Object.defineProperty(proto, "scrollIntoView", {
      configurable: true,
      value: noop,
    })
    Object.defineProperty(proto, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        width: 1024,
        height: 768,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        x: 0,
        y: 0,
        toJSON: () => {},
      }),
    })
    Object.defineProperty(proto, "getClientRects", {
      configurable: true,
      value: () => [
        {
          width: 1024,
          height: 768,
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
        },
      ],
    })
  })

  Object.defineProperty(window.HTMLElement.prototype, "offsetParent", {
    configurable: true,
    value: document.body,
  })
}

//Test Data
const mockBranch: BranchInfo = {
  id: "branch-1",
  label: "feature/login",
  lastGenerated: "2 mins ago",
  internalDependencyGraph: "graph TD; A-->B;",
  dependencyGraph: "graph TD; C-->D;",
  llmGraph: "graph TD; L-->M;",
  fileTree: "src/\n  components/\n    Login.tsx",
  commitMessage: "feat: add login",
  commitNumber: "a1b2c3d",
  llmLoading: false,
}

const mockBranchLibrary: BranchLibrary = {
  "branch-1": mockBranch,
  "branch-2": { ...mockBranch, id: "branch-2", label: "feature/dashboard" },
}

const defaultProps = {
  branch: mockBranch,
  canRemove: false,
  onRemove: vi.fn(),
  onSwitchBranch: vi.fn(),
  usedBranchIds: new Set(["branch-1"]),
  branches: ["branch-1", "branch-2"],
  branchDetails: mockBranchLibrary,
}

//Helpers
const setup = (props = defaultProps) => {
  return {
    user: userEvent.setup(),
    ...render(<DiagramPanel {...props} />),
  }
}

const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

//Tests
describe("DiagramPanel", () => {
  beforeAll(() => {
    mockMatchMedia(true)
    setupDomMocks()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    cleanup()
  })

  afterEach(() => {
    cleanup()
  })

  // Header Tests
  describe("Header", () => {
    it("renders branch name, timestamp, and commit info", () => {
      setup()
      // Use getAllByText because the name appears in the header title AND the dropdown button
      const branchNames = screen.getAllByText("feature/login")
      expect(branchNames.length).toBeGreaterThan(0)

      expect(screen.getByText(/Last generated 2 mins ago/)).toBeInTheDocument()
      expect(screen.getByText("a1b2c3d:")).toBeInTheDocument()
    })

    it("allows selecting a new branch via dropdown", async () => {
      const onSwitchBranch = vi.fn()
      const { user } = setup({ ...defaultProps, onSwitchBranch })

      // Target the trigger container
      const triggerLabel = screen.getByText("Switch branch")
      const trigger =
        triggerLabel.closest('[data-slot="dropdown-menu-trigger"]') || triggerLabel

      // Radix UI attaches the open handler to pointerdown.
      // We also ensure the event has the primary button set.
      fireEvent.pointerDown(trigger, {
        button: 0,
        ctrlKey: false,
        pointerType: "mouse",
      })

      const option = await screen.findByText("feature/dashboard")
      await user.click(option)

      expect(onSwitchBranch).toHaveBeenCalledWith("branch-2")
    })

    it("renders remove button only when canRemove is true", async () => {
      const onRemove = vi.fn()
      const { unmount } = render(
        <DiagramPanel {...defaultProps} canRemove={false} onRemove={onRemove} />,
      )
      const removeBtnQuery = screen.queryByLabelText("Remove feature/login diagram")
      expect(removeBtnQuery).not.toBeInTheDocument()
      unmount()

      const { user } = setup({ ...defaultProps, canRemove: true, onRemove })
      const removeBtns = screen.getAllByLabelText("Remove feature/login diagram")
      await user.click(removeBtns[0])
      expect(onRemove).toHaveBeenCalled()
    })
  })

  // File Tree Panel
  describe("File Tree Panel", () => {
    it("is visible by default on desktop", () => {
      setup()
      expect(screen.getByText("File Structure")).toBeInTheDocument()
    })

    it("collapses when collapse button is clicked", async () => {
      const { user } = setup()
      const collapseBtn = screen.getByText("Collapse")
      await user.click(collapseBtn)

      expect(screen.queryByText("File Structure")).not.toBeInTheDocument()
      expect(screen.getByText("Show file tree")).toBeInTheDocument()
    })

    it("restores file tree when 'Show file tree' is clicked", async () => {
      const { user } = setup()
      await user.click(screen.getByText("Collapse"))
      await user.click(screen.getByText("Show file tree"))

      expect(screen.getByText("File Structure")).toBeInTheDocument()
    })
  })

  // Diagram Area
  describe("Diagram Area", () => {
    it("renders the Mermaid diagram with LLM graph by default", () => {
      setup()
      expect(screen.getByText(/Mock Diagram:.*graph TD; L-->M;/)).toBeInTheDocument()
      expect(screen.getByText("SWE Graph")).toBeInTheDocument()
    })

    it("toggles between LLM, Internal, and External Dependency graphs", async () => {
      const { user } = setup()

      const trigger = screen.getByRole("button", { name: "SWE Graph" })
      // Trigger dropdown
      fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse" })

      const internalOption = await screen.findByText("Internal Dependency Graph")
      await user.click(internalOption)
      expect(screen.getByText(/Mock Diagram:.*graph TD; A-->B;/)).toBeInTheDocument()

      // Open again for External graph
      fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse" })
      const externalOption = await screen.findByText("External Dependency Graph")
      await user.click(externalOption)
      expect(screen.getByText(/Mock Diagram:.*graph TD; C-->D;/)).toBeInTheDocument()
    })

    it("triggers export to image when export button is clicked", async () => {
      const { user } = setup()
      const exportBtn = screen.getByText("Export as Image")
      await user.click(exportBtn)

      expect(toPng).toHaveBeenCalled()
    })
  })

  // Dialog Preview
  describe("Dialog Preview", () => {
    it("opens dialog when clicking the diagram trigger", async () => {
      const { user } = setup()
      const diagramTrigger = screen.getByLabelText(
        "Open enlarged swe graph for feature/login",
      )
      await user.click(diagramTrigger)

      expect(
        screen.getByRole("heading", {
          name: "feature/login branch swe graph",
        }),
      ).toBeInTheDocument()
      const dialogContent = screen.getByRole("dialog")
      expect(within(dialogContent).getByText(/Mock Diagram:/)).toBeInTheDocument()
    })
  })

  // Responsiveness
  describe("Responsiveness", () => {
    it("switches layout based on screen size", async () => {
      mockMatchMedia(false)
      const { unmount } = setup()

      const desktopGroupMobile = document.querySelector("[data-panel-group]")
      expect(desktopGroupMobile).toBeNull()

      unmount()

      mockMatchMedia(true)
      setup()

      await waitFor(() => {
        const desktopGroup = document.querySelector("[data-panel-group]")
        expect(desktopGroup).toBeInTheDocument()
      })
    })
  })

  // State Independence
  describe("Multiple Panels", () => {
    it("collapse state is independent across multiple panels", async () => {
      const user = userEvent.setup()

      render(
        <div className="flex gap-4">
          <div data-testid="panel-1">
            <DiagramPanel {...defaultProps} branch={{ ...mockBranch, id: "1" }} />
          </div>
          <div data-testid="panel-2">
            <DiagramPanel {...defaultProps} branch={{ ...mockBranch, id: "2" }} />
          </div>
        </div>,
      )

      const panel1 = screen.getByTestId("panel-1")
      const panel2 = screen.getByTestId("panel-2")

      const collapseBtn1 = within(panel1).getByText("Collapse")
      await user.click(collapseBtn1)

      expect(within(panel1).queryByText("File Structure")).not.toBeInTheDocument()
      expect(within(panel1).getByText("Show file tree")).toBeInTheDocument()

      expect(within(panel2).getByText("File Structure")).toBeInTheDocument()
      expect(within(panel2).queryByText("Show file tree")).not.toBeInTheDocument()
    })
  })
})
