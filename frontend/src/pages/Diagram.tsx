/* eslint-disable @typescript-eslint/no-unused-vars */
// ignore unused vars for now as we build out the page
import { toPng } from "html-to-image"
import { Button } from "@/components/ui/button"
import { MermaidDiagram } from "@/components/shared/MermaidDiagram"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChevronDown, ChevronLeft, ChevronRight, Download, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

import { ScrollArea } from "@/components/ui/scroll-area"

import {
  BRANCH_LIBRARY,
  BRANCH_LIST,
  REPOSITORY_NAME,
  WORKSPACE_SUMMARY,
} from "@/lib/mockData"
import { GithubIcon, Plus } from "lucide-react"
import { useMemo, useState, useRef, useEffect } from "react"

export type BranchDiagram = {
  id: string
  label: string
  lastGenerated: string
  diagram: string
  fileTree: string
  commitMessage: string
  commitNumber: string
}

const BRANCH_OPTIONS = Object.values(BRANCH_LIBRARY)

type BranchId = keyof typeof BRANCH_LIBRARY

type DiagramPanelState = {
  id: string
  branchId: BranchId
}

const DEFAULT_DIAGRAMS: DiagramPanelState[] = [{ id: "diagram-1", branchId: "main" }]

const PANEL_HEIGHT_PX = 360
const ADD_PANEL_TRIGGER_ID = "diagram-add-trigger"

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
  const [panels, setPanels] = useState<DiagramPanelState[]>(DEFAULT_DIAGRAMS)

  const handleAddPanel = (branchId: string) => {
    if (!branchId) return
    const newId = `diagram-${Date.now()}`
    setPanels((prev) => 
      prev.some((p) => p.branchId === branchId)
      ? prev
      : [...prev, { id: newId, branchId }]
    )
    setBranchDetails((prev) => {
      if (Object.prototype.hasOwnProperty.call(prev, branchId)) return prev
      if (!Object.prototype.hasOwnProperty.call(BRANCH_LIBRARY, branchId)) return prev
      const branchData = BRANCH_LIBRARY[branchId]
      if (!branchData) return prev
      return { ...prev, [branchId]: branchData }
    })
  }

  const handleRemovePanel = (diagramId: string) => {
     setPanels((prev) => prev.filter((panel) => panel.id !== diagramId))
  }

  const handleSwitchBranch = (diagramId: string, branchId: BranchId) => {
    setPanels((prev) =>
      prev.map((panel) => (panel.id === diagramId ? { ...panel, branchId } : panel)),
    )
  }

  const unusedBranches = useMemo(() => {
  // CORRECT: Create a Set of BRANCH IDs currently in use
  const usedBranchIds = new Set(panels.map((p) => p.branchId)) 
  
  // Filter the master list of branch IDs against the used branch IDs
  return branches.filter((branchId) => !usedBranchIds.has(branchId))
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
          {panels.map((panel) => {
            const branch = BRANCH_LIBRARY[panel.branchId]
            return (
              <DiagramPanel
                key={panel.id}
                branch={branch}
                canRemove={panels.length > 1}
                onRemove={() => handleRemovePanel(panel.id)}
                onSwitchBranch={(branchId) => handleSwitchBranch(panel.id, branchId)}
              />
            )
          })}
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
                const branch: BranchDiagram | undefined =
                  Object.prototype.hasOwnProperty.call(branchDetails, branchId)
                    ? branchDetails[branchId]
                    : undefined
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
                      {branch
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
type BranchInfo = (typeof BRANCH_LIBRARY)[BranchId]

type DiagramPanelProps = {
  branch: BranchInfo
  canRemove: boolean
  onRemove: () => void
  onSwitchBranch: (branchId: BranchId) => void
}

type DiagramView = "swe" | "dependency"

function DiagramPanel({
  branch,
  canRemove,
  onRemove,
  onSwitchBranch,
}: DiagramPanelProps) {
  const [isDiagramExporting, setIsDiagramExporting] = useState(false)
  const [showFileTree, setShowFileTree] = useState(true)
  const [diagramView, setDiagramView] = useState<DiagramView>("swe")
  const diagramRef = useRef<HTMLDivElement>(null)
  const [isDesktop, setIsDesktop] = useState(false) 

  useEffect(() => {

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return;
    }
    
    // Logic that requires browser APIs runs here
    const query = "(min-width: 640px)"
    const media = window.matchMedia(query)
    
    // Set initial state
    setIsDesktop(media.matches)

    const listener = (event: MediaQueryListEvent) => {
        setIsDesktop(event.matches)
    }

    // Subscribe to changes
    media.addEventListener('change', listener)

    // Cleanup function
    return () => {
        media.removeEventListener('change', listener)
    }
  }, [])

  const diagramLabel = diagramView === "swe" ? "SWE Diagram" : "Dependency Graph"
  const diagramDefinition =
    diagramView === "swe" ? branch.diagram : branch.dependencyGraph

  const handleExportDiagram = async () => {
    if (!diagramRef.current) return
    try {
      setIsDiagramExporting(true)
      const computedStyles = getComputedStyle(diagramRef.current)
      const backgroundColor =
        computedStyles.backgroundColor ||
        computedStyles.getPropertyValue("--panel-bg") ||
        "#ffffff"
      const url = await toPng(diagramRef.current, {
        cacheBust: true,
        backgroundColor,
      })
      const link = document.createElement("a")
      link.href = url
      link.download = `${branch.label}-${diagramView}-diagram.png`
      link.click()
    } catch (error) {
      console.error("Failed to export diagram", error)
    } finally {
      setIsDiagramExporting(false)
    }
  }

  const FileTreeComponent = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-base font-semibold">File Structure</p>
        <Button
          variant="ghost"
          size="sm"
          className="text-[color:var(--muted-text)] hover:text-[color:var(--page-foreground)]"
          onClick={() => setShowFileTree(false)}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Collapse
        </Button>
      </div>
      
      <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--input-bg)] px-4 py-3">
        <ScrollArea style={{ height: isDesktop ? PANEL_HEIGHT_PX : 300 }} className="w-full"> 
          <pre className="whitespace-pre-wrap text-sm leading-6 text-[color:var(--page-foreground)]">
            {branch.fileTree}
          </pre>
        </ScrollArea>
      </div>
    </div>
  )

  const DiagramComponent = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center px-1"> 
        {/* Left Side */}
        <div className="flex items-center gap-3"> 
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 text-base font-semibold text-[color:var(--page-foreground)]"
              >
                {diagramLabel}
                <ChevronDown className="h-4 w-4 text-[color:var(--icon-muted)]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[12rem]">
              <DropdownMenuItem onSelect={() => setDiagramView("swe")}>
                SWE Diagram
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDiagramView("dependency")}>
                Dependency Graph
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {!showFileTree && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[color:var(--muted-text)] hover:text-[color:var(--page-foreground)]"
              onClick={() => setShowFileTree(true)}
            >
              <ChevronRight className="mr-1 h-4 w-4" />
              Show file tree
            </Button>
          )}
        </div>
        
        {/* Right Side Button */}
        <Button
          variant="ghost"
          size="sm"
          className="text-[color:var(--muted-text)] hover:text-[color:var(--page-foreground)] ml-auto flex-shrink-0"
          onClick={handleExportDiagram}
          disabled={isDiagramExporting}
        >
          Export as Image
          <Download className="ml-2 h-4 w-4" />
        </Button>
      </div>
      
      <div className="overflow-hidden">
        <Dialog>
            <DialogTrigger asChild>
            <button
                type="button"
                className="w-full rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--page-bg)] p-4 text-left outline-none transition hover:border-[color:var(--primary-action)] focus-visible:ring-2 focus-visible:ring-[color:var(--primary-action)]"
                aria-label={`Open enlarged ${diagramLabel.toLowerCase()} for ${branch.label}`}
            >
                <div ref={diagramRef} className="w-full">
                <MermaidDiagram
                    definition={diagramDefinition}
                    style={{ height: PANEL_HEIGHT_PX, width: '100%' }}
                />
                </div>
            </button>
            </DialogTrigger>
            <DialogContent className="h-[90vh] w-[95vw] max-w-6xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg)] text-[color:var(--page-foreground)]">
            <DialogHeader>
                <DialogTitle className="text-xl">
                {branch.label} branch {diagramLabel.toLowerCase()}
                </DialogTitle>
                <Button
                variant="ghost"
                size="sm"
                className="text-[color:var(--muted-text)] hover:text-[color:var(--page-foreground)]"
                onClick={handleExportDiagram}
                >
                Export as Image
                <Download className="ml-2 h-4 w-4" />
                </Button>
            </DialogHeader>
            <div className="h-full w-full overflow-auto rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--page-bg)] p-4">
                <MermaidDiagram
                definition={diagramDefinition}
                style={{ height: PANEL_HEIGHT_PX + 180 }}
                />
            </div>
            </DialogContent>
        </Dialog>
      </div>
      <p className="px-1 text-xs text-[color:var(--muted-text)]">
        Click the diagram to open a larger preview.
      </p>
    </div>
  )

  return (
    <Card className="border-[color:var(--panel-border)] bg-[color:var(--panel-bg)] transition-shadow duration-200">
      <CardHeader className="border-b border-[color:var(--panel-border)] pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-text)]">
              Branch
            </p>
            <p className="text-lg font-semibold text-[color:var(--page-foreground)]">
              {branch.label}
            </p>
            <p className="text-xs text-[color:var(--muted-text)]">
              Last generated {branch.lastGenerated} | Commit {branch.commitNumber}:{" "}
              {branch.commitMessage}
            </p>
          </div>        
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex flex-col items-end gap-1">
                  <p className="text-[color:var(--muted-text)] text-[11px] font-semibold uppercase tracking-wide">
                    Switch branch
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-[color:var(--panel-border)] bg-[color:var(--panel-bg)] text-xs font-semibold"
                  >
                    {branch.label}
                    <ChevronDown className="ml-2 h-3.5 w-3.5 text-[color:var(--icon-muted)]" />
                  </Button>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[14rem]">
                {BRANCH_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.id}
                    onSelect={() => onSwitchBranch(option.id)}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <span className="text-sm font-medium">{option.label}</span>
                    <span className="text-xs text-[color:var(--muted-text)]">
                      Last generated {option.lastGenerated}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {canRemove && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${branch.label} diagram`}
                onClick={onRemove}
                className="text-[color:var(--muted-text)] hover:text-[color:var(--page-foreground)]"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="py-6">
        {/* --- CONDITIONAL RENDERING --- */}
        {!showFileTree ? (
          // Case 1: File Tree Collapsed (Same for both Mobile/Desktop)
          <div style={{ height: PANEL_HEIGHT_PX }}>
             {DiagramComponent}
           </div>
        ) : !isDesktop ? (
          // Case 2: MOBILE (Vertical Stack, No Resizing)
          <div className="flex flex-col gap-6">
            {FileTreeComponent}
            {DiagramComponent}
          </div>
        ) : (
          // Case 3: DESKTOP (Horizontal Resizable Split)
          <ResizablePanelGroup
            direction="horizontal"
            className="h-[360px] gap-6" 
          >
            <ResizablePanel defaultSize={38} minSize={25}>
              {FileTreeComponent}
            </ResizablePanel>
            
            <ResizableHandle withHandle className="bg-[color:var(--panel-border)]" />
            
            <ResizablePanel defaultSize={62} minSize={35}>
              {DiagramComponent}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </CardContent>
    </Card>
  )
}