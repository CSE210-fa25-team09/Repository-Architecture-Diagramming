/**
 * Parser utilities for dependency analysis
 * Handles parsing of imports/dependencies from various programming languages
 */

import { 
  REGEX_PATTERNS, 
  BUILTIN_MODULES, 
  FILE_EXTENSIONS,
  PATH_RESOLUTION_EXTENSIONS,
  getLanguageFromExtension
} from '../const/parserConfig.js';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Add unique dependency to the list
 * @param {Array} dependencies - Dependency list to add to
 * @param {Set} seen - Set of already seen modules
 * @param {string} module - Module name
 * @param {string} type - Dependency type ('internal', 'external', 'builtin')
 */
function addDependency(dependencies, seen, module, type) {
  if (!seen.has(module)) {
    dependencies.push({ module, type });
    seen.add(module);
  }
}

// ============================================================================
// Dependency Classification Functions
// ============================================================================

/**
 * Classify a JavaScript/TypeScript dependency
 * @param {string} moduleName - The module name
 * @returns {string} 'internal', 'external', or 'builtin'
 */
function classifyJstsDependency(moduleName) {
  if (moduleName.startsWith('.')) return 'internal';
  
  if (BUILTIN_MODULES.jsts.includes(moduleName) || moduleName.startsWith('node:')) {
    return 'builtin';
  }
  
  return 'external';
}

/**
 * Classify a Python dependency
 * @param {string} moduleName - The module name
 * @returns {string} 'internal', 'external', or 'builtin'
 */
function classifyPythonDependency(moduleName) {
  // Relative imports (start with .)
  if (moduleName.startsWith('.')) return 'internal';
  
  if (BUILTIN_MODULES.python.includes(moduleName)) {
    return 'builtin';
  }
  
  return 'external';
}

/**
 * Classify a Java dependency
 * @param {string} packageName - The package name
 * @returns {string} 'internal', 'external', or 'builtin'
 */
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

/**
 * Classify a Go dependency
 * @param {string} packagePath - The package path
 * @returns {string} 'internal', 'external', or 'builtin'
 */
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

// ============================================================================
// Language-Specific Parsers
// ============================================================================

/**
 * Parse JavaScript/TypeScript file for dependencies
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @returns {Object} Parsed file with dependencies
 */
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

/**
 * Parse C/C++ file for dependencies
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @returns {Object} Parsed file with dependencies
 */
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

/**
 * Parse Java file for dependencies
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @returns {Object} Parsed file with dependencies
 */
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

/**
 * Parse Go file for dependencies
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @returns {Object} Parsed file with dependencies
 */
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

/**
 * Parse Python file for dependencies
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @returns {Object} Parsed file with dependencies
 */
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

// ============================================================================
// Main Parser
// ============================================================================

/**
 * Main parser that detects file type and uses appropriate parser
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @returns {Object} Parsed file with dependencies
 */
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

// ============================================================================
// Path Resolution
// ============================================================================

/**
 * Resolve relative import path to actual file path
 * @param {string} sourcePath - Source file path
 * @param {string} importPath - Import path (e.g., './utils')
 * @param {Set} fileSet - Set of all file paths in the project
 * @returns {string|null} Resolved path or null if not found
 */
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
  
  // First try the path as-is (for imports that already include extension)
  if (fileSet.has(basePath)) return basePath;
  
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

// ============================================================================
// Exports
// ============================================================================

export {
  // Language-specific parsers
  parseJSTSFile,
  parseCppFile,
  parseJavaFile,
  parseGoFile,
  parsePythonFile,
  
  // Main parser
  parseFile,
  
  // Path resolution
  resolveImportPath,
  
  // Classification functions (exported for testing)
  classifyJstsDependency,
  classifyPythonDependency,
  classifyJavaDependency,
  classifyGoDependency
};

export default {
  parseJSTSFile,
  parseCppFile,
  parseJavaFile,
  parseGoFile,
  parsePythonFile,
  parseFile,
  resolveImportPath
};
