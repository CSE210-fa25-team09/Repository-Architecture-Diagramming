/**
 * Graph Visualization Service
 * Converts dependency trees into Mermaid.js diagrams
 * 
 * Architecture:
 * 1. Collectors - Extract data from dependency tree
 * 2. Builders - Build intermediate data structures  
 * 3. Renderers - Generate Mermaid syntax output
 */

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const sanitizeLabel = (label) => label.replace(/["[\]]/g, '');
const getFileName = (path) => path.split('/').pop();
const getFolderPath = (path) => {
  const lastSlash = path.lastIndexOf('/');
  return lastSlash > 0 ? path.substring(0, lastSlash) : '';
};

// =============================================================================
// ID GENERATORS
// =============================================================================

/**
 * Creates a unique ID generator for graph nodes
 */
function createNodeIdGenerator() {
  const nodes = new Map();
  let counter = 0;
  
  return {
    getNodeId: (path) => {
      if (!nodes.has(path)) {
        nodes.set(path, `node${counter++}`);
      }
      return nodes.get(path);
    },
    nodes
  };
}

/**
 * Creates a unique ID generator for folder subgraphs
 */
function createSubgraphIdGenerator() {
  const subgraphs = new Map();
  
  return {
    getSubgraphId: (folderPath) => {
      if (!subgraphs.has(folderPath)) {
        const sanitizedId = folderPath.replace(/[^a-zA-Z0-9]/g, '_');
        subgraphs.set(folderPath, `folder_${sanitizedId}`);
      }
      return subgraphs.get(folderPath);
    }
  };
}

// =============================================================================
// DATA COLLECTORS - Extract information from dependency tree
// =============================================================================

/**
 * Collects nodes and edges from a dependency tree
 * @param {Array} tree - The dependency tree
 * @param {Object} options - Collection options
 * @returns {Object} { nodes: Map, edges: Array, nodeStyles: Object }
 */
function collectGraphData(tree, options = {}) {
  const { showExternal = true, showBuiltin = false, maxDepth = null } = options;
  const { getNodeId } = createNodeIdGenerator();
  
  const nodes = new Map();      // nodeId -> { id, label, fullPath, folderPath, type }
  const edges = new Set();      // JSON strings for deduplication
  const nodeStyles = {
    code: new Set(),
    internal: new Set(),
    external: new Set(),
    builtin: new Set()
  };

  function traverse(treeNodes, currentPath = '', depth = 0) {
    if (!Array.isArray(treeNodes)) return;
    if (maxDepth !== null && depth > maxDepth) return;

    for (const node of treeNodes) {
      const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;

      if (node.type === 'file' && node.dependencies?.length > 0) {
        // Register source node
        const sourceId = getNodeId(fullPath);
        const sourceLabel = getFileName(fullPath);
        
        if (!nodes.has(sourceId)) {
          nodes.set(sourceId, {
            id: sourceId,
            label: sourceLabel,
            fullPath,
            folderPath: getFolderPath(fullPath),
            type: 'code'
          });
        }
        nodeStyles.code.add(sourceId);

        // Process dependencies
        for (const dep of node.dependencies) {
          if (dep.type === 'external' && !showExternal) continue;
          if (dep.type === 'builtin' && !showBuiltin) continue;

          const targetId = getNodeId(dep.module);
          const targetLabel = dep.type === 'internal' ? getFileName(dep.module) : dep.module;

          // Register target node
          if (!nodes.has(targetId)) {
            nodes.set(targetId, {
              id: targetId,
              label: targetLabel,
              fullPath: dep.module,
              folderPath: dep.type === 'internal' ? getFolderPath(dep.module) : null,
              type: dep.type
            });
          }

          // Classify for styling
          if (dep.type === 'internal') nodeStyles.internal.add(targetId);
          else if (dep.type === 'external') nodeStyles.external.add(targetId);
          else if (dep.type === 'builtin') nodeStyles.builtin.add(targetId);

          // Add edge (use JSON for deduplication)
          edges.add(JSON.stringify({ sourceId, targetId }));
        }
      }

      if (node.type === 'dir' && node.children) {
        traverse(node.children, fullPath, depth + 1);
      }
    }
  }

  traverse(tree);

  return { 
    nodes, 
    edges: Array.from(edges).map(e => JSON.parse(e)), 
    nodeStyles 
  };
}

// =============================================================================
// FOLDER HIERARCHY BUILDER
// =============================================================================

/**
 * Builds a nested folder hierarchy from nodes
 * @param {Map} nodes - Map of nodeId -> node data
 * @returns {Object} Nested folder structure
 */
function buildFolderHierarchy(nodes) {
  const root = { children: {}, nodes: [], name: '', path: '' };
  
  // Group nodes by folder path
  const nodesByFolder = new Map();
  for (const [nodeId, node] of nodes) {
    if (node.folderPath === null) continue; // Skip external/builtin
    
    const folderPath = node.folderPath;
    if (!nodesByFolder.has(folderPath)) {
      nodesByFolder.set(folderPath, []);
    }
    nodesByFolder.get(folderPath).push(node);
  }

  // Build nested tree structure
  for (const [folderPath, folderNodes] of nodesByFolder) {
    if (!folderPath) {
      root.nodes.push(...folderNodes);
      continue;
    }

    const parts = folderPath.split('/');
    let current = root;
    let currentPath = '';

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (!current.children[part]) {
        current.children[part] = { children: {}, nodes: [], name: part, path: currentPath };
      }
      current = current.children[part];
    }

    current.nodes.push(...folderNodes);
  }

  return root;
}

// =============================================================================
// MERMAID RENDERERS - Generate Mermaid syntax
// =============================================================================

/**
 * Renders nodes grouped by folders as Mermaid subgraphs
 */
function renderFolderSubgraphs(hierarchy, getSubgraphId, indent = 1) {
  const renderedNodes = new Set();

  function render(hier, level) {
    const ind = '    '.repeat(level);
    const result = [];

    // Render nodes at this level
    for (const node of hier.nodes) {
      if (!renderedNodes.has(node.id)) {
        renderedNodes.add(node.id);
        result.push(`${ind}${node.id}["${sanitizeLabel(node.label)}"]`);
      }
    }

    // Render child folders as nested subgraphs
    for (const [folderName, child] of Object.entries(hier.children)) {
      const subgraphId = getSubgraphId(child.path);
      result.push(`${ind}subgraph ${subgraphId}["📁 ${folderName}"]`);
      result.push(...render(child, level + 1));
      result.push(`${ind}end`);
    }

    return result;
  }

  return { lines: render(hierarchy, indent), renderedNodes };
}

/**
 * Renders external/builtin nodes (not in any folder)
 */
function renderExternalNodes(nodes, renderedNodes) {
  const lines = [];
  const externalNodes = [];

  for (const [nodeId, node] of nodes) {
    if (!renderedNodes.has(nodeId) && node.folderPath === null) {
      externalNodes.push(`    ${nodeId}["${sanitizeLabel(node.label)}"]`);
      renderedNodes.add(nodeId);
    }
  }

  if (externalNodes.length > 0) {
    lines.push('', '    %% External/Builtin Dependencies', ...externalNodes);
  }

  return lines;
}

/**
 * Renders edges as Mermaid arrows
 */
function renderEdges(edges) {
  return ['', '    %% Dependencies', ...edges.map(e => `    ${e.sourceId} --> ${e.targetId}`)];
}

/**
 * Renders node style definitions
 */
function renderStyles(nodeStyles) {
  const lines = ['', '    %% Styling'];
  
  const styleConfig = [
    { set: nodeStyles.code, name: 'codeStyle', style: 'fill:#4A90E2,stroke:#2E5C8A,stroke-width:2px,color:#fff' },
    { set: nodeStyles.internal, name: 'internalStyle', style: 'fill:#50C878,stroke:#2E7D4E,stroke-width:2px,color:#fff' },
    { set: nodeStyles.external, name: 'externalStyle', style: 'fill:#FF6B6B,stroke:#C92A2A,stroke-width:2px,color:#fff' },
    { set: nodeStyles.builtin, name: 'builtinStyle', style: 'fill:#FFA500,stroke:#CC8400,stroke-width:2px,color:#fff' }
  ];

  for (const { set, name, style } of styleConfig) {
    if (set.size > 0) {
      lines.push(`    classDef ${name} ${style}`);
      lines.push(`    class ${Array.from(set).join(',')} ${name}`);
    }
  }

  return lines;
}

/**
 * Renders a simple flat graph (no folder grouping)
 */
function renderFlatGraph(nodes, edges) {
  return edges.map(edge => {
    const source = nodes.get(edge.sourceId);
    const target = nodes.get(edge.targetId);
    return `    ${edge.sourceId}["${sanitizeLabel(source.label)}"] --> ${edge.targetId}["${sanitizeLabel(target.label)}"]`;
  });
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Generate a Mermaid flowchart with optional styling and folder grouping
 * @param {Array} tree - The dependency tree structure
 * @param {Object} options - Visualization options
 * @returns {string} Mermaid diagram syntax
 */
function generateStyledMermaidFlowchart(tree, options = {}) {
  const {
    direction = 'LR',
    showExternal = true,
    showBuiltin = false,
    maxDepth = null,
    styled = true,
    groupByFolder = true
  } = options;

  // Step 1: Collect graph data from tree
  const { nodes, edges, nodeStyles } = collectGraphData(tree, { showExternal, showBuiltin, maxDepth });

  // Step 2: Start building Mermaid output
  const lines = [`graph ${direction}`];

  // Step 3: Render nodes (grouped by folder or flat)
  if (groupByFolder && nodes.size > 0) {
    const { getSubgraphId } = createSubgraphIdGenerator();
    const hierarchy = buildFolderHierarchy(nodes);
    const { lines: subgraphLines, renderedNodes } = renderFolderSubgraphs(hierarchy, getSubgraphId);
    
    lines.push(...subgraphLines);
    lines.push(...renderExternalNodes(nodes, renderedNodes));
    lines.push(...renderEdges(edges));
  } else {
    lines.push(...renderFlatGraph(nodes, edges));
  }

  // Step 4: Add styling classes
  if (styled) {
    lines.push(...renderStyles(nodeStyles));
  }

  return lines.join('\n');
}

/**
 * Generate a focused Mermaid diagram for a specific file
 * @param {Array} tree - The dependency tree structure
 * @param {string} targetFile - The file path to focus on
 * @param {Object} options - Visualization options
 * @returns {string} Mermaid diagram syntax
 */
function generateFileDependencyDiagram(tree, targetFile, options = {}) {
  const { direction = 'LR' } = options;
  const { getNodeId } = createNodeIdGenerator();

  // Find target file in tree
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
  const sourceId = getNodeId(targetFile);
  const sourceLabel = getFileName(targetFile);

  // Handle file not found or no dependencies
  if (!fileNode?.dependencies) {
    return `graph ${direction}\n    ${sourceId}["${sanitizeLabel(sourceLabel)}"]`;
  }

  // Build edges for this file's dependencies
  const lines = [`graph ${direction}`];
  for (const dep of fileNode.dependencies) {
    const targetId = getNodeId(dep.module);
    const targetLabel = dep.type === 'internal' ? getFileName(dep.module) : dep.module;
    lines.push(`    ${sourceId}["${sanitizeLabel(sourceLabel)}"] --> ${targetId}["${sanitizeLabel(targetLabel)}"]`);
  }

  return lines.join('\n');
}

/**
 * Generate statistics about a Mermaid diagram
 * @param {string} mermaidDiagram - The generated Mermaid diagram
 * @returns {Object} Statistics about the diagram
 */
function getDiagramStats(mermaidDiagram) {
  const lines = mermaidDiagram.split('\n');
  const edgeLines = lines.filter(line => line.includes('-->'));
  const nodeIds = new Set();

  for (const line of edgeLines) {
    const matches = line.matchAll(/node\d+/g);
    for (const match of matches) {
      nodeIds.add(match[0]);
    }
  }

  return {
    totalNodes: nodeIds.size,
    totalEdges: edgeLines.length,
    avgDegree: nodeIds.size > 0 ? (edgeLines.length / nodeIds.size).toFixed(2) : 0
  };
}

export default {
  generateStyledMermaidFlowchart,
  generateFileDependencyDiagram,
  getDiagramStats
};
