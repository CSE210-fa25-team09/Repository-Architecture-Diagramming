import { createContext, useContext, useState } from "react"
import type { ReactNode } from "react"
import type { WorkspaceResponse } from "../api/diagram"

type WorkspaceContextValue = {
  workspace: WorkspaceResponse | null
  setWorkspace: (w: WorkspaceResponse | null) => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null)

  return (
    <WorkspaceContext.Provider value={{ workspace, setWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider")
  }
  return ctx
}
