// --------- Types shared with the UI ---------

export type WorkspaceBranch = {
  id: string
  name: string
}

export type WorkspaceResponse = {
  repo: {
    name: string
    description: string
  }
  branches: WorkspaceBranch[]
}

export type BranchDiagramResponse = {
  branchId: string
  allDependencies: string
  internalDependencies: string
  timestamp: number
  repoDescription: string
  commitId: string
  commitMessage: string
}

export type RepoTreeNode = {
  name: string
  type: "dir" | "file"
  path: string
  children?: RepoTreeNode[]
}

export type BranchFileTreeResponse = {
  branchId: string
  tree: RepoTreeNode[]
}

// For /api/architecture
export type ArchitectureMetadata = {
  owner: string
  repo: string
  repoUrl: string
  branch: string
  branchSummary: Record<string, unknown>
  latestCommit: Record<string, unknown>
  fileStats: Record<string, unknown>
  treePreview: unknown[]
  llm: Record<string, unknown>
}

export type ArchitectureDiagramResponse = {
  success: boolean
  diagram: string
  metadata: ArchitectureMetadata
}

// --------- Simple in-memory cache of “current repo” ---------

let cachedWorkspace: WorkspaceResponse | null = null
let cachedRepoCoords: { owner: string; repo: string } | null = null

const API_BASE_URL = "https://repository-architecture-diagramming.onrender.com"

function withApiBase(path: string) {
  if (!API_BASE_URL) return path
  return `${API_BASE_URL}${path}`
}

function parseRepositoryIdentifier(identifier: string): {
  owner: string
  repo: string
  fullName: string
} {
  let trimmed = identifier.trim()
  if (trimmed.endsWith("/")) trimmed = trimmed.slice(0, -1)

  if (trimmed.startsWith("https://github.com/")) {
    const parts = trimmed.replace("https://github.com/", "").split("/")
    const [owner, repo] = parts
    if (!owner || !repo) {
      throw new Error(
        "Could not parse GitHub URL. Expected: https://github.com/owner/repo",
      )
    }
    return { owner, repo, fullName: `${owner}/${repo}` }
  }

  const parts = trimmed.split("/")
  if (parts.length === 2) {
    const [owner, repo] = parts
    return { owner, repo, fullName: `${owner}/${repo}` }
  }

  throw new Error("Unsupported repository identifier format.")
}

// -------------------------------------------------------------
// GET /api/branches  →  fetchInitialWorkspace()
// -------------------------------------------------------------
//
// - Backend: returns { success, branches: string[], repoDescription }
// - Frontend: turns that into WorkspaceResponse and remembers which
//   owner/repo we’re currently looking at (cachedRepoCoords).
// -------------------------------------------------------------

export async function fetchInitialWorkspace(
  identifier: string,
): Promise<WorkspaceResponse> {
  const { owner, repo, fullName } = parseRepositoryIdentifier(identifier)

  // Only reuse cache if it's the exact same repo
  if (
    cachedWorkspace &&
    cachedRepoCoords &&
    cachedRepoCoords.owner === owner &&
    cachedRepoCoords.repo === repo
  ) {
    return cachedWorkspace
  }

  cachedRepoCoords = { owner, repo }

  const url = `/api/branches?owner=${encodeURIComponent(
    owner,
  )}&repo=${encodeURIComponent(repo)}`
  const resp = await fetch(withApiBase(url))

  if (!resp.ok) {
    throw new Error(`Failed to fetch branches: ${resp.status} ${resp.statusText}`)
  }

  const data: {
    success: boolean
    branches: string[]
    repoDescription: string
  } = await resp.json()

  if (!data.success) {
    throw new Error("Backend returned failure for /api/branches")
  }

  const workspace: WorkspaceResponse = {
    repo: {
      name: fullName,
      description: data.repoDescription ?? "",
    },
    branches: data.branches.map((name) => ({
      id: name,
      name,
    })),
  }

  cachedWorkspace = workspace
  return workspace
}

// -------------------------------------------------------------
// GET /api/analyzeRepo → fetchBranchDiagram()
// -------------------------------------------------------------
//
// - Uses cachedRepoCoords (set by fetchInitialWorkspace)
// - Backend returns Mermaid strings + metadata.
// -------------------------------------------------------------

export async function fetchBranchDiagram(
  branchId: string,
): Promise<BranchDiagramResponse> {
  if (!cachedRepoCoords) {
    throw new Error("No repository info cached—call fetchInitialWorkspace() first.")
  }

  const { owner, repo } = cachedRepoCoords

  const url = `/api/analyzeRepo?owner=${encodeURIComponent(
    owner,
  )}&repo=${encodeURIComponent(repo)}&branch=${encodeURIComponent(branchId)}`
  const resp = await fetch(withApiBase(url))

  if (!resp.ok) {
    throw new Error(`Failed to fetch branch diagram: ${resp.status} ${resp.statusText}`)
  }

  const data: {
    allDependencies: string
    internalDependencies: string
    timestamp: number
    repoDescription: string
    commitId: string
    commitMessage: string
    error?: string
  } = await resp.json()

  if (data.error) {
    throw new Error(data.error)
  }

  return {
    branchId,
    allDependencies: data.allDependencies,
    internalDependencies: data.internalDependencies,
    timestamp: data.timestamp,
    repoDescription: data.repoDescription,
    commitId: data.commitId,
    commitMessage: data.commitMessage,
  }
}

// -------------------------------------------------------------
// GET /api/repoTree → fetchRepoTree()
// -------------------------------------------------------------
//
// - Uses cachedRepoCoords (current repo)
// - Backend returns { success, tree: RepoTreeNode }.
// -------------------------------------------------------------

export async function fetchRepoTree(branchId: string): Promise<BranchFileTreeResponse> {
  if (!cachedRepoCoords) {
    throw new Error("No repository info cached—call fetchInitialWorkspace() first.")
  }

  const { owner, repo } = cachedRepoCoords

  const url = `/api/repoTree?owner=${encodeURIComponent(
    owner,
  )}&repo=${encodeURIComponent(repo)}&branch=${encodeURIComponent(branchId)}`
  const resp = await fetch(withApiBase(url))

  if (!resp.ok) {
    throw new Error(`Failed to fetch branch file tree: ${resp.status} ${resp.statusText}`)
  }

  const data: {
    success: boolean
    tree: RepoTreeNode | RepoTreeNode[]
    error?: string
  } = await resp.json()

  if (!data.success) {
    throw new Error("Backend returned failure for /api/repoTree")
  }
  if (data.error) {
    throw new Error(data.error)
  }

  return {
    branchId,
    tree: Array.isArray(data.tree) ? data.tree : [data.tree],
  }
}

// -------------------------------------------------------------
// GET /api/architecture → fetchArchitectureDiagram()
// -------------------------------------------------------------
//
// - Sends repoUrl + optional branch
// - Backend returns { success, diagram, metadata }.
// - For LLM graphs, callers mostly care about `diagram` string.
// -------------------------------------------------------------

export async function fetchArchitectureDiagram(
  repoUrl: string,
  branch?: string,
): Promise<ArchitectureDiagramResponse> {
  const params = new URLSearchParams({ repoUrl })
  if (branch) params.set("branch", branch)

  const resp = await fetch(withApiBase(`/api/architecture?${params.toString()}`))

  if (!resp.ok) {
    throw new Error(
      `Failed to fetch architecture diagram: ${resp.status} ${resp.statusText}`,
    )
  }

  const data: {
    success: boolean
    diagram: string
    metadata: ArchitectureMetadata
    error?: string
  } = await resp.json()

  if (!data.success) {
    throw new Error(data.error || "Backend returned failure for /api/architecture")
  }

  return data
}
