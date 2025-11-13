/**
 * Simple Dependency Analyzer
 * Analyzes JavaScript files to extract dependency information
 */

/**
 * Parse a JavaScript file and extract all require/import statements
 * @param {string} content - File content
 * @param {string} filePath - Path to the file
 * @returns {Object} Parsed dependency information
 */
function parseJavaScriptFile(content, filePath) {
  const dependencies = [];
  
  // Match CommonJS require statements
  // Examples: require('module'), require("module"), require('./file')
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  
  while ((match = requireRegex.exec(content)) !== null) {
    const moduleName = match[1];
    const lineNumber = content.substring(0, match.index).split('\n').length;
    
    dependencies.push({
      module: moduleName,
      type: classifyDependency(moduleName),
      line: lineNumber
    });
  }
  
  // Match ES6 import statements
  // Examples: import x from 'module', import { x } from 'module'
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
  
  while ((match = importRegex.exec(content)) !== null) {
    const moduleName = match[1];
    const lineNumber = content.substring(0, match.index).split('\n').length;
    
    dependencies.push({
      module: moduleName,
      type: classifyDependency(moduleName),
      line: lineNumber
    });
  }
  
  return {
    filePath,
    dependencies,
    stats: {
      total: dependencies.length,
      internal: dependencies.filter(d => d.type === 'internal').length,
      external: dependencies.filter(d => d.type === 'external').length,
      builtin: dependencies.filter(d => d.type === 'builtin').length
    }
  };
}

/**
 * Classify a dependency as internal (relative), external (npm), or builtin (node)
 * @param {string} moduleName - The module name
 * @returns {string} The type: 'internal', 'external', or 'builtin'
 */
function classifyDependency(moduleName) {
  // Relative paths (./ or ../)
  if (moduleName.startsWith('.')) {
    return 'internal';
  }
  
  // Node built-in modules
  const builtinModules = [
    'fs', 'path', 'http', 'https', 'crypto', 'os', 'util', 'events',
    'stream', 'buffer', 'child_process', 'cluster', 'net', 'dgram',
    'dns', 'readline', 'repl', 'tls', 'tty', 'url', 'querystring',
    'zlib', 'assert', 'string_decoder', 'vm', 'v8', 'timers',
    'node:fs', 'node:path', 'node:http', 'node:https', 'node:crypto'
  ];
  
  if (builtinModules.includes(moduleName) || moduleName.startsWith('node:')) {
    return 'builtin';
  }
  
  // Everything else is external (npm packages)
  return 'external';
}

/**
 * Analyze multiple files and build a dependency summary
 * @param {Array} parsedFiles - Array of parsed file objects
 * @returns {Object} Summary of all dependencies
 */
function analyzeDependencies(parsedFiles) {
  const allDependencies = new Map();
  const fileGraph = {};
  
  // Build dependency map
  parsedFiles.forEach(file => {
    fileGraph[file.filePath] = {
      dependencies: file.dependencies,
      stats: file.stats
    };
    
    file.dependencies.forEach(dep => {
      if (!allDependencies.has(dep.module)) {
        allDependencies.set(dep.module, {
          name: dep.module,
          type: dep.type,
          usedIn: []
        });
      }
      allDependencies.get(dep.module).usedIn.push(file.filePath);
    });
  });
  
  // Convert to array and sort by usage
  const dependencyList = Array.from(allDependencies.values())
    .sort((a, b) => b.usedIn.length - a.usedIn.length);
  
  return {
    summary: {
      totalFiles: parsedFiles.length,
      totalDependencies: dependencyList.length,
      totalImports: parsedFiles.reduce((sum, f) => sum + f.stats.total, 0)
    },
    byType: {
      internal: dependencyList.filter(d => d.type === 'internal').length,
      external: dependencyList.filter(d => d.type === 'external').length,
      builtin: dependencyList.filter(d => d.type === 'builtin').length
    },
    dependencies: dependencyList,
    files: fileGraph
  };
}

/**
 * Build a dependency graph showing file-to-file and file-to-library relationships
 * @param {Array} parsedFiles - Array of parsed file objects
 * @returns {Object} Graph structure with nodes and edges
 */
function buildDependencyGraph(parsedFiles) {
  const nodes = new Map();
  const edges = [];
  
  // Create nodes for all files
  parsedFiles.forEach(file => {
    nodes.set(file.filePath, {
      id: file.filePath,
      type: 'file',
      label: file.filePath.split('/').pop(),
      dependencies: []
    });
  });
  
  // Create nodes and edges for dependencies
  parsedFiles.forEach(file => {
    file.dependencies.forEach(dep => {
      const targetId = dep.module;
      
      // Create node for dependency if it doesn't exist
      if (!nodes.has(targetId)) {
        nodes.set(targetId, {
          id: targetId,
          type: dep.type, // 'internal', 'external', or 'builtin'
          label: targetId.split('/').pop()
        });
      }
      
      // Create edge from file to dependency
      edges.push({
        from: file.filePath,
        to: targetId,
        type: dep.type
      });
      
      // Track dependencies
      nodes.get(file.filePath).dependencies.push(targetId);
    });
  });
  
  return {
    nodes: Array.from(nodes.values()),
    edges: edges
  };
}

/**
 * Print a visual text-based dependency graph
 * @param {Array} parsedFiles - Array of parsed file objects
 */
function printDependencyGraph(parsedFiles) {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    DEPENDENCY GRAPH                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  // Group by file
  parsedFiles.forEach(file => {
    const fileName = file.filePath;
    console.log(`\n📄 ${fileName}`);
    console.log('   │');
    
    if (file.dependencies.length === 0) {
      console.log('   └── (no dependencies)');
      return;
    }
    
    // Group dependencies by type
    const internal = file.dependencies.filter(d => d.type === 'internal');
    const external = file.dependencies.filter(d => d.type === 'external');
    const builtin = file.dependencies.filter(d => d.type === 'builtin');
    
    // Print internal dependencies (file-to-file)
    if (internal.length > 0) {
      console.log('   ├─── Internal (Files):');
      internal.forEach((dep, idx) => {
        const isLast = idx === internal.length - 1 && external.length === 0 && builtin.length === 0;
        const prefix = isLast ? '   │    └──' : '   │    ├──';
        console.log(`${prefix} 📄 ${dep.module}`);
      });
    }
    
    // Print external dependencies (npm packages)
    if (external.length > 0) {
      console.log('   ├─── External (NPM):');
      external.forEach((dep, idx) => {
        const isLast = idx === external.length - 1 && builtin.length === 0;
        const prefix = isLast ? '   │    └──' : '   │    ├──';
        console.log(`${prefix} 📦 ${dep.module}`);
      });
    }
    
    // Print builtin dependencies (node modules)
    if (builtin.length > 0) {
      console.log('   └─── Built-in (Node):');
      builtin.forEach((dep, idx) => {
        const isLast = idx === builtin.length - 1;
        const prefix = isLast ? '        └──' : '        ├──';
        console.log(`${prefix} ⚙️  ${dep.module}`);
      });
    }
  });
  
  console.log('\n');
}

/**
 * Print dependency relationships in a compact format
 * @param {Array} parsedFiles - Array of parsed file objects
 */
function printDependencyMap(parsedFiles) {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    DEPENDENCY MAP                             ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  // Build reverse dependency map (who depends on what)
  const dependencyMap = new Map();
  
  parsedFiles.forEach(file => {
    file.dependencies.forEach(dep => {
      if (!dependencyMap.has(dep.module)) {
        dependencyMap.set(dep.module, {
          type: dep.type,
          usedBy: []
        });
      }
      dependencyMap.get(dep.module).usedBy.push(file.filePath);
    });
  });
  
  // Group by type
  const internal = [];
  const external = [];
  const builtin = [];
  
  dependencyMap.forEach((data, module) => {
    const entry = { module, usedBy: data.usedBy };
    if (data.type === 'internal') internal.push(entry);
    else if (data.type === 'external') external.push(entry);
    else builtin.push(entry);
  });
  
  // Print internal dependencies (file-to-file relationships)
  if (internal.length > 0) {
    console.log('📄 INTERNAL DEPENDENCIES (File-to-File):');
    console.log('─'.repeat(60));
    internal.forEach(({ module, usedBy }) => {
      console.log(`\n  ${module}`);
      console.log('    ↑');
      usedBy.forEach(file => {
        console.log(`    ├─ ${file}`);
      });
    });
    console.log('\n');
  }
  
  // Print external dependencies (libraries)
  if (external.length > 0) {
    console.log('📦 EXTERNAL DEPENDENCIES (NPM Packages):');
    console.log('─'.repeat(60));
    external.sort((a, b) => b.usedBy.length - a.usedBy.length);
    external.forEach(({ module, usedBy }) => {
      console.log(`\n  ${module} (used by ${usedBy.length} file${usedBy.length > 1 ? 's' : ''})`);
      console.log('    ↑');
      usedBy.forEach(file => {
        console.log(`    ├─ ${file}`);
      });
    });
    console.log('\n');
  }
  
  // Print builtin dependencies
  if (builtin.length > 0) {
    console.log('⚙️  BUILT-IN DEPENDENCIES (Node.js):');
    console.log('─'.repeat(60));
    builtin.sort((a, b) => b.usedBy.length - a.usedBy.length);
    builtin.forEach(({ module, usedBy }) => {
      console.log(`\n  ${module} (used by ${usedBy.length} file${usedBy.length > 1 ? 's' : ''})`);
      console.log('    ↑');
      usedBy.forEach(file => {
        console.log(`    ├─ ${file}`);
      });
    });
    console.log('\n');
  }
}

export default {
  parseJavaScriptFile,
  analyzeDependencies,
  classifyDependency,
  buildDependencyGraph,
  printDependencyGraph,
  printDependencyMap
};
