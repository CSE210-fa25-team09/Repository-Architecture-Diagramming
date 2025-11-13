/**
 * Dependency Analyzer - Core Functions Only
 */

import { 
  REGEX_PATTERNS, 
  BUILTIN_MODULES, 
  FILE_EXTENSIONS,
  PATH_RESOLUTION_EXTENSIONS,
  getLanguageFromExtension
} from '../config/parserConfig.js';

function parseJavaScriptFile(content, filePath) {
  const dependencies = [];
  let match;
  
  // Parse require() statements
  while ((match = REGEX_PATTERNS.javascript.require.exec(content)) !== null) {
    dependencies.push({
      module: match[1],
      type: classifyDependency(match[1])
    });
  }
  
  // Parse import statements
  while ((match = REGEX_PATTERNS.javascript.import.exec(content)) !== null) {
    dependencies.push({
      module: match[1],
      type: classifyDependency(match[1])
    });
  }
  
  return { filePath, dependencies };
}

function parseCppFile(content, filePath) {
  const dependencies = [];
  let match;
  
  // Match #include <header> (system headers)
  while ((match = REGEX_PATTERNS.cpp.systemInclude.exec(content)) !== null) {
    dependencies.push({
      module: match[1],
      type: 'builtin' // System/standard library headers
    });
  }
  
  // Match #include "header" (local/project headers)
  while ((match = REGEX_PATTERNS.cpp.localInclude.exec(content)) !== null) {
    const header = match[1];
    dependencies.push({
      module: header,
      type: header.startsWith('.') || header.includes('/') ? 'internal' : 'external'
    });
  }
  
  return { filePath, dependencies };
}

function parsePythonFile(content, filePath) {
  const dependencies = [];
  let match;
  
  // Parse import statements
  while ((match = REGEX_PATTERNS.python.import.exec(content)) !== null) {
    const moduleName = match[1].split('.')[0]; // Get base module (e.g., 'os' from 'os.path')
    dependencies.push({
      module: moduleName,
      type: classifyPythonDependency(moduleName)
    });
  }
  
  // Parse from...import statements
  while ((match = REGEX_PATTERNS.python.fromImport.exec(content)) !== null) {
    const moduleName = match[1];
    dependencies.push({
      module: moduleName,
      type: classifyPythonDependency(moduleName)
    });
  }
  
  return { filePath, dependencies };
}

// Main parser that detects file type and uses appropriate parser
function parseFile(content, filePath) {
  const ext = filePath.substring(filePath.lastIndexOf('.'));
  
  // Python files
  if (FILE_EXTENSIONS.python.includes(ext)) {
    return parsePythonFile(content, filePath);
  }
  
  // C/C++ files
  if (FILE_EXTENSIONS.cpp.includes(ext)) {
    return parseCppFile(content, filePath);
  }
  
  // JavaScript/TypeScript files (default)
  return parseJavaScriptFile(content, filePath);
}

function classifyDependency(moduleName) {
  if (moduleName.startsWith('.')) return 'internal';
  
  if (BUILTIN_MODULES.javascript.includes(moduleName) || moduleName.startsWith('node:')) {
    return 'builtin';
  }
  
  return 'external';
}

function classifyPythonDependency(moduleName) {
  // Relative imports (start with .)
  if (moduleName.startsWith('.')) return 'internal';
  
  if (BUILTIN_MODULES.python.includes(moduleName)) {
    return 'builtin';
  }
  
  return 'external';
}

function resolveImportPath(sourcePath, importPath, fileSet) {
  if (!importPath.startsWith('./') && !importPath.startsWith('../')) return null;
  
  // Resolve the base path
  const sourceDir = sourcePath.substring(0, sourcePath.lastIndexOf('/'));
  const parts = sourceDir.split('/');
  const importParts = importPath.split('/');
  
  for (const part of importParts) {
    if (part === '..') parts.pop();
    else if (part !== '.') parts.push(part);
  }
  
  const basePath = parts.join('/');
  
  // Get language-specific extensions to try
  const language = getLanguageFromExtension(sourcePath);
  const extensionsToTry = PATH_RESOLUTION_EXTENSIONS[language] || PATH_RESOLUTION_EXTENSIONS.javascript;
  
  // Try each possible extension/path variant
  for (const ext of extensionsToTry) {
    const possiblePath = basePath + ext;
    if (fileSet.has(possiblePath)) return possiblePath;
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
  parsePythonFile,
  parseFile,
  exportDependencyGraphJSON
};
