import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Plus } from "lucide-react"
import { useLocation } from "react-router-dom"
import { useMemo, useState, useEffect, useCallback } from "react"
import { useWorkspace } from "@/lib/workspaceContext"
import IconLight from "@/assets/icon_light.svg"
import IconDark from "@/assets/icon_dark.svg"

import {
  DiagramPanel,
  type BranchInfo,
  type BranchLibrary,
} from "@/components/shared/DiagramPanel"
import {
  fetchArchitectureDiagram,
  fetchBranchDiagram,
  fetchRepoTree,
  fetchInitialWorkspace,
} from "@/api/diagram"
import { formatLastGenerated, normalizeRepoParam, repoTreeToAscii } from "@/lib/utils"
import { NotFound } from "@/pages/NotFound"

type BranchId = string

type DiagramPanelState = {
  id: string
  branchId: BranchId
}

const ADD_PANEL_TRIGGER_ID = "diagram-add-trigger"

export function Diagram() {
  const { workspace, setWorkspaceForRepo, setCurrentRepoKey } = useWorkspace()
  const location = useLocation()

  const repoParam = useMemo(
    () => new URLSearchParams(location.search).get("repo")?.trim() ?? "",
    [location.search],
  )

  const [repoName, setRepoName] = useState(workspace?.repo?.name ?? "")
  const [repoSummary, setRepoSummary] = useState(workspace?.repo?.description ?? "")

  const repoKeyFromParam = useMemo(() => normalizeRepoParam(repoParam), [repoParam])

  const repoUrl = useMemo(() => {
    const decoded = decodeURIComponent(repoParam || "")
    if (decoded.startsWith("http")) return decoded
    const baseName = repoKeyFromParam || repoName || decoded
    return baseName ? `https://github.com/${baseName}` : ""
  }, [repoKeyFromParam, repoParam, repoName])

  useEffect(() => {
    if (workspace?.repo) {
      setRepoName(workspace.repo.name)
      setRepoSummary(workspace.repo.description ?? "")
    }
  }, [workspace])

  const [branches, setBranches] = useState<string[]>(
    workspace?.branches?.map((b) => b.name) ?? [],
  )

  const [branchDetails, setBranchDetails] = useState<BranchLibrary>({} as BranchLibrary)
  const [panels, setPanels] = useState<DiagramPanelState[]>(() =>
    workspace?.defaultBranch
      ? [{ id: "diagram-1", branchId: workspace.defaultBranch }]
      : [],
  )

  const repoKey = workspace?.repo?.name ?? null

  // Keep the workspace context aligned with the current ?repo param and clear
  // any stale branch data when switching repos.
  useEffect(() => {
    if (!repoKeyFromParam) return
    if (workspace?.repo?.name !== repoKeyFromParam) {
      setCurrentRepoKey(repoKeyFromParam)
      setBranchDetails({} as BranchLibrary)
      setBranches([])
      setPanels(
        workspace?.defaultBranch
          ? [{ id: "diagram-1", branchId: workspace.defaultBranch }]
          : [],
      )
      setRepoName(repoKeyFromParam)
      setRepoSummary("")
    }
  }, [
    repoKeyFromParam,
    setBranchDetails,
    setBranches,
    setCurrentRepoKey,
    setRepoSummary,
    setRepoName,
    setPanels,
    workspace,
  ])

  useEffect(() => {
    if (workspace?.repo?.name) {
      setCurrentRepoKey(workspace.repo.name)
    }
  }, [workspace, setCurrentRepoKey])

  useEffect(() => {
    if (workspace?.branches) {
      setBranches(workspace.branches.map((b) => b.name))
    }
  }, [workspace])

  // Initialize workspace from ?repo=
  useEffect(() => {
    if (!workspace?.defaultBranch) return
    setPanels((prev) => {
      if (prev.some((panel) => panel.branchId === workspace.defaultBranch)) return prev
      if (prev.length === 0) {
        return [{ id: "diagram-1", branchId: workspace.defaultBranch }]
      }
      if (prev.length === 1 && !prev[0].branchId) {
        return [{ ...prev[0], branchId: workspace.defaultBranch }]
      }
      return prev
    })
  }, [workspace?.defaultBranch])

  useEffect(() => {
    if (!repoParam || !repoKeyFromParam) return
    if (workspace && workspace.repo?.name === repoKeyFromParam) return

    let mounted = true

    const loadWorkspace = async () => {
      try {
        const identifier = decodeURIComponent(repoParam)
        const ws = await fetchInitialWorkspace(identifier)
        if (!mounted) return
        setCurrentRepoKey(ws.repo.name)
        setWorkspaceForRepo(ws.repo.name, ws)
        setRepoName(ws.repo.name)
        setRepoSummary(ws.repo.description ?? "")
        setBranches(ws.branches.map((b) => b.name))
        setBranchDetails({} as BranchLibrary)
      } catch (err) {
        console.error("Failed to initialize workspace", err)
      }
    }

    void loadWorkspace()

    return () => {
      mounted = false
    }
  }, [
    workspace,
    setCurrentRepoKey,
    setWorkspaceForRepo,
    repoParam,
    repoKeyFromParam,
    setRepoName,
    setRepoSummary,
    setBranches,
    setBranchDetails,
  ])

  const ensureBranchData = useCallback(
    async (branchId: string) => {
      if (!repoKey || !workspace || !repoUrl) return
      const existingCached = branchDetails[branchId]

      if (
        existingCached &&
        !existingCached.diagramLoading &&
        !existingCached.treeLoading &&
        !existingCached.llmLoading &&
        existingCached.internalDependencyGraph &&
        existingCached.fileTree &&
        existingCached.llmGraph
      ) {
        return
      }

      setBranchDetails((prev) => {
        const existing = prev[branchId]
        if (existing?.diagramLoading || existing?.treeLoading || existing?.llmLoading)
          return prev
        const fallback: BranchInfo = existing ?? {
          id: branchId,
          label: branchId,
          lastGenerated: "",
          internalDependencyGraph: "",
          fileTree: "",
          commitMessage: "",
          commitNumber: "",
          dependencyGraph: "",
          llmGraph: "",
          diagramError: undefined,
          treeError: undefined,
          llmError: undefined,
          llmLoading: false,
        }
        return {
          ...prev,
          [branchId]: {
            ...fallback,
            diagramLoading: true,
            treeLoading: true,
            llmLoading: true,
          },
        }
      })

      let commitCaptured =
        Boolean(existingCached?.commitNumber) || Boolean(existingCached?.lastGenerated)

      const maybeApplyCommitInfo = ({
        commitMessage,
        commitNumber,
        commitTimestamp,
      }: {
        commitMessage?: string
        commitNumber?: string
        commitTimestamp?: number
      }) => {
        if (commitCaptured) return
        if (!commitMessage && !commitNumber && !commitTimestamp) return
        const formattedTimestamp = formatLastGenerated(commitTimestamp)
        commitCaptured = true
        setBranchDetails((prev) => {
          const existing = prev[branchId]
          if (!existing) return prev
          return {
            ...prev,
            [branchId]: {
              ...existing,
              commitMessage: commitMessage ?? existing.commitMessage,
              commitNumber: commitNumber ?? existing.commitNumber,
              lastGenerated: formattedTimestamp || existing.lastGenerated || "Just now",
            },
          }
        })
      }

      const loadDiagram = async () => {
        try {
          const diagramResp = await fetchBranchDiagram(branchId)
          maybeApplyCommitInfo({
            commitMessage: diagramResp.commitMessage,
            commitNumber: diagramResp.commitId,
            commitTimestamp: diagramResp.timestamp,
          })
          setBranchDetails((prev) => {
            const existing = prev[branchId]
            if (!existing) return prev
            const updated: BranchLibrary = {
              ...prev,
              [branchId]: {
                ...existing,
                internalDependencyGraph: diagramResp.internalDependencies,
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

      const loadLlmDiagram = async () => {
        try {
          const archResp = await fetchArchitectureDiagram(repoUrl, branchId)
          const latestCommit = archResp.metadata?.latestCommit as
            | { sha?: string; message?: string; date?: string }
            | undefined
          const commitTimestamp = latestCommit?.date
            ? Math.floor(new Date(latestCommit.date).getTime() / 1000)
            : undefined
          maybeApplyCommitInfo({
            commitMessage: latestCommit?.message,
            commitNumber: latestCommit?.sha,
            commitTimestamp,
          })
          setBranchDetails((prev) => {
            const existing = prev[branchId]
            if (!existing) return prev
            return {
              ...prev,
              [branchId]: {
                ...existing,
                llmGraph: archResp.diagram,
                llmLoading: false,
                llmError: undefined,
              },
            }
          })
        } catch (err) {
          console.error("Failed to load LLM diagram", err)
          setBranchDetails((prev) => {
            const existing = prev[branchId]
            if (!existing) return prev
            const message =
              err instanceof Error
                ? err.message
                : "Failed to load LLM diagram for this branch."
            return {
              ...prev,
              [branchId]: { ...existing, llmLoading: false, llmError: message },
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
      void loadLlmDiagram()
      void loadTree()
    },
    [repoName, branchDetails, repoKey, workspace, repoUrl],
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
        void ensureBranchData(panel.branchId)
      }
    })
  }, [panels, ensureBranchData, branchDetails, repoKey, workspace])

  // If no ?repo= and no existing workspace, 404
  if (!repoParam && !workspace) return <NotFound />

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 pb-10 sm:px-0 sm:gap-10 sm:pb-12">
      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg)] shadow-lg">
        <div className="flex flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 sm:w-auto">
              <div className="flex h-20 w-20 sm:h-16 sm:w-16 px-2 items-center justify-center rounded-xl border border-[color:var(--panel-border)] bg-[color:var(--page-bg)] text-sm font-semibold">
                <img
                  src={IconDark}
                  alt="Repository icon dark"
                  className="h-10 w-10 hidden dark:block"
                  aria-hidden
                />
                <img
                  src={IconLight}
                  alt="Repository icon light"
                  className="h-10 w-10 block dark:hidden"
                  aria-hidden
                />
              </div>
              <div className="text-center text-left">
                <p data-testid="repo-name" className="text-lg font-semibold sm:text-xl">
                  {repoName}
                </p>
                <p
                  data-testid="repo-summary"
                  className="text-sm text-[color:var(--muted-text)] sm:text-base"
                >
                  {repoSummary}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-4 pb-10 sm:px-8">
          {panels.map((panel) => {
            const branch = branchDetails[panel.branchId] ?? {
              id: panel.branchId,
              label: panel.branchId,
              lastGenerated: "Loading...",
              internalDependencyGraph: "",
              fileTree: "",
              commitMessage: "",
              commitNumber: "",
              dependencyGraph: "",
              diagramLoading: true,
              treeLoading: true,
              llmGraph: "",
              llmLoading: true,
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
