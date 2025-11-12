import 'dotenv/config';
import githubService from './src/services/githubService.js';

async function testGetDefaultRepoTree() {
  const owner = "octocat"; // replace with any public repo
  const repo = "octocat.github.io";     // replace with any public repo

  try {
    const tree = await githubService.getRepoTree(owner, repo);
    console.log(JSON.stringify({ name: repo, type: "dir", children: tree }, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

async function testGetRepoTreeWithBranch() {
  const owner = "octocat"; // replace with any public repo
  const repo = "octocat.github.io";     // replace with any public repo
  const branch = "gh-pages"; // replace with a valid branch name
  
  try {
    const tree = await githubService.getRepoTree(owner, repo, "", branch);
    console.log(JSON.stringify({ name: repo, type: "dir", children: tree }, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

async function testGetFileContent() {
  const owner = "octocat"; // replace with any public repo
  const repo = "octocat.github.io";     // replace with any public repo
  const filePath = "CNAME"; // replace with a valid file path in the repo

  try {
    const content = await githubService.getFileContent(owner, repo, filePath);
    console.log(content);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

async function testGetAllBranches() {
  const owner = "octocat"; 
  const repo = "octocat.github.io";

  try {
    const branches = await githubService.getAllBranches(owner, repo);
    console.log("Branches:", branches);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testGetAllBranches();
testGetDefaultRepoTree();
testGetRepoTreeWithBranch();
testGetFileContent();
