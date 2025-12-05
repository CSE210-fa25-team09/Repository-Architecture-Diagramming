import githubService from './githubService.js';
import llmService from './llmService.js';
import cacheService from './cacheService.js';
import { UserInputError } from '../const/errors.js';

async function generateArchitectureDiagram({ repoUrl, branch }) {
  if (!repoUrl || typeof repoUrl !== 'string' || repoUrl.trim() === '') {
    throw new UserInputError('The "repoUrl" field is required.');
  }

  const metadata = await githubService.fetchRepoMetadata({
    githubUrl: repoUrl,
    branch
  });

  const commitSha = metadata.latestCommit.sha || 'latest';
  const cacheKey = cacheService.buildArchitectureKey(metadata.owner, metadata.repo, metadata.branch, commitSha);
  
  const cachedResult = cacheService.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  const llmResult = await llmService.generateArchitectureDiagram(metadata);

  const result = {
    diagram: llmResult.diagram,
    metadata: {
      ...metadata,
      llm: {
        provider: llmResult.provider,
        cached: false
      }
    },
    rawLlmResponse: llmResult.rawResponse,
    prompt: llmResult.prompt,
    systemPrompt: llmResult.systemPrompt
  };

  // Store in Cache with cached flag set to true
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
