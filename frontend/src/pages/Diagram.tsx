import { toPng } from "html-to-image"
import { ChevronDown, ChevronLeft, ChevronRight, Download, Plus, X } from "lucide-react"
import { useMemo, useRef, useState } from "react"

import { MermaidDiagram } from "@/components/shared/MermaidDiagram"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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

const REPOSITORY_NAME = "inventory-diagramming"
const WORKSPACE_SUMMARY = "Track branch-specific repository flows."

const BRANCH_LIBRARY = {
  main: {
    id: "main",
    label: "main",
    lastGenerated: "45 seconds ago",
    commitNumber: "8b3c9f1",
    commitMessage: "Refine inventory flow and logging",
    dependencyGraph: `
      graph TD
        API[REST API] --> Service[Inventory Service]
        Service --> Cache[Redis Cache]
        Service --> DB[(Postgres)]
        Service --> Queue[[SQS]]
        Queue --> Worker[Reservation Worker]
        Worker --> DB
        Worker --> Notifier[Slack Notifier]
      `,
    diagram: `
      flowchart TD
        Start((Start)) --> Fetch[Fetch inventory snapshot]
        Fetch --> Decision{Stock available?}
        Decision -- Yes --> Reserve[Reserve items]
        Reserve --> Publish[Emit INVENTORY_RESERVED]
        Publish --> Done((Done))
        Decision -- No --> Notify[Notify Slack #ops-inventory]
        Notify --> Escalate[Escalate to SRE rota]
        Escalate --> Done
    `,
    fileTree: `inventory-service
|-- i18n/
|   |-- messages.properties
|   |-- messages_fr.properties
|   |-- messages_pt-BR.properties
|-- services/
|   |-- catalog/
|   |   |-- hydrate.ts
|   |   |-- search.ts
|   |-- fulfillment/
|   |   |-- reserveStock.ts
|   |   |-- publishEvents.ts
|-- utils/
|   |-- passwordCodec.ts
|   |-- retry.ts
|-- main.ts`,
  },
  "hotfix/dynamodb-timeouts": {
    id: "hotfix/dynamodb-timeouts",
    label: "hotfix/dynamodb-timeouts",
    lastGenerated: "12 minutes ago",
    commitNumber: "c12a7df",
    commitMessage: "Harden DynamoDB timeout guardrails",
    dependencyGraph: `
      graph TD
        Client[Checkout Service] --> Gateway[API Gateway]
        Gateway --> Lambda[Timeout Guard Lambda]
        Lambda --> Dynamo[(DynamoDB Orders)]
        Lambda --> Metrics[CloudWatch Metrics]
        Metrics --> Alarms[PagerDuty Alarms]
      `,
    diagram: `
      graph LR
    node5["App.tsx"] --> node6["Header.tsx"]
    node5["App.tsx"] --> node7["separator.tsx"]
    node5["App.tsx"] --> node8["utils.ts"]
    node5["App.tsx"] --> node9["Home.tsx"]
    node5["App.tsx"] --> node10["NotFound.tsx"]
    node18["App.test.tsx"] --> node5["App.tsx"]

    %% Styling
    classDef codeStyle fill:#4A90E2,stroke:#2E5C8A,stroke-width:2px,color:#fff
    class node0,node1,node2,node3,node4,node5,node6,node11,node12,node13,node14,node15,node16,node7,node8,node17,node18,node19,node20 codeStyle
    classDef internalStyle fill:#50C878,stroke:#2E7D4E,stroke-width:2px,color:#fff
    class node6,node7,node8,node9,node10,node5 internalStyle
    `,
    fileTree: `inventory-service
|-- services/
|   |-- throttler.ts
|   |-- timeoutGuard.ts
|-- infra/
|   |-- circuitBreaker.ts
|-- alerts/
|   |-- pagerduty.ts
|-- utils/
|   |-- memoize.ts
|   |-- observability.ts`,
  },
} as const

const BRANCH_OPTIONS = Object.values(BRANCH_LIBRARY)

type BranchId = keyof typeof BRANCH_LIBRARY

type DiagramPanelState = {
  id: string
  branchId: BranchId
}

const DEFAULT_DIAGRAMS: DiagramPanelState[] = [{ id: "diagram-1", branchId: "main" }]

const PANEL_HEIGHT_PX = 360
const ADD_PANEL_TRIGGER_ID = "diagram-add-trigger"

export function Diagram() {
  const [panels, setPanels] = useState<DiagramPanelState[]>(DEFAULT_DIAGRAMS)
  const workspaceRef = useRef<HTMLDivElement>(null)

  const unusedBranches = useMemo(() => {
    const used = new Set(panels.map((panel) => panel.branchId))
    return BRANCH_OPTIONS.filter((branch) => !used.has(branch.id))
  }, [panels])

  const handleAddPanel = (branchId: BranchId) => {
    if (typeof document !== "undefined") {
      document.getElementById(ADD_PANEL_TRIGGER_ID)?.blur()
    }
    setPanels((prev) => [
      ...prev,
      { id: `diagram-${Math.random().toString(36).slice(2, 8)}`, branchId },
    ])
  }

  const handleRemovePanel = (diagramId: string) => {
    setPanels((prev) => prev.filter((panel) => panel.id !== diagramId))
  }

  const handleSwitchBranch = (diagramId: string, branchId: BranchId) => {
    setPanels((prev) =>
      prev.map((panel) => (panel.id === diagramId ? { ...panel, branchId } : panel)),
    )
  }

  return (
    <main className="flex flex-1 flex-col gap-10 pb-12">
      <section
        ref={workspaceRef}
        className="rounded-3xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg)] shadow-lg"
      >
        <div className="flex flex-col gap-6 px-8 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--page-bg)] text-sm font-semibold">
                SWE
              </div>
              <div>
                <p className="text-lg font-semibold">{REPOSITORY_NAME}</p>
                <p className="text-sm text-[color:var(--muted-text)]">
                  {WORKSPACE_SUMMARY}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-8 pb-10">
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

        <div className="flex flex-col items-center gap-3 border-t border-[color:var(--panel-border)] px-8 py-8">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={!unusedBranches.length}
                className="flex items-center gap-2 rounded-full border-[3px] border-dashed border-[color:var(--panel-border)] px-6 py-6 text-base"
                id={ADD_PANEL_TRIGGER_ID}
              >
                <Plus className="h-5 w-5" />
                {unusedBranches.length
                  ? "Add a new diagram for a branch"
                  : "All tracked branches already visible."}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="min-w-[16rem]">
              {unusedBranches.map((branch) => (
                <DropdownMenuItem
                  key={branch.id}
                  onSelect={() => handleAddPanel(branch.id)}
                  className="flex flex-col items-start gap-0.5"
                >
                  <span className="font-medium text-[color:var(--page-foreground)]">
                    {branch.label}
                  </span>
                  <span className="text-xs text-[color:var(--muted-text)]">
                    Last generated {branch.lastGenerated}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <p className="text-sm text-[color:var(--muted-text)]">
            Pick a branch to generate a new diagram workspace card.
          </p>
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

  const diagramSection = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <Button
          variant="ghost"
          size="sm"
          className="text-[color:var(--muted-text)] hover:text-[color:var(--page-foreground)]"
          onClick={handleExportDiagram}
          disabled={isDiagramExporting}
        >
          Export as Image
          <Download className="ml-2 h-4 w-4" />
        </Button>
      </div>

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
                style={{ height: PANEL_HEIGHT_PX }}
              />
            </div>
          </button>
        </DialogTrigger>
        <DialogContent className="h-[90vh] max-w-[90vw] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg)] text-[color:var(--page-foreground)]">
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
          <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--page-bg)] p-4">
            <MermaidDiagram
              definition={diagramDefinition}
              style={{ height: PANEL_HEIGHT_PX + 180 }}
            />
          </div>
        </DialogContent>
      </Dialog>
      <p className="text-xs text-[color:var(--muted-text)]">
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
        {showFileTree ? (
          <ResizablePanelGroup direction="horizontal" className="gap-6">
            <ResizablePanel defaultSize={38} minSize={25}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
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
                  <ScrollArea style={{ height: PANEL_HEIGHT_PX }}>
                    <pre className="whitespace-pre-wrap text-sm leading-6 text-[color:var(--page-foreground)]">
                      {branch.fileTree}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className="bg-[color:var(--panel-border)]" />
            <ResizablePanel defaultSize={62} minSize={35}>
              {diagramSection}
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          diagramSection
        )}
      </CardContent>
    </Card>
  )
}
