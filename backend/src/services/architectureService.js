import repoMetadataService, { parseGithubUrl as parseGithubRepoUrl } from './repoMetadataService.js';
import llmService from './llmService.js';

class UserInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UserInputError';
    this.statusCode = 400;
  }
}

function createArchitectureService({ metadataService = repoMetadataService, llm = llmService } = {}) {
  async function generateArchitectureDiagram({ repoUrl, branch }) {
    if (!repoUrl || typeof repoUrl !== 'string' || repoUrl.trim() === '') {
      throw new UserInputError('The "repoUrl" field is required.');
    }

    const metadata = await metadataService.fetchRepoMetadata({
      githubUrl: repoUrl,
      branch
    });

    const llmResult = await llm.generateArchitectureDiagram(metadata);

    return {
      diagram: llmResult.diagram,
      metadata: {
        ...metadata,
        llm: {
          provider: llmResult.provider
        }
      },
      rawLlmResponse: llmResult.rawResponse,
      prompt: llmResult.prompt,
      systemPrompt: llmResult.systemPrompt
    };
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
