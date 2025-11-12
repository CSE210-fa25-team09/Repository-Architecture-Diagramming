import { Octokit } from "@octokit/rest";

// Rate limited to 60 req per hour, without GITHUB_TOKEN _VERY LIMITING_
const octokit = process.env.GITHUB_TOKEN
  ? new Octokit({ auth: process.env.GITHUB_TOKEN})
  : new Octokit();

async function getContent(owner, repo, path, ref = "") {
  const { data } = await octokit.repos.getContent({ 
    "owner": owner, 
    "repo": repo, 
    "path": path, 
    "ref": ref 
  });
  return data;
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
  const { data } = await octokit.repos.getContent({ 
    "owner": owner, 
    "repo": repo, 
    "path": path, 
    "ref": branch
  });
  if (data.type === "file") {
    // Decode base64 content
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return content;
  } else {
    throw new Error("Path is not a file");
  }
}

async function getAllBranches(owner, repo) {
  const branches = await octokit.paginate(octokit.repos.listBranches, {
    "owner": owner, 
    "repo": repo, 
    "per_page": 100
  });
  return branches.map(branch => branch.name);
}

async function getAllCommits(owner, repo, branch="") {
  if (!branch) {
    // Get default branch
    const { data: repoData } = await octokit.repos.get({
      "owner": owner,
      "repo": repo
    });
    branch = repoData.default_branch;
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

const githubService = {
  getContent,
  getRepoTree,
  getFile,
  getAllBranches,
  getAllCommits
};

export default githubService;

