import { WorkspaceProvider } from "@/lib/workspaceContext"
import { Home } from "@/pages/Home"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

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
    const errorMessage = screen.getByText(/Please enter a valid GitHub repo URL./i)
    expect(errorMessage).toBeTruthy()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
