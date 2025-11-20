/**
 * Repository metadata utilities.
 * Builds a condensed snapshot of GitHub data that the LLM can consume safely.
 */

import githubService from './githubService.js';

const DEFAULT_MAX_BRANCHES = parseEnvInt(process.env.LLM_MAX_BRANCHES, 20);
const DEFAULT_MAX_TREE_LINES = parseEnvInt(process.env.LLM_MAX_TREE_LINES, 400);
const DEFAULT_MAX_README_CHARS = parseEnvInt(process.env.LLM_MAX_README_CHARS, 6000);

function parseEnvInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export class RepoMetadataError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'RepoMetadataError';
    this.statusCode = statusCode;
  }
}

/**
 * Normalize a GitHub URL into { owner, repo }.
 * @param {string} githubUrl GitHub repository URL (https or SSH).
 * @returns {{owner: string, repo: string}} Extracted owner/repo.
 */
export function parseGithubUrl(githubUrl) {
  if (!githubUrl || typeof githubUrl !== 'string') {
    throw new RepoMetadataError('GitHub URL is required', 400);
  }

  const trimmed = githubUrl.trim();
  const httpsMatch = trimmed.match(/https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+)(?:\.git)?/i);
  if (httpsMatch) {
    const repoName = httpsMatch[2].replace(/\.git$/i, '');
    return { owner: httpsMatch[1], repo: repoName };
  }

  const sshMatch = trimmed.match(/git@github\.com:([\w.-]+)\/([\w.-]+)(?:\.git)?/i);
  if (sshMatch) {
    const repoName = sshMatch[2].replace(/\.git$/i, '');
    return { owner: sshMatch[1], repo: repoName };
  }

  throw new RepoMetadataError('Unable to parse GitHub URL. Expected formats: https://github.com/<owner>/<repo> or git@github.com:<owner>/<repo>.', 400);
}

function limitText(text = '', maxChars = DEFAULT_MAX_README_CHARS) {
  if (!text) return '(no README content found)';
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n... (truncated ${text.length - maxChars} chars)`;
}

function buildBranchPreview(branches = [], maxBranches = DEFAULT_MAX_BRANCHES) {
  const limited = branches.slice(0, maxBranches);
  const more = branches.length > maxBranches ? ` (+${branches.length - maxBranches} more)` : '';
  return {
    preview: limited,
    total: branches.length,
    note: more
  };
}

function buildFileTreeSummary(tree = [], options = {}) {
  const {
    rootLabel = 'repository',
    maxLines = DEFAULT_MAX_TREE_LINES
  } = options;

  const lines = [`${rootLabel}/`];
  let lineCount = 1;
  let truncated = false;
  let fileCount = 0;
  let dirCount = 0;

  function traverse(nodes, depth) {
    if (!Array.isArray(nodes) || truncated) return;

    const sorted = [...nodes].sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === 'dir' ? -1 : 1;
    });

    for (const node of sorted) {
      if (lineCount >= maxLines) {
        truncated = true;
        break;
      }

      const indent = '  '.repeat(depth);
      const suffix = node.type === 'dir' ? '/' : '';
      lines.push(`${indent}${node.name}${suffix}`);
      lineCount += 1;

      if (node.type === 'dir') {
        dirCount += 1;
        traverse(node.children || [], depth + 1);
      } else {
        fileCount += 1;
      }

      if (truncated) break;
    }
  }

  traverse(tree, 1);

  if (truncated) {
    lines.push('  ... (file tree truncated for brevity)');
  }

  return {
    text: lines.join('\n'),
    stats: {
      files: fileCount,
      directories: dirCount,
      lines: lines.length,
      truncated
    }
  };
}

/**
 * Fetch relevant repo metadata used to prime the LLM.
 * @param {object} params GitHub target.
 * @param {string} params.githubUrl Repository URL.
 * @param {string} [params.branch] Optional branch override.
 * @returns {Promise<object>} Metadata payload for downstream formatting.
 */
export async function fetchRepoMetadata({ githubUrl, branch } = {}) {
  const { owner, repo } = parseGithubUrl(githubUrl);

  try {
    const [branches, defaultBranch] = await Promise.all([
      githubService.getAllBranches(owner, repo),
      githubService.getDefaultBranch(owner, repo)
    ]);

    const targetBranch = branch || defaultBranch;
    const [tree, latestCommit] = await Promise.all([
      githubService.getRepoTree(owner, repo, '', targetBranch),
      githubService.getLatestCommit(owner, repo, targetBranch)
    ]);

    let readme = '';
    try {
      readme = await githubService.getFile(owner, repo, 'README.md', targetBranch);
    } catch {
      readme = '(README not found)';
    }

    const branchInfo = buildBranchPreview(branches);
    const treeSummary = buildFileTreeSummary(tree, {
      rootLabel: `${repo}@${targetBranch}`,
      maxLines: DEFAULT_MAX_TREE_LINES
    });

    return {
      owner,
      repo,
      repoUrl: `https://github.com/${owner}/${repo}`,
      branch: targetBranch,
      defaultBranch,
      latestCommit,
      branches: branchInfo,
      fileTree: treeSummary,
      readme: limitText(readme, DEFAULT_MAX_README_CHARS),
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    if (error.status === 404) {
      throw new RepoMetadataError('Repository or branch not found on GitHub.', 404);
    }
    if (error instanceof RepoMetadataError) {
      throw error;
    }
    throw new RepoMetadataError(error.message || 'Failed to fetch repository metadata.', 502);
  }
}

/**
 * Convert the metadata into a deterministic LLM prompt.
 * @param {object} metadata Repository metadata payload.
 * @returns {string} Deterministic prompt text for the LLM.
 */
export function formatMetadataForPrompt(metadata) {
  if (!metadata) {
    throw new RepoMetadataError('Metadata payload is required for prompt formatting.');
  }

  const branchLines = (metadata.branches?.preview || [])
    .map(branchName => `- ${branchName}`)
    .join('\n') || '(no branches found)';

  const branchNote = metadata.branches?.note ? `\n${metadata.branches.note}` : '';
  const fileTreeText = metadata.fileTree?.text || '(file tree not available)';
  const readmeText = metadata.readme || '(README not available)';

  return [
    `Repository: ${metadata.owner}/${metadata.repo}`,
    `Source URL: ${metadata.repoUrl}`,
    `Analyzed branch: ${metadata.branch} (default: ${metadata.defaultBranch})`,
    `Latest commit: ${metadata.latestCommit}`,
    `Metadata generated at: ${metadata.generatedAt}`,
    '',
    `Branches preview (${metadata.branches?.total ?? 0} total):`,
    branchLines + branchNote,
    '',
    `File tree snapshot (limited to ${DEFAULT_MAX_TREE_LINES} lines):`,
    fileTreeText,
    '',
    `README excerpt (limited to ${DEFAULT_MAX_README_CHARS} characters):`,
    readmeText
  ].join('\n');
}

const repoMetadataService = {
  fetchRepoMetadata,
  parseGithubUrl,
  formatMetadataForPrompt
};

export default repoMetadataService;
