import express from 'express';
import githubService from '../services/githubService.js';

const githubRouter = express.Router();

// Rate limit check endpoint
githubRouter.get('/api/rateLimit', async (req, res) => {
  try {
    const cachedRateLimit = await githubService.getRateLimit();
    const isAuthenticated = !!process.env.GITHUB_TOKEN;
    
    // Also show what limit we expect: 60 without token, 5000 with token
    const expectedLimit = isAuthenticated ? 5000 : 60;
    
    res.json({ 
      success: true, 
      authenticated: isAuthenticated,
      tokenPrefix: process.env.GITHUB_TOKEN ? process.env.GITHUB_TOKEN.substring(0, 7) + '...' : 'none',
      expectedLimit: expectedLimit,
      cachedRateLimit: cachedRateLimit,
      note: 'Cached rate limit is updated after each GitHub API call'
    });
  } catch (error) {
    console.error('Error fetching rate limit:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch rate limit' });
  }
});

githubRouter.get('/api/branches', async (req, res) => {
  const { owner, repo } = req.query;
  
  if (!owner || !repo) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required query parameters: owner and repo' 
    });
  }
  
  try {
    const branches = await githubService.getAllBranches(owner, repo);
    res.json({ success: true, branches });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch branches' });
  }
});

githubRouter.get('/api/repoTree', async (req, res) => {
  const { owner, repo, branch } = req.query;
  
  if (!owner || !repo) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required query parameters: owner and repo' 
    });
  }
  
  try {
    const tree = branch 
      ? await githubService.getRepoTree(owner, repo, "", branch)
      : await githubService.getRepoTree(owner, repo);
    res.json({ success: true, tree });
  } catch (error) {
    console.error('Error fetching repo tree:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch repo tree' });
  }
});

export default githubRouter;
