import githubService from './githubService.js';
import llmService from './llmService.js';
import cacheService from './cacheService.js';
import dependencyService from './dependencyService.js';
import { UserInputError } from '../const/errors.js';

/**
 * Generate architecture diagram by analyzing actual source code.
 * Two-step LLM process:
 * 1. Analyze source code to understand architecture
 * 2. Generate detailed Mermaid diagram from analysis
 * 
 * @param {object} params - Parameters
 * @param {string} params.repoUrl - GitHub repository URL
 * @param {string} params.branch - Branch name (optional)
 * @param {number} params.maxFiles - Maximum files to analyze (default: 100)
 * @param {string} params.language - Language filter (default: 'all')
 * @returns {object} Result with diagram, analysis, and metadata
 */
async function generateArchitectureDiagram({ repoUrl, branch, maxFiles = 100, language = 'all' }) {
  if (!repoUrl || typeof repoUrl !== 'string' || repoUrl.trim() === '') {
    throw new UserInputError('The "repoUrl" field is required.');
  }

  // Step 1: Get repository metadata
  const metadata = await githubService.fetchRepoMetadata({
    githubUrl: repoUrl,
    branch
  });

  const commitSha = metadata.latestCommit.sha || 'latest';
  const cacheKey = cacheService.buildArchitectureKey(
    metadata.owner, 
    metadata.repo, 
    metadata.branch, 
    commitSha
  );
  
  // Check cache
  const cachedResult = cacheService.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Step 2: Fetch source code files
  console.log(`Fetching source files for analysis (max: ${maxFiles}, language: ${language})`);
  const tree = await githubService.getRepoTree(metadata.owner, metadata.repo, '', metadata.branch);
  const codeFiles = dependencyService.extractFilesByLanguage(tree, language, { includeTests: false });
  const filesToAnalyze = codeFiles.slice(0, maxFiles);
  
  console.log(`Found ${codeFiles.length} code files, analyzing ${filesToAnalyze.length}`);
  
  const fileContents = await githubService.getFilesParallel(
    metadata.owner,
    metadata.repo,
    filesToAnalyze,
    metadata.branch
  );

  // Step 3: LLM analyzes the code
  console.log('Step 1/2: Analyzing code architecture...');
  const analysisResult = await llmService.analyzeCodeArchitecture(fileContents, metadata);

  // Step 4: LLM generates detailed diagram from analysis
  console.log('Step 2/2: Generating diagram...');
  const diagramResult = await llmService.generateDetailedDiagram(analysisResult.analysis, metadata);

  const result = {
    diagram: diagramResult.diagram,
    analysis: analysisResult.analysis,
    metadata: {
      ...metadata,
      llm: {
        provider: diagramResult.provider,
        cached: false,
        filesAnalyzed: analysisResult.filesAnalyzed,
        steps: 2
      }
    },
    rawLlmResponse: {
      analysis: analysisResult.rawResponse,
      diagram: diagramResult.rawResponse
    },
    prompts: {
      analysis: {
        system: analysisResult.systemPrompt,
        user: analysisResult.prompt
      },
      diagram: {
        system: diagramResult.systemPrompt,
        user: diagramResult.prompt
      }
    }
  };

  // Store in cache with cached flag
  const resultToCache = {
    ...result,
    metadata: {
      ...result.metadata,
      llm: { ...result.metadata.llm, cached: true }
    }
  };
  
  cacheService.set(cacheKey, resultToCache);

  return result;
}

const architectureService = {
  generateArchitectureDiagram
}

export default architectureService;
