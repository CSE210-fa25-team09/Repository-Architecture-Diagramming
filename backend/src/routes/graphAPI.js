import express from 'express';
import graphService from '../services/graphService.js';
import dependencyService from '../services/dependencyService.js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import githubService from '../services/githubService.js';

dotenv.config();

const maxFiles = process.env.MAX_ANALYZE_FILES ? parseInt(process.env.MAX_ANALYZE_FILES) : 1000;
const graphRouter = express.Router();

// Endpoint to analyze dependencies and save to cache
graphRouter.get('/api/analyzeDep', async (req, res) => {
  const { owner, repo, branch, language = 'all' } = req.query;
  let queryBranch = branch;

  if (!owner || !repo) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required parameters: owner and repo' 
    });
  }

  try {
    if (!branch) {
      queryBranch = await githubService.getDefaultBranch(owner, repo);
    }

    console.log(`Analyzing dependencies for ${owner}/${repo} (${queryBranch})`);

    // Use the new analyzeDependencies function
    const result = await dependencyService.analyzeDependencies(
      githubService, 
      owner, 
      repo, 
      queryBranch, 
      { maxFiles, language, verbose: true }
    );

    if (!result.success) {
      return res.status(500).json(result);
    }

    const { tree, metadata } = result.data;

    // Save to cache
    const outputDir = path.join(process.cwd(), 'dependency_graphs');
    await fs.mkdir(outputDir, { recursive: true });
    
    const filename = `${repo}_${queryBranch}_${metadata.commitSha}.json`;
    const outputPath = path.join(outputDir, filename);
    
    await fs.writeFile(
      outputPath, 
      JSON.stringify({ name: repo, type: 'dir', children: tree }, null, 2), 
      'utf-8'
    );

    console.log(`✅ Saved: ${outputPath}`);
    console.log(`Files analyzed: ${metadata.analyzedFiles}\n`);

    res.json({
      success: true,
      data: {
        metadata,
        cachePath: filename
      }
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Endpoint to get Mermaid diagrams (checks cache first)
graphRouter.get('/api/getMermaid', async (req, res) => {
  const { owner, repo, branch, diagramType = 'all', styled = 'true' } = req.query;
  let queryBranch = branch;

  if (!owner || !repo) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required parameters: owner and repo' 
    });
  }

  try {
    if (!branch) {
      queryBranch = await githubService.getDefaultBranch(owner, repo);
    }

    const commitSha = await githubService.getLatestCommit(owner, repo, queryBranch);
    const cacheFilename = `${repo}_${queryBranch}_${commitSha}.json`;
    const cachePath = path.join(process.cwd(), 'dependency_graphs', cacheFilename);
    
    // Check if cached dependency graph exists
    let treeData;
    try {
      const cacheContent = await fs.readFile(cachePath, 'utf-8');
      treeData = JSON.parse(cacheContent);
      console.log(`✓ Using cached dependency graph: ${cacheFilename}`);
    } catch (err) {
      // Cache miss - need to analyze first
      console.log(`✗ Cache miss for ${cacheFilename}, analyzing dependencies...`);
      
      const result = await dependencyService.analyzeDependencies(
        githubService, 
        owner, 
        repo, 
        queryBranch, 
        { maxFiles, language: 'all', verbose: false }
      );

      if (!result.success) {
        return res.status(500).json(result);
      }

      const { tree } = result.data;
      treeData = { name: repo, type: 'dir', children: tree };
      
      // Save to cache
      const outputDir = path.join(process.cwd(), 'dependency_graphs');
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(cachePath, JSON.stringify(treeData, null, 2), 'utf-8');
      console.log(`✓ Cached dependency graph: ${cacheFilename}`);
    }

    // Generate Mermaid diagrams
    const isStyled = styled === 'true';
    const diagrams = {};

    if (diagramType === 'all' || diagramType === 'full') {
      diagrams.allDependencies = graphService.generateStyledMermaidFlowchart(
        treeData.children, 
        { styled: isStyled, showExternal: true, showBuiltin: false }
      );
    }

    if (diagramType === 'all' || diagramType === 'internal') {
      diagrams.internalDependencies = graphService.generateStyledMermaidFlowchart(
        treeData.children, 
        { styled: isStyled, showExternal: false, showBuiltin: false }
      );
    }

    res.json({
      success: true,
      data: {
        diagrams,
        metadata: {
          owner,
          repo,
          branch: queryBranch,
          commitSha,
          cached: true,
          diagramType,
          styled: isStyled
        }
      }
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

export default graphRouter;