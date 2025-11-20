import express from 'express';
import repoMetadataService, { RepoMetadataError } from '../services/repoMetadataService.js';
import llmService, { LlmProviderError } from '../services/llmService.js';

const llmRouter = express.Router();

llmRouter.post('/api/architecture/diagram', async (req, res) => {
  const { githubUrl, branch } = req.body || {};

  if (!githubUrl) {
    return res.status(400).json({
      success: false,
      error: 'githubUrl is required, e.g. https://github.com/owner/repo'
    });
  }

  try {
    const metadata = await repoMetadataService.fetchRepoMetadata({ githubUrl, branch });
    const diagram = await llmService.generateArchitectureDiagram(metadata);

    res.json({
      success: true,
      target: {
        owner: metadata.owner,
        repo: metadata.repo,
        branch: metadata.branch,
        latestCommit: metadata.latestCommit
      },
      diagram: diagram.diagram,
      provider: diagram.provider,
      usage: diagram.usage || null,
      metadata: {
        repoUrl: metadata.repoUrl,
        branchCount: metadata.branches?.total ?? 0,
        branchPreview: metadata.branches?.preview ?? [],
        fileTreeStats: metadata.fileTree?.stats,
        generatedAt: metadata.generatedAt
      }
    });
  } catch (error) {
    if (error instanceof RepoMetadataError || error.name === 'RepoMetadataError') {
      return res.status(error.statusCode || 400).json({
        success: false,
        error: error.message
      });
    }

    if (error instanceof LlmProviderError || error.name === 'LlmProviderError') {
      return res.status(error.statusCode || 502).json({
        success: false,
        error: error.message,
        details: error.details
      });
    }

    console.error('Unexpected LLM route error:', error);
    res.status(500).json({
      success: false,
      error: 'Unexpected server error.'
    });
  }
});

export default llmRouter;
