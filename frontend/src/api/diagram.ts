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

let cachedWorkspace: WorkspaceResponse | null = null
let cachedRepoCoords: { owner: string; repo: string } | null = null

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

export async function fetchInitialWorkspace(
  identifier: string,
): Promise<WorkspaceResponse> {
  if (cachedWorkspace) return cachedWorkspace

  const { owner, repo, fullName } = parseRepositoryIdentifier(identifier)
  cachedRepoCoords = { owner, repo }

  const url = `/api/branches?owner=${encodeURIComponent(
    owner,
  )}&repo=${encodeURIComponent(repo)}`
  const resp = await fetch(url)

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

export async function fetchBranchDiagram(
  branchId: string,
): Promise<BranchDiagramResponse> {
  if (!cachedRepoCoords) {
    throw new Error(
      "No repository info cached—call fetchInitialWorkspace() first.",
    )
  }

  const { owner, repo } = cachedRepoCoords

  const url = `/api/analyzeRepo?owner=${encodeURIComponent(
    owner,
  )}&repo=${encodeURIComponent(repo)}&branch=${encodeURIComponent(branchId)}`
  const resp = await fetch(url)

  if (!resp.ok) {
    throw new Error(
      `Failed to fetch branch diagram: ${resp.status} ${resp.statusText}`,
    )
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