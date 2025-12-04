# Backend API Documentation

Base URL: `http://localhost:3000`

## Table of Contents
1. [Health Check](#health-check)
2. [GitHub API Endpoints](#github-api-endpoints)
3. [Graph API Endpoints](#graph-api-endpoints)
4. [Architecture Diagram Endpoint](#architecture-diagram-endpoint)

---

## Health Check

### GET `/health`

Check if the server is running.

**Parameters:** None

**Response:**

Returns server status with timestamp.

**Schema:**
- `status` (string) - Server status
- `timestamp` (string) - ISO 8601 timestamp
- `message` (string) - Status message

---

## GitHub API Endpoints

### GET `/api/rateLimit`

Get GitHub API rate limit information and authentication status.

**Parameters:** None

**Response:**

Returns GitHub API rate limit information and authentication status.

**Schema:**
- `success` (boolean) - Request status
- `authenticated` (boolean) - Whether GitHub token is configured
- `tokenPrefix` (string) - First 7 characters of token (for verification)
- `expectedLimit` (number) - Expected rate limit (60 or 5000)
- `cachedRateLimit` (object) - Cached rate limit data
  - `limit` (number) - Total requests allowed per hour
  - `remaining` (number) - Requests remaining
  - `reset` (number) - Unix timestamp when limit resets
  - `used` (number) - Requests used
- `note` (string) - Additional information

**Status Codes:**
- `200` - Success
- `500` - Server error

---

### GET `/api/branches`

Get all branches for a repository along with repository description.

**Query Parameters:**
- `owner` (required) - Repository owner/organization name
- `repo` (required) - Repository name

**Example:**
```
GET /api/branches?owner=CSE210-fa25-team09&repo=Repository-Architecture-Diagramming
```

**Response:**

Returns list of all branches and repository description. This endpoint provides repository information needed before rendering any graphs.

**Schema:**
- `success` (boolean) - Request status
- `branches` (array) - List of branch names (strings)
- `repoDescription` (string) - Repository description/about 
- `defaultBranch` (string) - Default branch name

**Status Codes:**
- `200` - Success
- `400` - Missing required parameters
- `500` - Server error or GitHub API error

---

### GET `/api/repoTree`

Get the file tree structure of a repository.

**Query Parameters:**
- `owner` (required) - Repository owner/organization name
- `repo` (required) - Repository name
- `branch` (optional) - Branch name (defaults to repository's default branch)

**Example:**
```
GET /api/repoTree?owner=CSE210-fa25-team09&repo=Repository-Architecture-Diagramming&branch=main
```

**Response:**

Returns hierarchical file tree structure of the repository.

**Schema:**
- `success` (boolean) - Request status
- `tree` (object) - Root tree node
  - `name` (string) - Directory or file name
  - `type` (string) - "dir" or "file"
  - `path` (string) - Relative path from repository root
  - `children` (array, optional) - Child nodes (for directories)

**Status Codes:**
- `200` - Success
- `400` - Missing required parameters
- `500` - Server error or GitHub API error

---

## Graph API Endpoints

### GET `/api/analyzeRepo`

Analyze repository and return dependency diagrams with repository metadata. Results are cached based on repository, branch, and commit SHA.

**Query Parameters:**
- `owner` (required) - Repository owner/organization name
- `repo` (required) - Repository name
- `branch` (optional) - Branch name (defaults to repository's default branch)

**Example:**
```
GET /api/analyzeRepo?owner=CSE210-fa25-team09&repo=Repository-Architecture-Diagramming&branch=main
```

**Response:**

Returns dependency diagrams, repository information, and latest commit details.

**Schema:**
- `allDependencies` (string) - Mermaid diagram including all dependencies (internal, external, built-in)
- `internalDependencies` (string) - Mermaid diagram showing only internal project file dependencies
- `timestamp` (number) - Unix timestamp (seconds) of when the diagrams were generated
- `repoDescription` (string) - Repository description/about text
- `commitId` (string) - Short commit SHA (7 characters) of latest commit
- `commitMessage` (string) - Commit message of latest commit

**Caching:**
- Diagrams are cached in `mermaid_diagrams/{repo}_{branch}_{commitSha}_{timestamp}/`
- Current cache just includes `.mmd` files
- Subsequent requests with same commit SHA return cached results with updated metadata
- Outdated caches (different commit SHA) are automatically cleaned up after new generation

**Status Codes:**
- `200` - Success (diagrams and metadata returned)
- `400` - Missing required parameters
- `500` - Server error, GitHub API error, or analysis failure

**Error Response Schema:**
- `error` (string) - Error message describing what went wrong

## Notes

- All GitHub API calls respect rate limits (60/hour unauthenticated, 5000/hour with token)
- Set `GITHUB_TOKEN` environment variable for higher rate limits
- The `/api/analyzeRepo` endpoint performs expensive operations and may take several seconds on first request
- Cached diagram files are stored in the `mermaid_diagrams/` directory (not Git-tracked due to `.gitignore` settings)

---

## Architecture Diagram Endpoint

### POST or GET `/api/architecture`

Generate a high-level architecture diagram for a GitHub repository by sending repository metadata to the configured LLM provider. You may supply parameters in the JSON body (POST) or as query parameters (GET). The LLM response is validated to ensure it returns compilable Mermaid syntax.

**Parameters (JSON body for POST or query string for GET):**
- `repoUrl` (required) - GitHub repository URL (e.g., `https://github.com/CSE210-fa25-team09/Repository-Architecture-Diagramming`)
- `branch` (optional) - Branch to analyze (defaults to the repository default branch)

**Example:**
```
POST /api/architecture
Content-Type: application/json

{
  "repoUrl": "https://github.com/CSE210-fa25-team09/Repository-Architecture-Diagramming",
  "branch": "main"
}
```

**Response:**

Returns the Mermaid diagram produced by the LLM along with the metadata that was supplied as context.

**Schema:**
- `success` (boolean) - Request status
- `diagram` (string) - Mermaid diagram (flowchart syntax) returned by the LLM
- `metadata` (object) - Repository metadata sent to the LLM
  - `owner` (string) - Repository owner
  - `repo` (string) - Repository name
  - `repoUrl` (string) - Normalized GitHub URL used for analysis
  - `branch` (string) - Branch analyzed
  - `branchSummary` (object) - Contains total branches and a sample list
  - `latestCommit` (object) - Latest commit details for the analyzed branch
  - `fileStats` (object) - File/directory counts and language distribution
  - `treePreview` (array) - First 60 entries from the repository tree for context
  - `llm` (object) - Provider/model metadata for the LLM call

**Status Codes:**
- `200` - Success (diagram and metadata returned)
- `400` - Missing or invalid parameters (e.g., invalid GitHub URL)
- `500` - Server error, GitHub API failure, or LLM error

**Error Response Schema:**
- `success` (boolean) - Always `false`
- `error` (string) - Error message describing what went wrong

**LLM Prompt Customization:**
- Set the `LLM_SYSTEM_PROMPT` environment variable to override the default system prompt that instructs the LLM how to format diagrams. If unset, a safe default emphasizing Mermaid flowcharts is used.
