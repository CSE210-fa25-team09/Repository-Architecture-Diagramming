import { jest } from '@jest/globals';
import llmService from '../src/services/llmService.js';

global.fetch = jest.fn();

describe('LLM Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.LLM_PROVIDER = 'huggingface';
    process.env.LLM_API_KEY = 'mock_key';
    process.env.LLM_API_URL = 'https://api.openai.com';
    
    process.env.LLM_MODEL = 'test-model-v1'; 
  });

  afterAll(() => {
    process.env = originalEnv;
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

    test('HuggingFace: handles different response formats and fallback URL', async () => {
      process.env.LLM_PROVIDER = 'huggingface';
      delete process.env.LLM_API_URL;
      
      const fileContents = new Map([['test.js', 'code']]);
      const metadata = { owner: 'test', repo: 'test', branch: 'main' };

      // Array response format
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([{ generated_text: 'Analysis result' }])
      });
      let result = await llmService.analyzeCodeArchitecture(fileContents, metadata);
      expect(result.analysis).toBe('Analysis result');
      expect(global.fetch.mock.calls[0][0]).toContain('router.huggingface.co/hf-inference/models/test-model-v1');

      // generated_text string format (not array)
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ generated_text: 'Direct analysis' })
      });
      result = await llmService.analyzeCodeArchitecture(fileContents, metadata);
      expect(result.analysis).toBe('Direct analysis');
    });

    test('HuggingFace: uses OpenAI format for /v1/chat/completions endpoints', async () => {
      process.env.LLM_PROVIDER = 'huggingface';
      process.env.LLM_API_URL = 'https://api.example.com/v1/chat/completions';
      
      const fileContents = new Map([['test.js', 'code']]);
      const metadata = { owner: 'test', repo: 'test', branch: 'main' };

      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          choices: [{ message: { content: 'OpenAI format analysis' } }]
        })
      });

      const result = await llmService.analyzeCodeArchitecture(fileContents, metadata);
      expect(result.analysis).toBe('OpenAI format analysis');
      
      // Verify request body has OpenAI format (messages array)
      const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(requestBody.messages).toBeDefined();
      expect(requestBody.messages[0].role).toBe('system');
      expect(requestBody.messages[1].role).toBe('user');
    });

    test('OpenAI: extracts response correctly', async () => {
      process.env.LLM_PROVIDER = 'openai';
      
      const fileContents = new Map([['test.js', 'code']]);
      const metadata = { owner: 'test', repo: 'test', branch: 'main' };

      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          choices: [{ message: { content: 'OpenAI analysis' } }]
        })
      });
      
      const result = await llmService.analyzeCodeArchitecture(fileContents, metadata);
      expect(result.analysis).toBe('OpenAI analysis');
    });

    test('HuggingFace: throws errors for missing config or failed requests', async () => {
      process.env.LLM_PROVIDER = 'huggingface';
      const fileContents = new Map([['test.js', 'code']]);
      const metadata = { owner: 'test', repo: 'test', branch: 'main' };
      
      // Missing API_URL and MODEL
      delete process.env.LLM_API_URL;
      delete process.env.LLM_MODEL;
      await expect(llmService.analyzeCodeArchitecture(fileContents, metadata))
        .rejects.toThrow('LLM_API_URL or LLM_MODEL must be configured');
      
      // Missing API_KEY
      process.env.LLM_MODEL = 'test-model';
      delete process.env.LLM_API_KEY;
      delete process.env.HF_TOKEN;
      await expect(llmService.analyzeCodeArchitecture(fileContents, metadata))
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
      await expect(llmService.analyzeCodeArchitecture(fileContents, metadata))
        .rejects.toThrow('HuggingFace request failed with 500');
      
      // Unparseable response
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => 'not json'
      });
      await expect(llmService.analyzeCodeArchitecture(fileContents, metadata))
        .rejects.toThrow('Unable to parse HuggingFace response');
    });

    test('OpenAI: throws errors for missing config or failed requests', async () => {
      process.env.LLM_PROVIDER = 'openai';
      const fileContents = new Map([['test.js', 'code']]);
      const metadata = { owner: 'test', repo: 'test', branch: 'main' };
      
      // Incomplete config
      delete process.env.LLM_API_URL;
      await expect(llmService.analyzeCodeArchitecture(fileContents, metadata))
        .rejects.toThrow('LLM_API_URL, LLM_API_KEY, and LLM_MODEL must be set');
      
      // Restore for next tests
      process.env.LLM_API_URL = 'https://api.openai.com';
      
      // API error response
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized'
      });
      await expect(llmService.analyzeCodeArchitecture(fileContents, metadata))
        .rejects.toThrow('OpenAI-compatible request failed with 401');
      
      // Unparseable response
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => 'invalid json'
      });
      await expect(llmService.analyzeCodeArchitecture(fileContents, metadata))
        .rejects.toThrow('Unable to parse OpenAI-compatible response');
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

    test('should handle various diagram extraction scenarios', async () => {
      process.env.LLM_PROVIDER = 'huggingface';
      const codeAnalysis = 'Test analysis';
      const metadata = { owner: 'test', repo: 'test', branch: 'main' };
      
      // Non-text response
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([{ generated_text: 12345 }])
      });
      await expect(llmService.generateDetailedDiagram(codeAnalysis, metadata))
        .rejects.toThrow('LLM response payload was not text');
      
      // No Mermaid diagram
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([{ generated_text: 'Just some text without diagram' }])
      });
      await expect(llmService.generateDetailedDiagram(codeAnalysis, metadata))
        .rejects.toThrow('LLM response did not include a Mermaid diagram');
      
      // Extract from <mermaid> tags
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([{ 
          generated_text: 'Here is the diagram:\n<mermaid>graph TD\nTagged-->Diagram</mermaid>' 
        }])
      });
      let result = await llmService.generateDetailedDiagram(codeAnalysis, metadata);
      expect(result.diagram).toBe('graph TD\nTagged-->Diagram');
      
      // Extract raw graph (no code block)
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([{ generated_text: 'graph TD\nRaw-->Diagram' }])
      });
      result = await llmService.generateDetailedDiagram(codeAnalysis, metadata);
      expect(result.diagram).toBe('graph TD\nRaw-->Diagram');
      
      // Extract from code block without mermaid keyword
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([{ generated_text: '```\ngraph LR\nSimple-->Block\n```' }])
      });
      result = await llmService.generateDetailedDiagram(codeAnalysis, metadata);
      expect(result.diagram).toBe('graph LR\nSimple-->Block');
    });

    test('truncates long readme in prompt', async () => {
      process.env.LLM_PROVIDER = 'huggingface';
      
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([{ generated_text: 'graph TD\nA-->B' }])
      });

      const longReadme = 'x'.repeat(5000);
      const metadata = { owner: 'test', repo: 'test', branch: 'main', readme: longReadme };
      
      await llmService.generateDetailedDiagram('Analysis', metadata);
      
      // Check the prompt sent to fetch has truncated readme (2000 chars max)
      const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      const userPrompt = requestBody.inputs || requestBody.messages?.[1]?.content;
      // The full 5000 char readme should NOT appear, only first 2000 chars
      expect(userPrompt).not.toContain(longReadme);
      expect(userPrompt).toContain('x'.repeat(100)); // Should contain some of the readme
    });

    test('should sanitize problematic Mermaid syntax from LLM output', async () => {
      process.env.LLM_PROVIDER = 'huggingface';
      const codeAnalysis = 'Test analysis';
      const metadata = { owner: 'test', repo: 'test', branch: 'main' };

      // Test: Slashes in node labels (causes parallelogram interpretation)
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([{ 
          generated_text: `graph LR
    subgraph API[API Layer]
        apiRate[/api/rateLimit]
        apiBranches[/api/branches/list]
    end
    apiRate-->apiBranches` 
        }])
      });
      let result = await llmService.generateDetailedDiagram(codeAnalysis, metadata);
      // Slashes should be converted to dashes
      expect(result.diagram).toContain('apiRate[api-rateLimit]');
      expect(result.diagram).toContain('apiBranches[api-branches-list]');
      expect(result.diagram).not.toContain('[/api');

      // Test: Parentheses in labels
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([{ 
          generated_text: 'graph TD\n    svc[Service (main)]' 
        }])
      });
      result = await llmService.generateDetailedDiagram(codeAnalysis, metadata);
      expect(result.diagram).toContain('svc[Service main]');
      expect(result.diagram).not.toContain('(main)');

      // Test: Duplicate node definitions removed
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([{ 
          generated_text: `graph LR
    nodeA[First]
    nodeA[Duplicate]
    nodeB[Second]
    nodeA-->nodeB` 
        }])
      });
      result = await llmService.generateDetailedDiagram(codeAnalysis, metadata);
      expect(result.diagram.match(/nodeA\[/g).length).toBe(1); // Only one definition
      expect(result.diagram).toContain('nodeA[First]');
      expect(result.diagram).not.toContain('nodeA[Duplicate]');

      // Test: Reserved keywords as node IDs (graph, subgraph, end, style, etc.)
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([{ 
          generated_text: `graph LR
    subgraph Backend[Backend Layer]
        graph>graphService.js]
        style>styleService.js]
        end>endService.js]
    end
    graph-->style
    style graph fill:#fff` 
        }])
      });
      result = await llmService.generateDetailedDiagram(codeAnalysis, metadata);
      // Reserved keywords should be renamed to avoid conflicts
      expect(result.diagram).toContain('graphNode');
      expect(result.diagram).not.toMatch(/\bgraph\>/); // 'graph>' should be replaced
      expect(result.diagram).toContain('graph LR'); // But 'graph LR' declaration should stay
    });
  });
});
