import type { MouseEvent } from "react"
import { GithubIcon, Moon, Sun } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"

type HeaderProps = {
  isDark: boolean
  onToggleTheme: () => void
}

export function Header({ isDark, onToggleTheme }: HeaderProps) {
  const navigate = useNavigate()
  const handleNavigateHome = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault()
    navigate("/")
  }

  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3 text-lg font-semibold">
        <Link
          to="/"
          className="flex h-12 w-12 items-center justify-center rounded-xl border border-[color:var(--panel-border)] bg-[var(--panel-bg)] text-[var(--page-foreground)] shadow-sm transition hover:brightness-110"
          aria-label="Go to homepage"
          onClick={handleNavigateHome}
        >
          <GithubIcon className="h-6 w-6" />
        </Link>
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
        <Button
          className="rounded-full bg-[color:var(--secondary-action-bg)] px-6 text-[color:var(--secondary-action-foreground)] hover:brightness-110"
          asChild
          onClick={handleNavigateHome}
        >
          <Link to="/">Home</Link>
        </Button>
      </div>
    </header>
  )
}
