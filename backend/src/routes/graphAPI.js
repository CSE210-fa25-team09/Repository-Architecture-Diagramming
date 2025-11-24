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

async function checkCache(baseCacheDir, repo, branch, commitSha) {
  try {
    const cachePrefix = `${repo}_${branch}_${commitSha}_`;
    const entries = await fs.readdir(baseCacheDir);
    const matchingDir = entries
      .filter(entry => entry.startsWith(cachePrefix))
      .sort()
      .pop(); // Get most recent
    
    if (matchingDir) {
      const cachedDir = path.join(baseCacheDir, matchingDir);
      const cachedTimestamp = parseInt(matchingDir.split('_').pop());
      const internalPath = path.join(cachedDir, 'internal_dependencies.mmd');
      const allPath = path.join(cachedDir, 'all_dependencies.mmd');
      
      const [internalDependencies, allDependencies] = await Promise.all([
        fs.readFile(internalPath, 'utf-8'),
        fs.readFile(allPath, 'utf-8')
      ]);
      
      return {
        allDependencies,
        internalDependencies,
        timestamp: cachedTimestamp
      };
    }
  } catch (err) {
    // Cache miss or read error
  }
  
  return null;
}

async function removeOutdatedCache(baseCacheDir, repo, branch, currentCommitSha) {
  try {
    const entries = await fs.readdir(baseCacheDir);
    const outdatedDirs = entries.filter(entry => {
      // Match pattern: {repo}_{branch}_{oldCommitSha}_{timestamp}
      if (!entry.startsWith(`${repo}_${branch}_`)) return false;
      // Extract the commit SHA (third component)
      const parts = entry.split('_');
      if (parts.length < 4) return false;
      const entryCommitSha = parts[2];
      return entryCommitSha !== currentCommitSha;
    });
    
    for (const dir of outdatedDirs) {
      const dirPath = path.join(baseCacheDir, dir);
      await fs.rm(dirPath, { recursive: true, force: true });
      console.log(`   Deleted outdated cache: ${dir}`);
    }
    
    if (outdatedDirs.length > 0) {
      console.log(`   Cleaned up ${outdatedDirs.length} outdated cache(s)`);
    }
  } catch (cleanupErr) {
    console.error(`   Warning: Cache cleanup failed - ${cleanupErr.message}`);
  }
}

// Endpoint to analyze repository and return diagrams with metadata
graphRouter.get('/api/analyzeRepo', async (req, res) => {
  const { owner, repo, branch } = req.query;

  if (!owner || !repo) {
    return res.status(400).json({ 
      error: 'Missing required parameters: owner and repo' 
    });
  }

  try {
    const queryBranch = branch || await githubService.getDefaultBranch(owner, repo);
    const baseCacheDir = path.join(process.cwd(), 'mermaid_diagrams');
    
    // Get repository info and latest commit metadata
    const [repoInfo, commitData] = await Promise.all([
      githubService.getRepoInfo(owner, repo),
      githubService.getLatestCommit(owner, repo, queryBranch)
    ]);
    const commitSha = commitData.sha;
    
    // Check for cached diagrams
    const cached = await checkCache(baseCacheDir, repo, queryBranch, commitSha);
    if (cached) {
      console.log(`✅ Retrieved cached diagrams for ${owner}/${repo} (${queryBranch}@${commitSha})\n`);
      return res.json({
        ...cached,
        repoDescription: repoInfo.description,
        commitId: commitData.sha,
        commitMessage: commitData.message
      });
    }
    
    console.log(`Cache miss for ${owner}/${repo} (${queryBranch}@${commitSha})`);

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
    const timestamp = Math.floor(Date.now() / 1000);
    const folderName = `${repo}_${queryBranch}_${commitSha}_${timestamp}`;
    const cacheDir = path.join(baseCacheDir, folderName);
    const internalPath = path.join(cacheDir, 'internal_dependencies.mmd');
    const allPath = path.join(cacheDir, 'all_dependencies.mmd');
    
    await fs.mkdir(cacheDir, { recursive: true });
    await Promise.all([
      fs.writeFile(internalPath, internalDependencies, 'utf-8'),
      fs.writeFile(allPath, allDependencies, 'utf-8')
    ]);

    console.log(`✅ Generated and cached diagrams for ${owner}/${repo} (${queryBranch}@${commitSha})`);

    // Remove outdated caches
    await removeOutdatedCache(baseCacheDir, repo, queryBranch, commitSha);

    res.json({
      allDependencies,
      internalDependencies,
      timestamp,
      repoDescription: repoInfo.description,
      commitId: commitData.sha,
      commitMessage: commitData.message
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default graphRouter;