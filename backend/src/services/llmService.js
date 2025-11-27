import dotenv from 'dotenv';

dotenv.config();

const {
  LLM_PROVIDER = 'huggingface',
  LLM_API_URL,
  LLM_API_KEY,
  LLM_MODEL
} = process.env;

function ensureConfigured() {
  if (!LLM_API_URL || !LLM_API_KEY || !LLM_MODEL) {
    throw Object.assign(
      new Error('Missing LLM configuration. Please set LLM_API_URL, LLM_API_KEY, and LLM_MODEL.'),
      { statusCode: 500 }
    );
  }
}

async function createChatCompletion({ messages, temperature = 0.1, maxTokens = 800 }) {
  ensureConfigured();
  const payload = {
    model: LLM_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens
  };

  const response = await fetch(LLM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LLM_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw Object.assign(
      new Error(`LLM request failed (${response.status}): ${responseText}`),
      { statusCode: response.status }
    );
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (err) {
    throw Object.assign(
      new Error(`Failed to parse LLM response: ${err.message}`),
      { statusCode: 500 }
    );
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw Object.assign(
      new Error('LLM response did not include any content'),
      { statusCode: 502 }
    );
  }

  return { content, raw: data };
}

function extractMermaidDiagram(content) {
  if (!content || typeof content !== 'string') {
    throw Object.assign(new Error('Invalid LLM content received'), { statusCode: 502 });
  }

  const codeMatch = content.match(/```(?:mermaid)?\s*([\s\S]*?)```/i);
  let diagram = codeMatch ? codeMatch[1].trim() : content.trim();

  if (!diagram.toLowerCase().startsWith('graph')) {
    const fallbackMatch = diagram.match(/graph\s+(?:LR|TD|RL|BT|TB)?[\s\S]*/i);
    if (fallbackMatch) {
      diagram = fallbackMatch[0].trim();
    }
  }

  if (!diagram.toLowerCase().startsWith('graph')) {
    throw Object.assign(
      new Error('LLM response did not contain Mermaid graph syntax'),
      { statusCode: 502 }
    );
  }

  return diagram;
}

async function generateMermaidDiagram({ messages, temperature = 0.1, maxTokens = 800 }) {
  const completion = await createChatCompletion({ messages, temperature, maxTokens });
  const diagram = extractMermaidDiagram(completion.content);
  return {
    diagram,
    rawResponse: completion.raw,
    model: LLM_MODEL,
    provider: LLM_PROVIDER
  };
}

const llmService = {
  createChatCompletion,
  extractMermaidDiagram,
  generateMermaidDiagram,
  ensureConfigured
};

export default llmService;
export { createChatCompletion, extractMermaidDiagram, generateMermaidDiagram, ensureConfigured };
