import { type CSSProperties, useEffect, useId, useState } from "react"
import mermaid from "mermaid"

import { cn } from "@/lib/utils"

type MermaidDiagramProps = {
  definition: string
  className?: string
  style?: CSSProperties
}

let mermaidHasInitialized = false

function ensureMermaidIsReady() {
  if (mermaidHasInitialized) return
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
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

export function MermaidDiagram({ definition, className, style }: MermaidDiagramProps) {
  const [svgMarkup, setSvgMarkup] = useState("")
  const [error, setError] = useState<string | null>(null)
  const renderId = useId()

  useEffect(() => {
    ensureMermaidIsReady()
    let isMounted = true

    async function renderDiagram() {
      try {
        const { svg } = await mermaid.render(`mermaid-diagram-${renderId}`, definition)
        if (isMounted) {
          setSvgMarkup(svg)
          setError(null)
        }
      } catch (err) {
        console.error("Failed to render Mermaid diagram", err)
        if (isMounted) setError("Unable to render diagram.")
      }
    }

    renderDiagram()
    return () => {
      isMounted = false
    }
  }, [definition, renderId])

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
      style={style}
      className={cn(
        "mermaid-diagram rounded-2xl border border-[color:var(--panel-border)] bg-white/90 p-3 shadow-inner [&_svg]:mx-auto [&_svg]:h-full [&_svg]:w-full [&_svg]:max-w-none",
        className,
      )}
      aria-live="polite"
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  )
}
