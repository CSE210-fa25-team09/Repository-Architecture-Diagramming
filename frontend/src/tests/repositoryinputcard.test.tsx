import { describe, it, expect, vi, afterEach } from "vitest"
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  cleanup,
} from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { Home } from "@/pages/Home"
import { WorkspaceProvider } from "@/lib/workspaceContext"

const mockNavigate = vi.fn()
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock("@/api/diagram", () => ({
  fetchInitialWorkspace: vi.fn().mockResolvedValue({
    repo: { name: "test/repo", description: "desc" },
    branches: [],
  }),
}))

const createMockFile = (name: string, size: number, mimeType: string) => {
  const file = new File(["content"], name, { type: mimeType })
  Object.defineProperty(file, "size", { value: size })
  return file
}
function getFormElements() {
  // Finds the form element using the data-testid and selects the first instance [0]
  const formElement = screen.getAllByTestId("repo-input-form")[0]
  // Finds the submit button scoped within that form instance
  const submitButton = within(formElement).getByRole("button", {
    name: /Generate Diagram/i,
  })
  return { formElement, submitButton }
}

function renderHome() {
  return render(
    <MemoryRouter>
      <WorkspaceProvider>
        <Home />
      </WorkspaceProvider>
    </MemoryRouter>,
  )
}

describe("Home Component (Integration Test)", () => {
  // Reset the mock functions after each test to ensure a clean slate
  afterEach(() => {
    vi.clearAllMocks()
    cleanup()
    window.localStorage.clear()
  })

  // --- Test 1: Successful URL Submission ---
  it("allows for successful submission of a valid GitHub URL", async () => {
    renderHome()

    // Use native Chai assertion (.toBeTruthy()) instead of .toBeInTheDocument()
    const urlInput = screen.getByLabelText(/Enter GitHub Repo URL/i)
    expect(urlInput).toBeTruthy()

    // Use getAllByRole to handle the potential duplicate issue, selecting the primary submit button
    const submitButton = screen.getAllByRole("button", { name: /Generate Diagram/i })[0]
    expect(submitButton).toBeTruthy()

    const validUrl = "https://github.com/integration/test-repo"

    // Simulate User Interaction
    fireEvent.change(urlInput, { target: { value: validUrl } })
    fireEvent.click(submitButton)

    // Assert: Check navigation
    const expectedRoute = `/diagram?repo=${encodeURIComponent(validUrl)}`
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(expectedRoute))

    // Assert: Check for absence of error message
    expect(screen.queryByText(/Please enter a valid GitHub repo URL/i)).toBeNull()
  })

  // --- Test 2: Invalid Input Failure ---
  it("displays an error message when the form is submitted without valid input", () => {
    renderHome()

    // Select the primary submit button
    const submitButton = screen.getAllByRole("button", { name: /Generate Diagram/i })[0]

    // Simulate User Interaction: Submit with empty fields
    fireEvent.click(submitButton)

    // Assert: Check for the error message's presence
    const errorMessage = screen.getByText(
      /Please enter a valid GitHub repo URL or upload a .zip file./i,
    )
    expect(errorMessage).toBeTruthy()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  // --- Test 3: Successful Zip File Submission ---
  it("allows for navigation via zip file upload", async () => {
    renderHome()

    const mockZipFile = createMockFile("full-test.zip", 2048, "application/zip")

    // Get the submit button from the single, correct form instance
    const { submitButton } = getFormElements()

    // 1. Get the hidden file input element by its ID (must be outside the form scope)
    const zipInput = document.getElementById("zip-upload") as HTMLInputElement | null

    if (!zipInput) throw new Error("Zip input not found for testing")

    // Simulate User Interaction:
    // Directly simulate the 'change' event on the hidden input to set the component's state.
    fireEvent.change(zipInput, { target: { files: [mockZipFile] } })

    // Wait for the state to update after the file change event
    await waitFor(() => {
      expect(zipInput.files?.length).toBe(1)
    })

    // 2. Submit the form by clicking the submit button.
    fireEvent.click(submitButton)

    // Assert: Check navigation
    const expectedRoute = `/diagram?zip=${encodeURIComponent(mockZipFile.name)}`
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(expectedRoute)
    })
  })
})
