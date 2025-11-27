import dotenv from 'dotenv';
import githubService from './githubService.js';
import llmService from './llmService.js';
import { FILE_EXTENSIONS } from '../config/parserConfig.js';

dotenv.config();

class UserInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UserInputError';
    this.statusCode = 400;
  }
}

const extensionToLanguage = Object.entries(FILE_EXTENSIONS).reduce((acc, [language, extensions]) => {
  extensions.forEach(ext => {
    acc[ext] = language;
  });
  return acc;
}, {});

function parseGithubUrl(repoUrl = '') {
  if (typeof repoUrl !== 'string' || repoUrl.trim() === '') {
    throw new UserInputError('Repository URL is required.');
  }

  const trimmed = repoUrl.trim();
  const urlWithProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  let parsed;
  try {
    parsed = new URL(urlWithProtocol);
  } catch (err) {
    throw new UserInputError('Invalid GitHub URL.');
  }

  if (!parsed.hostname.includes('github.com')) {
    throw new UserInputError('Provided URL must be a GitHub repository URL.');
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.length < 2) {
    throw new UserInputError('GitHub URL must include both owner and repository.');
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/, '');

  return { owner, repo };
}

function flattenTree(tree) {
  const result = [];
  function traverse(nodes, depth, path) {
    if (!Array.isArray(nodes)) return;
    nodes.forEach(node => {
      const entry = {
        name: node.name,
        path: path ? `${path}/${node.name}` : node.name,
        type: node.type,
        depth
      };
      result.push(entry);
      if (node.type === 'dir' && node.children) {
        traverse(node.children, depth + 1, entry.path);
      }
    });
  }
  traverse(tree, 0, '');
  return result;
}

function summarizeTreeStructure(tree, limit = 40) {
  const flattened = flattenTree(tree);
  const lines = [];
  for (const node of flattened) {
    if (lines.length >= limit) break;
    const indent = '  '.repeat(node.depth);
    const suffix = node.type === 'dir' ? '/' : '';
    lines.push(`${indent}${node.name}${suffix}`);
  }
  return lines;
}

function computeTreeStats(tree) {
  const flattened = flattenTree(tree);
  const stats = {
    totalFiles: 0,
    totalDirectories: 0,
    extensionCounts: {},
    languageCounts: {},
    totalEntries: flattened.length
  };

  flattened.forEach(node => {
    if (node.type === 'dir') {
      stats.totalDirectories += 1;
      return;
    }

    stats.totalFiles += 1;
    const dotIndex = node.name.lastIndexOf('.');
    const ext = dotIndex >= 0 ? node.name.slice(dotIndex) : 'no_ext';
    stats.extensionCounts[ext] = (stats.extensionCounts[ext] || 0) + 1;
    const language = extensionToLanguage[ext] || 'other';
    stats.languageCounts[language] = (stats.languageCounts[language] || 0) + 1;
  });

  return stats;
}

function formatCounts(counts) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
}

const DEFAULT_SYSTEM_PROMPT = [
  'You are an expert software architect who turns GitHub repository metadata into concise Mermaid diagrams.',
  'The user will send:',
  '- Repository name and branch',
  '- A trimmed file tree',
  '- README excerpts',
  '',
  'Tasks:',
  '1. Identify the main architectural components (apps, services, libraries, tools).',
  '2. Determine how those components collaborate.',
  '3. Output a single Mermaid graph (flowchart or graph TD/LR) that captures the system decomposition.',
  '',
  'Rules:',
  '- Output ONLY a Mermaid code block (no narrative, no explanations).',
  '- Prefer graph LR with meaningful node labels.',
  '- Include external services (GitHub, databases, third-party APIs) when they are referenced.',
  '- Validate syntax so the block compiles in Mermaid Live Editor.'
].join('\n');

function getSystemPrompt() {
  const customPrompt = process.env.LLM_SYSTEM_PROMPT;
  if (customPrompt && customPrompt.trim().length > 0) {
    return customPrompt.trim();
  }
  return DEFAULT_SYSTEM_PROMPT;
}

function createPrompt(metadata) {
  const systemPrompt = getSystemPrompt();
  const branchLine = metadata.branchSummary.sample.length > 0
    ? `${metadata.branchSummary.sample.join(', ')}${metadata.branchSummary.total > metadata.branchSummary.sample.length ? '…' : ''}`
    : 'Not available';

  const languageBreakdown = formatCounts(metadata.fileStats.languageCounts) || 'Unknown';
  const extensionBreakdown = formatCounts(metadata.fileStats.extensionCounts) || 'Unknown';
  const treePreview = metadata.treePreview.length > 0
    ? metadata.treePreview.map(line => `  - ${line}`).join('\n')
    : '  - (repo tree empty or not available)';

  const metadataBlock = [
    `Repository URL: ${metadata.repoUrl}`,
    `Owner: ${metadata.owner}`,
    `Repository: ${metadata.repo}`,
    `Description: ${metadata.description || 'No description'}`,
    `Default Branch: ${metadata.defaultBranch}`,
    `Analyzed Branch: ${metadata.branch}`,
    `Stars: ${metadata.stars}`,
    `Primary Language: ${metadata.language || 'Unknown'}`,
    `Branches (${metadata.branchSummary.total} total): ${branchLine}`,
    `Latest Commit: ${metadata.latestCommit.sha} - ${metadata.latestCommit.message}`,
    `Files: ${metadata.fileStats.totalFiles}, Directories: ${metadata.fileStats.totalDirectories}`,
    `Language distribution: ${languageBreakdown}`,
    `Common extensions: ${extensionBreakdown}`,
    `Tree preview:\n${treePreview}`
  ].join('\n');

  const userPrompt = `Use the GitHub repository metadata below to design an architecture diagram. Focus on logical components (clients, services, data stores, integrations) inferred from filenames and structure. Each node should represent a subsystem, not a single file unless unavoidable. Highlight direction of data/control flow.\n\n${metadataBlock}`;

  return [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: userPrompt
    }
  ];
}

function createArchitectureService({ githubService: github = githubService, llmService: llm = llmService } = {}) {
  async function gatherMetadata({ repoUrl, branch }) {
    const { owner, repo } = parseGithubUrl(repoUrl);
    const repoInfo = await github.getRepoInfo(owner, repo);
    const targetBranch = branch || repoInfo.defaultBranch;

    const [branches, tree, latestCommit] = await Promise.all([
      github.getAllBranches(owner, repo),
      github.getRepoTree(owner, repo, '', targetBranch),
      github.getLatestCommit(owner, repo, targetBranch)
    ]);

    return {
      owner,
      repo,
      repoUrl: `https://github.com/${owner}/${repo}`,
      description: repoInfo.description,
      stars: repoInfo.stars,
      language: repoInfo.language,
      defaultBranch: repoInfo.defaultBranch,
      branch: targetBranch,
      branchSummary: {
        total: branches.length,
        sample: branches.slice(0, 10)
      },
      latestCommit,
      fileStats: computeTreeStats(tree),
      treePreview: summarizeTreeStructure(tree, 60),
      generatedAt: new Date().toISOString()
    };
  }

  async function generateArchitectureDiagram({ repoUrl, branch }) {
    if (!repoUrl) {
      throw new UserInputError('The "repoUrl" field is required.');
    }

    const metadata = await gatherMetadata({ repoUrl, branch });
    const messages = createPrompt(metadata);
    const llmResult = await llm.generateMermaidDiagram({
      messages,
      temperature: 0.05,
      maxTokens: 900
    });

    return {
      diagram: llmResult.diagram,
      metadata: {
        ...metadata,
        llm: {
          provider: llmResult.provider,
          model: llmResult.model
        }
      },
      rawLlmResponse: llmResult.rawResponse
    };
  }

  return {
    generateArchitectureDiagram,
    gatherMetadata,
    parseGithubUrl
  };
}

const architectureService = createArchitectureService();

export default architectureService;
export {
  createArchitectureService,
  parseGithubUrl,
  summarizeTreeStructure,
  computeTreeStats,
  UserInputError
};
