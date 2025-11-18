import { useEffect, useState } from "react"
import { Route, Routes } from "react-router-dom"

import { Header } from "./components/shared/Header"
import { Separator } from "./components/ui/separator"
import { getSystemTheme, type Theme } from "./lib/utils"
import { Diagram } from "./pages/Diagram"
import { Home } from "./pages/Home"
import { NotFound } from "./pages/NotFound"

function App() {
  const [theme, setTheme] = useState<Theme>(() => getSystemTheme())
  const isDark = theme === "dark"

  // Sync with system preference so the UI stays in step with OS theme toggles.
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

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/diagram" element={<Diagram />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default App
