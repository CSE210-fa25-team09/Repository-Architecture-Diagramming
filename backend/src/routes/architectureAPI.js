import express from 'express';
import architectureService from '../services/architectureService.js';
import { UserInputError } from '../services/architectureService.js';

export function createArchitectureRouter(service = architectureService) {
  const router = express.Router();

  async function handleRequest(req, res) {
    const repoUrl = req.body?.repoUrl || req.query?.repoUrl;
    const branch = req.body?.branch || req.query?.branch;

    if (!repoUrl) {
      return res.status(400).json({
        success: false,
        error: 'The "repoUrl" parameter is required.'
      });
    }

    try {
      const result = await service.generateArchitectureDiagram({ repoUrl, branch });
      return res.json({
        success: true,
        diagram: result.diagram,
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

  router.post('/api/architecture', handleRequest);
  router.get('/api/architecture', handleRequest);

  return router;
}

export default createArchitectureRouter();
