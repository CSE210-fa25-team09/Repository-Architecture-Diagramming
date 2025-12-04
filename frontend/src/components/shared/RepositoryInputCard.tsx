import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@radix-ui/react-label"
import { Loader2, AlertCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { fetchInitialWorkspace } from "@/api/diagram"
import { useWorkspace } from "@/lib/workspaceContext"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

export default function RepositoryInputCard() {
  const navigate = useNavigate()
  const { setWorkspaceForRepo, setCurrentRepoKey } = useWorkspace()
  const [repoUrl, setRepoUrl] = React.useState("")
  const [error, setError] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  function isValidRepoUrl(url: string) {
    const githubRegex = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/
    return githubRegex.test(url)
  }

  function validateInputs() {
    if (isValidRepoUrl(repoUrl)) return { ok: true as const }
    return { ok: false as const }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    const result = validateInputs()

    if (!result.ok) {
      setError("Please enter a valid GitHub repo URL.")
      return
    }

    const repoIdentifier = repoUrl

    setLoading(true)
    try {
      const workspace = await fetchInitialWorkspace(repoIdentifier)

      // Store in global context
      setWorkspaceForRepo(workspace.repo.name, workspace)
      setCurrentRepoKey(workspace.repo.name)

      // Navigate to diagram page
      const route = `/diagram?repo=${encodeURIComponent(repoUrl)}`
      navigate(route)
    } catch (err) {
      console.error(err)
      setError("Failed to generate workspace. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="relative w-full max-w-none bg-[var(--panel-bg)] ">
      <CardContent>
        <form
          onSubmit={handleSubmit}
          data-testid="repo-input-form"
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Label
              htmlFor="repo-url"
              className="text-base text-[var(--page-foreground)] md:w-48 md:flex-none"
            >
              Enter GitHub Repo URL
            </Label>

            <Input
              id="repo-url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/username/repo"
              className="h-12 w-full border border-[color:var(--input-border)] bg-[var(--input-bg)] px-4 text-base text-[var(--page-foreground)] shadow-sm placeholder:text-[var(--input-placeholder)] focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
            />

            <Button
              size="lg"
              type="submit"
              disabled={loading}
              className="h-12 min-w-48 rounded-full bg-[color:var(--btn-primary-bg)] px-8 text-base text-white hover:bg-[color:var(--btn-primary-hover)] active:bg-[color:var(--btn-primary-active)] disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </span>
              ) : (
                "Generate Diagram"
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div>
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </div>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
