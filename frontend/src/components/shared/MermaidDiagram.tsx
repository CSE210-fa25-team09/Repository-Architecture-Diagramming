import { type CSSProperties, useEffect, useId, useRef, useState } from "react"
import mermaid from "mermaid"

import { cn } from "@/lib/utils"

type MermaidDiagramProps = {
  definition: string
  className?: string
  style?: CSSProperties
  onRender?: (size: { width: number; height: number }) => void
  minWidth?: number
  onError?: (message: string) => void
}

let mermaidHasInitialized = false

function ensureMermaidIsReady() {
  if (mermaidHasInitialized) return
  mermaid.initialize({
    startOnLoad: false,
    maxEdges: 1000,
    maxTextSize: 200000,
    securityLevel: "strict",
    theme: "base",
    fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif",
    themeVariables: {
      background: "#fefefe",
      primaryColor: "#eef2ff",
      primaryTextColor: "#111827",
      primaryBorderColor: "#1d4ed8",
      secondaryColor: "#dbeafe",
      tertiaryColor: "#fef3c7",
      clusterBkg: "#ffffff",
      clusterBorder: "#94a3b8",
      lineColor: "#0f172a",
      signalColor: "#f97316",
      noteBkgColor: "#fff7ed",
      noteTextColor: "#1f2937",
      edgeLabelBackground: "#ffffff",
    },
    themeCSS: `
      .node rect,
      .node path,
      .node polygon {
        filter: drop-shadow(0px 2px 6px rgba(15, 23, 42, 0.12));
        stroke-width: 2px;
      }
      .node text {
        font-weight: 600;
        font-size: 14px;
      }
      .edgeLabel rect {
        fill: #ffffff;
        stroke: #d0d7de;
        rx: 8px;
        ry: 8px;
      }
      .label text {
        fill: #0f172a;
      }
      .flowchart-link {
        stroke-width: 2.5px;
        stroke: #0f172a;
      }
      .flowchart-link.arrowheadPath {
        fill: #0f172a;
      }
      .cluster rect {
        fill: #f8fafc;
        stroke-width: 1.5px;
      }
    `,
  })
  mermaidHasInitialized = true
}

export function MermaidDiagram({
  definition,
  className,
  style,
  onRender,
  minWidth,
  onError,
}: MermaidDiagramProps) {
  const [error, setError] = useState<string | null>(null)
  // Use a ref to access the DOM element directly
  const containerRef = useRef<HTMLDivElement>(null)
  const renderId = useId()

  useEffect(() => {
    ensureMermaidIsReady()
    let isMounted = true

    async function renderDiagram() {
      try {
        // Clean the ID to ensure it is a valid selector for Mermaid
        const validId = `mermaid-diagram-${renderId.replace(/:/g, "")}`

        // Render returns the SVG string
        const { svg } = await mermaid.render(validId, definition)

        if (!isMounted || !containerRef.current) return

        // Parse the SVG string to avoid writing raw HTML and reduce XSS risk
        const parser = new DOMParser()
        const parsed = parser.parseFromString(svg, "image/svg+xml")
        const svgElement = parsed.documentElement.cloneNode(true) as Element
        svgElement.setAttribute("width", "100%")
        svgElement.setAttribute("height", "auto")
        svgElement.setAttribute("preserveAspectRatio", "xMinYMin meet")
        if (minWidth) {
          svgElement.setAttribute("min-width", `${minWidth}px`)
          svgElement.setAttribute("style", `min-width:${minWidth}px;`)
        }

        const container = containerRef.current
        container.replaceChildren(svgElement)
        setError(null)

        if (typeof onRender === "function") {
          requestAnimationFrame(() => {
            const rect = svgElement.getBoundingClientRect()
            if (rect.width && rect.height) {
              onRender({ width: rect.width, height: rect.height })
            }
          })
        }
      } catch (err) {
        console.error("Failed to render Mermaid diagram", err)
        const message = "Unable to render diagram."
        if (isMounted) {
          setError(message)
          onError?.(message)
        }
      }
    }

    renderDiagram()
    return () => {
      isMounted = false
    }
  }, [definition, renderId, minWidth, onRender, onError])

  if (error) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive",
          className,
        )}
      >
        {error}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={style}
      className={cn(
        "mermaid-diagram rounded-2xl border border-[color:var(--panel-border)] bg-white/90 p-3 shadow-inner [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:w-full [&_svg]:max-w-none",
        className,
      )}
      aria-live="polite"
    />
  )
}
