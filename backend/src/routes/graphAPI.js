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

// Endpoint to generate Mermaid diagram from a given graph JSON
graphRouter.get('/api/getMermaid', async (req, res) => {
  const { owner, repo, branch } = req.query;
  let queryBranch = branch;

  if (!owner || !repo) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required parameters: owner and repo' 
    });
  }
  if (!branch) {
    queryBranch = await githubService.getDefaultBranch(owner, repo);
  }

  console.log(`Generating Mermaid diagram for ${owner}/${repo} (${queryBranch})\n`);

  try {
    const tree = await githubService.getRepoTree(owner, repo, "", queryBranch);
    const allCodeFiles = dependencyService.extractFilesByLanguage(tree, 'all');
    const filesToAnalyze = maxFiles ? allCodeFiles.slice(0, maxFiles) : allCodeFiles;
    
    console.log(`Found ${allCodeFiles.length} files, analyzing ${filesToAnalyze.length}\n`);
    
    const parsedFiles = [];
    for (const filePath of filesToAnalyze) {
      const content = await githubService.getFile(owner, repo, filePath, queryBranch);
      const parsed = dependencyService.parseFile(content, filePath); // Auto-detects language
      parsedFiles.push(parsed);
      
      console.log(`✓ ${filePath} (${parsed.dependencies.length} deps)`);
    }

    const treeWithDeps = dependencyService.exportDependencyGraphWithTree(parsedFiles, tree);

    const outputDir = path.join(process.cwd(), 'dependency_graphs');
    await fs.mkdir(outputDir, { recursive: true });
    
    // Get the latest commit SHA for filename
    const commitSha = await githubService.getLatestCommit(owner, repo, queryBranch);
    const filename = `${repo}_${queryBranch}_${commitSha}.json`;
    const outputPath = path.join(outputDir, filename);
    
    await fs.writeFile(outputPath, JSON.stringify({ name: repo, type: 'dir', children: treeWithDeps }, null, 2), 'utf-8');
    
    console.log(`\n✅ Saved: ${outputPath}`);
    console.log(`Files analyzed: ${parsedFiles.length}\n`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
});

export default graphRouter;