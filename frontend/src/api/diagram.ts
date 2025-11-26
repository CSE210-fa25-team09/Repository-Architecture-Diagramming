import workspaceMock from "./mocks/workspace.json";
import mainBranchMock from "./mocks/branches/main.json";
import devBranchMock from "./mocks/branches/dev.json";

export type BranchId = string;

const LATENCY_MS = 400;

let cachedWorkspace: WorkspaceResponse | null = null;
const branchCache: Record<BranchId, BranchDiagramResponse> = {};

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export interface RepoSummary {
  name: string;
  description: string | null;
  url: string;
  defaultBranch: BranchId;
}

export interface BranchInfo {
  id: BranchId;
  name: string;
  lastGenerated: string | null;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileTreeNode[];
}

export interface DiagramAndTree {
  mermaid: string;
  fileTree: FileTreeNode[];
}

export interface WorkspaceResponse {
  repo: RepoSummary;
  branches: BranchInfo[];
  mainBranchId: BranchId;
  mainBranchData: DiagramAndTree;
  lastGenerated: string | null;
}

export interface BranchDiagramResponse {
  branchId: BranchId;
  data: DiagramAndTree;
  lastGenerated: string | null;
}

export async function fetchInitialWorkspace(
  repoUrlOrZip: string
): Promise<WorkspaceResponse> {
  await delay(LATENCY_MS);
  if (cachedWorkspace) return cachedWorkspace;
  cachedWorkspace = workspaceMock as WorkspaceResponse;
  return cachedWorkspace;
}

export async function fetchBranchDiagram(
  branchId: BranchId
): Promise<BranchDiagramResponse> {
  await delay(LATENCY_MS);
  if (branchCache[branchId]) return branchCache[branchId];
  let mock: any;
  switch (branchId) {
    case "main":
      mock = mainBranchMock;
      break;
    case "dev":
      mock = devBranchMock;
      break;
    default:
      mock = mainBranchMock;
  }
  const response: BranchDiagramResponse = {
    branchId,
    data: mock.data,
    lastGenerated: mock.lastGenerated,
  };
  branchCache[branchId] = response;
  return response;
}