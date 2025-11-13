import { 
  REGEX_PATTERNS, 
  BUILTIN_MODULES, 
  FILE_EXTENSIONS,
  PATH_RESOLUTION_EXTENSIONS,
  getLanguageFromExtension
} from '../config/parserConfig.js';

// Helper to add unique dependencies
function addDependency(dependencies, seen, module, type) {
  if (!seen.has(module)) {
    dependencies.push({ module, type });
    seen.add(module);
  }
}

function parseJSTSFile(content, filePath) {
  const dependencies = [];
  const seen = new Set();
  
  // Parse all import patterns
  const patterns = [
    REGEX_PATTERNS.jsts.require,
    REGEX_PATTERNS.jsts.import,
    REGEX_PATTERNS.jsts.dynamicImport,
    REGEX_PATTERNS.jsts.exportFrom,
    REGEX_PATTERNS.jsts.tripleSlash
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      addDependency(dependencies, seen, match[1], classifyJstsDependency(match[1]));
    }
  });
  
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

function parseJavaFile(content, filePath) {
  const dependencies = [];
  let match;
  
  // Parse import statements (including static imports and wildcard imports)
  while ((match = REGEX_PATTERNS.java.import.exec(content)) !== null) {
    const importPath = match[1];
    
    // Skip wildcard imports like java.util.*
    if (importPath.endsWith('.*')) {
      const packageName = importPath.slice(0, -2); // Remove .*
      dependencies.push({
        module: packageName,
        type: classifyJavaDependency(packageName)
      });
    } else {
      // For specific class imports, use the package name
      const lastDot = importPath.lastIndexOf('.');
      const packageName = lastDot > 0 ? importPath.substring(0, lastDot) : importPath;
      dependencies.push({
        module: packageName,
        type: classifyJavaDependency(packageName)
      });
    }
  }
  
  return { filePath, dependencies };
}

function parseGoFile(content, filePath) {
  const dependencies = [];
  const importedPackages = new Set();
  
  // Parse single-line imports: import "package"
  let match;
  while ((match = REGEX_PATTERNS.go.import.exec(content)) !== null) {
    importedPackages.add(match[1]);
  }
  
  // Parse multi-line import blocks: import ( ... )
  while ((match = REGEX_PATTERNS.go.importBlock.exec(content)) !== null) {
    const importBlock = match[1];
    let lineMatch;
    while ((lineMatch = REGEX_PATTERNS.go.importLine.exec(importBlock)) !== null) {
      importedPackages.add(lineMatch[1]);
    }
  }
  
  // Classify each imported package
  importedPackages.forEach(packagePath => {
    dependencies.push({
      module: packagePath,
      type: classifyGoDependency(packagePath)
    });
  });
  
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
  
  // Go files
  if (FILE_EXTENSIONS.go.includes(ext)) {
    return parseGoFile(content, filePath);
  }
  
  // Java files
  if (FILE_EXTENSIONS.java.includes(ext)) {
    return parseJavaFile(content, filePath);
  }
  
  // Python files
  if (FILE_EXTENSIONS.python.includes(ext)) {
    return parsePythonFile(content, filePath);
  }
  
  // C/C++ files
  if (FILE_EXTENSIONS.cpp.includes(ext)) {
    return parseCppFile(content, filePath);
  }
  
  // JavaScript/TypeScript files (default)
  return parseJSTSFile(content, filePath);
}

function classifyJstsDependency(moduleName) {
  if (moduleName.startsWith('.')) return 'internal';
  
  if (BUILTIN_MODULES.jsts.includes(moduleName) || moduleName.startsWith('node:')) {
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

function classifyJavaDependency(packageName) {
  // Check if it's a standard Java package
  if (packageName.startsWith('java.') || packageName.startsWith('javax.')) {
    return 'builtin';
  }
  
  // Check against known standard packages
  if (BUILTIN_MODULES.java.includes(packageName)) {
    return 'builtin';
  }
  
  // Everything else is external (third-party libraries)
  return 'external';
}

function classifyGoDependency(packagePath) {
  // Relative imports (start with .)
  if (packagePath.startsWith('.')) return 'internal';
  
  // Check if it's a standard library package
  // Standard library packages don't contain dots or are single-level
  const parts = packagePath.split('/');
  const basePackage = parts[0];
  
  // Check against Go standard library
  if (BUILTIN_MODULES.go.includes(packagePath) || BUILTIN_MODULES.go.includes(basePackage)) {
    return 'builtin';
  }
  
  // External packages typically have domain names (contain dots) or start with github.com, etc.
  if (basePackage.includes('.') || packagePath.includes('github.com') || packagePath.includes('golang.org')) {
    return 'external';
  }
  
  // If no dot and not in stdlib, could be internal project package
  return 'internal';
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
  const fileSet = new Set(parsedFiles.map(f => f.filePath));
  
  // Helper to add a node
  const addNode = (name, type) => {
    if (!nodeSet.has(name)) {
      nodes.push({ name, type });
      nodeSet.add(name);
      dependencyMap[name] = [];
    }
  };
  
  // Add all source files as nodes
  parsedFiles.forEach(file => addNode(file.filePath, 'code'));
  
  // Process dependencies
  parsedFiles.forEach(file => {
    file.dependencies.forEach(dep => {
      if (dep.type === 'internal') {
        const resolvedTarget = resolveImportPath(file.filePath, dep.module, fileSet);
        if (resolvedTarget && fileSet.has(resolvedTarget)) {
          addNode(resolvedTarget, 'code');
          dependencyMap[file.filePath].push(resolvedTarget);
        }
      } else {
        const type = dep.type === 'builtin' ? 'builtin' : 'external';
        addNode(dep.module, type);
        dependencyMap[file.filePath].push(dep.module);
      }
    });
  });
  
  return { nodes, dependencies: dependencyMap };
}

export default {
  parseJSTSFile,
  parseCppFile,
  parsePythonFile,
  parseJavaFile,
  parseGoFile,
  parseFile,
  exportDependencyGraphJSON
};
