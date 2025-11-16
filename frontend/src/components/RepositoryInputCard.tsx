import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@radix-ui/react-label"
import { Separator } from "@radix-ui/react-separator"
import { Upload } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function RepositoryInputCard() {
  const navigate = useNavigate()
  const [repoUrl, setRepoUrl] = React.useState("")
  const [zipFile, setZipFile] = React.useState<File | null>(null)
  const [error, setError] = React.useState("")

  function isValidRepoUrl(url: string) {
    //Checks if the Repo Url is a valid url
    const githubRegex = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/
    return githubRegex.test(url)
  }
  function handleZipFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setZipFile(e.target.files[0])
    }
  }
  /** 
  function handleZipUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    //checks if the file ends with a .zip
    if (!file.name.endsWith(".zip")) {
      //Sets the error msg to and set the state of the zipfull to null
      setError("Uploaded file must be a .zip archive.")
      setZipFile(null)
      return
    }
    //Valid zip file, sets the error msg to be empty, sets the zipfile state to the file 
    setError("")
    setZipFile(file)
  }
    */
  function validateInputs() {
    if (isValidRepoUrl(repoUrl)) return { ok: true, type: "url" as const }
    if (zipFile) return { ok: true, type: "zip" as const }
    return { ok: false }
  }
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    const result = validateInputs()

    if (!result.ok) {
      setError("Please enter a valid GitHub repo URL or upload a .zip file.")
      return
    }

    const route =
      result.type === "url"
        ? `/diagram?repo=${encodeURIComponent(repoUrl)}`
        : `/diagram?zip=${encodeURIComponent(zipFile!.name)}`

    navigate(route)
  }

  return (
    <Card className="relative w-full max-w-none bg-[var(--panel-bg)] ">
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Label
              htmlFor="repo-url"
              className="text-base text-[var(--page-foreground)] md:w-48 md:flex-none"
            >
              Enter GitHub Repo URL
            </Label>

            {/* Input for user to enter github url and sets the repo url state to the user input */}
            <div className="flex flex-col w-full gap-2 md:flex-1">
              <Input
                id="repo-url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/username/repo"
                className="h-12 w-full border border-[color:var(--input-border)] bg-[var(--input-bg)] px-4 text-base text-[var(--page-foreground)] shadow-sm placeholder:text-[var(--input-placeholder)] focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
              />
              {/* Button for user to generate diagrams which also checks if the user inputed in a valid github url or zip file*/}
              {error && (
                <p className="absolute left-0 top-full mt-1 text-sm text-red-500 font-medium">
                  {error}
                </p>
              )}
            </div>

            <Button
              size="lg"
              type="submit"
              className="h-12 min-w-48 rounded-full bg-[color:var(--btn-primary-bg)] px-8 text-base text-white hover:bg-[color:var(--btn-primary-hover)] active:bg-[color:var(--btn-primary-active)]"
            >
              Generate Diagram
            </Button>
          </div>
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
          <Label>Or upload a .zip file of the repository</Label>
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
