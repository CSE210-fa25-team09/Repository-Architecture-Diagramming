import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { RepoTreeNode } from "@/api/diagram"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type Theme = "light" | "dark"

export function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function repoTreeToAscii(tree: RepoTreeNode[], rootName?: string): string {
  const lines: string[] = []
  if (rootName) lines.push(rootName)

  const walk = (nodes: RepoTreeNode[], depth: number) => {
    nodes.forEach((node) => {
      const prefix = `${"|   ".repeat(depth)}|-- `
      const label = node.type === "dir" ? `${node.name}/` : node.name
      lines.push(`${prefix}${label}`)
      if (node.children?.length) {
        walk(node.children, depth + 1)
      }
    })
  }

  walk(tree, 0)

  return lines.join("\n")
}

export function formatLastGenerated(timestamp: number | undefined): string {
  if (!timestamp) return "Just now"
  const tsMs = timestamp * 1000
  const now = Date.now()
  const diff = Math.max(0, now - tsMs)
  const oneMinute = 60 * 1000
  const oneHour = 60 * oneMinute
  const oneDay = 24 * oneHour

  if (diff < oneMinute) return "Just now"
  if (diff < oneHour) {
    const minutes = Math.floor(diff / oneMinute)
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
  }
  if (diff < oneDay) {
    const hours = Math.floor(diff / oneHour)
    return `${hours} hour${hours === 1 ? "" : "s"} ago`
  }

  return `Generated at ${new Date(tsMs).toLocaleString()}`
}

// Rudimentary check to see if a Mermaid definition contains at least one edge
export function definitionHasEdges(definition?: string) {
  if (!definition) return false
  const cleaned = definition.replace(/%%.*$/gm, "").trim()
  if (!cleaned) return false
  const edgePattern = /\b\S+\s*(?:-->|-\.->|==>|---|->)\s*\S+/ // common mermaid edge syntaxes
  return edgePattern.test(cleaned)
}
