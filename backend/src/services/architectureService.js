import repoMetadataService, { parseGithubUrl as parseGithubRepoUrl } from './repoMetadataService.js';
import llmService from './llmService.js';
import cacheService from './cacheService.js';

class UserInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UserInputError';
    this.statusCode = 400;
  }
}

function createArchitectureService({ metadataService = repoMetadataService, llm = llmService, cache = cacheService } = {}) {
  async function generateArchitectureDiagram({ repoUrl, branch }) {
    if (!repoUrl || typeof repoUrl !== 'string' || repoUrl.trim() === '') {
      throw new UserInputError('The "repoUrl" field is required.');
    }

    const metadata = await metadataService.fetchRepoMetadata({
      githubUrl: repoUrl,
      branch
    });

    const cacheKey = `diagram:${metadata.owner}:${metadata.repo}:${metadata.branch}:${metadata.latestCommit.sha || 'latest'}`;
    
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      console.log(`[Cache Hit] Serving diagram for ${cacheKey}`);
      return cachedResult;
    }

    // console.log(`Cache Miss ${cacheKey}`);

    const llmResult = await llm.generateArchitectureDiagram(metadata);

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

    // Store in Cache
    const resultToCache = {
      ...result,
      metadata: {
        ...result.metadata,
        llm: { ...result.metadata.llm, cached: true }
      }
    };
    
    cache.set(cacheKey, resultToCache);

    return result;
  }

  return {
    generateArchitectureDiagram,
    parseGithubUrl: parseGithubRepoUrl
  };
}

const architectureService = createArchitectureService();

export default architectureService;
export {
  createArchitectureService,
  UserInputError,
  parseGithubRepoUrl as parseGithubUrl
};
