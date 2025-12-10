import { toPng } from "html-to-image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useState, useRef, useEffect, useCallback } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { MermaidDiagram } from "@/components/shared/MermaidDiagram"
import { definitionHasEdges } from "@/lib/utils"

// Types needed for this component
export type BranchInfo = {
  id: string
  label: string
  lastGenerated: string
  internalDependencyGraph: string
  fileTree: string
  commitMessage: string
  commitNumber: string
  dependencyGraph: string
  llmGraph: string
  diagramLoading?: boolean
  treeLoading?: boolean
  diagramError?: string
  treeError?: string
  llmLoading?: boolean
  llmError?: string
}

type BranchId = string
export type BranchLibrary = Record<string, BranchInfo>
type DiagramView = "internalDependency" | "externalDependency" | "llmGraph"

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
  const [diagramView, setDiagramView] = useState<DiagramView>("llmGraph")
  const diagramRef = useRef<HTMLDivElement>(null)
  const [isDesktop, setIsDesktop] = useState(false)
  const [inlineDiagramHeight, setInlineDiagramHeight] = useState(360)
  const [dialogDiagramHeight, setDialogDiagramHeight] = useState(600)

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

  const diagramLabel =
    diagramView === "internalDependency"
      ? "Internal Dependency Graph"
      : diagramView === "externalDependency"
        ? "External Dependency Graph"
        : "Architecture Diagram"
  const diagramDefinition =
    diagramView === "internalDependency"
      ? branch.internalDependencyGraph
      : diagramView === "externalDependency"
        ? branch.dependencyGraph
        : branch.llmGraph
  const activeDiagramLoading =
    diagramView === "llmGraph" ? branch.llmLoading : branch.diagramLoading
  const activeDiagramError =
    diagramView === "llmGraph" ? branch.llmError : branch.diagramError
  // Hardcoded to Dependency Graph
  const isMetadataLoading = Boolean(branch.diagramLoading && branch.llmLoading)
  const mermaidKey = `${branch.id}-${diagramView}`

  useEffect(() => {
    // Reset dialog height when switching diagram types so it can resize to the new content
    setDialogDiagramHeight(600)
  }, [diagramView])

  const hasDiagram = definitionHasEdges(diagramDefinition)
  const emptyDiagramMessage = "No diagram available—the returned graph has no edges."
  const DEFAULT_INLINE_HEIGHT = 360
  const DEFAULT_DIALOG_HEIGHT = 600

  const handleDiagramError = useCallback(() => {
    setInlineDiagramHeight(DEFAULT_INLINE_HEIGHT)
    setDialogDiagramHeight(DEFAULT_DIALOG_HEIGHT)
  }, [])

  useEffect(() => {
    if (!hasDiagram || activeDiagramError) {
      setInlineDiagramHeight(DEFAULT_INLINE_HEIGHT)
      setDialogDiagramHeight(DEFAULT_DIALOG_HEIGHT)
    }
  }, [hasDiagram, activeDiagramError])

  const handleExportDiagram = async () => {
    if (!diagramRef.current) return
    const svgNode = diagramRef.current.querySelector("svg")
    try {
      setIsDiagramExporting(true)
      const target = (svgNode as HTMLElement | null) ?? diagramRef.current
      const computedStyles = getComputedStyle(target)
      const backgroundColor =
        computedStyles.backgroundColor ||
        computedStyles.getPropertyValue("--panel-bg") ||
        "#ffffff"
      const url = await toPng(target, {
        cacheBust: true,
        backgroundColor,
        pixelRatio: 2.5,
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

      {branch.treeError || branch.treeLoading ? (
        <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--input-bg)] px-4 py-3">
          <div className="relative flex flex-col items-center justify-center">
            <Skeleton
              className="w-full rounded-lg"
              style={{
                height: isDesktop ? Math.max(inlineDiagramHeight + 20, 300) : 300,
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              {branch.treeError ? (
                <div className="flex items-center gap-2 rounded-full bg-[color:var(--panel-bg)]/80 px-3 py-2 text-sm text-destructive shadow-sm text-center">
                  {branch.treeError}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-full bg-[color:var(--panel-bg)]/80 px-3 py-2 text-sm text-[color:var(--muted-text)] shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating file tree...
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--input-bg)] px-4 py-3">
          <ScrollArea
            style={{ height: isDesktop ? Math.max(inlineDiagramHeight + 20, 300) : 300 }}
            className="w-full"
          >
            <pre className="whitespace-pre-wrap text-sm leading-6 text-[color:var(--page-foreground)]">
              {branch.fileTree}
            </pre>
          </ScrollArea>
        </div>
      )}
    </div>
  )

  const DiagramComponent = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center">
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
              <DropdownMenuItem onSelect={() => setDiagramView("llmGraph")}>
                Architecture Diagram
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDiagramView("internalDependency")}>
                Internal Dependency Graph
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDiagramView("externalDependency")}>
                External Dependency Graph
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
          className="text-[color:var(--muted-text)] hover:text-[color:var(--page-foreground)] self-start sm:ml-auto sm:self-center flex-shrink-0"
          onClick={handleExportDiagram}
          disabled={isDiagramExporting || activeDiagramLoading || !hasDiagram}
        >
          <span className="md:inline">Export as Image</span>
          <Download className="h-4 w-4 md:ml-2" />
        </Button>
      </div>

      <div className="overflow-hidden">
        <div className="relative">
          {(activeDiagramLoading || activeDiagramError) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--page-bg)]/80 backdrop-blur-sm px-4">
              <div className="relative w-full">
                <Skeleton
                  className="w-full rounded-xl"
                  style={{ height: inlineDiagramHeight + 20 }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  {activeDiagramError ? (
                    <div className="flex items-center gap-2 rounded-full bg-[color:var(--panel-bg)]/80 px-3 py-2 text-sm text-destructive shadow-sm text-center">
                      {activeDiagramError}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-full bg-[color:var(--panel-bg)]/80 px-3 py-2 text-sm text-[color:var(--muted-text)] shadow-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating diagram...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="w-full rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--page-bg)] p-4 text-left outline-none transition hover:border-[color:var(--primary-action)] focus-visible:ring-2 focus-visible:ring-[color:var(--primary-action)]"
                aria-label={`Open enlarged ${diagramLabel.toLowerCase()} for ${branch.label}`}
                disabled={activeDiagramLoading || !hasDiagram}
              >
                <div
                  ref={diagramRef}
                  className="w-full flex items-center justify-center"
                  style={{ minHeight: inlineDiagramHeight + 20 }}
                >
                  {activeDiagramLoading ? (
                    <Skeleton
                      className="w-full rounded-xl"
                      style={{ height: inlineDiagramHeight + 20 }}
                    />
                  ) : hasDiagram ? (
                    <MermaidDiagram
                      key={mermaidKey}
                      definition={diagramDefinition}
                      onRender={(size) =>
                        setInlineDiagramHeight(Math.max(360, Math.ceil(size.height)))
                      }
                      onError={handleDiagramError}
                      style={{ height: inlineDiagramHeight + 20, width: "100%" }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900 text-center">
                      <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden />
                      <span>{emptyDiagramMessage}</span>
                    </div>
                  )}
                </div>
              </button>
            </DialogTrigger>
            <DialogContent className="h-[90vh] w-[95vw] max-w-[1100px] sm:max-w-[1200px] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg)] text-[color:var(--page-foreground)]">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {branch.label} branch {diagramLabel.toLowerCase()}
                </DialogTitle>
                <DialogDescription className="text-[color:var(--muted-text)]">
                  Enlarged view of the {diagramLabel.toLowerCase()} for {branch.label}{" "}
                  branch.
                </DialogDescription>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[color:var(--muted-text)] hover:text-[color:var(--page-foreground)]"
                  onClick={handleExportDiagram}
                  disabled={activeDiagramLoading || !hasDiagram}
                >
                  Export as Image
                  <Download className="ml-2 h-4 w-4" />
                </Button>
              </DialogHeader>
              <div className="h-full w-full overflow-auto rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--page-bg)] p-4">
                {activeDiagramLoading ? (
                  <Skeleton
                    className="w-full rounded-xl"
                    style={{ height: Math.max(dialogDiagramHeight + 20, 600) }}
                  />
                ) : hasDiagram ? (
                  <MermaidDiagram
                    key={`${mermaidKey}-dialog`}
                    definition={diagramDefinition}
                    onRender={(size) => {
                      const measured = Math.ceil(size.height)
                      setDialogDiagramHeight(Math.max(600, measured))
                    }}
                    onError={handleDiagramError}
                    style={{ height: dialogDiagramHeight + 20, width: "100%" }}
                  />
                ) : (
                  <div
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-10 text-sm text-amber-900 shadow-sm text-center"
                    style={{ minHeight: Math.max(dialogDiagramHeight + 20, 600) }}
                  >
                    <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden />
                    <span className="font-medium">{emptyDiagramMessage}</span>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
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
                  className="text-[color:var(--muted-text)] hover:text-[color:var(--page-foreground)] sm:hidden"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <p className="text-lg font-semibold text-[color:var(--page-foreground)] break-all max-w-full min-w-0">
              {branch.label}
            </p>

            {isMetadataLoading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            ) : (
              <div className="text-xs text-[color:var(--muted-text)] flex flex-col gap-1 sm:flex-row sm:flex-wrap">
                <span>
                  Last generated {branch.lastGenerated} {isDesktop ? "|" : ""}
                </span>
                <span className="flex flex-wrap gap-1">
                  <span>Commit</span>
                  <span className="break-all">{branch.commitNumber}:</span>
                </span>
                <span className="break-words">{branch.commitMessage}</span>
              </div>
            )}
          </div>

          <div className="flex w-full flex-col items-stretch gap-2 self-start sm:w-auto sm:flex-row sm:items-center sm:self-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div
                  className={`flex w-full gap-2 sm:w-auto sm:gap-1 ${
                    isDesktop ? "flex-row items-center" : "flex-col items-start"
                  }`}
                >
                  <p className="text-[color:var(--muted-text)] text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap px-2">
                    Switch branch
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-[color:var(--panel-border)] bg-[color:var(--panel-bg)] text-xs font-semibold w-full sm:w-40 justify-between min-w-0"
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
