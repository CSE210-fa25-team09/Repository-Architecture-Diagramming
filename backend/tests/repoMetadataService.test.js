import { jest } from '@jest/globals';
import repoMetadataService, {
  parseGithubUrl,
  fetchRepoMetadata,
  formatMetadataForPrompt,
  RepoMetadataError
} from '../src/services/repoMetadataService.js';
import githubService from '../src/services/githubService.js';

// Mock githubService
jest.mock('../src/services/githubService.js');

describe('Repo Metadata Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    githubService.getAllBranches = jest.fn();
    githubService.getDefaultBranch = jest.fn();
    githubService.getRepoTree = jest.fn();
    githubService.getLatestCommit = jest.fn();
    githubService.getFile = jest.fn();
  });

  describe('parseGithubUrl', () => {
    test('should parse HTTPS GitHub URL', () => {
      const result = parseGithubUrl('https://github.com/facebook/react');
      expect(result).toEqual({ owner: 'facebook', repo: 'react' });
    });

    test('should parse HTTPS GitHub URL with .git extension', () => {
      const result = parseGithubUrl('https://github.com/expressjs/express.git');
      expect(result).toEqual({ owner: 'expressjs', repo: 'express' });
    });

    test('should parse SSH GitHub URL', () => {
      const result = parseGithubUrl('git@github.com:torvalds/linux.git');
      expect(result).toEqual({ owner: 'torvalds', repo: 'linux' });
    });

    test('should parse SSH GitHub URL without .git', () => {
      const result = parseGithubUrl('git@github.com:nodejs/node');
      expect(result).toEqual({ owner: 'nodejs', repo: 'node' });
    });

    test('should handle URLs with hyphens and dots', () => {
      const result = parseGithubUrl('https://github.com/my-org/my.repo-name');
      expect(result).toEqual({ owner: 'my-org', repo: 'my.repo-name' });
    });

    test('should throw error for null URL', () => {
      expect(() => parseGithubUrl(null)).toThrow('GitHub URL is required');
    });

    test('should throw error for undefined URL', () => {
      expect(() => parseGithubUrl(undefined)).toThrow('GitHub URL is required');
    });

    test('should throw error for empty string', () => {
      expect(() => parseGithubUrl('')).toThrow('GitHub URL is required');
    });

    test('should throw error for non-GitHub URL', () => {
      expect(() => parseGithubUrl('https://gitlab.com/user/repo'))
        .toThrow('Unable to parse GitHub URL');
    });

    test('should throw error for malformed URL', () => {
      expect(() => parseGithubUrl('not-a-url'))
        .toThrow('Unable to parse GitHub URL');
    });
  });

  describe('fetchRepoMetadata', () => {
    const mockBranches = ['main', 'develop', 'feature-1'];
    const mockTree = [
      { name: 'src', type: 'dir', children: [{ name: 'index.js', type: 'file' }] },
      { name: 'README.md', type: 'file' }
    ];
    const mockCommit = {
      sha: 'abc123',
      message: 'Initial commit',
      author: 'Test Author',
      date: '2025-01-01T00:00:00Z'
    };

    beforeEach(() => {
      githubService.getAllBranches.mockResolvedValue(mockBranches);
      githubService.getDefaultBranch.mockResolvedValue('main');
      githubService.getRepoTree.mockResolvedValue(mockTree);
      githubService.getLatestCommit.mockResolvedValue(mockCommit);
      githubService.getFile.mockResolvedValue('# Test README\nThis is a test.');
    });

    test('should fetch complete metadata for a repository', async () => {
      const result = await fetchRepoMetadata({
        githubUrl: 'https://github.com/test/repo',
        branch: 'main'
      });

      expect(result).toHaveProperty('owner', 'test');
      expect(result).toHaveProperty('repo', 'repo');
      expect(result).toHaveProperty('repoUrl', 'https://github.com/test/repo');
      expect(result).toHaveProperty('branch', 'main');
      expect(result).toHaveProperty('defaultBranch', 'main');
      expect(result).toHaveProperty('latestCommit', mockCommit);
      expect(result).toHaveProperty('branches');
      expect(result).toHaveProperty('fileTree');
      expect(result).toHaveProperty('readme');
      expect(result).toHaveProperty('generatedAt');
    });

    test('should use default branch when branch not specified', async () => {
      const result = await fetchRepoMetadata({
        githubUrl: 'https://github.com/test/repo'
      });

      expect(result.branch).toBe('main');
      expect(githubService.getRepoTree).toHaveBeenCalledWith('test', 'repo', '', 'main');
    });

    test('should handle README not found', async () => {
      githubService.getFile.mockRejectedValue(new Error('Not found'));

      const result = await fetchRepoMetadata({
        githubUrl: 'https://github.com/test/repo'
      });

      expect(result.readme).toBe('(README not found)');
    });

    test('should throw RepoMetadataError for 404 repository', async () => {
      githubService.getAllBranches.mockRejectedValue({ status: 404 });

      await expect(fetchRepoMetadata({
        githubUrl: 'https://github.com/test/nonexistent'
      })).rejects.toThrow('Repository or branch not found on GitHub');
    });

    test('should throw RepoMetadataError for GitHub service errors', async () => {
      githubService.getAllBranches.mockRejectedValue(new Error('API Error'));

      await expect(fetchRepoMetadata({
        githubUrl: 'https://github.com/test/repo'
      })).rejects.toThrow(RepoMetadataError);
    });

    test('should throw error for invalid GitHub URL', async () => {
      await expect(fetchRepoMetadata({
        githubUrl: 'invalid-url'
      })).rejects.toThrow('Unable to parse GitHub URL');
    });

    test('should limit branches preview', async () => {
      const manyBranches = Array.from({ length: 30 }, (_, i) => `branch-${i}`);
      githubService.getAllBranches.mockResolvedValue(manyBranches);

      const result = await fetchRepoMetadata({
        githubUrl: 'https://github.com/test/repo'
      });

      expect(result.branches.preview.length).toBeLessThanOrEqual(20);
      expect(result.branches.total).toBe(30);
      expect(result.branches.note).toContain('+10 more');
    });

    test('should truncate large file trees', async () => {
      const largeTree = Array.from({ length: 500 }, (_, i) => ({
        name: `file-${i}.js`,
        type: 'file'
      }));
      githubService.getRepoTree.mockResolvedValue(largeTree);

      const result = await fetchRepoMetadata({
        githubUrl: 'https://github.com/test/repo'
      });

      expect(result.fileTree.stats.truncated).toBe(true);
    });

    test('should truncate long README content', async () => {
      const longReadme = 'A'.repeat(10000);
      githubService.getFile.mockResolvedValue(longReadme);

      const result = await fetchRepoMetadata({
        githubUrl: 'https://github.com/test/repo'
      });

      expect(result.readme.length).toBeLessThan(longReadme.length);
      expect(result.readme).toContain('truncated');
    });
  });

  describe('formatMetadataForPrompt', () => {
    const mockMetadata = {
      owner: 'test',
      repo: 'repo',
      repoUrl: 'https://github.com/test/repo',
      branch: 'main',
      defaultBranch: 'main',
      latestCommit: {
        sha: 'abc123',
        message: 'Test commit'
      },
      branches: {
        preview: ['main', 'develop'],
        total: 2,
        note: ''
      },
      fileTree: {
        text: 'repo/\n  src/\n    index.js',
        stats: { files: 1, directories: 1 }
      },
      readme: '# Test README',
      generatedAt: '2025-01-01T00:00:00Z'
    };

    test('should format metadata into a prompt string', () => {
      const prompt = formatMetadataForPrompt(mockMetadata);

      expect(prompt).toContain('Repository: test/repo');
      expect(prompt).toContain('Source URL: https://github.com/test/repo');
      expect(prompt).toContain('Analyzed branch: main');
      expect(prompt).toContain('Latest commit:');
      expect(prompt).toContain('Branches preview (2 total):');
      expect(prompt).toContain('- main');
      expect(prompt).toContain('- develop');
      expect(prompt).toContain('File tree snapshot');
      expect(prompt).toContain('README excerpt');
    });

    test('should handle missing branches gracefully', () => {
      const metadata = { ...mockMetadata, branches: null };
      const prompt = formatMetadataForPrompt(metadata);

      expect(prompt).toContain('Branches preview (0 total)');
      expect(prompt).toContain('(no branches found)');
    });

    test('should handle missing file tree gracefully', () => {
      const metadata = { ...mockMetadata, fileTree: null };
      const prompt = formatMetadataForPrompt(metadata);

      expect(prompt).toContain('(file tree not available)');
    });

    test('should handle missing README gracefully', () => {
      const metadata = { ...mockMetadata, readme: null };
      const prompt = formatMetadataForPrompt(metadata);

      expect(prompt).toContain('(README not available)');
    });

    test('should throw error for null metadata', () => {
      expect(() => formatMetadataForPrompt(null))
        .toThrow('Metadata payload is required');
    });

    test('should throw error for undefined metadata', () => {
      expect(() => formatMetadataForPrompt(undefined))
        .toThrow('Metadata payload is required');
    });

    test('should include branch note when present', () => {
      const metadata = {
        ...mockMetadata,
        branches: {
          preview: ['main'],
          total: 10,
          note: ' (+9 more)'
        }
      };
      const prompt = formatMetadataForPrompt(metadata);

      expect(prompt).toContain('(+9 more)');
    });
  });

  describe('Service Export', () => {
    test('should export all required functions', () => {
      expect(repoMetadataService).toHaveProperty('fetchRepoMetadata');
      expect(repoMetadataService).toHaveProperty('parseGithubUrl');
      expect(repoMetadataService).toHaveProperty('formatMetadataForPrompt');
    });
  });
});

