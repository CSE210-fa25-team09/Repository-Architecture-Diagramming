import 'dotenv/config';
import githubService from '../src/services/githubService.js';

// jest.setTimeout(30000);

describe('GitHub Service Integration Tests', () => {

  test('getRepoTree should return a file tree for a public repo', async () => {
    const owner = "octocat";
    const repo = "octocat.github.io";
    
    const tree = await githubService.getRepoTree(owner, repo);
    
    expect(tree).toBeDefined();
    expect(Array.isArray(tree)).toBe(true);
    expect(tree.length).toBeGreaterThan(0);
  });

  test('getRepoTree should work with a specific branch', async () => {
    const owner = "octocat";
    const repo = "octocat.github.io";
    const branch = "gh-pages";
    
    const tree = await githubService.getRepoTree(owner, repo, "", branch);
    
    expect(tree).toBeDefined();
    expect(Array.isArray(tree)).toBe(true);
  });

  test('getRepoTree should work with a specific commit SHA', async () => {
    const owner = "octocat";
    const repo = "octocat.github.io";
    const commitSha = "3a9796cf19902af0f7e677391b340f1ae4128433"; 
    
    const tree = await githubService.getRepoTree(owner, repo, "", commitSha);
    
    expect(tree).toBeDefined();
    expect(Array.isArray(tree)).toBe(true);
  });

  test('getFile should fetch content of a specific file', async () => {
    const owner = "octocat";
    const repo = "octocat.github.io";
    const filePath = "CNAME"; 
    
    const content = await githubService.getFile(owner, repo, filePath);
    
    expect(content).toBeDefined();
    expect(typeof content).toBe('string');
  });

  test('getAllBranches should return a list of branches', async () => {
    const owner = "octocat";
    const repo = "octocat.github.io";

    const branches = await githubService.getAllBranches(owner, repo);
    
    expect(branches).toBeDefined();
    expect(Array.isArray(branches)).toBe(true);
    expect(branches.length).toBeGreaterThan(0);
  });

  test('getAllCommits should return a list of commits', async () => {
    const owner = "octocat";
    const repo = "octocat.github.io";

    const commits = await githubService.getAllCommits(owner, repo);
    
    expect(commits).toBeDefined();
    expect(Array.isArray(commits)).toBe(true);
    expect(commits.length).toBeGreaterThan(0);
  });

  test('getRepoInfo should return repository metadata', async () => {
    const owner = "octocat";
    const repo = "octocat.github.io";

    const info = await githubService.getRepoInfo(owner, repo);

    expect(info).toBeDefined();
    expect(info.defaultBranch).toBeDefined();
    expect(info.stars).toBeGreaterThanOrEqual(0);
  });

  test('getLatestCommit should return the last commit info', async () => {
    const owner = "octocat";
    const repo = "octocat.github.io";

    const commit = await githubService.getLatestCommit(owner, repo);

    expect(commit).toBeDefined();
    expect(commit.sha).toBeDefined();
    expect(commit.author).toBeDefined();
  });

});
