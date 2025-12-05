import { jest } from '@jest/globals';
import llmService from '../src/services/llmService.js';
import githubService from '../src/services/githubService.js';

global.fetch = jest.fn();

describe('LLM Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    
    jest.spyOn(githubService, 'formatMetadataForPrompt').mockReturnValue('Mock Prompt');

    process.env.LLM_PROVIDER = 'huggingface';
    process.env.LLM_API_KEY = 'mock_key';
    process.env.LLM_API_URL = 'https://api.openai.com';
    
    process.env.LLM_MODEL = 'test-model-v1'; 
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('generateArchitectureDiagram', () => {
    test('should throw error if metadata is missing', async () => {
      await expect(llmService.generateArchitectureDiagram(null))
        .rejects.toThrow('Repository metadata is required');
    });

    test('HuggingFace: handles array response and fallback URL', async () => {
      process.env.LLM_PROVIDER = 'huggingface';
      
      delete process.env.LLM_API_URL;
      
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([{ generated_text: 'graph TD\nX-->Y' }])
      });

      const res = await llmService.generateArchitectureDiagram({});
      
      expect(res.diagram).toBe('graph TD\nX-->Y');
      expect(global.fetch.mock.calls[0][0]).toContain('router.huggingface.co/hf-inference/models/test-model-v1');
    });

    test('OpenAI: Extract response correctly', async () => {
      process.env.LLM_PROVIDER = 'openai';
      
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          choices: [{ message: { content: 'Here: ```mermaid\ngraph A\n```' } }]
        })
      });
      
      const res = await llmService.generateArchitectureDiagram({});
      expect(res.diagram).toBe('graph A');
    });

    test('HuggingFace: uses OpenAI format for /v1/chat/completions endpoints', async () => {
      process.env.LLM_PROVIDER = 'huggingface';
      process.env.LLM_API_URL = 'https://api.example.com/v1/chat/completions';
      
      const diagramContent = 'graph TD\nOpenAI-->Format';
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          choices: [{ message: { content: diagramContent } }]
        })
      });

      const res = await llmService.generateArchitectureDiagram({});
      
      // Should parse the OpenAI-style response - diagram starts with graph
      expect(res.diagram).toContain('graph TD');
      expect(res.diagram).toContain('OpenAI-->Format');
      
      // Verify request body has OpenAI format (messages array)
      const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(requestBody.messages).toBeDefined();
      expect(requestBody.messages[0].role).toBe('system');
      expect(requestBody.messages[1].role).toBe('user');
    });

    test('HuggingFace: throws errors for missing config or failed requests', async () => {
      process.env.LLM_PROVIDER = 'huggingface';
      
      // Missing API_URL and MODEL
      delete process.env.LLM_API_URL;
      delete process.env.LLM_MODEL;
      await expect(llmService.generateArchitectureDiagram({}))
        .rejects.toThrow('LLM_API_URL or LLM_MODEL must be configured');
      
      // Missing API_KEY
      process.env.LLM_MODEL = 'test-model';
      delete process.env.LLM_API_KEY;
      delete process.env.HF_TOKEN;
      await expect(llmService.generateArchitectureDiagram({}))
        .rejects.toThrow('LLM_API_KEY (or HF_TOKEN) is required');
      
      // Restore for next tests
      process.env.LLM_API_KEY = 'mock_key';
      process.env.LLM_API_URL = 'https://api.test.com';
      
      // API error response
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      });
      await expect(llmService.generateArchitectureDiagram({}))
        .rejects.toThrow('HuggingFace request failed with 500');
      
      // Unparseable response
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => 'not json'
      });
      await expect(llmService.generateArchitectureDiagram({}))
        .rejects.toThrow('Unable to parse HuggingFace response');
    });

    test('OpenAI: throws errors for missing config or failed requests', async () => {
      process.env.LLM_PROVIDER = 'openai';
      
      // Incomplete config
      delete process.env.LLM_API_URL;
      await expect(llmService.generateArchitectureDiagram({}))
        .rejects.toThrow('LLM_API_URL, LLM_API_KEY, and LLM_MODEL must be set');
      
      // Restore for next tests
      process.env.LLM_API_URL = 'https://api.openai.com';
      
      // API error response
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized'
      });
      await expect(llmService.generateArchitectureDiagram({}))
        .rejects.toThrow('OpenAI-compatible request failed with 401');
      
      // Unparseable response
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => 'invalid json'
      });
      await expect(llmService.generateArchitectureDiagram({}))
        .rejects.toThrow('Unable to parse OpenAI-compatible response');
    });

    test('should handle various diagram extraction scenarios', async () => {
      process.env.LLM_PROVIDER = 'huggingface';
      
      // Non-text response
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([{ generated_text: 12345 }])
      });
      await expect(llmService.generateArchitectureDiagram({}))
        .rejects.toThrow('LLM response payload was not text');
      
      // No Mermaid diagram
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([{ generated_text: 'Just some text without diagram' }])
      });
      await expect(llmService.generateArchitectureDiagram({}))
        .rejects.toThrow('LLM response did not include a Mermaid diagram');
      
      // Extract from <mermaid> tags
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([{ 
          generated_text: 'Here is the diagram:\n<mermaid>graph TD\nTagged-->Diagram</mermaid>' 
        }])
      });
      let res = await llmService.generateArchitectureDiagram({});
      expect(res.diagram).toBe('graph TD\nTagged-->Diagram');
      
      // Extract raw graph (no code block)
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([{ generated_text: 'graph TD\nRaw-->Diagram' }])
      });
      res = await llmService.generateArchitectureDiagram({});
      expect(res.diagram).toBe('graph TD\nRaw-->Diagram');
      
      // generated_text string format (not array)
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ generated_text: 'graph TD\nDirect-->Response' })
      });
      res = await llmService.generateArchitectureDiagram({});
      expect(res.diagram).toBe('graph TD\nDirect-->Response');
    });
  });

  describe('analyzeCodeArchitecture', () => {
    test('should throw error for invalid fileContents', async () => {
      await expect(llmService.analyzeCodeArchitecture(new Map(), {}))
        .rejects.toThrow('Source code files are required');
      await expect(llmService.analyzeCodeArchitecture(null, {}))
        .rejects.toThrow('Source code files are required');
    });

    test('should analyze code, truncate large files, and respect limits', async () => {
      process.env.LLM_PROVIDER = 'huggingface';
      
      // Normal analysis
      const fileContents = new Map([
        ['src/index.js', 'const express = require("express");'],
        ['src/utils.js', 'export function helper() {}']
      ]);
      const metadata = { owner: 'testOwner', repo: 'testRepo', branch: 'main', fileTree: 'src/' };

      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([{ generated_text: 'Node.js Express application' }])
      });

      let result = await llmService.analyzeCodeArchitecture(fileContents, metadata);
      expect(result.analysis).toBe('Node.js Express application');
      expect(result.filesAnalyzed).toBe(2);
      expect(result.prompt).toContain('src/index.js');
      
      // Large file truncation
      const largeFileContents = new Map([['large.js', 'x'.repeat(5000)]]);
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([{ generated_text: 'Analysis' }])
      });
      result = await llmService.analyzeCodeArchitecture(largeFileContents, metadata);
      expect(result.prompt).toContain('... (truncated)');
      
      // Many files - total limit
      const manyFiles = new Map();
      for (let i = 0; i < 50; i++) manyFiles.set(`file${i}.js`, 'x'.repeat(3000));
      result = await llmService.analyzeCodeArchitecture(manyFiles, metadata);
      expect(result.prompt.length).toBeLessThan(150000);
    });
  });

  describe('generateDetailedDiagram', () => {
    test('should throw error for invalid codeAnalysis', async () => {
      await expect(llmService.generateDetailedDiagram(null, {}))
        .rejects.toThrow('Code analysis is required');
      await expect(llmService.generateDetailedDiagram('', {}))
        .rejects.toThrow('Code analysis is required');
    });

    test('should generate diagram and handle various metadata states', async () => {
      process.env.LLM_PROVIDER = 'huggingface';
      
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([{ generated_text: '```mermaid\ngraph LR\nApp-->Routes\n```' }])
      });

      // Full metadata
      const codeAnalysis = 'Express.js application with routes and middleware.';
      const metadata = {
        owner: 'testOwner', repo: 'testRepo', branch: 'main',
        fileTree: 'src/\n  app.js', readme: 'This is my awesome project'
      };
      let result = await llmService.generateDetailedDiagram(codeAnalysis, metadata);
      expect(result.diagram).toBe('graph LR\nApp-->Routes');
      expect(result.prompt).toContain('Express.js application');
      expect(result.prompt).toContain('testOwner/testRepo');
      expect(result.prompt).toContain('This is my awesome project');
      
      // Missing fileTree/readme
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([{ generated_text: 'graph TD\nA-->B' }])
      });
      result = await llmService.generateDetailedDiagram('Test', { owner: 'test', repo: 'test', branch: 'main' });
      expect(result.prompt).toContain('Not available');
    });
  });
});
