import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import graphService from '../services/graphService.js';
import dependencyService from '../services/dependencyService.js';
import dotenv from 'dotenv';
import githubService from '../services/githubService.js';

dotenv.config();

const maxFiles = process.env.MAX_ANALYZE_FILES ? parseInt(process.env.MAX_ANALYZE_FILES) : 1000;
const graphRouter = express.Router();

// Endpoint to get Mermaid diagrams
graphRouter.get('/api/getMermaid', async (req, res) => {
  const { owner, repo, branch } = req.query;

  if (!owner || !repo) {
    return res.status(400).json({ 
      error: 'Missing required parameters: owner and repo' 
    });
  }

  try {
    const queryBranch = branch || await githubService.getDefaultBranch(owner, repo);
    
    // Get commit SHA for cache key
    const commitSha = await githubService.getLatestCommit(owner, repo, queryBranch);
    const folderName = `${repo}_${queryBranch}_${commitSha}`;
    const cacheDir = path.join(process.cwd(), 'mermaid_diagrams', folderName);
    
    // Check if cached diagrams exist
    const internalPath = path.join(cacheDir, 'internal_dependencies.mmd');
    const allPath = path.join(cacheDir, 'all_dependencies.mmd');
    
    try {
      const [internalDependencies, allDependencies] = await Promise.all([
        fs.readFile(internalPath, 'utf-8'),
        fs.readFile(allPath, 'utf-8')
      ]);
      
      console.log(`✅ Retrieved cached diagrams for ${owner}/${repo} (${queryBranch}@${commitSha})\n`);
      
      return res.json({
        allDependencies,
        internalDependencies
      });
    } catch (cacheErr) {
      // Cache miss - generate new diagrams
      console.log(`Cache miss for ${owner}/${repo} (${queryBranch}@${commitSha})`);
      console.log(`Error: ${cacheErr.message}`);
    }

    // Analyze dependencies (analyze all files)
    const result = await dependencyService.analyzeDependencies(
      githubService, 
      owner, 
      repo, 
      queryBranch, 
      { maxFiles }
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

    // Cache the diagrams
    await fs.mkdir(cacheDir, { recursive: true });
    await Promise.all([
      fs.writeFile(internalPath, internalDependencies, 'utf-8'),
      fs.writeFile(allPath, allDependencies, 'utf-8')
    ]);

    console.log(`✅ Generated and cached diagrams for ${owner}/${repo} (${queryBranch}@${commitSha})\n`);

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