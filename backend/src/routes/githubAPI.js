import express from 'express';
import githubService from '../services/githubService.js';

const githubRouter = express.Router();

githubRouter.get('/api/branches/:owner/:repo', async (req, res) => {
  const { owner, repo } = req.params;
  try {
    const branches = await githubService.getAllBranches(owner, repo);
    res.json({ success: true, branches });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch branches' });
  }
});

export default githubRouter;
