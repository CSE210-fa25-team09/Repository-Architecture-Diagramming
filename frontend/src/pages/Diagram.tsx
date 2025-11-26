import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { GithubIcon } from "lucide-react"

import { useWorkspace } from "@/lib/workspaceContext"
import { fetchInitialWorkspace, fetchBranchDiagram } from "@/api/diagram"


export function Diagram() {
  const { workspace, setWorkspace } = useWorkspace()
  const [searchParams] = useSearchParams()

  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const [branchError, setBranchError] = useState<string | null>(null)
  const [loadingBranchId, setLoadingBranchId] = useState<string | null>(null)

  // Reload workspace if the user refreshes /diagram or lands here directly.
  useEffect(() => {
    if (workspace) return

    const repo = searchParams.get("repo")
    const zip = searchParams.get("zip")
    const identifier = repo ?? zip
    if (!identifier) return

    let cancelled = false
    setWorkspaceError(null)

    ;(async () => {
      try {
        const ws = await fetchInitialWorkspace(identifier)
        if (!cancelled) {
          setWorkspace(ws)
        }
      } catch (err) {
        console.error("Failed to load workspace", err)
        if (!cancelled) {
          setWorkspaceError("Failed to load workspace. Please go back and try again.")
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [workspace, searchParams, setWorkspace])

  async function handleFetchBranch(branchId: string) {
    if (!branchId) return
    setBranchError(null)
    setLoadingBranchId(branchId)

    try {
      const res = await fetchBranchDiagram(branchId)
      console.log("Fetched branch diagram:", res)
    } catch (err) {
      console.error("Failed to load branch diagram", err)
      setBranchError(`Could not load diagram for branch "${branchId}".`)
    } finally {
      setLoadingBranchId(null)
    }
  }
  if (!workspace) {
    return (
      <main className="flex flex-1 flex-col gap-4 px-4 pb-12 sm:px-0">
        <p className="mt-6 text-sm text-muted-foreground">
          Loading workspace…
        </p>
        {workspaceError && (
          <p className="text-sm text-red-500">{workspaceError}</p>
        )}
      </main>
    )
  }

  const repo = workspace.repo
  const branches = workspace.branches

  // import {
  //   BRANCH_LIBRARY,
  //   BRANCH_LIST,
  //   REPOSITORY_NAME,
  //   WORKSPACE_SUMMARY,
  // } from "@/lib/mockData"
  //
  // const [repoName, _setRepoName] = useState(REPOSITORY_NAME)
  // const [repoSummary, _setRepoSummary] = useState(WORKSPACE_SUMMARY)
  // const [branchesLegacy, _setBranchesLegacy] = useState<string[]>(BRANCH_LIST)
  // const [branchDetailsLegacy, setBranchDetailsLegacy] = useState<BranchLibrary>({
  //   main: BRANCH_LIBRARY["main"],
  // })
  // const [panelsLegacy, setPanelsLegacy] = useState<string[]>(["main"])
  //
  // const handleAddPanelLegacy = (branchId: string) => {
  //   if (!branchId) return
  //   setPanelsLegacy((prev) => (prev.includes(branchId) ? prev : [...prev, branchId]))
  //   setBranchDetailsLegacy((prev) => {
  //     if (Object.prototype.hasOwnProperty.call(prev, branchId)) return prev
  //     if (!Object.prototype.hasOwnProperty.call(BRANCH_LIBRARY, branchId)) return prev
  //     const branchData = BRANCH_LIBRARY[branchId]
  //     if (!branchData) return prev
  //     return { ...prev, [branchId]: branchData }
  //   })
  // }
  //
  // The panel rendering (mermaid/file tree, skeletons, dropdown) that used
  // these legacy variables has been removed from the active JSX to keep this
  // file focused on the API + routing behavior. Andrew’s UI ticket will
  // implement the full diagram layout.

  return (
    <main className="flex flex-1 flex-col gap-8 px-4 pb-12 sm:px-0">
      {/* Simple repo header; detailed layout comes in the UI ticket */}
      <section className="mt-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--page-bg)]">
          <GithubIcon
            className="h-7 w-7 text-[color:var(--page-foreground)]"
            aria-hidden
          />
        </div>
        <div>
          <p data-testid="repo-name" className="text-lg font-semibold">
            {repo.name}
          </p>
          <p
            data-testid="repo-summary"
            className="text-sm text-[color:var(--muted-text)]"
          >
            {repo.description || "No description provided."}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Branches</h2>
        {branches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No branches available in this mock workspace.
          </p>
        ) : (
          <ul className="space-y-2">
            {branches.map((b) => (
              <li key={b.id} className="flex items-center gap-3 text-sm">
                <span className="font-mono">{b.name}</span>
                <button
                  type="button"
                  className="text-xs underline disabled:opacity-60"
                  disabled={loadingBranchId === b.id}
                  onClick={() => void handleFetchBranch(b.id)}
                >
                  {loadingBranchId === b.id
                    ? "Loading diagram…"
                    : "Fetch diagram (mock)"}
                </button>
              </li>
            ))}
          </ul>
        )}

        {branchError && (
          <p className="text-sm text-red-500">{branchError}</p>
        )}
      </section>
    </main>
  )
}
