/**
 * Graph Visualization Service
 * Converts dependency trees into Mermaid.js diagrams
 */

// Shared helper functions
const sanitizeLabel = (label) => label.replace(/["\[\]]/g, '');
const getFileName = (path) => path.split('/').pop();

/**
 * Create node ID generator
 * @returns {Object} Generator with getNodeId function and nodes Map
 */
function createNodeIdGenerator() {
  const nodes = new Map();
  let nodeId = 0;
  
  const getNodeId = (path) => {
    if (!nodes.has(path)) {
      nodes.set(path, `node${nodeId++}`);
    }
    return nodes.get(path);
  };
  
  return { getNodeId, nodes };
}

/**
 * Generate a Mermaid flowchart with optional styling
 * @param {Object} tree - The dependency tree structure
 * @param {Object} options - Visualization options
 * @returns {string} Mermaid diagram syntax
 */
function generateStyledMermaidFlowchart(tree, options = {}) {
  const {
    direction = 'LR',
    showExternal = true,
    showBuiltin = false,
    maxDepth = null,
    styled = true
  } = options;

  const { getNodeId } = createNodeIdGenerator();
  const edges = new Set();
  const codeNodes = new Set();
  const internalNodes = new Set();
  const externalNodes = new Set();
  const builtinNodes = new Set();

  // Traverse tree and collect dependencies
  function traverseTree(nodes, currentPath = '', depth = 0) {
    if (!Array.isArray(nodes)) return;
    if (maxDepth !== null && depth > maxDepth) return;

    nodes.forEach(node => {
      const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;

      if (node.type === 'file' && node.dependencies && node.dependencies.length > 0) {
        const sourceId = getNodeId(fullPath);
        const sourceLabel = getFileName(fullPath);
        if (styled) codeNodes.add(sourceId);

        node.dependencies.forEach(dep => {
          if (dep.type === 'external' && !showExternal) return;
          if (dep.type === 'builtin' && !showBuiltin) return;

          const targetId = getNodeId(dep.module);
          const targetLabel = dep.type === 'internal' ? getFileName(dep.module) : dep.module;

          // Classify target node for styling
          if (styled) {
            if (dep.type === 'internal') internalNodes.add(targetId);
            else if (dep.type === 'external') externalNodes.add(targetId);
            else if (dep.type === 'builtin') builtinNodes.add(targetId);
          }

          edges.add(`    ${sourceId}["${sanitizeLabel(sourceLabel)}"] --> ${targetId}["${sanitizeLabel(targetLabel)}"]`);
        });
      }

      if (node.type === 'dir' && node.children) {
        traverseTree(node.children, fullPath, depth + 1);
      }
    });
  }

  traverseTree(tree);

  const lines = [`graph ${direction}`];
  lines.push(...Array.from(edges));
  
  // Add styling if enabled
  if (styled) {
    lines.push('');
    lines.push('    %% Styling');
    if (codeNodes.size > 0) {
      lines.push(`    classDef codeStyle fill:#4A90E2,stroke:#2E5C8A,stroke-width:2px,color:#fff`);
      lines.push(`    class ${Array.from(codeNodes).join(',')} codeStyle`);
    }
    if (internalNodes.size > 0) {
      lines.push(`    classDef internalStyle fill:#50C878,stroke:#2E7D4E,stroke-width:2px,color:#fff`);
      lines.push(`    class ${Array.from(internalNodes).join(',')} internalStyle`);
    }
    if (externalNodes.size > 0) {
      lines.push(`    classDef externalStyle fill:#FF6B6B,stroke:#C92A2A,stroke-width:2px,color:#fff`);
      lines.push(`    class ${Array.from(externalNodes).join(',')} externalStyle`);
    }
    if (builtinNodes.size > 0) {
      lines.push(`    classDef builtinStyle fill:#FFA500,stroke:#CC8400,stroke-width:2px,color:#fff`);
      lines.push(`    class ${Array.from(builtinNodes).join(',')} builtinStyle`);
    }
  }

  return lines.join('\n');
}

/**
 * Generate a focused Mermaid diagram for a specific file
 * @param {Object} tree - The dependency tree structure
 * @param {string} targetFile - The file path to focus on
 * @param {Object} options - Visualization options
 * @returns {string} Mermaid diagram syntax
 */
function generateFileDependencyDiagram(tree, targetFile, options = {}) {
  const { direction = 'LR' } = options;
  const { getNodeId } = createNodeIdGenerator();
  const edges = new Set();

  // Find the target file in tree
  function findFile(nodes, currentPath = '') {
    if (!Array.isArray(nodes)) return null;

    for (const node of nodes) {
      const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;

      if (fullPath === targetFile && node.type === 'file') {
        return node;
      }

      if (node.type === 'dir' && node.children) {
        const found = findFile(node.children, fullPath);
        if (found) return found;
      }
    }
    return null;
  }

  const fileNode = findFile(tree);
  if (!fileNode || !fileNode.dependencies) {
    return `graph ${direction}\n    ${getNodeId(targetFile)}["${sanitizeLabel(getFileName(targetFile))}"]`;
  }

  const sourceId = getNodeId(targetFile);
  const sourceLabel = getFileName(targetFile);

  fileNode.dependencies.forEach(dep => {
    const targetId = getNodeId(dep.module);
    const targetLabel = dep.type === 'internal' ? getFileName(dep.module) : dep.module;
    edges.add(`    ${sourceId}["${sanitizeLabel(sourceLabel)}"] --> ${targetId}["${sanitizeLabel(targetLabel)}"]`);
  });

  const lines = [`graph ${direction}`];
  lines.push(...Array.from(edges));

  return lines.join('\n');
}

/**
 * Generate Mermaid diagram statistics
 * @param {string} mermaidDiagram - The generated Mermaid diagram
 * @returns {Object} Statistics about the diagram
 */
function getDiagramStats(mermaidDiagram) {
  const lines = mermaidDiagram.split('\n');
  const edges = lines.filter(line => line.includes('-->'));
  const nodes = new Set();

  edges.forEach(line => {
    const matches = line.matchAll(/node\d+/g);
    for (const match of matches) {
      nodes.add(match[0]);
    }
  });

  return {
    totalNodes: nodes.size,
    totalEdges: edges.length,
    avgDegree: nodes.size > 0 ? (edges.length / nodes.size).toFixed(2) : 0
  };
}

export default {
  generateStyledMermaidFlowchart,
  generateFileDependencyDiagram,
  getDiagramStats
};
