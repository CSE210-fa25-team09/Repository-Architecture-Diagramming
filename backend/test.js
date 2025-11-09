require('dotenv').config();
const { getRepoTree } = require('./src/services/githubService');

async function test() {
  const owner = "octocat"; // replace with any public repo
  const repo = "Hello-World";     // replace with any public repo

  try {
    const tree = await getRepoTree(owner, repo);
    console.log(JSON.stringify({ name: repo, type: "dir", children: tree }, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

test();

