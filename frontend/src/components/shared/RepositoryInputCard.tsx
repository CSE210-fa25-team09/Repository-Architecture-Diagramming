import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@radix-ui/react-label"
import { Separator } from "@radix-ui/react-separator"
import { Upload, Loader2 } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { fetchInitialWorkspace } from "@/api/diagram"
import { useWorkspace } from "@/lib/workspaceContext"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
export default function RepositoryInputCard() {
  const navigate = useNavigate()
  const { setWorkspace } = useWorkspace()
  const [repoUrl, setRepoUrl] = React.useState("")
  const [zipFile, setZipFile] = React.useState<File | null>(null)
  const [error, setError] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  function isValidRepoUrl(url: string) {
    const githubRegex = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/
    return githubRegex.test(url)
  }

  function handleZipFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setZipFile(e.target.files[0])
    }
  }

  function validateInputs() {
    if (isValidRepoUrl(repoUrl)) return { ok: true, type: "url" as const }
    if (zipFile) return { ok: true, type: "zip" as const }
    return { ok: false }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    const result = validateInputs()

    if (!result.ok) {
      setError("Please enter a valid GitHub repo URL or upload a .zip file.")
      return
    }

    // This is what we send to the mock API (it does not really matter yet)
    const repoIdentifier =
      result.type === "url" ? repoUrl : zipFile!.name

    setLoading(true)
    try {
      // 1) Call mock backend
      const workspace = await fetchInitialWorkspace(repoIdentifier)

      // 2) Store in global context
      setWorkspace(workspace)

      // 3) Navigate to diagram page (keep existing query params for future use)
      const route =
        result.type === "url"
          ? `/diagram?repo=${encodeURIComponent(repoUrl)}`
          : `/diagram?zip=${encodeURIComponent(zipFile!.name)}`

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
            <Alert variant="destructive">
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>

      <CardContent>
        <div className="flex flex-wrap items-center gap-3 text-sm text-[color:var(--muted-text)]">
          <Separator
            className="hidden h-6 w-px bg-[color:var(--panel-border)] md:block"
            orientation="vertical"
          />
          {/* Upload Icon*/}
          <Upload className="h-4 w-4 text-[color:var(--icon-muted)]" />
          <Label htmlFor="zip-upload">Or upload a .zip file of the repository</Label>
          {/* Button for user to select zip file that user wants to upload to generate a diagram */}
          <Input
            type="file"
            accept=".zip"
            className="hidden"
            id="zip-upload"
            onChange={handleZipFile}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-full border-[color:var(--panel-border)] text-[color:var(--muted-text)] !bg-transparent hover:brightness-110"
            onClick={() => document.getElementById("zip-upload")?.click()}
          >
            <Upload className="h-4 w-4" />
            Upload Zip
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}