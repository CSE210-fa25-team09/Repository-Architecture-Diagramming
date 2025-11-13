/**
 * Dependency Analyzer - Core Functions Only
 */

function parseJavaScriptFile(content, filePath) {
  const dependencies = [];
  
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  
  while ((match = requireRegex.exec(content)) !== null) {
    dependencies.push({
      module: match[1],
      type: classifyDependency(match[1])
    });
  }
  
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
  
  while ((match = importRegex.exec(content)) !== null) {
    dependencies.push({
      module: match[1],
      type: classifyDependency(match[1])
    });
  }
  
  return { filePath, dependencies };
}

function classifyDependency(moduleName) {
  if (moduleName.startsWith('.')) return 'internal';
  
  const builtinModules = [
    'fs', 'path', 'http', 'https', 'crypto', 'os', 'util', 'events',
    'stream', 'buffer', 'child_process', 'cluster', 'net', 'dgram',
    'dns', 'readline', 'repl', 'tls', 'tty', 'url', 'querystring',
    'zlib', 'assert', 'string_decoder', 'vm', 'v8', 'timers'
  ];
  
  if (builtinModules.includes(moduleName) || moduleName.startsWith('node:')) {
    return 'builtin';
  }
  
  return 'external';
}

function resolveImportPath(sourcePath, importPath, fileSet) {
  if (!importPath.startsWith('./') && !importPath.startsWith('../')) return null;
  
  const sourceDir = sourcePath.substring(0, sourcePath.lastIndexOf('/'));
  const parts = sourceDir.split('/');
  const importParts = importPath.split('/');
  
  for (const part of importParts) {
    if (part === '..') parts.pop();
    else if (part !== '.') parts.push(part);
  }
  
  const basePath = parts.join('/');
  const possiblePaths = [basePath + '.js', basePath + '/index.js', basePath + '.ts', basePath + '/index.ts'];
  
  for (const p of possiblePaths) {
    if (fileSet.has(p)) return p;
  }
  
  return null;
}

function exportDependencyGraphJSON(parsedFiles) {
  const nodes = [];
  const nodeSet = new Set();
  const dependencyMap = {};
  
  parsedFiles.forEach(file => {
    if (!nodeSet.has(file.filePath)) {
      nodes.push(file.filePath);
      nodeSet.add(file.filePath);
      dependencyMap[file.filePath] = [];
    }
  });
  
  const fileSet = new Set(parsedFiles.map(f => f.filePath));
  
  parsedFiles.forEach(file => {
    file.dependencies.forEach(dep => {
      if (dep.type === 'internal') {
        const resolvedTarget = resolveImportPath(file.filePath, dep.module, fileSet);
        if (resolvedTarget && fileSet.has(resolvedTarget)) {
          if (!nodeSet.has(resolvedTarget)) {
            nodes.push(resolvedTarget);
            nodeSet.add(resolvedTarget);
            dependencyMap[resolvedTarget] = [];
          }
          dependencyMap[file.filePath].push(resolvedTarget);
        }
      } else if (dep.type === 'external' || dep.type === 'builtin') {
        if (!nodeSet.has(dep.module)) {
          nodes.push(dep.module);
          nodeSet.add(dep.module);
          dependencyMap[dep.module] = [];
        }
        dependencyMap[file.filePath].push(dep.module);
      }
    });
  });
  
  return { nodes, dependencies: dependencyMap };
}

export default {
  parseJavaScriptFile,
  exportDependencyGraphJSON
};
