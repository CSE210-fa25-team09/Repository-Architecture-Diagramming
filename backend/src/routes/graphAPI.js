import express from 'express';
import graphService from '../services/graphService.js';
import dependencyService from '../services/dependencyService.js';
import dotenv from 'dotenv';
import githubService from '../services/githubService.js';

dotenv.config();

const maxFiles = process.env.MAX_ANALYZE_FILES ? parseInt(process.env.MAX_ANALYZE_FILES) : 1000;
const graphRouter = express.Router();

// Endpoint to get Mermaid diagrams
graphRouter.get('/api/getMermaid', async (req, res) => {
  const { owner, repo, branch, language = 'all' } = req.query;

  if (!owner || !repo) {
    return res.status(400).json({ 
      error: 'Missing required parameters: owner and repo' 
    });
  }

  try {
    const queryBranch = branch || await githubService.getDefaultBranch(owner, repo);

    console.log(`Generating Mermaid diagrams for ${owner}/${repo} (${queryBranch})`);

    // Analyze dependencies
    const result = await dependencyService.analyzeDependencies(
      githubService, 
      owner, 
      repo, 
      queryBranch, 
      { maxFiles, language }
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Generate both Mermaid diagrams
    const allDependencies = graphService.generateStyledMermaidFlowchart(
      result.data.tree, 
      { styled: true, showExternal: true, showBuiltin: false }
    );

    const internalDependencies = graphService.generateStyledMermaidFlowchart(
      result.data.tree, 
      { styled: true, showExternal: false, showBuiltin: false }
    );

    console.log(`✅ Generated diagrams\n`);

    res.json({
      allDependencies,
      internalDependencies
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default graphRouter;