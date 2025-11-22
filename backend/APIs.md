# Backend API Documentation

Base URL: `http://localhost:3000`

## Table of Contents
1. [Health Check](#health-check)
2. [GitHub API Endpoints](#github-api-endpoints)
3. [Graph API Endpoints](#graph-api-endpoints)

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

Get all branches for a repository.

**Query Parameters:**
- `owner` (required) - Repository owner/organization name
- `repo` (required) - Repository name

**Example:**
```
GET /api/branches?owner=CSE210-fa25-team09&repo=Repository-Architecture-Diagramming
```

**Response:**

Returns list of all branches in the repository.

**Schema:**
- `success` (boolean) - Request status
- `branches` (array) - List of branch objects
  - `name` (string) - Branch name
  - `commit` (object) - Latest commit information
    - `sha` (string) - Commit SHA hash
    - `url` (string) - GitHub API URL for commit
  - `protected` (boolean) - Whether branch is protected

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

### GET `/api/getMermaid`

Analyze repository dependencies and generate Mermaid diagrams. Results are cached based on repository, branch, and commit SHA.

**Query Parameters:**
- `owner` (required) - Repository owner/organization name
- `repo` (required) - Repository name
- `branch` (optional) - Branch name (defaults to repository's default branch)

**Example:**
```
GET /api/getMermaid?owner=CSE210-fa25-team09&repo=Repository-Architecture-Diagramming&branch=main
```

**Response:**

Returns two Mermaid diagram strings representing repository dependencies.

**Schema:**
- `allDependencies` (string) - Mermaid diagram including all dependencies (internal, external, built-in)
- `internalDependencies` (string) - Mermaid diagram showing only internal project file dependencies

**Caching:**
- Diagrams are cached in `mermaid_diagrams/{repo}_{branch}_{commitSha}/`
- Cache includes `.mmd` files and `.png` images (if generated)
- Subsequent requests with same commit SHA return cached results instantly

**Status Codes:**
- `200` - Success (diagrams returned)
- `400` - Missing required parameters
- `500` - Server error, GitHub API error, or analysis failure

**Error Response Schema:**
- `error` (string) - Error message describing what went wrong

## Notes

- All GitHub API calls respect rate limits (60/hour unauthenticated, 5000/hour with token)
- Set `GITHUB_TOKEN` environment variable for higher rate limits
- The `/api/getMermaid` endpoint performs expensive operations and may take several seconds on first request
- Cached diagram files are stored in the `mermaid_diagrams/` directory (not Git-tracked due to `.gitignore` settings)