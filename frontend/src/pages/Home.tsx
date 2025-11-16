// src/pages/Home.tsx
import { useEffect, useMemo, useState } from "react";
import { SampleSection } from "@/pages/SampleSection";
import { HistorySection } from "@/pages/HistorySection";
import { SAMPLE_REPOS, type Repo } from "@/lib/repoData";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const HISTORY_STORAGE_KEY = "repo-history";

export function Home() {
  // --- History with localStorage ---
  const [history, setHistory] = useState<Repo[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored) as Repo[];
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch {
      return [];
    }
  });

  const [searchInput, setSearchInput] = useState("");

  const handleRepoClick = (repo: Repo) => {
    setHistory((prev) => {
      const without = prev.filter((r) => r.id !== repo.id);
      const updated = [repo, ...without];
      return updated.slice(0, SAMPLE_REPOS.length);
    });
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(
        HISTORY_STORAGE_KEY,
        JSON.stringify(history)
      );
    } catch {
      // ignore write errors
    }
  }, [history]);

  const isSearching = searchInput.trim().length > 0;

  // 🔍 Search ONLY through SAMPLE_REPOS
  const filteredRepos: Repo[] = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return [];
    return SAMPLE_REPOS.filter(
      (repo) =>
        repo.name.toLowerCase().includes(q) ||
        repo.description.toLowerCase().includes(q)
    );
  }, [searchInput]);

  return (
    <main className="flex flex-1 flex-col gap-10 pb-12 px-8 pt-6">
      
      {/* LEFT-ALIGNED search section */}
      <section className="w-full flex flex-col gap-4">
        <div className="w-full max-w-xl space-y-2">
          <label
            htmlFor="repo-search"
            className="text-sm font-medium text-foreground"
          >
            Search repos
          </label>

          <Input
            id="repo-search"
            placeholder="Start typing to filter sample repos…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {isSearching && (
          <div className="w-full max-w-5xl">
            <h2 className="text-sm font-semibold mb-3">
              Search results
            </h2>

            {filteredRepos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No repositories match your search. Keep typing or try a
                different term.
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

      {/* Only show Sample + History when NOT searching */}
      {!isSearching && (
        <>
          <SampleSection
            repos={SAMPLE_REPOS}
            onRepoClick={handleRepoClick}
          />
          <HistorySection
            history={history}
            onRepoClick={handleRepoClick}
          />
        </>
      )}
    </main>
  );
}