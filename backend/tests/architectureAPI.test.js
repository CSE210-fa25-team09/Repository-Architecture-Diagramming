import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { createArchitectureRouter } from '../src/routes/architectureAPI.js';
import { UserInputError } from '../src/services/architectureService.js';

describe('Architecture API', () => {
  let app;
  let mockService;

  const mockResult = {
    diagram: 'graph TD\nA-->B',
    metadata: {
      owner: 'test',
      repo: 'repo',
      repoUrl: 'https://github.com/test/repo',
      branch: 'main',
      llm: { provider: 'openai' }
    },
    rawLlmResponse: {},
    prompt: 'test prompt',
    systemPrompt: 'test system prompt'
  };

  beforeEach(() => {
    // Create mock service
    mockService = {
      generateArchitectureDiagram: jest.fn()
    };

    // Setup Express app with the router
    app = express();
    app.use(express.json());
    app.use(createArchitectureRouter(mockService));

    // Default successful response
    mockService.generateArchitectureDiagram.mockResolvedValue(mockResult);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/architecture', () => {
    test('should generate diagram with valid request body', async () => {
      const response = await request(app)
        .post('/api/architecture')
        .send({
          repoUrl: 'https://github.com/test/repo',
          branch: 'main'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('diagram', 'graph TD\nA-->B');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('llm');
    });

    test('should call service with correct parameters', async () => {
      await request(app)
        .post('/api/architecture')
        .send({
          repoUrl: 'https://github.com/facebook/react',
          branch: 'main'
        });

      expect(mockService.generateArchitectureDiagram).toHaveBeenCalledWith({
        repoUrl: 'https://github.com/facebook/react',
        branch: 'main'
      });
    });

    test('should handle request without branch parameter', async () => {
      await request(app)
        .post('/api/architecture')
        .send({
          repoUrl: 'https://github.com/test/repo'
        });

      expect(mockService.generateArchitectureDiagram).toHaveBeenCalledWith({
        repoUrl: 'https://github.com/test/repo',
        branch: undefined
      });
    });

    test('should return 400 if repoUrl is missing', async () => {
      const response = await request(app)
        .post('/api/architecture')
        .send({
          branch: 'main'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'The "repoUrl" parameter is required.');
    });

    test('should return 400 if repoUrl is empty string', async () => {
      const response = await request(app)
        .post('/api/architecture')
        .send({
          repoUrl: ''
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'The "repoUrl" parameter is required.');
    });

    test('should handle UserInputError from service', async () => {
      mockService.generateArchitectureDiagram.mockRejectedValue(
        new UserInputError('Invalid repository URL')
      );

      const response = await request(app)
        .post('/api/architecture')
        .send({
          repoUrl: 'invalid-url'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid repository URL');
    });

    test('should handle service errors with statusCode', async () => {
      const error = new Error('Repository not found');
      error.statusCode = 404;
      mockService.generateArchitectureDiagram.mockRejectedValue(error);

      const response = await request(app)
        .post('/api/architecture')
        .send({
          repoUrl: 'https://github.com/test/nonexistent'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Repository not found');
    });

    test('should return 500 for unknown errors', async () => {
      mockService.generateArchitectureDiagram.mockRejectedValue(
        new Error('Unexpected error')
      );

      const response = await request(app)
        .post('/api/architecture')
        .send({
          repoUrl: 'https://github.com/test/repo'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Unexpected error');
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/architecture')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/architecture', () => {
    test('should generate diagram with query parameters', async () => {
      const response = await request(app)
        .get('/api/architecture')
        .query({
          repoUrl: 'https://github.com/test/repo',
          branch: 'main'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('diagram');
      expect(response.body).toHaveProperty('metadata');
    });

    test('should call service with correct parameters', async () => {
      await request(app)
        .get('/api/architecture')
        .query({
          repoUrl: 'https://github.com/expressjs/express',
          branch: 'master'
        });

      expect(mockService.generateArchitectureDiagram).toHaveBeenCalledWith({
        repoUrl: 'https://github.com/expressjs/express',
        branch: 'master'
      });
    });

    test('should handle request without branch parameter', async () => {
      await request(app)
        .get('/api/architecture')
        .query({
          repoUrl: 'https://github.com/test/repo'
        });

      expect(mockService.generateArchitectureDiagram).toHaveBeenCalledWith({
        repoUrl: 'https://github.com/test/repo',
        branch: undefined
      });
    });

    test('should return 400 if repoUrl is missing', async () => {
      const response = await request(app)
        .get('/api/architecture')
        .query({
          branch: 'main'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'The "repoUrl" parameter is required.');
    });

    test('should handle service errors', async () => {
      mockService.generateArchitectureDiagram.mockRejectedValue(
        new Error('Service error')
      );

      const response = await request(app)
        .get('/api/architecture')
        .query({
          repoUrl: 'https://github.com/test/repo'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('success', false);
    });

    test('should handle URL-encoded special characters', async () => {
      const repoUrl = 'https://github.com/test/repo-with-special-chars';
      
      await request(app)
        .get('/api/architecture')
        .query({ repoUrl });

      expect(mockService.generateArchitectureDiagram).toHaveBeenCalledWith({
        repoUrl,
        branch: undefined
      });
    });
  });

  describe('Request Parameter Priority', () => {
    test('should prefer body parameters over query parameters for POST', async () => {
      await request(app)
        .post('/api/architecture')
        .query({
          repoUrl: 'https://github.com/query/repo',
          branch: 'query-branch'
        })
        .send({
          repoUrl: 'https://github.com/body/repo',
          branch: 'body-branch'
        });

      expect(mockService.generateArchitectureDiagram).toHaveBeenCalledWith({
        repoUrl: 'https://github.com/body/repo',
        branch: 'body-branch'
      });
    });

    test('should fallback to query parameters if body is empty', async () => {
      await request(app)
        .post('/api/architecture')
        .query({
          repoUrl: 'https://github.com/query/repo',
          branch: 'query-branch'
        })
        .send({});

      expect(mockService.generateArchitectureDiagram).toHaveBeenCalledWith({
        repoUrl: 'https://github.com/query/repo',
        branch: 'query-branch'
      });
    });
  });

  describe('Response Format', () => {
    test('should return only diagram and metadata in response', async () => {
      const response = await request(app)
        .post('/api/architecture')
        .send({
          repoUrl: 'https://github.com/test/repo'
        });

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('diagram');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body).not.toHaveProperty('rawLlmResponse');
      expect(response.body).not.toHaveProperty('prompt');
      expect(response.body).not.toHaveProperty('systemPrompt');
    });

    test('should have correct Content-Type header', async () => {
      const response = await request(app)
        .post('/api/architecture')
        .send({
          repoUrl: 'https://github.com/test/repo'
        });

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Error Logging', () => {
    let consoleErrorSpy;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    test('should log errors to console', async () => {
      mockService.generateArchitectureDiagram.mockRejectedValue(
        new Error('Test error')
      );

      await request(app)
        .post('/api/architecture')
        .send({
          repoUrl: 'https://github.com/test/repo'
        });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error generating architecture diagram:',
        'Test error'
      );
    });
  });
});

