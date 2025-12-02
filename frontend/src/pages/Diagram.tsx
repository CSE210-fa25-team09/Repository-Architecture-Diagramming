import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { BRANCH_LIST, REPOSITORY_NAME, WORKSPACE_SUMMARY } from "@/lib/mockData"
import { GithubIcon, Plus } from "lucide-react"
import { useMemo, useState, useEffect, useCallback } from "react"
import { useWorkspace } from "@/lib/workspaceContext"

import {
  DiagramPanel,
  type BranchInfo,
  type BranchLibrary,
} from "@/components/shared/DiagramPanel"
import { fetchBranchDiagram, fetchRepoTree, fetchInitialWorkspace } from "@/api/diagram"
import { formatLastGenerated, repoTreeToAscii } from "@/lib/utils"

type BranchId = string

type DiagramPanelState = {
  id: string
  branchId: BranchId
}

const DEFAULT_DIAGRAMS: DiagramPanelState[] = [{ id: "diagram-1", branchId: "main" }]
const ADD_PANEL_TRIGGER_ID = "diagram-add-trigger"

export function Diagram() {
  const {
    workspace,
    setWorkspaceForRepo,
    setBranchCacheForRepo,
    branchCacheMap,
    setCurrentRepoKey,
  } = useWorkspace()

  const [repoName, setRepoName] = useState(workspace?.repo?.name ?? REPOSITORY_NAME)
  const [repoSummary, setRepoSummary] = useState(
    workspace?.repo?.description ?? WORKSPACE_SUMMARY,
  )

  useEffect(() => {
    if (workspace?.repo) {
      setRepoName(workspace.repo.name)
      setRepoSummary(workspace.repo.description ?? WORKSPACE_SUMMARY)
    }
  }, [workspace])

  const [branches, setBranches] = useState<string[]>(
    workspace?.branches?.map((b) => b.name) ?? BRANCH_LIST,
  )

  const [branchDetails, setBranchDetails] = useState<BranchLibrary>({} as BranchLibrary)
  const [panels, setPanels] = useState<DiagramPanelState[]>(DEFAULT_DIAGRAMS)

  const repoKey = workspace?.repo?.name ?? null

  useEffect(() => {
    if (workspace?.repo?.name) {
      setCurrentRepoKey(workspace.repo.name)
    }
  }, [workspace, setCurrentRepoKey])

  useEffect(() => {
    if (repoKey && branchCacheMap[repoKey]) {
      setBranchDetails(branchCacheMap[repoKey])
    }
  }, [branchCacheMap, repoKey])

  useEffect(() => {
    if (workspace?.branches) {
      setBranches(workspace.branches.map((b) => b.name))
    }
  }, [workspace])

  useEffect(() => {
    if (workspace) return
    let mounted = true
    const loadWorkspace = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const repoParam = params.get("repo")
        const repoIdentifier =
          repoParam && repoParam.trim().length > 0
            ? decodeURIComponent(repoParam)
            : BRANCH_LIST[0]
        const ws = await fetchInitialWorkspace(repoIdentifier)
        if (!mounted) return
        setCurrentRepoKey(ws.repo.name)
        setWorkspaceForRepo(ws.repo.name, ws)
        setRepoName(ws.repo.name)
        setRepoSummary(ws.repo.description ?? WORKSPACE_SUMMARY)
        setBranches(ws.branches.map((b) => b.name))
        const cachedBranches = branchCacheMap[ws.repo.name]
        setBranchDetails(cachedBranches ? cachedBranches : ({} as BranchLibrary))
      } catch (err) {
        console.error("Failed to initialize workspace", err)
      }
    }
    void loadWorkspace()
    return () => {
      mounted = false
    }
  }, [workspace, setCurrentRepoKey, setWorkspaceForRepo, branchCacheMap])

  const ensureBranchData = useCallback(
    async (branchId: string) => {
      if (!repoKey || !workspace) return
      const repoCache = repoKey ? branchCacheMap[repoKey] : undefined
      const existingCached = branchDetails[branchId]
      const cachedFromRepo = repoCache ? repoCache[branchId] : undefined

      if (cachedFromRepo && !branchDetails[branchId]) {
        setBranchDetails((prev) => ({ ...prev, [branchId]: cachedFromRepo }))
        return
      }

      if (
        existingCached &&
        !existingCached.diagramLoading &&
        !existingCached.treeLoading &&
        existingCached.diagram &&
        existingCached.fileTree
      ) {
        return
      }

      setBranchDetails((prev) => {
        const existing = prev[branchId]
        if (existing?.diagramLoading || existing?.treeLoading) return prev
        const fallback: BranchInfo = existing ?? {
          id: branchId,
          label: branchId,
          lastGenerated: "",
          diagram: "",
          fileTree: "",
          commitMessage: "",
          commitNumber: "",
          dependencyGraph: "",
          diagramError: undefined,
          treeError: undefined,
        }
        return {
          ...prev,
          [branchId]: { ...fallback, diagramLoading: true, treeLoading: true },
        }
      })

      const loadDiagram = async () => {
        try {
          const diagramResp = await fetchBranchDiagram(branchId)
          const formattedTimestamp = formatLastGenerated(diagramResp.timestamp)
          setBranchDetails((prev) => {
            const existing = prev[branchId]
            if (!existing) return prev
            const updated: BranchLibrary = {
              ...prev,
              [branchId]: {
                ...existing,
                lastGenerated: formattedTimestamp || "Just now",
                diagram: diagramResp.internalDependencies,
                commitMessage: diagramResp.commitMessage,
                commitNumber: diagramResp.commitId,
                dependencyGraph: diagramResp.allDependencies,
                diagramLoading: false,
                diagramError: undefined,
              },
            }
            return updated
          })
        } catch (err) {
          console.error("Failed to load diagram", err)
          setBranchDetails((prev) => {
            const existing = prev[branchId]
            if (!existing) return prev
            const message =
              err instanceof Error
                ? err.message
                : "Failed to load diagram for this branch."
            return {
              ...prev,
              [branchId]: { ...existing, diagramLoading: false, diagramError: message },
            }
          })
        }
      }

      const loadTree = async () => {
        try {
          const treeResp = await fetchRepoTree(branchId)
          const formattedTree = repoTreeToAscii(treeResp.tree, repoName ?? branchId)
          setBranchDetails((prev) => {
            const existing = prev[branchId]
            if (!existing) return prev
            const updated: BranchLibrary = {
              ...prev,
              [branchId]: { ...existing, fileTree: formattedTree, treeLoading: false },
            }
            return updated
          })
        } catch (err) {
          console.error("Failed to load repo tree", err)
          setBranchDetails((prev) => {
            const existing = prev[branchId]
            if (!existing) return prev
            const message =
              err instanceof Error
                ? err.message
                : "Failed to load file tree for this branch."
            return {
              ...prev,
              [branchId]: { ...existing, treeLoading: false, treeError: message },
            }
          })
        }
      }

      void loadDiagram()
      void loadTree()
    },
    [repoName, branchDetails, setBranchCacheForRepo, repoKey, workspace, branchCacheMap],
  )

  const handleAddPanel = (branchId: string) => {
    if (!branchId) return
    const newId = `diagram-${Date.now()}`
    setPanels((prev) =>
      prev.some((p) => p.branchId === branchId)
        ? prev
        : [...prev, { id: newId, branchId }],
    )
    if (!branchDetails[branchId]) {
      void ensureBranchData(branchId)
    }
  }

  const handleRemovePanel = (diagramId: string) => {
    setPanels((prev) => prev.filter((panel) => panel.id !== diagramId))
  }

  const handleSwitchBranch = (diagramId: string, branchId: BranchId) => {
    setPanels((prevPanels) => {
      const currentPanel = prevPanels.find((p) => p.id === diagramId)
      if (!currentPanel) return prevPanels
      const initialBranchId = currentPanel.branchId

      const otherPanelToSwap = prevPanels.find(
        (p) => p.branchId === branchId && p.id !== diagramId,
      )

      if (otherPanelToSwap) {
        const otherPanelId = otherPanelToSwap.id

        return prevPanels.map((panel) => {
          if (panel.id === diagramId) {
            return { ...panel, branchId: branchId }
          } else if (panel.id === otherPanelId) {
            return { ...panel, branchId: initialBranchId }
          }
          return panel
        })
      } else {
        return prevPanels.map((panel) =>
          panel.id === diagramId ? { ...panel, branchId } : panel,
        )
      }
    })

    if (!branchDetails[branchId]) {
      void ensureBranchData(branchId)
    }
  }

  const unusedBranches = useMemo(() => {
    const usedBranchIds = new Set(panels.map((p) => p.branchId))
    return branches.filter((branchId) => !usedBranchIds.has(branchId))
  }, [branches, panels])

  const allUsedBranchIds = useMemo(() => {
    return new Set(panels.map((p) => p.branchId))
  }, [panels])

  useEffect(() => {
    if (!repoKey || !workspace) return
    panels.forEach((panel) => {
      if (!branchDetails[panel.branchId]) {
        const repoCache = branchCacheMap[repoKey]
        if (repoCache && repoCache[panel.branchId]) {
          setBranchDetails((prev) => ({
            ...prev,
            [panel.branchId]: repoCache[panel.branchId],
          }))
          return
        }
        void ensureBranchData(panel.branchId)
      }
    })
  }, [panels, ensureBranchData, branchDetails, repoKey, workspace, branchCacheMap])

  useEffect(() => {
    if (!repoKey || !workspace) return
    if (!Object.keys(branchDetails).length) return
    setBranchCacheForRepo(repoKey, branchDetails)
  }, [branchDetails, repoKey, setBranchCacheForRepo, workspace])

  return (
    <main className="flex flex-1 flex-col gap-10 px-4 pb-12 sm:px-0">
      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg)] shadow-lg">
        <div className="flex flex-col gap-6 px-6 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex w-full items-center gap-3 sm:w-auto">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--page-bg)] text-sm font-semibold sm:h-14 sm:w-14">
                <GithubIcon
                  className="h-7 w-7 text-[color:var(--page-foreground)]"
                  aria-hidden
                />
              </div>
              <div className="text-center text-left">
                <p data-testid="repo-name" className="text-lg font-semibold">
                  {repoName}
                </p>
                <p
                  data-testid="repo-summary"
                  className="text-sm text-[color:var(--muted-text)]"
                >
                  {repoSummary}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-6 pb-10 sm:px-8">
          {panels.map((panel) => {
            const branch = branchDetails[panel.branchId] ?? {
              id: panel.branchId,
              label: panel.branchId,
              lastGenerated: "Loading...",
              diagram: "",
              fileTree: "",
              commitMessage: "",
              commitNumber: "",
              dependencyGraph: "",
              diagramLoading: true,
              treeLoading: true,
            }

            return (
              <DiagramPanel
                key={panel.id}
                branch={branch}
                canRemove={panels.length > 1}
                onRemove={() => handleRemovePanel(panel.id)}
                onSwitchBranch={(branchId) => handleSwitchBranch(panel.id, branchId)}
                usedBranchIds={allUsedBranchIds}
                branches={branches}
                branchDetails={branchDetails}
              />
            )
          })}
        </div>

        <div className="flex flex-col items-center gap-3 border-t border-[color:var(--panel-border)] px-6 py-6 sm:px-8 sm:py-8">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                id={ADD_PANEL_TRIGGER_ID}
                variant="outline"
                disabled={!unusedBranches.length}
                className="flex items-center gap-2 rounded-full border-[3px] border-dashed border-[color:var(--panel-border)] px-2 py-4 h-auto whitespace-nowrap text-center text-xs sm:px-6 sm:py-3 xs:text-base"
              >
                <Plus className="h-5 w-5 flex-shrink-0" />
                {unusedBranches.length
                  ? "Add a new diagram for a branch"
                  : "All tracked branches already visible."}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              className="min-w-[16rem] max-w-[calc(100vw-2rem)] sm:max-w-none"
            >
              {unusedBranches.map((branchId) => {
                const branch = branchDetails[branchId]

                return (
                  <DropdownMenuItem
                    data-branch-id={branchId}
                    key={branchId}
                    onSelect={() => {
                      handleAddPanel(branchId)
                    }}
                    className="flex w-full flex-col items-start gap-0.5"
                  >
                    <span className="font-medium text-[color:var(--page-foreground)]">
                      {branchId}
                    </span>
                    <span
                      data-testid="dropdown-item-last-generated"
                      className="text-xs text-[color:var(--muted-text)]"
                    >
                      {branch?.lastGenerated
                        ? `Last generated ${branch.lastGenerated}`
                        : "Not generated yet"}
                    </span>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          {unusedBranches.length > 0 && (
            <p className="text-center text-sm text-[color:var(--muted-text)] sm:text-left">
              Pick a branch to generate a new diagram workspace card.
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
