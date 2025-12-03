import { afterEach, describe, expect, it, vi } from "vitest"

const API_BASE = "https://repository-architecture-diagramming.onrender.com"

type FetchResponseShape = {
  ok: boolean
  status: number
  statusText: string
  json: () => Promise<unknown>
}

const mockFetch = vi.fn<(...args: unknown[]) => Promise<FetchResponseShape>>()

const createResponse = (data: unknown, ok = true, status = 200): FetchResponseShape => ({
  ok,
  status,
  statusText: ok ? "OK" : "ERROR",
  json: async () => data,
})

const loadApi = async () => {
  const api = await import("@/api/diagram")
  return api
}

describe("diagram api", () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    mockFetch.mockReset()
  })

  it("fetches workspace branches and caches by repo", async () => {
    mockFetch
      .mockResolvedValueOnce(
        createResponse({
          success: true,
          branches: ["main", "dev"],
          repoDescription: "desc",
        }),
      )
      // If caching fails, this call would run; make it obvious
      .mockRejectedValueOnce(new Error("should not refetch same repo"))

    vi.stubGlobal("fetch", mockFetch)
    const { fetchInitialWorkspace } = await loadApi()

    const ws = await fetchInitialWorkspace("test-owner/test-repo")
    expect(ws.repo.name).toBe("test-owner/test-repo")
    expect(ws.branches.map((b) => b.name)).toEqual(["main", "dev"])

    // Cached call should not hit fetch again
    const cached = await fetchInitialWorkspace("test-owner/test-repo")
    expect(cached.repo.name).toBe("test-owner/test-repo")
    expect(mockFetch).toHaveBeenCalledTimes(1)

    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toBe(`${API_BASE}/api/branches?owner=test-owner&repo=test-repo`)
  })

  it("throws on invalid workspace identifier", async () => {
    vi.stubGlobal("fetch", mockFetch)
    const { fetchInitialWorkspace } = await loadApi()
    await expect(fetchInitialWorkspace("invalid-format")).rejects.toThrow(
      /Unsupported repository identifier/,
    )
  })

  it("throws on malformed GitHub URL without repo", async () => {
    vi.stubGlobal("fetch", mockFetch)
    const { fetchInitialWorkspace } = await loadApi()
    await expect(fetchInitialWorkspace("https://github.com/owner/")).rejects.toThrow(
      /Could not parse GitHub URL/,
    )
  })

  it("throws when workspace request fails or reports success=false", async () => {
    mockFetch
      .mockResolvedValueOnce(createResponse({}, false, 500))
      .mockResolvedValueOnce(
        createResponse({ success: false, branches: [], repoDescription: "" }),
      )
    vi.stubGlobal("fetch", mockFetch)
    const { fetchInitialWorkspace } = await loadApi()

    await expect(fetchInitialWorkspace("test-owner/test-repo")).rejects.toThrow(
      /Failed to fetch branches/,
    )
    await expect(fetchInitialWorkspace("test-owner/test-repo")).rejects.toThrow(
      /Backend returned failure/,
    )
  })

  it("fetches branch diagrams and applies commit info", async () => {
    mockFetch
      .mockResolvedValueOnce(
        createResponse({
          success: true,
          branches: ["main"],
          repoDescription: "desc",
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          allDependencies: "graph TD; main-->all;",
          internalDependencies: "graph TD; main-->int;",
          timestamp: 1700000000,
          repoDescription: "desc",
          commitId: "commit-main",
          commitMessage: "message-main",
        }),
      )

    vi.stubGlobal("fetch", mockFetch)
    const { fetchInitialWorkspace, fetchBranchDiagram } = await loadApi()

    await fetchInitialWorkspace("test-owner/test-repo")
    const result = await fetchBranchDiagram("main")

    expect(result.internalDependencies).toContain("main-->int")
    expect(result.commitId).toBe("commit-main")
    expect(mockFetch).toHaveBeenLastCalledWith(
      `${API_BASE}/api/analyzeRepo?owner=test-owner&repo=test-repo&branch=main`,
    )
  })

  it("throws when branch diagram returns an error message", async () => {
    mockFetch
      .mockResolvedValueOnce(
        createResponse({
          success: true,
          branches: ["main"],
          repoDescription: "desc",
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          error: "diagram broken",
        }),
      )

    vi.stubGlobal("fetch", mockFetch)
    const { fetchInitialWorkspace, fetchBranchDiagram } = await loadApi()

    await fetchInitialWorkspace("test-owner/test-repo")
    await expect(fetchBranchDiagram("main")).rejects.toThrow(/diagram broken/)
  })

  it("throws when branch diagram fetch fails or cache missing", async () => {
    mockFetch
      .mockResolvedValueOnce(
        createResponse({
          success: true,
          branches: ["main"],
          repoDescription: "desc",
        }),
      )
      .mockResolvedValueOnce(createResponse({}, false, 500))

    vi.stubGlobal("fetch", mockFetch)
    const { fetchInitialWorkspace, fetchBranchDiagram } = await loadApi()

    await fetchInitialWorkspace("test-owner/test-repo")
    await expect(fetchBranchDiagram("main")).rejects.toThrow(
      /Failed to fetch branch diagram/,
    )

    // Missing cache path
    vi.resetModules()
    vi.unstubAllGlobals()
    vi.stubGlobal("fetch", mockFetch)
    const { fetchBranchDiagram: uncachedFetchBranchDiagram } = await loadApi()
    await expect(uncachedFetchBranchDiagram("main")).rejects.toThrow(
      /No repository info cached/,
    )
  })

  it("fetches repo tree using cached repo info", async () => {
    mockFetch
      .mockResolvedValueOnce(
        createResponse({
          success: true,
          branches: ["main"],
          repoDescription: "desc",
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          success: true,
          tree: { name: "src", type: "dir", path: "src" },
        }),
      )

    vi.stubGlobal("fetch", mockFetch)
    const { fetchInitialWorkspace, fetchRepoTree } = await loadApi()

    await fetchInitialWorkspace("test-owner/test-repo")
    const tree = await fetchRepoTree("main")

    expect(tree.branchId).toBe("main")
    expect(mockFetch).toHaveBeenLastCalledWith(
      `${API_BASE}/api/repoTree?owner=test-owner&repo=test-repo&branch=main`,
    )
  })

  it("throws when repo tree requested without cached repo", async () => {
    vi.stubGlobal("fetch", mockFetch)
    const { fetchRepoTree } = await loadApi()
    await expect(fetchRepoTree("main")).rejects.toThrow(/No repository info cached/)
  })

  it("throws when repo tree fetch fails or backend returns failure", async () => {
    mockFetch
      .mockResolvedValueOnce(
        createResponse({
          success: true,
          branches: ["main"],
          repoDescription: "desc",
        }),
      )
      .mockResolvedValueOnce(createResponse({}, false, 500))
      .mockResolvedValueOnce(
        createResponse({ success: false, tree: {}, error: "tree fail" }),
      )

    vi.stubGlobal("fetch", mockFetch)
    const { fetchInitialWorkspace, fetchRepoTree } = await loadApi()

    await fetchInitialWorkspace("test-owner/test-repo")
    await expect(fetchRepoTree("main")).rejects.toThrow(
      /Failed to fetch branch file tree/,
    )

    // backend success=false
    await expect(fetchRepoTree("main")).rejects.toThrow(/Backend returned failure/)
  })

  it("fetches architecture diagram with optional branch param", async () => {
    mockFetch.mockResolvedValueOnce(
      createResponse({
        success: true,
        diagram: "graph TD; A-->B;",
        metadata: { latestCommit: {} },
      }),
    )

    vi.stubGlobal("fetch", mockFetch)
    const { fetchArchitectureDiagram } = await loadApi()

    const result = await fetchArchitectureDiagram(
      "https://github.com/test-owner/test-repo",
      "dev",
    )

    expect(result.diagram).toContain("A-->B")
    const called = mockFetch.mock.calls[0][0] as string
    expect(called).toBe(
      `${API_BASE}/api/architecture?repoUrl=${encodeURIComponent(
        "https://github.com/test-owner/test-repo",
      )}&branch=dev`,
    )
  })

  it("throws when architecture request fails or success=false", async () => {
    mockFetch
      .mockResolvedValueOnce(createResponse({}, false, 500))
      .mockResolvedValueOnce(
        createResponse({ success: false, error: "arch fail", diagram: "", metadata: {} }),
      )

    vi.stubGlobal("fetch", mockFetch)
    const { fetchArchitectureDiagram } = await loadApi()

    await expect(
      fetchArchitectureDiagram("https://github.com/test-owner/test-repo"),
    ).rejects.toThrow(/Failed to fetch architecture diagram/)
    await expect(
      fetchArchitectureDiagram("https://github.com/test-owner/test-repo"),
    ).rejects.toThrow(/arch fail/)
  })
})
