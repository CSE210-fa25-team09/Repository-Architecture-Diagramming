import { createContext, useContext, useMemo, useState } from "react"
import type { ReactNode } from "react"
import type { WorkspaceResponse } from "../api/diagram"

type WorkspaceContextValue = {
  currentRepoKey: string | null
  setCurrentRepoKey: (key: string | null) => void
  workspaceMap: Record<string, WorkspaceResponse>
  setWorkspaceForRepo: (key: string, workspace: WorkspaceResponse) => void
  workspace: WorkspaceResponse | null
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [currentRepoKey, setCurrentRepoKey] = useState<string | null>(null)
  const [workspaceMap, setWorkspaceMap] = useState<Record<string, WorkspaceResponse>>({})

  const workspace = useMemo(
    () => (currentRepoKey ? (workspaceMap[currentRepoKey] ?? null) : null),
    [currentRepoKey, workspaceMap],
  )

  const setWorkspaceForRepo = useMemo(
    () => (key: string, ws: WorkspaceResponse) => {
      setWorkspaceMap((prev) => ({ ...prev, [key]: ws }))
    },
    [],
  )

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      currentRepoKey,
      setCurrentRepoKey,
      workspaceMap,
      setWorkspaceForRepo,
      workspace,
    }),
    [currentRepoKey, setCurrentRepoKey, setWorkspaceForRepo, workspace, workspaceMap],
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
