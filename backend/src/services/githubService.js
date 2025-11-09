const { Octokit } = require("@octokit/rest");

// Rate limited to 60 req per hour, without GITHUB_TOKEN _VERY LIMITING_
const octokit = process.env.GITHUB_TOKEN
  ? new Octokit({ auth: process.env.GITHUB_TOKEN })
  : new Octokit();


async function getRepoTree(owner, repo, path = "") {
  const { data } = await octokit.repos.getContent({ owner, repo, path });

  // console.log(data)

  const tree = await Promise.all(
    data.map(async (item) => {
      if (item.type === "dir") {
        return {
          name: item.name,
          type: "dir",
          children: await getRepoTree(owner, repo, item.path)
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

module.exports = { getRepoTree };

