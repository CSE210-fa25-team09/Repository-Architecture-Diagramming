/**
 * LLM service that turns repository metadata into architecture diagrams.
 */

import githubService from './githubService.js';
import { RepoMetadataError, LlmProviderError } from '../const/errors.js';
import { 
  DEFAULT_SYSTEM_PROMPT, 
  CODE_ANALYSIS_SYSTEM_PROMPT, 
  DETAILED_DIAGRAM_SYSTEM_PROMPT 
} from '../const/prompts.js';

const Provider = {
  HUGGING_FACE: 'huggingface',
  OPENAI: 'openai'
};

function parseEnvInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
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

  // Detect if using OpenAI-compatible chat completions endpoint
  const isOpenAICompatible = apiUrl.includes('/v1/chat/completions');
  
  let body;
  if (isOpenAICompatible) {
    // Use OpenAI chat format for /v1/chat/completions endpoints
    body = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0,
      max_tokens: parseEnvInt(process.env.LLM_MAX_NEW_TOKENS, 1024)
    };
  } else {
    // Use standard HuggingFace inference format
    const formattedPrompt = `<system>\n${systemPrompt}\n</system>\n<user>\n${userPrompt}\n</user>`;
    body = {
      inputs: formattedPrompt,
      parameters: {
        max_new_tokens: parseEnvInt(process.env.LLM_MAX_NEW_TOKENS, 1024),
        temperature: 0
      }
    };
    if (model) {
      body.model = model;
    }
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
    console.error(`HuggingFace API error (${response.status}):`, payload);
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
    temperature: 0,
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
  const userPrompt = githubService.formatMetadataForPrompt(metadata);
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

/**
 * Analyze source code to understand architecture (Step 1 of detailed analysis)
 * @param {Map<string, string>} fileContents - Map of file paths to their contents
 * @param {object} metadata - Repository metadata
 * @returns {object} Analysis result with structured insights
 */
export async function analyzeCodeArchitecture(fileContents, metadata) {
  if (!fileContents || fileContents.size === 0) {
    throw new RepoMetadataError('Source code files are required for detailed analysis.');
  }

  // Build a prompt with the actual source code
  const codeSnippets = [];
  const maxCharsPerFile = 3000; // Limit per file to avoid token limits
  const maxTotalChars = 100000; // Total limit for all code
  let totalChars = 0;

  for (const [filePath, content] of fileContents) {
    if (totalChars >= maxTotalChars) break;
    
    const truncatedContent = content.slice(0, maxCharsPerFile);
    const snippet = `### File: ${filePath}\n\`\`\`\n${truncatedContent}${content.length > maxCharsPerFile ? '\n... (truncated)' : ''}\n\`\`\``;
    codeSnippets.push(snippet);
    totalChars += snippet.length;
  }

  const userPrompt = `
# Repository: ${metadata.owner}/${metadata.repo}
Branch: ${metadata.branch}

## Source Code Files (${fileContents.size} files)

${codeSnippets.join('\n\n')}

## File Tree Summary
${metadata.fileTree || 'Not available'}

Please analyze this codebase and provide a structured architectural analysis.
`.trim();

  const providerResponse = await dispatchToProvider({
    systemPrompt: CODE_ANALYSIS_SYSTEM_PROMPT,
    userPrompt
  });

  return {
    analysis: providerResponse.text,
    provider: resolveProvider(),
    rawResponse: providerResponse.raw,
    usage: providerResponse.usage,
    prompt: userPrompt,
    systemPrompt: CODE_ANALYSIS_SYSTEM_PROMPT,
    filesAnalyzed: fileContents.size
  };
}

/**
 * Generate detailed Mermaid diagram from code analysis (Step 2 of detailed analysis)
 * @param {string} codeAnalysis - The analysis from step 1
 * @param {object} metadata - Repository metadata
 * @returns {object} Diagram generation result
 */
export async function generateDetailedDiagram(codeAnalysis, metadata) {
  if (!codeAnalysis) {
    throw new RepoMetadataError('Code analysis is required to generate detailed diagram.');
  }

  const userPrompt = `
# IMPORTANT: Generate a diagram based on THIS SPECIFIC analysis - do not use generic examples.

# Code Analysis Summary (USE THIS TO BUILD THE DIAGRAM)

${codeAnalysis}

---

# Repository Context
Repository: ${metadata.owner}/${metadata.repo}
Branch: ${metadata.branch}

## File Tree
${metadata.fileTree || 'Not available'}

## README Excerpt
${metadata.readme ? metadata.readme.slice(0, 2000) : 'Not available'}

---

# YOUR TASK
Create a detailed Mermaid architecture diagram that includes ALL components from the Code Analysis Summary above.
- Include EVERY component mentioned in the analysis (Application, Routing, Dependencies, Parameters, Request/Response, OpenAPI, Middleware, Background Tasks, etc.)
- Show the relationships and data flows described in the analysis
- Group into appropriate subgraphs (Core, Routing, Middleware, External, etc.)
- This should result in a diagram with 15-25+ nodes for a project of this complexity
`.trim();

  const providerResponse = await dispatchToProvider({
    systemPrompt: DETAILED_DIAGRAM_SYSTEM_PROMPT,
    userPrompt
  });

  const diagram = extractMermaidDiagram(providerResponse.text);

  return {
    diagram,
    provider: resolveProvider(),
    rawResponse: providerResponse.raw,
    usage: providerResponse.usage,
    prompt: userPrompt,
    systemPrompt: DETAILED_DIAGRAM_SYSTEM_PROMPT
  };
}

const llmService = {
  generateArchitectureDiagram,
  analyzeCodeArchitecture,
  generateDetailedDiagram
};

export default llmService;
