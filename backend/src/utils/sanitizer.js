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

  // Fix 0a: Fix malformed nested shape brackets BEFORE other processing
  // LLM sometimes wraps shapes incorrectly like nodeId[([label])] or nodeId[{{label}}]
  // Pattern: nodeId[([label])] -> nodeId([label])
  sanitized = sanitized.replace(/(\w+)\[\(\[([^\]]*)\]\)\]/g, '$1([$2])');
  // Pattern: nodeId[((label))] -> nodeId((label))
  sanitized = sanitized.replace(/(\w+)\[\(\(([^)]*)\)\)\]/g, '$1(($2))');
  // Pattern: nodeId[{{label}}] -> nodeId{{label}}
  sanitized = sanitized.replace(/(\w+)\[\{\{([^}]*)\}\}\]/g, '$1{{$2}}');
  // Pattern: nodeId[[[label]]] -> nodeId[[label]]
  sanitized = sanitized.replace(/(\w+)\[\[\[([^\]]*)\]\]\]/g, '$1[[$2]]');
  // Pattern: nodeId[>label]] -> nodeId>label]
  sanitized = sanitized.replace(/(\w+)\[>([^\]]*)\]\]/g, '$1>$2]');

  // Fix 0b: Replace reserved keywords used as STANDALONE node IDs only
  // Must be done first before other transformations
  // Uses negative lookbehind/lookahead to ensure keyword is not part of a larger word
  for (const keyword of MERMAID_RESERVED_KEYWORDS) {
    // Only match keyword when it's a standalone identifier (not part of another word)
    // (?<![a-zA-Z0-9_]) - not preceded by alphanumeric or underscore
    // (?![a-zA-Z0-9_]) - not followed by alphanumeric or underscore (except for shape brackets)
    
    // Match standalone keyword followed by node shape brackets
    const nodeDefPattern = new RegExp(`(?<![a-zA-Z0-9_])(${keyword})(\\s*[\\[\\(\\{\\>])`, 'gi');
    // Match standalone keyword as edge source (keyword -->)
    const edgeSourcePattern = new RegExp(`(?<![a-zA-Z0-9_])(${keyword})(\\s*-->)`, 'gi');
    // Match standalone keyword as edge target (--> keyword)
    const edgeTargetPattern = new RegExp(`(-->\\s*\\|?[^|]*\\|?\\s*)(${keyword})(?![a-zA-Z0-9_])`, 'gi');
    // Match standalone keyword in style declarations (style keyword fill:...)
    const styleTargetPattern = new RegExp(`(style\\s+)(${keyword})(?![a-zA-Z0-9_])`, 'gi');
    
    // Replace with suffixed version to avoid collision
    sanitized = sanitized.replace(nodeDefPattern, `${keyword}Node$2`);
    sanitized = sanitized.replace(edgeSourcePattern, `${keyword}Node$2`);
    sanitized = sanitized.replace(edgeTargetPattern, `$1${keyword}Node`);
    sanitized = sanitized.replace(styleTargetPattern, `$1${keyword}Node`);
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

  // Fix 4: Same for hexagon shapes {{label}}
  // Parentheses inside hexagons cause parsing errors
  sanitized = sanitized.replace(
    /(\w+)\{\{([^}]*)\}\}/g,
    (match, nodeId, label) => {
      const cleanLabel = label
        .replace(/^\/+/, '')
        .replace(/\/+$/, '')
        .replace(/\//g, '-')
        .replace(/\(([^)]*)\)/g, '$1') // Remove parentheses - critical for hexagons!
        .replace(/[<>]/g, '')
        .replace(/-+$/, '')
        .replace(/^-+/, '')
        .trim();
      return `${nodeId}{{${cleanLabel || nodeId}}}`;
    }
  );

  // Fix 5: Remove any duplicate node definitions (LLM sometimes repeats)
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

  // Fix 6: Remove incomplete/truncated lines at the end
  // LLM responses can be cut off mid-line due to token limits
  // Common patterns: incomplete style declarations, unclosed brackets, trailing commas
  while (deduplicatedLines.length > 0) {
    const lastLine = deduplicatedLines[deduplicatedLines.length - 1].trim();
    
    // Check for incomplete patterns that indicate truncation
    const isIncomplete = 
      // Style declaration without closing (ends with comma or colon)
      /^style\s+\w+\s+fill:[^,]*,\s*$/.test(lastLine) ||
      // Ends with just a comma
      lastLine.endsWith(',') ||
      // Incomplete style (has fill but no stroke-width:2px ending)
      (/^style\s+/.test(lastLine) && !lastLine.includes('stroke-width')) ||
      // Unclosed brackets/braces
      (lastLine.includes('[') && !lastLine.includes(']')) ||
      (lastLine.includes('{') && !lastLine.includes('}')) ||
      (lastLine.includes('(') && !lastLine.includes(')')) ||
      // Empty or whitespace only
      lastLine === '';
    
    if (isIncomplete) {
      deduplicatedLines.pop();
    } else {
      break;
    }
  }

  return deduplicatedLines.join('\n');
}

export { sanitizeMermaidDiagram };