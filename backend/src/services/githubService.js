import { Octokit } from "@octokit/rest";

// Rate limited to 60 req per hour, without GITHUB_TOKEN _VERY LIMITING_
const octokit = process.env.GITHUB_TOKEN
  ? new Octokit({ auth: process.env.GITHUB_TOKEN})
  : new Octokit();


async function getRepoTree(owner, repo, path = "", branch = "") {
  const { data } = await octokit.repos.getContent({ owner, repo, path, ref: branch });

  // console.log(data)

  const tree = await Promise.all(
    data.map(async (item) => {
      if (item.type === "dir") {
        return {
          name: item.name,
          type: "dir",
          children: await getRepoTree(owner, repo, item.path, branch)
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

async function getFileContent(owner, repo, path, branch = "") {
  const { data } = await octokit.repos.getContent({ owner, repo, path, ref: branch });
  if (data.type === "file") {
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return content;
  } else {
    throw new Error("Path is not a file");
  }
}

async function getAllBranches(owner, repo) {
  const branches = await octokit.paginate(octokit.repos.listBranches, {
    owner,
    repo,
    per_page: 100
  });
  return branches.map(branch => branch.name);
}

const githubService = {
  getRepoTree,
  getFileContent,
  getAllBranches
};

export default githubService;

