import 'dotenv/config';
import { getRepoTree } from './src/services/githubService.js';

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

