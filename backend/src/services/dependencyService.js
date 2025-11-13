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

function parseCppFile(content, filePath) {
  const dependencies = [];
  
  // Match #include <header> (system headers)
  const systemIncludeRegex = /#include\s*<([^>]+)>/g;
  let match;
  
  while ((match = systemIncludeRegex.exec(content)) !== null) {
    dependencies.push({
      module: match[1],
      type: 'builtin' // System/standard library headers
    });
  }
  
  // Match #include "header" (local/project headers)
  const localIncludeRegex = /#include\s*"([^"]+)"/g;
  
  while ((match = localIncludeRegex.exec(content)) !== null) {
    const header = match[1];
    dependencies.push({
      module: header,
      type: header.startsWith('.') || header.includes('/') ? 'internal' : 'external'
    });
  }
  
  return { filePath, dependencies };
}

// Main parser that detects file type and uses appropriate parser
function parseFile(content, filePath) {
  const ext = filePath.substring(filePath.lastIndexOf('.'));
  
  // C/C++ files
  if (['.cpp', '.cc', '.cxx', '.c', '.h', '.hpp', '.hxx'].includes(ext)) {
    return parseCppFile(content, filePath);
  }
  
  // JavaScript/TypeScript files (default)
  return parseJavaScriptFile(content, filePath);
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
  
  // Try different extensions based on source file type
  const sourceExt = sourcePath.substring(sourcePath.lastIndexOf('.'));
  let possiblePaths = [];
  
  if (['.cpp', '.cc', '.cxx', '.c', '.h', '.hpp', '.hxx'].includes(sourceExt)) {
    // C++ file extensions
    possiblePaths = [
      basePath + '.h',
      basePath + '.hpp',
      basePath + '.hxx',
      basePath + '.cpp',
      basePath + '.cc',
      basePath + '.cxx',
      basePath + '.c'
    ];
  } else {
    // JavaScript/TypeScript extensions
    possiblePaths = [
      basePath + '.js',
      basePath + '/index.js',
      basePath + '.ts',
      basePath + '/index.ts'
    ];
  }
  
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
      nodes.push({ name: file.filePath, type: 'code' });
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
            nodes.push({ name: resolvedTarget, type: 'code' });
            nodeSet.add(resolvedTarget);
            dependencyMap[resolvedTarget] = [];
          }
          dependencyMap[file.filePath].push(resolvedTarget);
        }
      } else if (dep.type === 'external' || dep.type === 'builtin') {
        if (!nodeSet.has(dep.module)) {
          nodes.push({ 
            name: dep.module, 
            type: dep.type === 'builtin' ? 'builtin' : 'external' 
          });
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
  parseCppFile,
  parseFile,
  exportDependencyGraphJSON
};
