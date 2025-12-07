// src/pages/SampleSection.tsx
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import type { Repo } from "@/lib/repoData"
import { fetchInitialWorkspace } from "@/api/diagram"
import { useWorkspace } from "@/lib/workspaceContext"

type SampleSectionProps = {
  repos?: Repo[]
  onRepoClick?: (repo: Repo) => void
}

const ROW_VISIBLE = 4

export function SampleSection({ repos = [], onRepoClick }: SampleSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const [loadingRepoId, setLoadingRepoId] = useState<string | null>(null)
  const navigate = useNavigate()
  const { setWorkspaceForRepo, setCurrentRepoKey, workspaceMap } = useWorkspace()

  const repoKeyFromUrl = (url: string) => {
    try {
      const parsed = new URL(url)
      if (parsed.hostname !== "github.com") return null
      const [owner, repo] = parsed.pathname.replace(/^\/+/, "").split("/")
      if (owner && repo) return `${owner}/${repo}`.replace(/\/+$/, "")
      return null
    } catch {
      return null
    }
  }

  if (repos.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Sample</h2>
        <p className="text-sm text-muted-foreground">No sample repositories available.</p>
      </section>
    )
  }

  const primaryRepos = repos.slice(0, ROW_VISIBLE)
  const extraRepos = repos.slice(ROW_VISIBLE)
  const hasMore = extraRepos.length > 0

  const handleCardClick = async (repo: Repo) => {
    onRepoClick?.(repo)

    // Fallback if someone adds a new sample without updating the map
    const identifier = repo.url
    const repoKey = repoKeyFromUrl(identifier) ?? repo.id

    const cached = repoKey ? workspaceMap[repoKey] : undefined
    if (cached) {
      setWorkspaceForRepo(repoKey, cached)
      setCurrentRepoKey(repoKey)
      navigate(`/diagram?repo=${encodeURIComponent(identifier)}`)
      return
    }

    setLoadingRepoId(repo.id)
    try {
      const ws = await fetchInitialWorkspace(identifier)
      setWorkspaceForRepo(ws.repo.name, ws)
      setCurrentRepoKey(ws.repo.name)
    } catch (err) {
      // Prefetch failures are logged but navigation still proceeds
      console.error("Failed to prefetch workspace for sample repo", err)
    } finally {
      setLoadingRepoId(null)
    }

    navigate(`/diagram?repo=${encodeURIComponent(identifier)}`)
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Sample</h2>

        {hasMore && (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? (
              <>
                <span>Show less</span>
                <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                <span>Show more</span>
                <ChevronDown className="h-3 w-3" />
              </>
            )}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {primaryRepos.map((repo) => (
          <Card
            key={repo.id}
            className={`h-32 w-full hover:shadow-md transition-shadow cursor-pointer ${
              loadingRepoId === repo.id ? "opacity-60 pointer-events-none" : ""
            }`}
            onClick={() => handleCardClick(repo)}
          >
            <CardHeader className="space-y-1">
              <CardTitle className="text-sm font-semibold truncate">
                {repo.name}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground line-clamp-2">
                {repo.description}
              </CardDescription>
              {loadingRepoId === repo.id && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading…
                </div>
              )}
            </CardHeader>
          </Card>
        ))}
      </div>

      {expanded && hasMore && (
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {extraRepos.map((repo) => (
            <Card
              key={repo.id}
              className={`h-32 w-full hover:shadow-md transition-shadow cursor-pointer ${
                loadingRepoId === repo.id ? "opacity-60 pointer-events-none" : ""
              }`}
              onClick={() => handleCardClick(repo)}
            >
              <CardHeader className="space-y-1">
                <CardTitle className="text-sm font-semibold truncate">
                  {repo.name}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground line-clamp-2">
                  {repo.description}
                </CardDescription>
                {loadingRepoId === repo.id && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading…
                  </div>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
