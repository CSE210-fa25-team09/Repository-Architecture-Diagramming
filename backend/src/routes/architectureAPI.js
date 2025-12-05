import express from 'express';
import architectureService from '../services/architectureService.js';
import { UserInputError } from '../const/errors.js';

const architectureRouter = express.Router();

/**
 * Handle architecture diagram requests.
 * Two-step LLM process: analyze code first, then generate diagram.
 */
async function handleRequest(req, res) {
  const repoUrl = req.body?.repoUrl || req.query?.repoUrl;
  const branch = req.body?.branch || req.query?.branch;
  const maxFiles = parseInt(req.body?.maxFiles || req.query?.maxFiles) || 100;
  const language = req.body?.language || req.query?.language || 'all';

  if (!repoUrl) {
    return res.status(400).json({
      success: false,
      error: 'The "repoUrl" parameter is required.'
    });
  }

  try {
    const result = await architectureService.generateArchitectureDiagram({
      repoUrl,
      branch,
      maxFiles,
      language
    });
    return res.json({
      success: true,
      diagram: result.diagram,
      analysis: result.analysis,
      metadata: result.metadata
    });
  } catch (error) {
    console.error('Error generating architecture diagram:', error.message);
    const statusCode = error.statusCode || (error instanceof UserInputError ? 400 : 500);
    return res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
}

architectureRouter.post('/api/architecture', handleRequest);
architectureRouter.get('/api/architecture', handleRequest);

export default architectureRouter;
