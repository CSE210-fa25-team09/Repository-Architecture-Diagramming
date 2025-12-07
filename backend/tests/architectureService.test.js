import { jest } from '@jest/globals';
import architectureService from '../src/services/architectureService.js';
import githubService from '../src/services/githubService.js';
import llmService from '../src/services/llmService.js';
import cacheService from '../src/services/cacheService.js';
import dependencyService from '../src/services/dependencyService.js';
import { UserInputError } from '../src/const/errors.js';

describe('Architecture Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear cache by deleting all known keys (cacheService doesn't have a clear method)
    cacheService.cache.clear();
  });

  describe('generateArchitectureDiagram', () => {
    test('should throw UserInputError for invalid repoUrl inputs', async () => {
      // Missing repoUrl
      await expect(architectureService.generateArchitectureDiagram({}))
        .rejects.toThrow(UserInputError);
      await expect(architectureService.generateArchitectureDiagram({}))
        .rejects.toThrow('The "repoUrl" field is required.');
      
      // Empty string
      await expect(architectureService.generateArchitectureDiagram({ repoUrl: '' }))
        .rejects.toThrow(UserInputError);
      
      // Whitespace only
      await expect(architectureService.generateArchitectureDiagram({ repoUrl: '   ' }))
        .rejects.toThrow(UserInputError);
      
      // Non-string
      await expect(architectureService.generateArchitectureDiagram({ repoUrl: 123 }))
        .rejects.toThrow(UserInputError);
    });

    test('should return cached result if available', async () => {
      const mockMetadata = {
        owner: 'testOwner',
        repo: 'testRepo',
        branch: 'main',
        latestCommit: { sha: 'abc123' }
      };

      const cachedResult = {
        diagram: 'graph TD\nA-->B',
        analysis: 'Test analysis',
        metadata: {
          ...mockMetadata,
          llm: { provider: 'huggingface', cached: true, filesAnalyzed: 5, steps: 2 }
        }
      };

      // Mock fetchRepoMetadata to return our metadata
      jest.spyOn(githubService, 'fetchRepoMetadata').mockResolvedValue(mockMetadata);
      
      // Pre-populate the cache
      const cacheKey = cacheService.buildArchitectureKey('testOwner', 'testRepo', 'main', 'abc123');
      cacheService.set(cacheKey, cachedResult);

      const result = await architectureService.generateArchitectureDiagram({
        repoUrl: 'https://github.com/testOwner/testRepo'
      });

      expect(result).toEqual(cachedResult);
      expect(result.metadata.llm.cached).toBe(true);
    });

    test('should generate diagram with two-step LLM process', async () => {
      const mockMetadata = {
        owner: 'testOwner',
        repo: 'testRepo',
        branch: 'main',
        latestCommit: { sha: 'def456' },
        fileTree: 'src/\n  index.js',
        readme: 'Test readme'
      };

      const mockTree = [
        { name: 'src', type: 'dir', path: 'src', children: [] },
        { name: 'index.js', type: 'file', path: 'src/index.js' }
      ];

      const mockFileContents = new Map([
        ['src/index.js', 'console.log("hello");']
      ]);

      const mockAnalysisResult = {
        analysis: 'This is a simple Node.js application',
        provider: 'huggingface',
        rawResponse: { generated_text: 'analysis' },
        usage: null,
        prompt: 'test prompt',
        systemPrompt: 'test system prompt',
        filesAnalyzed: 1
      };

      const mockDiagramResult = {
        diagram: 'graph LR\nA-->B',
        provider: 'huggingface',
        rawResponse: { generated_text: 'diagram' },
        usage: null,
        prompt: 'diagram prompt',
        systemPrompt: 'diagram system prompt'
      };

      jest.spyOn(githubService, 'fetchRepoMetadata').mockResolvedValue(mockMetadata);
      jest.spyOn(githubService, 'getRepoTree').mockResolvedValue(mockTree);
      jest.spyOn(githubService, 'getFilesParallel').mockResolvedValue(mockFileContents);
      jest.spyOn(dependencyService, 'extractFilesByLanguage').mockReturnValue(['src/index.js']);
      jest.spyOn(llmService, 'analyzeCodeArchitecture').mockResolvedValue(mockAnalysisResult);
      jest.spyOn(llmService, 'generateDetailedDiagram').mockResolvedValue(mockDiagramResult);

      const result = await architectureService.generateArchitectureDiagram({
        repoUrl: 'https://github.com/testOwner/testRepo',
        branch: 'main',
        maxFiles: 50,
        language: 'javascript'
      });

      expect(result.diagram).toBe('graph LR\nA-->B');
      expect(result.analysis).toBe('This is a simple Node.js application');
      expect(result.metadata.llm.filesAnalyzed).toBe(1);
      expect(result.metadata.llm.steps).toBe(2);
      expect(result.metadata.llm.cached).toBe(false);
      
      // Verify prompts are included
      expect(result.prompts.analysis.system).toBe('test system prompt');
      expect(result.prompts.diagram.system).toBe('diagram system prompt');
      
      // Verify raw responses are included
      expect(result.rawLlmResponse.analysis).toEqual({ generated_text: 'analysis' });
      expect(result.rawLlmResponse.diagram).toEqual({ generated_text: 'diagram' });
    });

    test('should use default values for maxFiles and language', async () => {
      const mockMetadata = {
        owner: 'testOwner',
        repo: 'testRepo',
        branch: 'main',
        latestCommit: { sha: 'xyz789' }
      };

      const mockTree = [];
      const mockFileContents = new Map();

      jest.spyOn(githubService, 'fetchRepoMetadata').mockResolvedValue(mockMetadata);
      jest.spyOn(githubService, 'getRepoTree').mockResolvedValue(mockTree);
      jest.spyOn(githubService, 'getFilesParallel').mockResolvedValue(mockFileContents);
      jest.spyOn(dependencyService, 'extractFilesByLanguage').mockReturnValue([]);
      jest.spyOn(llmService, 'analyzeCodeArchitecture').mockResolvedValue({
        analysis: 'Empty repo',
        provider: 'huggingface',
        rawResponse: {},
        filesAnalyzed: 0
      });
      jest.spyOn(llmService, 'generateDetailedDiagram').mockResolvedValue({
        diagram: 'graph LR\nEmpty',
        provider: 'huggingface',
        rawResponse: {}
      });

      await architectureService.generateArchitectureDiagram({
        repoUrl: 'https://github.com/testOwner/testRepo'
      });

      // Verify extractFilesByLanguage was called with 'all' (default language)
      expect(dependencyService.extractFilesByLanguage).toHaveBeenCalledWith(
        mockTree,
        'all',
        { includeTests: false }
      );
    });

    test('should cache result after generation', async () => {
      const mockMetadata = {
        owner: 'cacheOwner',
        repo: 'cacheRepo',
        branch: 'main',
        latestCommit: { sha: 'cache123' }
      };

      jest.spyOn(githubService, 'fetchRepoMetadata').mockResolvedValue(mockMetadata);
      jest.spyOn(githubService, 'getRepoTree').mockResolvedValue([]);
      jest.spyOn(githubService, 'getFilesParallel').mockResolvedValue(new Map());
      jest.spyOn(dependencyService, 'extractFilesByLanguage').mockReturnValue([]);
      jest.spyOn(llmService, 'analyzeCodeArchitecture').mockResolvedValue({
        analysis: 'Cached analysis',
        provider: 'huggingface',
        rawResponse: {},
        filesAnalyzed: 0
      });
      jest.spyOn(llmService, 'generateDetailedDiagram').mockResolvedValue({
        diagram: 'graph LR\nCached',
        provider: 'huggingface',
        rawResponse: {}
      });

      // Generate diagram (should cache)
      await architectureService.generateArchitectureDiagram({
        repoUrl: 'https://github.com/cacheOwner/cacheRepo'
      });

      // Check that cache was populated
      const cacheKey = cacheService.buildArchitectureKey('cacheOwner', 'cacheRepo', 'main', 'cache123');
      const cachedValue = cacheService.get(cacheKey);
      
      expect(cachedValue).toBeDefined();
      expect(cachedValue.metadata.llm.cached).toBe(true);
    });

    test('should limit files analyzed to maxFiles parameter', async () => {
      const mockMetadata = {
        owner: 'testOwner',
        repo: 'testRepo',
        branch: 'main',
        latestCommit: { sha: 'limit123' }
      };

      // Create 150 mock files
      const manyFiles = Array.from({ length: 150 }, (_, i) => `src/file${i}.js`);

      jest.spyOn(githubService, 'fetchRepoMetadata').mockResolvedValue(mockMetadata);
      jest.spyOn(githubService, 'getRepoTree').mockResolvedValue([]);
      jest.spyOn(dependencyService, 'extractFilesByLanguage').mockReturnValue(manyFiles);
      
      const getFilesParallelMock = jest.spyOn(githubService, 'getFilesParallel').mockResolvedValue(new Map());
      
      jest.spyOn(llmService, 'analyzeCodeArchitecture').mockResolvedValue({
        analysis: 'Analysis',
        provider: 'huggingface',
        rawResponse: {},
        filesAnalyzed: 50
      });
      jest.spyOn(llmService, 'generateDetailedDiagram').mockResolvedValue({
        diagram: 'graph LR\nLimited',
        provider: 'huggingface',
        rawResponse: {}
      });

      await architectureService.generateArchitectureDiagram({
        repoUrl: 'https://github.com/testOwner/testRepo',
        maxFiles: 50
      });

      // Verify only 50 files were passed to getFilesParallel
      expect(getFilesParallelMock).toHaveBeenCalledWith(
        'testOwner',
        'testRepo',
        manyFiles.slice(0, 50),
        'main'
      );
    });
  });
});
