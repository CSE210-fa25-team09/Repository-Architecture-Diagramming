import { Octokit } from "@octokit/rest";
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

// Rate limited to 60 req per hour without GITHUB_TOKEN, 5000 with token
const octokit = process.env.GITHUB_TOKEN
  ? new Octokit({ auth: process.env.GITHUB_TOKEN })
  : new Octokit();

// Rate limit tracking (extracted from response headers, not extra API calls)
let lastRateLimit = { remaining: null, limit: null, reset: null };

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
      console.error(`\n⚠️  CRITICAL: Rate limit below 10%! Only ${remaining} requests remaining.`);
      console.error(`⚠️  Rate limit resets at: ${resetTime}`);
      throw new Error(`GitHub API rate limit critically low (${percentRemaining.toFixed(1)}%). Please wait until ${resetTime} or use a token with higher limits.`);
    } else if (percentRemaining < 25) {
      console.warn(`⚠️  Warning: Rate limit below 25%. ${remaining} requests remaining.`);
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
  // Get the SHA of the branch/ref
  if (!ref) {
    const response = await octokit.repos.get({ owner, repo });
    updateRateLimitFromHeaders(response.headers);
    ref = response.data.default_branch;
  }
  
  // Get the commit SHA
  const commitResponse = await octokit.repos.getCommit({ owner, repo, ref });
  updateRateLimitFromHeaders(commitResponse.headers);
  const treeSha = commitResponse.data.commit.tree.sha;
  
  // Get entire tree recursively in ONE API call
  const treeResponse = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: treeSha,
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
    throw new Error("Path is not a file");
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
  
  return response.data[0]?.sha?.substring(0, 7) || 'unknown'; // Return short SHA (7 chars)
}

const githubService = {
  getContent,
  getRepoTree,
  getFile,
  getAllBranches,
  getDefaultBranch,
  getAllCommits,
  getLatestCommit,
  getRateLimit
};

export default githubService;

