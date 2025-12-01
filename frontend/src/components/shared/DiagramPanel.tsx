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

import { BRANCH_LIBRARY } from "@/lib/mockData"
import { useState, useRef, useEffect } from "react"

const PANEL_HEIGHT_PX = 360

// Types needed for this component
type BranchId = keyof typeof BRANCH_LIBRARY
type BranchInfo = (typeof BRANCH_LIBRARY)[BranchId]
type BranchLibrary = Record<string, BranchInfo>
type DiagramView = "swe" | "dependency"

export type DiagramPanelProps = {
  branch: BranchInfo
  canRemove: boolean
  onRemove: () => void
  onSwitchBranch: (branchId: BranchId) => void
  usedBranchIds: Set<BranchId>
  branches: string[]
  branchDetails: BranchLibrary
}

export function DiagramPanel({
  branch,
  canRemove,
  onRemove,
  onSwitchBranch,
  usedBranchIds,
  branches,
  branchDetails,
}: DiagramPanelProps) {
  const [isDiagramExporting, setIsDiagramExporting] = useState(false)
  const [showFileTree, setShowFileTree] = useState(true)
  const [diagramView, setDiagramView] = useState<DiagramView>("swe")
  const diagramRef = useRef<HTMLDivElement>(null)
  const [isDesktop, setIsDesktop] = useState(false)

  // SSR-Safe Media Query Check
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return
    }

    const query = "(min-width: 640px)"
    const media = window.matchMedia(query)

    setIsDesktop(media.matches)

    const listener = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches)
    }

    media.addEventListener("change", listener)

    return () => {
      media.removeEventListener("change", listener)
    }
  }, [])
  /** 
  const diagramLabel = diagramView === "swe" ? "SWE Diagram" : "Dependency Graph"
  const diagramDefinition =
    diagramView === "swe" ? branch.diagram : branch.dependencyGraph
  */
  // Hardcoded to Dependency Graph
  const diagramLabel = "Dependency Graph"
  const diagramDefinition = branch.dependencyGraph
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
        <ScrollArea
          style={{ height: isDesktop ? PANEL_HEIGHT_PX : 300 }}
          className="w-full"
        >
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
        <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3 flex-shrink">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 text-base font-semibold text-[color:var(--page-foreground)] whitespace-nowrap"
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

        {/* Right Side Button (Export) */}
        <Button
          variant="ghost"
          size="sm"
          className="text-[color:var(--muted-text)] hover:text-[color:var(--page-foreground)] ml-auto flex-shrink-0"
          onClick={handleExportDiagram}
          disabled={isDiagramExporting}
        >
          <span className="hidden md:inline">Export as Image</span>
          <Download className="h-4 w-4 md:ml-2" />
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
                  style={{ height: PANEL_HEIGHT_PX, width: "100%" }}
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="w-full sm:w-0 sm:min-w-0 sm:flex-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-text)]">
                Branch
              </p>

              {canRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${branch.label} diagram`}
                  onClick={onRemove}
                  className="text-[color:var(--muted-text)] hover:text-[color:var(--page-foreground)] -mr-2 sm:hidden"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <p className="text-lg font-semibold text-[color:var(--page-foreground)] break-all max-w-full min-w-0">
              {branch.label}
            </p>

            <div className="text-xs text-[color:var(--muted-text)] flex flex-wrap">
              <span>Last generated {branch.lastGenerated} | Commit </span>
              <span className="break-all">{branch.commitNumber}</span>
              <span>: {branch.commitMessage}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex flex-row items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
                  <p className="text-[color:var(--muted-text)] text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap">
                    Switch branch
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-[color:var(--panel-border)] bg-[color:var(--panel-bg)] text-xs font-semibold w-40 justify-between"
                  >
                    <span className="truncate min-w-0 flex-1 text-left">
                      {branch.label}
                    </span>
                    <ChevronDown className="ml-2 h-3.5 w-3.5 text-[color:var(--icon-muted)] flex-shrink-0" />
                  </Button>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[14rem]">
                {branches.map((branchId) => {
                  const option = branchDetails[branchId]
                  const optionId = (option?.id ?? branchId) as BranchId
                  const isCurrentBranch = branchId === branch.id
                  const isSwap = usedBranchIds.has(optionId) && !isCurrentBranch
                  return (
                    <DropdownMenuItem
                      key={optionId}
                      onSelect={() => onSwitchBranch(branchId as BranchId)}
                      disabled={isCurrentBranch}
                      className="flex flex-col items-start gap-0.5"
                    >
                      <span className="text-sm font-medium flex items-center gap-2">
                        {option?.label ?? branchId}
                        {/* Optional: Add a visual indicator if it is a swap action */}
                      </span>
                      {isSwap}
                      <span className="text-xs text-[color:var(--muted-text)]">
                        {option?.lastGenerated
                          ? `Last generated ${option.lastGenerated}`
                          : "Not generated yet"}
                      </span>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {canRemove && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${branch.label} diagram`}
                onClick={onRemove}
                className="text-[color:var(--muted-text)] hover:text-[color:var(--page-foreground)] flex-shrink-0 hidden sm:flex"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-6">
        {!showFileTree ? (
          <div>{DiagramComponent}</div>
        ) : !isDesktop ? (
          <div className="flex flex-col gap-6">
            {FileTreeComponent}
            {DiagramComponent}
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="h-[360px] gap-6">
            <ResizablePanel defaultSize={38} minSize={27}>
              {FileTreeComponent}
            </ResizablePanel>

            <ResizableHandle withHandle className="bg-[color:var(--panel-border)]" />

            <ResizablePanel defaultSize={62} minSize={40}>
              {DiagramComponent}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </CardContent>
    </Card>
  )
}
