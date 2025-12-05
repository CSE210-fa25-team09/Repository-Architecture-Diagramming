import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';
import { RepoMetadataError, GitHubApiError } from '../const/errors.js';

// Ensure environment variables are loaded
dotenv.config();

// Rate limited to 60 req per hour without GITHUB_TOKEN, 5000 with token
const octokit = process.env.GITHUB_TOKEN
  ? new Octokit({ auth: process.env.GITHUB_TOKEN })
  : new Octokit();

// Rate limit tracking (extracted from response headers, not extra API calls)
let lastRateLimit = { remaining: null, limit: null, reset: null };

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function parseEnvInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

const DEFAULT_MAX_BRANCHES = parseEnvInt(process.env.LLM_MAX_BRANCHES, 20);
const DEFAULT_MAX_TREE_LINES = parseEnvInt(process.env.LLM_MAX_TREE_LINES, 400);
const DEFAULT_MAX_README_CHARS = parseEnvInt(process.env.LLM_MAX_README_CHARS, 6000);

// =============================================================================
// RATE LIMIT HANDLING
// =============================================================================

function updateRateLimitFromHeaders(headers) {
  if (headers && headers['x-ratelimit-remaining']) {
    const remaining = parseInt(headers['x-ratelimit-remaining']);
    const limit = parseInt(headers['x-ratelimit-limit']);
    const reset = parseInt(headers['x-ratelimit-reset']);
    
    lastRateLimit = {
      remaining,
      limit,
      reset: new Date(reset * 1000)
    };
    
    const percentRemaining = (remaining / limit) * 100;
    
    if (percentRemaining < 10) {
      const resetTime = new Date(reset * 1000).toLocaleTimeString();
      console.error(`CRITICAL: Rate limit below 10%! Only ${remaining} requests remaining.`);
      console.error(`Rate limit resets at: ${resetTime}`);
      throw new GitHubApiError(`GitHub API rate limit critically low (${percentRemaining.toFixed(1)}%). Please wait until ${resetTime} or use a token with higher limits.`, 429);
    } else if (percentRemaining < 25) {
      console.warn(`Warning: Rate limit below 25%. ${remaining} requests remaining.`);
    }
  }
}

function getRateLimit() {
  return lastRateLimit;
}

async function getContent(owner, repo, path, ref = "") {
  const response = await octokit.repos.getContent({ 
    "owner": owner, 
    "repo": repo, 
    "path": path, 
    "ref": ref 
  });
  updateRateLimitFromHeaders(response.headers);
  return response.data;
}

async function getRepoTree(owner, repo, path = "", ref = "") {
  // Get the default branch if ref not specified
  if (!ref) {
    const response = await octokit.repos.get({ owner, repo });
    updateRateLimitFromHeaders(response.headers);
    ref = response.data.default_branch;
  }
  
  // Get entire tree recursively using branch reference (GitHub resolves it to commit SHA)
  const treeResponse = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: `${ref}`,  // GitHub API accepts branch names directly
    recursive: 'true'  // This gets the entire tree at once!
  });
  updateRateLimitFromHeaders(treeResponse.headers);
  
  // Build nested tree structure from flat list
  const root = [];
  const pathMap = { '': root };
  
  // Sort by path to ensure parents come before children
  const sortedTree = treeResponse.data.tree.sort((a, b) => a.path.localeCompare(b.path));
  
  for (const item of sortedTree) {
    // Skip if filtered by path prefix
    if (path && !item.path.startsWith(path)) continue;
    
    const parts = item.path.split('/');
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');
    
    const node = {
      name,
      type: item.type === 'tree' ? 'dir' : 'file',
      path: item.path
    };
    
    if (item.type === 'tree') {
      node.children = [];
      pathMap[item.path] = node.children;
    }
    
    const parent = pathMap[parentPath] || root;
    parent.push(node);
  }
  
  // If path filter was specified, return just that subtree
  if (path) {
    const filtered = sortedTree.find(item => item.path === path);
    if (filtered && filtered.type === 'tree') {
      return pathMap[path] || [];
    }
  }
  
  return root;
}

async function getFile(owner, repo, path, branch = "") {
  const data = await getContent(owner, repo, path, branch);
  if (data.type === "file") {
    // Decode base64 content
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return content;
  } else {
    throw new GitHubApiError("Path is not a file", 400);
  }
}

async function getAllBranches(owner, repo) {
  const response = await octokit.paginate(octokit.repos.listBranches, {
    "owner": owner, 
    "repo": repo, 
    "per_page": 100
  });
  return response.map(branch => branch.name);
}

async function getDefaultBranch(owner, repo) {
  const response = await octokit.repos.get({
    "owner": owner,
    "repo": repo
  });
  updateRateLimitFromHeaders(response.headers);
  return response.data.default_branch;
}

async function getAllCommits(owner, repo, branch="") {
  if (!branch) {
    branch = await getDefaultBranch(owner, repo);
  }
  const commits = await octokit.paginate(octokit.repos.listCommits, {
    "owner": owner, 
    "repo": repo, 
    "ref": branch,
    "per_page": 100
  });
  // Format the commits
  const formattedCommits = commits.map((commit) => {
    return {
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author.name,
      date: commit.commit.author.date
    };
  });
  return formattedCommits;
}

async function getLatestCommit(owner, repo, branch = "") {
  if (!branch) {
    const response = await octokit.repos.get({
      "owner": owner,
      "repo": repo
    });
    updateRateLimitFromHeaders(response.headers);
    branch = response.data.default_branch;
  }
  
  const response = await octokit.repos.listCommits({
    "owner": owner,
    "repo": repo,
    "sha": branch,
    "per_page": 1
  });
  updateRateLimitFromHeaders(response.headers);
  
  const commit = response.data[0];
  if (!commit) {
    return { 
      sha: 'unknown', 
      fullSha: 'unknown',
      message: 'No commits found',
      author: 'unknown',
      date: new Date().toISOString()
    };
  }
  
  return {
    sha: commit.sha.substring(0, 7),
    fullSha: commit.sha,
    message: commit.commit.message,
    author: commit.commit.author.name,
    date: commit.commit.author.date
  };
}

async function getRepoInfo(owner, repo) {
  const response = await octokit.repos.get({
    "owner": owner,
    "repo": repo
  });
  updateRateLimitFromHeaders(response.headers);
  
  return {
    description: response.data.description || '',
    stars: response.data.stargazers_count,
    language: response.data.language,
    defaultBranch: response.data.default_branch,
    createdAt: response.data.created_at,
    updatedAt: response.data.updated_at
  };
}

/**
 * Fetch multiple files in parallel with controlled concurrency
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string[]} filePaths - Array of file paths to fetch
 * @param {string} branch - Branch name
 * @param {Object} options - Options
 * @param {number} options.concurrency - Max concurrent requests (default: 10)
 * @returns {Promise<Map<string, string>>} Map of filePath -> content
 */
async function getFilesParallel(owner, repo, filePaths, branch = '', options = {}) {
  const { concurrency = 10 } = options;
  const results = new Map();
  const errors = [];
  
  // Process files in batches to control concurrency
  for (let i = 0; i < filePaths.length; i += concurrency) {
    const batch = filePaths.slice(i, i + concurrency);
    
    const batchPromises = batch.map(async (filePath) => {
      try {
        const content = await getFile(owner, repo, filePath, branch);
        return { filePath, content, success: true };
      } catch (error) {
        return { filePath, error: error.message, success: false };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    for (const result of batchResults) {
      if (result.success) {
        results.set(result.filePath, result.content);
      } else {
        errors.push({ path: result.filePath, error: result.error });
      }
    }
  }
  
  if (errors.length > 0) {
    console.warn(`Failed to fetch ${errors.length} files:`, errors.slice(0, 5).map(e => e.path));
  }
  
  return results;
}

// =============================================================================
// REPO METADATA FUNCTIONS (for LLM prompt generation)
// =============================================================================

/**
 * Normalize a GitHub URL into { owner, repo }.
 * @param {string} githubUrl GitHub repository URL (https or SSH).
 * @returns {{owner: string, repo: string}} Extracted owner/repo.
 */
export function parseGithubUrl(githubUrl) {
  if (!githubUrl || typeof githubUrl !== 'string') {
    throw new RepoMetadataError('GitHub URL is required', 400);
  }

  const trimmed = githubUrl.trim();
  const httpsMatch = trimmed.match(/https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+)(?:\.git)?/i);
  if (httpsMatch) {
    const repoName = httpsMatch[2].replace(/\.git$/i, '');
    return { owner: httpsMatch[1], repo: repoName };
  }

  const sshMatch = trimmed.match(/git@github\.com:([\w.-]+)\/([\w.-]+)(?:\.git)?/i);
  if (sshMatch) {
    const repoName = sshMatch[2].replace(/\.git$/i, '');
    return { owner: sshMatch[1], repo: repoName };
  }

  throw new RepoMetadataError('Unable to parse GitHub URL. Expected formats: https://github.com/<owner>/<repo> or git@github.com:<owner>/<repo>.', 400);
}

function limitText(text = '', maxChars = DEFAULT_MAX_README_CHARS) {
  if (!text) return '(no README content found)';
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n... (truncated ${text.length - maxChars} chars)`;
}

function buildBranchPreview(branches = [], maxBranches = DEFAULT_MAX_BRANCHES) {
  const limited = branches.slice(0, maxBranches);
  const more = branches.length > maxBranches ? ` (+${branches.length - maxBranches} more)` : '';
  return {
    preview: limited,
    total: branches.length,
    note: more
  };
}

function buildFileTreeSummary(tree = [], options = {}) {
  const {
    rootLabel = 'repository',
    maxLines = DEFAULT_MAX_TREE_LINES
  } = options;

  const lines = [`${rootLabel}/`];
  let lineCount = 1;
  let truncated = false;
  let fileCount = 0;
  let dirCount = 0;

  function traverse(nodes, depth) {
    if (!Array.isArray(nodes) || truncated) return;

    const sorted = [...nodes].sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === 'dir' ? -1 : 1;
    });

    for (const node of sorted) {
      if (lineCount >= maxLines) {
        truncated = true;
        break;
      }

      const indent = '  '.repeat(depth);
      const suffix = node.type === 'dir' ? '/' : '';
      lines.push(`${indent}${node.name}${suffix}`);
      lineCount += 1;

      if (node.type === 'dir') {
        dirCount += 1;
        traverse(node.children || [], depth + 1);
      } else {
        fileCount += 1;
      }

      if (truncated) break;
    }
  }

  traverse(tree, 1);

  if (truncated) {
    lines.push('  ... (file tree truncated for brevity)');
  }

  return {
    text: lines.join('\n'),
    stats: {
      files: fileCount,
      directories: dirCount,
      lines: lines.length,
      truncated
    }
  };
}

/**
 * Fetch relevant repo metadata used to prime the LLM.
 * @param {object} params GitHub target.
 * @param {string} params.githubUrl Repository URL.
 * @param {string} [params.branch] Optional branch override.
 * @returns {Promise<object>} Metadata payload for downstream formatting.
 */
async function fetchRepoMetadata({ githubUrl, branch } = {}) {
  const { owner, repo } = parseGithubUrl(githubUrl);

  try {
    const [branches, defaultBranch] = await Promise.all([
      getAllBranches(owner, repo),
      getDefaultBranch(owner, repo)
    ]);

    const targetBranch = branch || defaultBranch;
    const [tree, latestCommit] = await Promise.all([
      getRepoTree(owner, repo, '', targetBranch),
      getLatestCommit(owner, repo, targetBranch)
    ]);

    let readme = '';
    try {
      readme = await getFile(owner, repo, 'README.md', targetBranch);
    } catch {
      readme = '(README not found)';
    }

    const branchInfo = buildBranchPreview(branches);
    const treeSummary = buildFileTreeSummary(tree, {
      rootLabel: `${repo}@${targetBranch}`,
      maxLines: DEFAULT_MAX_TREE_LINES
    });

    return {
      owner,
      repo,
      repoUrl: `https://github.com/${owner}/${repo}`,
      branch: targetBranch,
      defaultBranch,
      latestCommit,
      branches: branchInfo,
      fileTree: treeSummary,
      readme: limitText(readme, DEFAULT_MAX_README_CHARS),
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    if (error.status === 404) {
      throw new RepoMetadataError('Repository or branch not found on GitHub.', 404);
    }
    if (error instanceof RepoMetadataError) {
      throw error;
    }
    throw new RepoMetadataError(error.message || 'Failed to fetch repository metadata.', 502);
  }
}

/**
 * Convert the metadata into a deterministic LLM prompt.
 * @param {object} metadata Repository metadata payload.
 * @returns {string} Deterministic prompt text for the LLM.
 */
function formatMetadataForPrompt(metadata) {
  if (!metadata) {
    throw new RepoMetadataError('Metadata payload is required for prompt formatting.');
  }

  const branchLines = (metadata.branches?.preview || [])
    .map(branchName => `- ${branchName}`)
    .join('\n') || '(no branches found)';

  const branchNote = metadata.branches?.note ? `\n${metadata.branches.note}` : '';
  const fileTreeText = metadata.fileTree?.text || '(file tree not available)';
  const readmeText = metadata.readme || '(README not available)';

  return [
    `Repository: ${metadata.owner}/${metadata.repo}`,
    `Source URL: ${metadata.repoUrl}`,
    `Analyzed branch: ${metadata.branch} (default: ${metadata.defaultBranch})`,
    `Latest commit: ${metadata.latestCommit}`,
    `Metadata generated at: ${metadata.generatedAt}`,
    '',
    `Branches preview (${metadata.branches?.total ?? 0} total):`,
    branchLines + branchNote,
    '',
    `File tree snapshot (limited to ${DEFAULT_MAX_TREE_LINES} lines):`,
    fileTreeText,
    '',
    `README excerpt (limited to ${DEFAULT_MAX_README_CHARS} characters):`,
    readmeText
  ].join('\n');
}

// =============================================================================
// EXPORTS
// =============================================================================

const githubService = {
  // Core GitHub API functions
  getContent,
  getRepoTree,
  getFile,
  getFilesParallel,
  getAllBranches,
  getDefaultBranch,
  getAllCommits,
  getLatestCommit,
  getRepoInfo,
  getRateLimit,
  // Repo metadata functions (for LLM)
  parseGithubUrl,
  fetchRepoMetadata,
  formatMetadataForPrompt
};

export default githubService;

