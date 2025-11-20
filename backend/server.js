/**
 * Simple Express Server for Repository Architecture Diagramming API
 */

import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
dotenv.config();

import express from 'express';
import cors from 'cors';
import githubRouter from './src/routes/githubAPI.js';
import graphRouter from './src/routes/graphAPI.js';
import llmRouter from './src/routes/llmAPI.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Server is running'
  });
});

app.use(githubRouter);
app.use(graphRouter);
app.use(llmRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handling
app.use((err, req, res) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`\nPress Ctrl+C to stop\n`);
});

export default app;
