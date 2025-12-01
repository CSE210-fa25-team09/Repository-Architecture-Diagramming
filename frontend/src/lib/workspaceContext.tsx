import { createContext, useContext, useMemo, useState } from "react"
import type { ReactNode } from "react"
import type { WorkspaceResponse } from "../api/diagram"
import type { BranchLibrary } from "@/components/shared/DiagramPanel"

type WorkspaceContextValue = {
  currentRepoKey: string | null
  setCurrentRepoKey: (key: string | null) => void
  workspaceMap: Record<string, WorkspaceResponse>
  setWorkspaceForRepo: (key: string, workspace: WorkspaceResponse) => void
  branchCacheMap: Record<string, BranchLibrary>
  setBranchCacheForRepo: (key: string, cache: BranchLibrary) => void
  workspace: WorkspaceResponse | null
  branches: BranchLibrary
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [currentRepoKey, setCurrentRepoKey] = useState<string | null>(null)
  const [workspaceMap, setWorkspaceMap] = useState<Record<string, WorkspaceResponse>>({})
  const [branchCacheMap, setBranchCacheMap] = useState<Record<string, BranchLibrary>>({})

  const workspace = useMemo(
    () => (currentRepoKey ? (workspaceMap[currentRepoKey] ?? null) : null),
    [currentRepoKey, workspaceMap],
  )
  const branches = useMemo(
    () => (currentRepoKey ? (branchCacheMap[currentRepoKey] ?? {}) : {}),
    [branchCacheMap, currentRepoKey],
  )

  const setWorkspaceForRepo = useMemo(
    () => (key: string, ws: WorkspaceResponse) => {
      setWorkspaceMap((prev) => ({ ...prev, [key]: ws }))
    },
    [],
  )

  const setBranchCacheForRepo = useMemo(
    () => (key: string, cache: BranchLibrary) => {
      setBranchCacheMap((prev) => ({ ...prev, [key]: cache }))
    },
    [],
  )

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      currentRepoKey,
      setCurrentRepoKey,
      workspaceMap,
      setWorkspaceForRepo,
      branchCacheMap,
      setBranchCacheForRepo,
      workspace,
      branches,
    }),
    [
      branchCacheMap,
      branches,
      currentRepoKey,
      setBranchCacheForRepo,
      setCurrentRepoKey,
      setWorkspaceForRepo,
      workspace,
      workspaceMap,
    ],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider")
  }
  return ctx
}
