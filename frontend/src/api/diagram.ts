import branchesMock from "./mocks/branches.json"
import analyzeRepoMock from "./mocks/analyzeRepo.json"
import repoTreeMock from "./mocks/repoTree.json"

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

export type RepoTreeResponse = {
  success: boolean
  tree: RepoTreeNode[]
}

let cachedWorkspace: WorkspaceResponse | null = null
let cachedRepoCoords: { owner: string; repo: string } | null = null

type BranchesMockResponse = {
  success: boolean
  branches: string[]
  repoDescription: string
}

const MOCK_BRANCHES_RESPONSE = branchesMock as BranchesMockResponse

const MOCK_ANALYZE_RESPONSES = analyzeRepoMock as Record<
  string,
  Omit<BranchDiagramResponse, "branchId">
>

const MOCK_REPO_TREE = repoTreeMock as Record<string, RepoTreeResponse>

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

export async function fetchInitialWorkspace(
  identifier: string,
): Promise<WorkspaceResponse> {
  if (cachedWorkspace) return cachedWorkspace

  const { owner, repo, fullName } = parseRepositoryIdentifier(identifier)
  cachedRepoCoords = { owner, repo }

  // const url = `/api/branches?owner=${encodeURIComponent(
  //   owner,
  // )}&repo=${encodeURIComponent(repo)}`
  // const resp = await fetch(url)

  // if (!resp.ok) {
  //   throw new Error(`Failed to fetch branches: ${resp.status} ${resp.statusText}`)
  // }

  // const data: {
  //   success: boolean
  //   branches: string[]
  //   repoDescription: string
  // } = await resp.json()

  // if (!data.success) {
  //   throw new Error("Backend returned failure for /api/branches")
  // }

  const data = MOCK_BRANCHES_RESPONSE

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
    throw new Error("No repository info cached—call fetchInitialWorkspace() first.")
  }

  // const { owner, repo } = cachedRepoCoords

  // const url = `/api/analyzeRepo?owner=${encodeURIComponent(
  //   owner,
  // )}&repo=${encodeURIComponent(repo)}&branch=${encodeURIComponent(branchId)}`
  // const resp = await fetch(url)

  // if (!resp.ok) {
  //   throw new Error(`Failed to fetch branch diagram: ${resp.status} ${resp.statusText}`)
  // }

  // const data: {
  //   allDependencies: string
  //   internalDependencies: string
  //   timestamp: number
  //   repoDescription: string
  //   commitId: string
  //   commitMessage: string
  //   error?: string
  // } = await resp.json()

  // if (data.error) {
  //   throw new Error(data.error)
  // }

  const data = MOCK_ANALYZE_RESPONSES[branchId]

  await delay(6000)

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

export async function fetchRepoTree(branchId = "main"): Promise<RepoTreeResponse> {
  if (!cachedRepoCoords) {
    throw new Error("No repository info cached—call fetchInitialWorkspace() first.")
  }

  const data = MOCK_REPO_TREE[branchId]

  if (!data) {
    const { owner, repo } = cachedRepoCoords
    throw new Error(`No mock repo tree for ${owner}/${repo} on branch ${branchId}`)
  }

  await delay(500)

  return data
}
