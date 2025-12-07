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
- `includeTests` (optional) - Include test file dependencies in analysis (`true` or `false`, defaults to `false`)

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

Generate a detailed architecture diagram for a GitHub repository using a two-step LLM process:
1. **Code Analysis**: Fetches and analyzes actual source code files to understand the architecture
2. **Diagram Generation**: Creates a comprehensive, visually-styled Mermaid diagram based on the analysis

You may supply parameters in the JSON body (POST) or as query parameters (GET). Results are cached based on repository, branch, and commit SHA.

**Parameters (JSON body for POST or query string for GET):**
- `repoUrl` (required) - GitHub repository URL (e.g., `https://github.com/owner/repo`)
- `branch` (optional) - Branch to analyze (defaults to the repository default branch)
- `maxFiles` (optional) - Maximum number of source files to analyze (default: 100)
- `language` (optional) - Language filter: `'all'`, `'jsts'`, `'python'`, `'java'`, `'go'`, `'cpp'` (default: `'all'`)

**Example:**
```
POST /api/architecture
Content-Type: application/json

{
  "repoUrl": "https://github.com/CSE210-fa25-team09/Repository-Architecture-Diagramming",
  "branch": "main",
  "maxFiles": 100,
  "language": "all"
}
```

**Response:**

Returns the Mermaid diagram, code analysis, and metadata.

**Schema:**
- `success` (boolean) - Request status
- `diagram` (string) - Mermaid diagram with visual styling (colors, shapes, subgraphs)
- `analysis` (string) - Detailed code analysis explaining the architecture
- `metadata` (object) - Repository and LLM metadata
  - `owner` (string) - Repository owner
  - `repo` (string) - Repository name
  - `repoUrl` (string) - Normalized GitHub URL
  - `branch` (string) - Branch analyzed
  - `defaultBranch` (string) - Repository's default branch
  - `latestCommit` (object) - Latest commit details
  - `branches` (object) - Branch information
  - `fileTree` (string) - Summary of repository file structure
  - `readme` (string) - README excerpt (truncated)
  - `llm` (object) - LLM execution details
    - `provider` (string) - LLM provider used
    - `cached` (boolean) - Whether result was from cache
    - `filesAnalyzed` (number) - Number of source files analyzed
    - `steps` (number) - Always 2 (analysis + diagram generation)

**Diagram Features:**
- Visual node shapes based on component type (services, databases, external APIs)
- Color-coded nodes (blue for core, orange for services, green for data, pink for external)
- Subgraphs for logical grouping (Frontend, Backend, External, etc.)
- Meaningful edge labels showing data flow and interactions
- Left-to-right (LR) layout for readability

**Status Codes:**
- `200` - Success (diagram, analysis, and metadata returned)
- `400` - Missing or invalid parameters (e.g., invalid GitHub URL)
- `500` - Server error, GitHub API failure, or LLM error

**Error Response Schema:**
- `success` (boolean) - Always `false`
- `error` (string) - Error message describing what went wrong

**Caching:**
- Results are cached based on owner, repo, branch, and commit SHA
- Subsequent requests for the same commit return cached results instantly
- Cache is invalidated when new commits are pushed

**Performance Notes:**
- First request may take 30-60 seconds depending on repository size
- The endpoint fetches up to `maxFiles` source files for analysis
- Large repositories benefit from using language filters to focus analysis
