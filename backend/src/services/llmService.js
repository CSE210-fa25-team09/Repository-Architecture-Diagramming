/**
 * LLM service that turns repository metadata into architecture diagrams.
 */

import repoMetadataService from './repoMetadataService.js';
import { RepoMetadataError } from './repoMetadataService.js';

const Provider = {
  HUGGING_FACE: 'huggingface',
  OPENAI: 'openai'
};

const DEFAULT_SYSTEM_PROMPT = `
You are an expert software architect who turns GitHub repository metadata into concise Mermaid diagrams.
The user will send:
- Repository name and branch
- A trimmed file tree
- README excerpts

Tasks:
1. Identify the main architectural components (apps, services, libraries, tools).
2. Determine how those components collaborate.
3. Output a single Mermaid graph (flowchart or graph TD/LR) that captures the system decomposition.

Rules:
- Output ONLY a Mermaid code block (no narrative, no explanations).
- Prefer graph LR with meaningful node labels.
- Include external services (GitHub, databases, third-party APIs) when they are referenced.
- Validate syntax so the block compiles in Mermaid Live Editor.
`.trim();

function parseEnvInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export class LlmProviderError extends Error {
  constructor(message, statusCode = 502, details) {
    super(message);
    this.name = 'LlmProviderError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

function resolveProvider() {
  return (process.env.LLM_PROVIDER || Provider.HUGGING_FACE).toLowerCase();
}

function resolveSystemPrompt(override) {
  return override || process.env.LLM_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT;
}

function extractMermaidDiagram(text) {
  if (typeof text !== 'string') {
    throw new LlmProviderError('LLM response payload was not text.', 502);
  }

  const codeBlockMatch = text.match(/```(?:mermaid)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  const mermaidStart = text.indexOf('```mermaid');
  if (mermaidStart !== -1) {
    const rest = text
      .slice(mermaidStart + '```mermaid'.length)
      .replace(/^\s+/, '');
    const closingIndex = rest.indexOf('```');
    const body = closingIndex !== -1 ? rest.slice(0, closingIndex) : rest;
    if (body.trim().startsWith('graph')) {
      return body.trim();
    }
  }

  const tagMatch = text.match(/<mermaid>([\s\S]*?)<\/mermaid>/i);
  if (tagMatch) {
    return tagMatch[1].trim();
  }

  const fallback = text.trim();
  if (fallback.startsWith('graph')) {
    return fallback;
  }

  throw new LlmProviderError('LLM response did not include a Mermaid diagram.', 502, fallback.slice(0, 2000));
}

async function callHuggingFace({ systemPrompt, userPrompt }) {
  const model = process.env.LLM_MODEL;
  const apiUrl = process.env.LLM_API_URL || (model ? `https://router.huggingface.co/hf-inference/models/${model}` : null);
  const apiKey = process.env.LLM_API_KEY || process.env.HF_TOKEN;

  if (!apiUrl) {
    throw new LlmProviderError('LLM_API_URL or LLM_MODEL must be configured for HuggingFace provider.', 500);
  }
  if (!apiKey) {
    throw new LlmProviderError('LLM_API_KEY (or HF_TOKEN) is required for HuggingFace requests.', 500);
  }

  const formattedPrompt = `<system>\n${systemPrompt}\n</system>\n<user>\n${userPrompt}\n</user>`;

  const body = {
    inputs: formattedPrompt,
    input: formattedPrompt,
    parameters: {
      max_new_tokens: parseEnvInt(process.env.LLM_MAX_NEW_TOKENS, 1024),
      temperature: Number.parseFloat(process.env.LLM_TEMPERATURE ?? '0.3')
    }
  };

  if (model) {
    body.model = model;
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const payload = await response.text();
  if (!response.ok) {
    throw new LlmProviderError(`HuggingFace request failed with ${response.status}`, response.status, payload);
  }

  let parsed;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new LlmProviderError('Unable to parse HuggingFace response.', 502, payload);
  }

  let generatedText = '';
  if (Array.isArray(parsed)) {
    generatedText = parsed[0]?.generated_text || '';
  } else if (typeof parsed.generated_text === 'string') {
    generatedText = parsed.generated_text;
  } else {
    generatedText = JSON.stringify(parsed);
  }

  return { raw: parsed, text: generatedText };
}

async function callOpenAiCompatible({ systemPrompt, userPrompt }) {
  const apiUrl = process.env.LLM_API_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;

  if (!apiUrl || !apiKey || !model) {
    throw new LlmProviderError('LLM_API_URL, LLM_API_KEY, and LLM_MODEL must be set for OpenAI provider.', 500);
  }

  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: Number.parseFloat(process.env.LLM_TEMPERATURE ?? '0.3'),
    max_tokens: parseEnvInt(process.env.LLM_MAX_NEW_TOKENS, 1024)
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const payload = await response.text();
  if (!response.ok) {
    throw new LlmProviderError(`OpenAI-compatible request failed with ${response.status}`, response.status, payload);
  }

  let parsed;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new LlmProviderError('Unable to parse OpenAI-compatible response.', 502, payload);
  }

  const choice = parsed.choices?.[0];
  const generatedText = choice?.message?.content || '';

  return { raw: parsed, text: generatedText, usage: parsed.usage };
}

async function dispatchToProvider({ systemPrompt, userPrompt }) {
  const provider = resolveProvider();
  if (provider === Provider.OPENAI) {
    return callOpenAiCompatible({ systemPrompt, userPrompt });
  }
  return callHuggingFace({ systemPrompt, userPrompt });
}

export async function generateArchitectureDiagram(metadata, options = {}) {
  if (!metadata) {
    throw new RepoMetadataError('Repository metadata is required before calling the LLM.');
  }

  const systemPrompt = resolveSystemPrompt(options.systemPrompt);
  const userPrompt = repoMetadataService.formatMetadataForPrompt(metadata);
  const providerResponse = await dispatchToProvider({ systemPrompt, userPrompt });
  const diagram = extractMermaidDiagram(providerResponse.text);

  return {
    diagram,
    provider: resolveProvider(),
    rawResponse: providerResponse.raw,
    usage: providerResponse.usage,
    prompt: userPrompt,
    systemPrompt
  };
}

const llmService = {
  generateArchitectureDiagram
};

export default llmService;
