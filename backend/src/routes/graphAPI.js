import express from 'express';
import graphService from '../services/graphService.js';
import dependencyService from '../services/dependencyService.js';
import cacheService from '../services/cacheService.js';
import dotenv from 'dotenv';
import githubService from '../services/githubService.js';

dotenv.config();

const maxFiles = process.env.MAX_ANALYZE_FILES ? parseInt(process.env.MAX_ANALYZE_FILES) : 100;
const graphRouter = express.Router();

// Endpoint to analyze repository and return diagrams with metadata
graphRouter.get('/api/analyzeRepo', async (req, res) => {
  const { owner, repo, branch, includeTests } = req.query;

  if (!owner || !repo) {
    return res.status(400).json({ 
      error: 'Missing required parameters: owner and repo' 
    });
  }

  // Parse includeTests as boolean (default: false to exclude test files)
  const shouldIncludeTests = includeTests === 'true';

  try {
    const queryBranch = branch || await githubService.getDefaultBranch(owner, repo);
    
    // Get repository info and latest commit metadata
    const [repoInfo, commitData] = await Promise.all([
      githubService.getRepoInfo(owner, repo),
      githubService.getLatestCommit(owner, repo, queryBranch)
    ]);
    const commitSha = commitData.sha;
    
    // Check for cached diagrams using unified cache service
    // Include includeTests in cache key to differentiate results
    const cacheKey = cacheService.buildDependencyKey(owner, repo, queryBranch, commitSha) + (shouldIncludeTests ? ':tests' : '');
    const cached = cacheService.get(cacheKey);
    
    if (cached) {
      return res.json({
        ...cached,
        repoDescription: repoInfo.description,
        commitId: commitData.sha,
        commitMessage: commitData.message
      });
    }

    // Analyze dependencies (excludes test files by default)
    const result = await dependencyService.analyzeDependencies(
      owner, 
      repo, 
      queryBranch, 
      { maxFiles, includeTests: shouldIncludeTests }
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

    // Cache the diagrams using unified cache service
    const timestamp = Math.floor(Date.now() / 1000);
    const cacheData = {
      allDependencies,
      internalDependencies,
      timestamp
    };
    
    cacheService.set(cacheKey, cacheData);

    console.log(`Generated diagrams for ${owner}/${repo} (${queryBranch}@${commitSha})`);

    res.json({
      allDependencies,
      internalDependencies,
      timestamp,
      repoDescription: repoInfo.description,
      commitId: commitData.sha,
      commitMessage: commitData.message
    });

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default graphRouter;