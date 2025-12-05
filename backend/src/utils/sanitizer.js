/**
 * Mermaid Diagram Sanitizer
 * Fixes common LLM output issues that cause Mermaid parsing errors
 */

// Mermaid reserved keywords that cannot be used as node IDs
const MERMAID_RESERVED_KEYWORDS = [
  'graph', 'subgraph', 'end', 'style', 'class', 'classDef', 'click',
  'linkStyle', 'direction', 'flowchart', 'sequenceDiagram', 'classDiagram',
  'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie', 'gitGraph',
  'LR', 'RL', 'TB', 'TD', 'BT'
];

// Malformed bracket patterns: [pattern, replacement]
// LLM sometimes nests shapes incorrectly - these fix the nesting
const MALFORMED_BRACKET_FIXES = [
  // Outer [] wrapping inner shapes
  [/(\w+)\[\(\[([^\]]*)\]\)\]/g, '$1([$2])'],     // [([label])] -> ([label])
  [/(\w+)\[\(\(([^)]*)\)\)\]/g, '$1(($2))'],      // [((label))] -> ((label))
  [/(\w+)\[\{\{([^}]*)\}\}\]/g, '$1{{$2}}'],      // [{{label}}] -> {{label}}
  [/(\w+)\[\[\[([^\]]*)\]\]\]/g, '$1[[$2]]'],     // [[[label]]] -> [[label]]
  [/(\w+)\[>([^\]]*)\]\]/g, '$1>$2]'],            // [>label]] -> >label]
  // Outer () wrapping inner [[]]
  [/(\w+)\(\[\[([^\]]*)\]\]\)/g, '$1([$2])'],     // ([[label]]) -> ([label])
  [/(\w+)\(\(\[\[([^\]]*)\]\]\)\)/g, '$1(($2))'], // (([[label]])) -> ((label))
];

/**
 * Clean problematic characters from node labels
 * @param {string} label - Raw label text
 * @param {string} fallback - Fallback if label becomes empty
 * @returns {string} Cleaned label
 */
function cleanLabel(label, fallback = '') {
  return label
    .replace(/^\/+/, '')           // Remove leading slashes
    .replace(/\/+$/, '')           // Remove trailing slashes
    .replace(/\//g, '-')           // Replace internal slashes with dashes
    .replace(/\(([^)]*)\)/g, '$1') // Remove parentheses (keep content)
    .replace(/[<>]/g, '')          // Remove angle brackets
    .replace(/-+$/, '')            // Remove trailing dashes
    .replace(/^-+/, '')            // Remove leading dashes
    .trim() || fallback;
}

/**
 * Fix reserved keywords used as standalone node IDs
 * @param {string} diagram - Diagram text
 * @returns {string} Fixed diagram
 */
function fixReservedKeywords(diagram) {
  let result = diagram;

  for (const keyword of MERMAID_RESERVED_KEYWORDS) {
    // Only match standalone keywords (not part of larger words like serviceGraph)
    const patterns = [
      // keyword followed by shape bracket
      [new RegExp(`(?<![a-zA-Z0-9_])(${keyword})(\\s*[\\[\\(\\{\\>])`, 'gi'), `${keyword}Node$2`],
      // keyword as edge source
      [new RegExp(`(?<![a-zA-Z0-9_])(${keyword})(\\s*-->)`, 'gi'), `${keyword}Node$2`],
      // keyword as edge target
      [new RegExp(`(-->\\s*\\|?[^|]*\\|?\\s*)(${keyword})(?![a-zA-Z0-9_])`, 'gi'), `$1${keyword}Node`],
      // keyword in style declaration
      [new RegExp(`(style\\s+)(${keyword})(?![a-zA-Z0-9_])`, 'gi'), `$1${keyword}Node`],
    ];

    for (const [pattern, replacement] of patterns) {
      result = result.replace(pattern, replacement);
    }
  }

  return result;
}

/**
 * Clean labels inside all node shape types
 * @param {string} diagram - Diagram text
 * @returns {string} Fixed diagram
 */
function cleanNodeLabels(diagram) {
  let result = diagram;

  // Shape patterns: [regex, formatter(nodeId, cleanedLabel) => string]
  const shapePatterns = [
    [/(\w+)\[([^\]]*)\]/g, (id, label) => `${id}[${label}]`],       // [label]
    [/(\w+)\(\[([^\]]*)\]\)/g, (id, label) => `${id}([${label}])`], // ([label])
    [/(\w+)\(\(([^)]*)\)\)/g, (id, label) => `${id}((${label}))`],  // ((label))
    [/(\w+)\{\{([^}]*)\}\}/g, (id, label) => `${id}{{${label}}}`],  // {{label}}
    [/(\w+)\[\[([^\]]*)\]\]/g, (id, label) => `${id}[[${label}]]`], // [[label]]
  ];

  for (const [pattern, formatter] of shapePatterns) {
    result = result.replace(pattern, (match, nodeId, label) =>
      formatter(nodeId, cleanLabel(label, nodeId))
    );
  }

  return result;
}

/**
 * Remove duplicate node definitions (keep first occurrence)
 * @param {string[]} lines - Diagram lines
 * @returns {string[]} Deduplicated lines
 */
function removeDuplicateNodes(lines) {
  const seenNodes = new Set();
  return lines.filter(line => {
    const trimmed = line.trim();
    const nodeDefMatch = trimmed.match(/^(\w+)[[({<>]/);
    if (nodeDefMatch) {
      const nodeId = nodeDefMatch[1];
      if (seenNodes.has(nodeId)) {
        return false;
      }
      seenNodes.add(nodeId);
    }
    return true;
  });
}

/**
 * Remove truncated/incomplete lines from the end (LLM output cutoff)
 * @param {string[]} lines - Diagram lines
 * @returns {string[]} Lines with truncated ending removed
 */
function removeTruncatedEnding(lines) {
  const result = [...lines];

  while (result.length > 0) {
    const lastLine = result[result.length - 1].trim();

    const isIncomplete =
      lastLine === '' ||
      lastLine.endsWith(',') ||
      // Incomplete style: just "style" or "style nodeId" without fill/stroke-width
      lastLine === 'style' ||
      (/^style\s+/.test(lastLine) && !lastLine.includes('stroke-width')) ||
      // Unclosed brackets/braces
      (lastLine.includes('[') && !lastLine.includes(']')) ||
      (lastLine.includes('{') && !lastLine.includes('}')) ||
      (lastLine.includes('(') && !lastLine.includes(')'));

    if (isIncomplete) {
      result.pop();
    } else {
      break;
    }
  }

  return result;
}

/**
 * Sanitize Mermaid diagram to fix common LLM output issues
 * @param {string} diagram - Raw Mermaid diagram from LLM
 * @returns {string} Sanitized diagram
 */
function sanitizeMermaidDiagram(diagram) {
  let sanitized = diagram;

  // Step 1: Fix malformed nested brackets (must be first)
  for (const [pattern, replacement] of MALFORMED_BRACKET_FIXES) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  // Step 2: Fix reserved keywords used as node IDs
  sanitized = fixReservedKeywords(sanitized);

  // Step 3: Clean labels inside all shape types
  sanitized = cleanNodeLabels(sanitized);

  // Step 4: Process lines for deduplication and truncation
  let lines = sanitized.split('\n');
  lines = removeDuplicateNodes(lines);
  lines = removeTruncatedEnding(lines);

  return lines.join('\n');
}

export { sanitizeMermaidDiagram };