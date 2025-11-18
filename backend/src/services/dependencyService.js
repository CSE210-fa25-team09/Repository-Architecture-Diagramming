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

function exportDependencyGraphWithTree(parsedFiles, repoTree) {
  const fileSet = new Set(parsedFiles.map(f => f.filePath));
  const fileDependencyMap = new Map();
  
  // Build dependency map for each file
  parsedFiles.forEach(file => {
    const dependencies = [];
    
    file.dependencies.forEach(dep => {
      if (dep.type === 'internal') {
        const resolvedTarget = resolveImportPath(file.filePath, dep.module, fileSet);
        if (resolvedTarget && fileSet.has(resolvedTarget)) {
          dependencies.push({ module: resolvedTarget, type: 'internal' });
        }
      } else {
        dependencies.push({ module: dep.module, type: dep.type });
      }
    });
    
    fileDependencyMap.set(file.filePath, dependencies);
  });
  
  // Add dependencies to tree structure
  function addDependenciesToTree(nodes, currentPath = '') {
    if (!Array.isArray(nodes)) return nodes;
    
    return nodes.map(node => {
      const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;
      const newNode = { ...node };
      
      if (node.type === 'file') {
        // Add dependencies if this file was analyzed
        const deps = fileDependencyMap.get(fullPath);
        if (deps && deps.length > 0) {
          newNode.dependencies = deps;
        } else {
          newNode.dependencies = [];
        }
      } else if (node.type === 'dir' && node.children) {
        // Recursively process children
        newNode.children = addDependenciesToTree(node.children, fullPath);
      }
      
      return newNode;
    });
  }
  
  return addDependenciesToTree(repoTree);
}

/**
 * Extract files from a tree structure by language
 * @param {Array|Object} tree - The tree structure (array of nodes or single root node)
 * @param {string} language - Language name ('jsts', 'cpp', 'python', 'java', 'go', or 'all')
 * @returns {Array} Array of file paths matching the language
 */
function extractFilesByLanguage(tree, language = 'all') {
  const codeFiles = [];
  
  // Determine which extensions to look for
  let targetExtensions;
  if (language === 'all') {
    targetExtensions = [
      ...FILE_EXTENSIONS.jsts,
      ...FILE_EXTENSIONS.cpp,
      ...FILE_EXTENSIONS.python,
      ...FILE_EXTENSIONS.java,
      ...FILE_EXTENSIONS.go
    ];
  } else if (FILE_EXTENSIONS[language]) {
    targetExtensions = FILE_EXTENSIONS[language];
  } else {
    throw new Error(`Unknown language: ${language}. Use 'jsts', 'cpp', 'python', 'java', 'go', or 'all'`);
  }
  
  function traverse(nodes, currentPath = '') {
    if (!Array.isArray(nodes)) return;
    nodes.forEach(node => {
      const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;
      const ext = node.name.substring(node.name.lastIndexOf('.'));
      if (node.type === 'file' && targetExtensions.includes(ext)) {
        codeFiles.push(fullPath);
      } else if (node.type === 'dir' && node.children) {
        traverse(node.children, fullPath);
      }
    });
  }
  
  // Handle both array of nodes and single root node with children
  if (Array.isArray(tree)) {
    traverse(tree);
  } else if (tree && tree.children) {
    traverse(tree.children, tree.path || '');
  }
  
  return codeFiles;
}

/**
 * Analyze dependencies for a repository
 * @param {Object} githubService - GitHub service instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} branch - Branch name
 * @param {Object} options - Analysis options
 * @returns {Object} Analysis result with tree, parsedFiles, and metadata
 */
async function analyzeDependencies(githubService, owner, repo, branch, options = {}) {
  const { maxFiles = 1000, language = 'all' } = options;
  
  try {
    // Get repository tree
    const tree = await githubService.getRepoTree(owner, repo, '', branch);
    
    // Extract files by language
    const allCodeFiles = extractFilesByLanguage(tree, language);
    const filesToAnalyze = maxFiles ? allCodeFiles.slice(0, maxFiles) : allCodeFiles;
    
    console.log(`Found ${allCodeFiles.length} files, analyzing ${filesToAnalyze.length}`);
    
    // Parse all files
    const parsedFiles = [];
    for (const filePath of filesToAnalyze) {
      const content = await githubService.getFile(owner, repo, filePath, branch);
      const parsed = parseFile(content, filePath);
      parsedFiles.push(parsed);
      
      if (options.verbose) {
        console.log(`✓ ${filePath} (${parsed.dependencies.length} deps)`);
      }
    }
    
    // Export dependency graph with tree structure
    const treeWithDeps = exportDependencyGraphWithTree(parsedFiles, tree);
    
    // Get commit SHA for versioning
    const commitSha = await githubService.getLatestCommit(owner, repo, branch);
    
    return {
      success: true,
      data: {
        tree: treeWithDeps,
        parsedFiles,
        metadata: {
          owner,
          repo,
          branch,
          commitSha,
          totalFiles: allCodeFiles.length,
          analyzedFiles: parsedFiles.length,
          language,
          timestamp: new Date().toISOString()
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  parseJSTSFile,
  parseCppFile,
  parsePythonFile,
  parseJavaFile,
  parseGoFile,
  parseFile,
  exportDependencyGraphWithTree,
  extractFilesByLanguage,
  analyzeDependencies
};
