import 'dotenv/config';
import githubService from '../src/services/githubService.js';
import { RepoMetadataError } from '../src/const/errors.js';

describe('GitHub Service Integration Tests', () => {
  const owner = "octocat";
  const repo = "octocat.github.io";

  test('getRepoTree should return file tree with different ref types', async () => {
    // Default branch
    let tree = await githubService.getRepoTree(owner, repo);
    expect(tree).toBeDefined();
    expect(Array.isArray(tree)).toBe(true);
    expect(tree.length).toBeGreaterThan(0);
    
    // Specific branch
    tree = await githubService.getRepoTree(owner, repo, "", "gh-pages");
    expect(Array.isArray(tree)).toBe(true);
    
    // Specific commit SHA
    tree = await githubService.getRepoTree(owner, repo, "", "3a9796cf19902af0f7e677391b340f1ae4128433");
    expect(Array.isArray(tree)).toBe(true);
  });

  test('getFile should fetch file content', async () => {
    const content = await githubService.getFile(owner, repo, "CNAME");
    expect(content).toBeDefined();
    expect(typeof content).toBe('string');
  });

  test('getAllBranches and getAllCommits should return lists', async () => {
    const branches = await githubService.getAllBranches(owner, repo);
    expect(Array.isArray(branches)).toBe(true);
    expect(branches.length).toBeGreaterThan(0);

    const commits = await githubService.getAllCommits(owner, repo);
    expect(Array.isArray(commits)).toBe(true);
    expect(commits.length).toBeGreaterThan(0);
  });

  test('getRepoInfo and getLatestCommit should return metadata', async () => {
    const info = await githubService.getRepoInfo(owner, repo);
    expect(info.defaultBranch).toBeDefined();
    expect(info.stars).toBeGreaterThanOrEqual(0);

    const commit = await githubService.getLatestCommit(owner, repo);
    expect(commit.sha).toBeDefined();
    expect(commit.author).toBeDefined();
  });
});

describe('GitHub Service Unit Tests', () => {
  describe('parseGithubUrl', () => {
    test('should parse valid GitHub URLs', () => {
      // HTTPS formats
      expect(githubService.parseGithubUrl('https://github.com/owner/repo'))
        .toEqual({ owner: 'owner', repo: 'repo' });
      expect(githubService.parseGithubUrl('https://github.com/owner/repo.git'))
        .toEqual({ owner: 'owner', repo: 'repo' });
      
      // SSH formats
      expect(githubService.parseGithubUrl('git@github.com:owner/repo'))
        .toEqual({ owner: 'owner', repo: 'repo' });
      expect(githubService.parseGithubUrl('git@github.com:owner/repo.git'))
        .toEqual({ owner: 'owner', repo: 'repo' });
      
      // Whitespace and special chars
      expect(githubService.parseGithubUrl('  https://github.com/owner/repo  '))
        .toEqual({ owner: 'owner', repo: 'repo' });
      expect(githubService.parseGithubUrl('https://github.com/my-org/my-repo.js'))
        .toEqual({ owner: 'my-org', repo: 'my-repo.js' });
    });

    test('should throw error for invalid URLs', () => {
      expect(() => githubService.parseGithubUrl(null)).toThrow('GitHub URL is required');
      expect(() => githubService.parseGithubUrl('')).toThrow(RepoMetadataError);
      expect(() => githubService.parseGithubUrl('https://gitlab.com/owner/repo')).toThrow(RepoMetadataError);
      expect(() => githubService.parseGithubUrl('not-a-url')).toThrow('Unable to parse GitHub URL');
    });
  });

  describe('formatMetadataForPrompt', () => {
    test('should format metadata and handle missing fields', () => {
      const fullMetadata = {
        owner: 'testOwner', repo: 'testRepo',
        repoUrl: 'https://github.com/testOwner/testRepo',
        branch: 'main', defaultBranch: 'main',
        latestCommit: { sha: 'abc123' },
        branches: { preview: ['main', 'develop'], total: 25, note: ' (+5 more)' },
        fileTree: { text: 'src/\n  index.js' },
        readme: '# Test Project',
        generatedAt: '2024-01-01T00:00:00Z'
      };

      // Full metadata
      let result = githubService.formatMetadataForPrompt(fullMetadata);
      expect(result).toContain('Repository: testOwner/testRepo');
      expect(result).toContain('- main');
      expect(result).toContain('- develop');
      expect(result).toContain('+5 more');
      expect(result).toContain('src/');
      expect(result).toContain('# Test Project');

      // Missing branches
      result = githubService.formatMetadataForPrompt({ ...fullMetadata, branches: {} });
      expect(result).toContain('(no branches found)');

      // Missing fileTree
      result = githubService.formatMetadataForPrompt({ ...fullMetadata, fileTree: undefined });
      expect(result).toContain('(file tree not available)');

      // Missing readme
      result = githubService.formatMetadataForPrompt({ ...fullMetadata, readme: undefined });
      expect(result).toContain('(README not available)');
    });

    test('should throw error for null metadata', () => {
      expect(() => githubService.formatMetadataForPrompt(null)).toThrow('Metadata payload is required');
    });
  });

  describe('getRateLimit', () => {
    test('should return rate limit info object', () => {
      const rateLimit = githubService.getRateLimit();
      expect(rateLimit).toHaveProperty('remaining');
      expect(rateLimit).toHaveProperty('limit');
      expect(rateLimit).toHaveProperty('reset');
    });
  });

  describe('getFilesParallel', () => {
    test('should fetch files, handle errors, and respect options', async () => {
      const owner = "octocat";
      const repo = "octocat.github.io";
      
      // Fetch single file
      let results = await githubService.getFilesParallel(owner, repo, ["CNAME"]);
      expect(results instanceof Map).toBe(true);
      expect(results.has("CNAME")).toBe(true);
      
      // Empty file list
      results = await githubService.getFilesParallel("owner", "repo", []);
      expect(results.size).toBe(0);
      
      // Handle errors gracefully
      results = await githubService.getFilesParallel(owner, repo, ["CNAME", "non-existent-file.xyz"]);
      expect(results.has("CNAME")).toBe(true);
      expect(results.has("non-existent-file.xyz")).toBe(false);
      
      // Respect concurrency option
      results = await githubService.getFilesParallel(owner, repo, ["CNAME"], '', { concurrency: 1 });
      expect(results instanceof Map).toBe(true);
    });
  });
});
