/**
 * Mermaid reserved keywords that cannot be used as node IDs
 */
const MERMAID_RESERVED_KEYWORDS = [
  'graph', 'subgraph', 'end', 'style', 'class', 'classDef', 'click',
  'linkStyle', 'direction', 'flowchart', 'sequenceDiagram', 'classDiagram',
  'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie', 'gitGraph',
  'LR', 'RL', 'TB', 'TD', 'BT'
];

/**
 * Sanitize Mermaid diagram to fix common LLM output issues
 * @param {string} diagram - Raw Mermaid diagram from LLM
 * @returns {string} Sanitized diagram
 */
function sanitizeMermaidDiagram(diagram) {
  let sanitized = diagram;

  // Fix 0: Replace reserved keywords used as node IDs
  // Must be done first before other transformations
  for (const keyword of MERMAID_RESERVED_KEYWORDS) {
    // Match keyword used as node ID (followed by node shape brackets or in edges)
    // Pattern: word boundary + keyword + (node shape OR arrow)
    const nodeDefPattern = new RegExp(`\\b(${keyword})(\\s*[\\[\\(\\{\\>])`, 'gi');
    const edgeSourcePattern = new RegExp(`\\b(${keyword})(\\s*-->)`, 'gi');
    const edgeTargetPattern = new RegExp(`(-->\\s*\\|?[^|]*\\|?\\s*)(${keyword})\\b`, 'gi');
    const stylePattern = new RegExp(`(style\\s+)(${keyword})\\b`, 'gi');
    
    // Replace with prefixed version to avoid collision
    sanitized = sanitized.replace(nodeDefPattern, `${keyword}Node$2`);
    sanitized = sanitized.replace(edgeSourcePattern, `${keyword}Node$2`);
    sanitized = sanitized.replace(edgeTargetPattern, `$1${keyword}Node`);
    sanitized = sanitized.replace(stylePattern, `$1${keyword}Node`);
  }

  // Fix 1: Replace problematic characters in node labels inside brackets
  // Pattern: nodeId[/api/something] -> nodeId[api-something]
  // The `/` at the start of brackets is interpreted as parallelogram shape
  sanitized = sanitized.replace(
    /(\w+)\[([^\]]*)\]/g,
    (match, nodeId, label) => {
      // Replace leading/trailing slashes and internal slashes in labels
      const cleanLabel = label
        .replace(/^\/+/, '')           // Remove leading slashes
        .replace(/\/+$/, '')           // Remove trailing slashes  
        .replace(/\//g, '-')           // Replace internal slashes with dashes
        .replace(/\(([^)]*)\)/g, '$1') // Remove parentheses (cause syntax errors)
        .replace(/[<>]/g, '')          // Remove angle brackets
        .replace(/-+$/, '')            // Remove trailing dashes (left after slash removal)
        .replace(/^-+/, '')            // Remove leading dashes
        .trim();
      // If label is empty after cleaning, use nodeId as label
      return `${nodeId}[${cleanLabel || nodeId}]`;
    }
  );

  // Fix 2: Same for rounded brackets ([label])
  sanitized = sanitized.replace(
    /(\w+)\(\[([^\]]*)\]\)/g,
    (match, nodeId, label) => {
      const cleanLabel = label
        .replace(/^\/+/, '')
        .replace(/\/+$/, '')
        .replace(/\//g, '-')
        .replace(/\(([^)]*)\)/g, '$1')
        .replace(/[<>]/g, '')
        .replace(/-+$/, '')            // Remove trailing dashes
        .replace(/^-+/, '')            // Remove leading dashes
        .trim();
      return `${nodeId}([${cleanLabel || nodeId}])`;
    }
  );

  // Fix 3: Same for stadium shapes (([label]))
  sanitized = sanitized.replace(
    /(\w+)\(\(([^)]*)\)\)/g,
    (match, nodeId, label) => {
      const cleanLabel = label
        .replace(/^\/+/, '')
        .replace(/\/+$/, '')
        .replace(/\//g, '-')
        .replace(/\(([^)]*)\)/g, '$1')
        .replace(/[<>]/g, '')
        .replace(/-+$/, '')            // Remove trailing dashes
        .replace(/^-+/, '')            // Remove leading dashes
        .trim();
      return `${nodeId}((${cleanLabel || nodeId}))`;
    }
  );

  // Fix 4: Remove any duplicate node definitions (LLM sometimes repeats)
  const lines = sanitized.split('\n');
  const seenNodes = new Set();
  const deduplicatedLines = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Check if it's a node definition (not edge, not subgraph, not style)
    const nodeDefMatch = trimmed.match(/^(\w+)[[({<>]/);
    if (nodeDefMatch) {
      const nodeId = nodeDefMatch[1];
      if (seenNodes.has(nodeId)) {
        continue; // Skip duplicate node definition
      }
      seenNodes.add(nodeId);
    }
    deduplicatedLines.push(line);
  }

  return deduplicatedLines.join('\n');
}

export { sanitizeMermaidDiagram };