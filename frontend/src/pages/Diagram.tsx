/* eslint-disable @typescript-eslint/no-unused-vars */
// ignore unused vars for now as we build out the page

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  BRANCH_LIBRARY,
  BRANCH_LIST,
  REPOSITORY_NAME,
  WORKSPACE_SUMMARY,
} from "@/lib/mockData"
import { GithubIcon, Plus } from "lucide-react"
import { useMemo, useState } from "react"

export type BranchDiagram = {
  id: string
  label: string
  lastGenerated: string
  diagram: string
  fileTree: string
}

export type BranchLibrary = Record<string, BranchDiagram>

export function Diagram() {
  // Prepare repo details for initial view
  const [repoName, setRepoName] = useState(REPOSITORY_NAME)
  const [repoSummary, setRepoSummary] = useState(WORKSPACE_SUMMARY)
  const [branches, setBranches] = useState<string[]>(BRANCH_LIST) // list of branch IDs
  const [branchDetails, setBranchDetails] = useState<BranchLibrary>({
    main: BRANCH_LIBRARY["main"],
  }) // branch ID to details map, initially only main branch

  // use branch name as panel identifier
  const [panels, setPanels] = useState<string[]>(["main"])

  const handleAddPanel = (branchId: string) => {
    setPanels((prev) => {
      if (prev.includes(branchId)) return prev
      return [...prev, branchId]
    })
    setBranchDetails((prev) => {
      if (prev[branchId]) return prev
      const branchData = BRANCH_LIBRARY[branchId]
      if (!branchData) return prev
      return { ...prev, [branchId]: branchData }
    })
  }

  const unusedBranches = useMemo(() => {
    const used = new Set(panels)
    return branches.filter((branchId) => !used.has(branchId))
  }, [branches, panels])

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
          {/* // implement panels here */}
        </div>

        <div className="flex flex-col items-center gap-3 border-t border-[color:var(--panel-border)] px-6 py-6 sm:px-8 sm:py-8">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={!unusedBranches.length}
                className="flex items-center gap-2 rounded-full border-[3px] border-dashed border-[color:var(--panel-border)] px-6 py-6 text-base"
              >
                <Plus className="h-5 w-5" />
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
                    onSelect={() => handleAddPanel(branchId)}
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
