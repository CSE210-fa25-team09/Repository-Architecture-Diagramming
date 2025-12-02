import { jest } from '@jest/globals';
import llmService from '../src/services/llmService.js';

global.fetch = jest.fn();

describe('LLM Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LLM_PROVIDER = 'huggingface';
    process.env.LLM_API_KEY = 'mock_key';
    process.env.LLM_API_URL = 'https://openai-api.com';
  });

  afterAll(() => process.env = originalEnv);

  test('should throw error if metadata is missing', async () => {
    await expect(llmService.generateArchitectureDiagram(null))
      .rejects.toThrow('Repository metadata is required');
  });

  test('HuggingFace: handles array response', async () => {
    process.env.LLM_PROVIDER = 'huggingface';
    delete process.env.LLM_API_URL;
    global.fetch.mockResolvedValue({ ok: true, text: async () => JSON.stringify([{ generated_text: 'graph TD\nX-->Y' }]) });

    const res = await llmService.generateArchitectureDiagram({});
    expect(res.diagram).toBe('graph TD\nX-->Y');
    expect(global.fetch.mock.calls[0][0]).toContain('router.huggingface.co');
  });

  test('Extract response', async () => {
    process.env.LLM_PROVIDER = 'openai';
    global.fetch.mockResolvedValue({ ok: true, text: async () => JSON.stringify({ choices: [{ message: { content: 'Here: ```mermaid\ngraph A\n```' } }] }) });
    
    const res = await llmService.generateArchitectureDiagram({});
    expect(res.diagram).toBe('graph A');
  });
});
