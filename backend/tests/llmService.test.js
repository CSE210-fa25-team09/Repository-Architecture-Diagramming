import { jest } from '@jest/globals';
import llmService from '../src/services/llmService.js';
import repoMetadataService from '../src/services/repoMetadataService.js';
import { LlmProviderError } from '../src/services/llmService.js';

global.fetch = jest.fn();

describe('LLM Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    
    jest.spyOn(repoMetadataService, 'formatMetadataForPrompt').mockReturnValue('Mock Prompt');

    process.env.LLM_PROVIDER = 'huggingface';
    process.env.LLM_API_KEY = 'mock_key';
    process.env.LLM_API_URL = 'https://api.openai.com';
    process.env.LLM_MODEL = 'test-model-v1';
    process.env.LLM_MAX_NEW_TOKENS = '1024';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Input Validation', () => {
    test('should throw error if metadata is missing', async () => {
      await expect(llmService.generateArchitectureDiagram(null))
        .rejects.toThrow('Repository metadata is required');
    });

    test('should throw error if metadata is undefined', async () => {
      await expect(llmService.generateArchitectureDiagram(undefined))
        .rejects.toThrow('Repository metadata is required');
    });
  });

  describe('HuggingFace Provider', () => {
    beforeEach(() => {
      process.env.LLM_PROVIDER = 'huggingface';
    });

    test('should throw error if API URL and MODEL are missing', async () => {
      delete process.env.LLM_API_URL;
      delete process.env.LLM_MODEL;
      
      await expect(llmService.generateArchitectureDiagram({}))
        .rejects.toThrow('LLM_API_URL or LLM_MODEL must be configured');
    });

    test('should throw error if API key is missing', async () => {
      delete process.env.LLM_API_KEY;
      delete process.env.HF_TOKEN;
      
      await expect(llmService.generateArchitectureDiagram({}))
        .rejects.toThrow('LLM_API_KEY (or HF_TOKEN) is required');
    });

    test('should use HF_TOKEN as fallback for API key', async () => {
      delete process.env.LLM_API_KEY;
      process.env.HF_TOKEN = 'hf_token_fallback';
      
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([{ generated_text: 'graph TD\nA-->B' }])
      });

      await llmService.generateArchitectureDiagram({});
      
      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[1].headers.Authorization).toBe('Bearer hf_token_fallback');
    });

    test('should handle array response format', async () => {
      delete process.env.LLM_API_URL;
      
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([{ generated_text: 'graph TD\nX-->Y' }])
      });

      const res = await llmService.generateArchitectureDiagram({});
      
      expect(res.diagram).toBe('graph TD\nX-->Y');
      expect(global.fetch.mock.calls[0][0]).toContain('router.huggingface.co/hf-inference/models/test-model-v1');
    });

    test('should handle object response format', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ generated_text: 'graph LR\nA-->B' })
      });

      const res = await llmService.generateArchitectureDiagram({});
      expect(res.diagram).toBe('graph LR\nA-->B');
    });

    test('should handle HTTP error responses', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable'
      });

      await expect(llmService.generateArchitectureDiagram({}))
        .rejects.toThrow('HuggingFace request failed with 503');
    });

    test('should handle unparseable JSON response', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => 'not valid json'
      });

      await expect(llmService.generateArchitectureDiagram({}))
        .rejects.toThrow('Unable to parse HuggingFace response');
    });
  });

  describe('OpenAI Provider', () => {
    beforeEach(() => {
      process.env.LLM_PROVIDER = 'openai';
    });

    test('should throw error if API URL is missing', async () => {
      delete process.env.LLM_API_URL;
      
      await expect(llmService.generateArchitectureDiagram({}))
        .rejects.toThrow('LLM_API_URL, LLM_API_KEY, and LLM_MODEL must be set');
    });

    test('should throw error if API key is missing', async () => {
      delete process.env.LLM_API_KEY;
      
      await expect(llmService.generateArchitectureDiagram({}))
        .rejects.toThrow('LLM_API_URL, LLM_API_KEY, and LLM_MODEL must be set');
    });

    test('should throw error if model is missing', async () => {
      delete process.env.LLM_MODEL;
      
      await expect(llmService.generateArchitectureDiagram({}))
        .rejects.toThrow('LLM_API_URL, LLM_API_KEY, and LLM_MODEL must be set');
    });

    test('should extract response with mermaid code block', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          choices: [{ message: { content: 'Here: ```mermaid\ngraph A\n```' } }]
        })
      });
      
      const res = await llmService.generateArchitectureDiagram({});
      expect(res.diagram).toBe('graph A');
    });

    test('should extract response with generic code block', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          choices: [{ message: { content: '```\ngraph TD\nA-->B\n```' } }]
        })
      });
      
      const res = await llmService.generateArchitectureDiagram({});
      expect(res.diagram).toBe('graph TD\nA-->B');
    });

    test('should extract response starting with graph keyword', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          choices: [{ message: { content: 'graph LR\nA-->B' } }]
        })
      });
      
      const res = await llmService.generateArchitectureDiagram({});
      expect(res.diagram).toBe('graph LR\nA-->B');
    });

    test('should handle HTTP error responses', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized'
      });

      await expect(llmService.generateArchitectureDiagram({}))
        .rejects.toThrow('OpenAI-compatible request failed with 401');
    });

    test('should handle unparseable JSON response', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => 'invalid json'
      });

      await expect(llmService.generateArchitectureDiagram({}))
        .rejects.toThrow('Unable to parse OpenAI-compatible response');
    });

    test('should include usage information when available', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          choices: [{ message: { content: 'graph TD\nA-->B' } }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
        })
      });
      
      const res = await llmService.generateArchitectureDiagram({});
      expect(res.usage).toEqual({
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150
      });
    });
  });

  describe('Diagram Extraction', () => {
    beforeEach(() => {
      process.env.LLM_PROVIDER = 'openai';
    });

    test('should throw error if response contains no Mermaid diagram', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          choices: [{ message: { content: 'Just some text without a diagram' } }]
        })
      });

      await expect(llmService.generateArchitectureDiagram({}))
        .rejects.toThrow('LLM response did not include a Mermaid diagram');
    });

    test('should extract diagram from mermaid tags', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          choices: [{ message: { content: '<mermaid>graph TD\nA-->B</mermaid>' } }]
        })
      });

      const res = await llmService.generateArchitectureDiagram({});
      expect(res.diagram).toBe('graph TD\nA-->B');
    });
  });

  describe('System Prompt', () => {
    beforeEach(() => {
      process.env.LLM_PROVIDER = 'openai';
    });

    test('should use custom system prompt from options', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          choices: [{ message: { content: 'graph TD\nA-->B' } }]
        })
      });

      const customPrompt = 'Custom system prompt for testing';
      const res = await llmService.generateArchitectureDiagram({}, { systemPrompt: customPrompt });
      
      expect(res.systemPrompt).toBe(customPrompt);
    });

    test('should use environment variable for system prompt', async () => {
      process.env.LLM_SYSTEM_PROMPT = 'Environment system prompt';
      
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          choices: [{ message: { content: 'graph TD\nA-->B' } }]
        })
      });

      const res = await llmService.generateArchitectureDiagram({});
      expect(res.systemPrompt).toBe('Environment system prompt');
    });

    test('should use default system prompt if none provided', async () => {
      delete process.env.LLM_SYSTEM_PROMPT;
      
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          choices: [{ message: { content: 'graph TD\nA-->B' } }]
        })
      });

      const res = await llmService.generateArchitectureDiagram({});
      expect(res.systemPrompt).toContain('expert software architect');
    });
  });

  describe('Return Values', () => {
    beforeEach(() => {
      process.env.LLM_PROVIDER = 'openai';
    });

    test('should return complete result object', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          choices: [{ message: { content: 'graph TD\nA-->B' } }],
          usage: { total_tokens: 100 }
        })
      });

      const res = await llmService.generateArchitectureDiagram({ test: 'metadata' });
      
      expect(res).toHaveProperty('diagram');
      expect(res).toHaveProperty('provider');
      expect(res).toHaveProperty('rawResponse');
      expect(res).toHaveProperty('usage');
      expect(res).toHaveProperty('prompt');
      expect(res).toHaveProperty('systemPrompt');
      expect(res.provider).toBe('openai');
    });
  });
});
