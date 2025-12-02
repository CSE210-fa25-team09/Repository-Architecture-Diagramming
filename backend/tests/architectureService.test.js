import { jest } from '@jest/globals';
import { createArchitectureService, UserInputError } from '../src/services/architectureService.js';
import repoMetadataService from '../src/services/repoMetadataService.js';
import llmService from '../src/services/llmService.js';

// Mock the dependencies
jest.mock('../src/services/repoMetadataService.js');
jest.mock('../src/services/llmService.js');

describe('Architecture Service', () => {
  let architectureService;

  const mockMetadata = {
    owner: 'test',
    repo: 'repo',
    repoUrl: 'https://github.com/test/repo',
    branch: 'main',
    defaultBranch: 'main',
    latestCommit: { sha: 'abc123' },
    branches: { preview: ['main'], total: 1 },
    fileTree: { text: 'src/\n  index.js' },
    readme: '# Test',
    generatedAt: '2025-01-01T00:00:00Z'
  };

  const mockLlmResult = {
    diagram: 'graph TD\nA-->B',
    provider: 'openai',
    rawResponse: {},
    usage: { total_tokens: 100 },
    prompt: 'test prompt',
    systemPrompt: 'test system prompt'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock functions
    repoMetadataService.fetchRepoMetadata = jest.fn().mockResolvedValue(mockMetadata);
    llmService.generateArchitectureDiagram = jest.fn().mockResolvedValue(mockLlmResult);
    
    // Create a fresh instance for each test
    architectureService = createArchitectureService({
      metadataService: repoMetadataService,
      llm: llmService
    });
  });

  describe('Input Validation', () => {
    test('should throw UserInputError if repoUrl is missing', async () => {
      await expect(
        architectureService.generateArchitectureDiagram({})
      ).rejects.toThrow(UserInputError);

      await expect(
        architectureService.generateArchitectureDiagram({})
      ).rejects.toThrow('The "repoUrl" field is required');
    });

    test('should throw UserInputError if repoUrl is null', async () => {
      await expect(
        architectureService.generateArchitectureDiagram({ repoUrl: null })
      ).rejects.toThrow(UserInputError);
    });

    test('should throw UserInputError if repoUrl is empty string', async () => {
      await expect(
        architectureService.generateArchitectureDiagram({ repoUrl: '' })
      ).rejects.toThrow(UserInputError);
    });

    test('should throw UserInputError if repoUrl is whitespace only', async () => {
      await expect(
        architectureService.generateArchitectureDiagram({ repoUrl: '   ' })
      ).rejects.toThrow(UserInputError);
    });

    test('should throw UserInputError if repoUrl is not a string', async () => {
      await expect(
        architectureService.generateArchitectureDiagram({ repoUrl: 123 })
      ).rejects.toThrow(UserInputError);
    });
  });

  describe('Successful Diagram Generation', () => {
    test('should generate architecture diagram with valid repoUrl', async () => {
      const result = await architectureService.generateArchitectureDiagram({
        repoUrl: 'https://github.com/test/repo'
      });

      expect(result).toHaveProperty('diagram', 'graph TD\nA-->B');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('llm');
      expect(result.metadata.llm.provider).toBe('openai');
    });

    test('should pass repoUrl to metadata service', async () => {
      await architectureService.generateArchitectureDiagram({
        repoUrl: 'https://github.com/facebook/react'
      });

      expect(repoMetadataService.fetchRepoMetadata).toHaveBeenCalledWith({
        githubUrl: 'https://github.com/facebook/react',
        branch: undefined
      });
    });

    test('should pass branch parameter to metadata service', async () => {
      await architectureService.generateArchitectureDiagram({
        repoUrl: 'https://github.com/test/repo',
        branch: 'develop'
      });

      expect(repoMetadataService.fetchRepoMetadata).toHaveBeenCalledWith({
        githubUrl: 'https://github.com/test/repo',
        branch: 'develop'
      });
    });

    test('should pass metadata to LLM service', async () => {
      await architectureService.generateArchitectureDiagram({
        repoUrl: 'https://github.com/test/repo'
      });

      expect(llmService.generateArchitectureDiagram).toHaveBeenCalledWith(mockMetadata);
    });

    test('should return complete result with all fields', async () => {
      const result = await architectureService.generateArchitectureDiagram({
        repoUrl: 'https://github.com/test/repo'
      });

      expect(result).toHaveProperty('diagram');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('rawLlmResponse');
      expect(result).toHaveProperty('prompt');
      expect(result).toHaveProperty('systemPrompt');
    });

    test('should merge metadata with LLM provider info', async () => {
      const result = await architectureService.generateArchitectureDiagram({
        repoUrl: 'https://github.com/test/repo'
      });

      expect(result.metadata).toEqual({
        ...mockMetadata,
        llm: {
          provider: 'openai'
        }
      });
    });
  });

  describe('Error Handling', () => {
    test('should propagate metadata service errors', async () => {
      const metadataError = new Error('Failed to fetch metadata');
      repoMetadataService.fetchRepoMetadata.mockRejectedValue(metadataError);

      await expect(
        architectureService.generateArchitectureDiagram({
          repoUrl: 'https://github.com/test/repo'
        })
      ).rejects.toThrow('Failed to fetch metadata');
    });

    test('should propagate LLM service errors', async () => {
      const llmError = new Error('LLM API failed');
      llmService.generateArchitectureDiagram.mockRejectedValue(llmError);

      await expect(
        architectureService.generateArchitectureDiagram({
          repoUrl: 'https://github.com/test/repo'
        })
      ).rejects.toThrow('LLM API failed');
    });

    test('should handle 404 repository errors', async () => {
      const notFoundError = new Error('Repository not found');
      notFoundError.statusCode = 404;
      repoMetadataService.fetchRepoMetadata.mockRejectedValue(notFoundError);

      await expect(
        architectureService.generateArchitectureDiagram({
          repoUrl: 'https://github.com/test/nonexistent'
        })
      ).rejects.toThrow('Repository not found');
    });
  });

  describe('Service Factory', () => {
    test('should create service with custom dependencies', () => {
      const customMetadataService = {
        fetchRepoMetadata: jest.fn().mockResolvedValue(mockMetadata)
      };
      const customLlmService = {
        generateArchitectureDiagram: jest.fn().mockResolvedValue(mockLlmResult)
      };

      const customService = createArchitectureService({
        metadataService: customMetadataService,
        llm: customLlmService
      });

      expect(customService).toHaveProperty('generateArchitectureDiagram');
      expect(customService).toHaveProperty('parseGithubUrl');
    });

    test('should use custom metadata service when provided', async () => {
      const customMetadataService = {
        fetchRepoMetadata: jest.fn().mockResolvedValue(mockMetadata)
      };

      const customService = createArchitectureService({
        metadataService: customMetadataService,
        llm: llmService
      });

      await customService.generateArchitectureDiagram({
        repoUrl: 'https://github.com/test/repo'
      });

      expect(customMetadataService.fetchRepoMetadata).toHaveBeenCalled();
    });

    test('should use custom LLM service when provided', async () => {
      const customLlmService = {
        generateArchitectureDiagram: jest.fn().mockResolvedValue(mockLlmResult)
      };

      const customService = createArchitectureService({
        metadataService: repoMetadataService,
        llm: customLlmService
      });

      await customService.generateArchitectureDiagram({
        repoUrl: 'https://github.com/test/repo'
      });

      expect(customLlmService.generateArchitectureDiagram).toHaveBeenCalled();
    });
  });

  describe('UserInputError', () => {
    test('should be an Error instance', () => {
      const error = new UserInputError('Test error');
      expect(error).toBeInstanceOf(Error);
    });

    test('should have correct name', () => {
      const error = new UserInputError('Test error');
      expect(error.name).toBe('UserInputError');
    });

    test('should have statusCode 400', () => {
      const error = new UserInputError('Test error');
      expect(error.statusCode).toBe(400);
    });

    test('should preserve error message', () => {
      const error = new UserInputError('Custom message');
      expect(error.message).toBe('Custom message');
    });
  });
});

