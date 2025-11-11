import { useEffect, useState } from "react"
import { GithubIcon, Moon, Search, Sun, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

const sampleRepos = [
  { name: "octo/mermaid-demo", description: "Reference architecture" },
  { name: "acme/platform", description: "Modular monolith" },
  { name: "ui-lab/design-system", description: "Component showcase" },
]

const historyRepos = [
  { name: "my-org/payments", description: "Uploaded yesterday" },
  { name: "cse210/project3", description: "Cached run" },
  { name: "demo/storefront", description: "Sample diagram" },
]

type Theme = "light" | "dark"

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function App() {
  const [theme, setTheme] = useState<Theme>(() => getSystemTheme())
  const isDark = theme === "dark"

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const listener = (event: MediaQueryListEvent) =>
      setTheme(event.matches ? "dark" : "light")
    media.addEventListener("change", listener)
    return () => media.removeEventListener("change", listener)
  }, [])

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen bg-[var(--page-bg)] text-[var(--page-foreground)] transition-colors">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8">
          <Header
            isDark={isDark}
            onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
          />
          <Separator className="bg-[color:var(--panel-border)]" />
          <main className="flex flex-1 flex-col gap-10 pb-12">
            <HeroForm />
            <RepoSections />
          </main>
        </div>
      </div>
    </div>
  )
}

function Header({
  isDark,
  onToggleTheme,
}: {
  isDark: boolean
  onToggleTheme: () => void
}) {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3 text-lg font-semibold">
        <a
          href="/"
          className="flex h-12 w-12 items-center justify-center rounded-xl border border-[color:var(--panel-border)] bg-[var(--panel-bg)] text-[var(--page-foreground)] shadow-sm transition hover:brightness-110"
          aria-label="Go to homepage"
        >
          <GithubIcon className="h-6 w-6" />
        </a>
        <div>
          <p className="text-[var(--page-foreground)]">SWE Diagramming</p>
          <p className="text-[color:var(--muted-text)] text-sm">Repository insights</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          aria-label="Toggle color theme"
          onClick={onToggleTheme}
          className="h-10 w-10 rounded-full border border-[color:var(--panel-border)] bg-[var(--panel-bg)] text-[var(--page-foreground)] hover:brightness-110"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <Button className="rounded-full bg-[color:var(--secondary-action-bg)] px-6 text-[color:var(--secondary-action-foreground)] hover:brightness-110">
          Home
        </Button>
      </div>
    </header>
  )
}

function HeroForm() {
  return (
    <section className="flex flex-col gap-6">
      <div className="grid gap-4 rounded-xl border border-[color:var(--panel-border)] bg-[var(--panel-bg)] p-6 shadow-md">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Label
            htmlFor="repo-url"
            className="text-base text-[var(--page-foreground)] md:w-48 md:flex-none"
          >
            Enter GitHub Repo URL
          </Label>
          <div className="flex flex-1 flex-col gap-3 md:flex-row">
            <Input
              id="repo-url"
              placeholder="https://github.com/org/repo"
              className="h-12 w-full border border-[color:var(--input-border)] bg-[var(--input-bg)] px-4 text-base text-[var(--page-foreground)] shadow-sm placeholder:text-[var(--input-placeholder)] focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
            />
            <Button className="h-12 min-w-48 rounded-full bg-[color:var(--btn-primary-bg)] px-8 text-base text-white hover:bg-[color:var(--btn-primary-hover)] active:bg-[color:var(--btn-primary-active)]">
              Generate Diagram
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-[color:var(--muted-text)]">
          <Separator
            className="hidden h-6 w-px bg-[color:var(--panel-border)] md:block"
            orientation="vertical"
          />
          <Upload className="text-[color:var(--icon-muted)] h-4 w-4" />
          <span>Or upload a .zip file of the repository</span>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-full border-[color:var(--panel-border)] text-[color:var(--muted-text)] !bg-transparent hover:brightness-110"
          >
            <Upload className="h-4 w-4" />
            Upload Zip
          </Button>
        </div>
      </div>
      <div className="relative">
        <Search className="text-[color:var(--icon-muted)] absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
        <Input
          placeholder="Search repos"
          className="h-12 rounded-full border border-[color:var(--input-border)] bg-[var(--panel-bg)] pl-12 text-base text-[var(--page-foreground)] shadow-sm placeholder:text-[var(--input-placeholder)] focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
        />
      </div>
    </section>
  )
}

function RepoSections() {
  return (
    <section className="grid gap-8">
      <RepoGrid title="Sample" repos={sampleRepos} />
      <RepoGrid title="History" repos={historyRepos} />
    </section>
  )
}

type RepoTile = { name: string; description: string }

function RepoGrid({ title, repos }: { title: string; repos: RepoTile[] }) {
  return (
    <div className="grid gap-4">
      <Label className="text-base text-[color:var(--muted-text)]">{title}</Label>
      <div className="w-full">
        <div className="grid gap-4 md:grid-cols-3">
          {repos.map((repo) => (
            <Card
              key={repo.name}
              className="border border-[color:var(--card-border)] bg-[color:var(--card-bg)] transition hover:border-[color:var(--panel-border)] hover:bg-[color:var(--card-hover)] hover:shadow-lg"
            >
              <CardContent className="space-y-2">
                <CardTitle className="text-base text-[var(--page-foreground)]">
                  {repo.name}
                </CardTitle>
                <CardDescription className="text-[color:var(--muted-text)]">
                  {repo.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
