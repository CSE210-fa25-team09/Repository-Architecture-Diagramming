import { Octokit } from "@octokit/rest";

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
  const data = await getContent(owner, repo, path, ref);

  // console.log(data)

  const tree = await Promise.all(
    data.map(async (item) => {
      if (item.type === "dir") {
        return {
          name: item.name,
          type: "dir",
          children: await getRepoTree(owner, repo, item.path, ref)
        };
      } else {
        return {
          name: item.name,
          type: "file"
        };
      }
    })
  );
  return tree;
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
  }, { headers: {} });
  // Note: paginate doesn't return headers easily, so we skip rate limit check here
  return response.map(branch => branch.name);
}

async function getAllCommits(owner, repo, branch="") {
  if (!branch) {
    // Get default branch
    const response = await octokit.repos.get({
      "owner": owner,
      "repo": repo
    });
    updateRateLimitFromHeaders(response.headers);
    branch = response.data.default_branch;
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
  getAllCommits,
  getLatestCommit,
  getRateLimit
};

export default githubService;

