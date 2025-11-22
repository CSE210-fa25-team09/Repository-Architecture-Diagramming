import { useEffect, useMemo, useState } from "react"
import { SampleSection } from "@/components/shared/SampleSection"
import { HistorySection } from "@/components/shared/HistorySection"
import { SAMPLE_REPOS, type Repo } from "@/lib/repoData"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const HISTORY_STORAGE_KEY = "repo-history"

export function Home() {
  const [history, setHistory] = useState<Repo[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(HISTORY_STORAGE_KEY)
      if (!stored) return []
      const parsed = JSON.parse(stored) as Repo[]
      if (!Array.isArray(parsed)) return []
      return parsed
    } catch {
      return []
    }
  })

  const [searchInput, setSearchInput] = useState("")

  const handleRepoClick = (repo: Repo) => {
    setHistory((prev) => {
      const without = prev.filter((r) => r.id !== repo.id)
      const updated = [repo, ...without]
      return updated.slice(0, SAMPLE_REPOS.length)
    })
  }

  useEffect(() => {
    try {
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
    } catch (err) {
      console.error("Failed to write history to localStorage:", err)
    }
  }, [history])

  const isSearching = searchInput.trim().length > 0
  const filteredRepos: Repo[] = useMemo(() => {
    const q = searchInput.trim().toLowerCase()
    if (!q) return []
    return SAMPLE_REPOS.filter(
      (repo) =>
        repo.name.toLowerCase().includes(q) || repo.description.toLowerCase().includes(q),
    )
  }, [searchInput])

  return (
    <main className="flex flex-1 flex-col gap-10 pb-12 px-8 pt-6">
      <section className="w-full flex flex-col gap-4">
        <div className="w-full max-w-5xl space-y-2">
          <h2 id="search-heading" className="text-sm font-semibold mb-3">
            Search repos
          </h2>
          <Input
            id="repo-search"
            aria-labelledby="search-heading"
            placeholder="Search repos"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-12 rounded-full border border-[color:var(--input-border)] bg-[var(--panel-bg)] pl-12 text-base text-[var(--page-foreground)] shadow-sm placeholder:text-[var(--input-placeholder)] focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
          />
        </div>

        {isSearching && (
          <div className="w-full max-w-5xl">
            <h2 className="text-sm font-semibold mb-3">Search results</h2>
            {filteredRepos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No repositories match your search. Keep typing or try a different term.
              </p>
            ) : (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredRepos.map((repo) => (
                  <Card
                    key={repo.id}
                    className="h-32 w-full hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleRepoClick(repo)}
                  >
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-sm font-semibold truncate">
                        {repo.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground line-clamp-2">
                        {repo.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {!isSearching && (
        <>
          <SampleSection repos={SAMPLE_REPOS} onRepoClick={handleRepoClick} />
          <HistorySection history={history} onRepoClick={handleRepoClick} />
        </>
      )}
    </main>
  )
}
