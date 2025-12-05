import dotenv from 'dotenv';
import { 
  FILE_EXTENSIONS,
  TEST_DIR_PATTERNS,
  TEST_FILE_PATTERNS
} from '../const/parserConfig.js';
import { UserInputError } from '../const/errors.js';
import githubService from './githubService.js';
import { parseFile, resolveImportPath } from '../utils/parser.js';

dotenv.config();

// Default concurrency for parallel file fetching
const FETCH_CONCURRENCY = process.env.FETCH_CONCURRENCY 
  ? parseInt(process.env.FETCH_CONCURRENCY) 
  : 20;

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
 * Extract files from a tree structure by language using BFS
 * BFS ensures files at shallower depths are collected first,
 * providing better coverage of top-level architecture when maxFiles is limited
 * @param {Array|Object} tree - The tree structure (array of nodes or single root node)
 * @param {string} language - Language name ('jsts', 'cpp', 'python', 'java', 'go', or 'all')
 * @param {Object} options - Extraction options
 * @param {boolean} options.includeTests - Whether to include test files (default: false)
 * @returns {Array} Array of file paths matching the language
 */
function extractFilesByLanguage(tree, language = 'all', options = {}) {
  const { includeTests = false } = options;
  const codeFiles = [];
  
  function isTestFile(filePath, fileName) {
    // Check if file is in a test directory
    const pathParts = filePath.split('/');
    for (const part of pathParts.slice(0, -1)) { // Exclude filename
      if (TEST_DIR_PATTERNS.some(pattern => pattern.test(part))) {
        return true;
      }
    }
    // Check if filename matches test patterns
    return TEST_FILE_PATTERNS.some(pattern => pattern.test(fileName));
  }
  
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
    throw new UserInputError(`Unknown language: ${language}. Use 'jsts', 'cpp', 'python', 'java', 'go', or 'all'`);
  }
  
  // BFS traversal to prioritize files at shallower depths
  const queue = [];
  
  // Initialize queue with root nodes
  if (Array.isArray(tree)) {
    tree.forEach(node => queue.push({ node, currentPath: '' }));
  } else if (tree && tree.children) {
    tree.children.forEach(node => queue.push({ node, currentPath: tree.path || '' }));
  }
  
  while (queue.length > 0) {
    const { node, currentPath } = queue.shift();
    const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;
    
    if (node.type === 'file') {
      const ext = node.name.substring(node.name.lastIndexOf('.'));
      if (targetExtensions.includes(ext)) {
        // Skip test files unless explicitly included
        if (!includeTests && isTestFile(fullPath, node.name)) {
          continue;
        }
        codeFiles.push(fullPath);
      }
    } else if (node.type === 'dir' && node.children) {
      // Skip test directories entirely unless tests are included
      if (!includeTests && TEST_DIR_PATTERNS.some(pattern => pattern.test(node.name))) {
        continue;
      }
      // Add children to queue for BFS
      node.children.forEach(child => queue.push({ node: child, currentPath: fullPath }));
    }
  }
  
  return codeFiles;
}

/**
 * Analyze dependencies for a repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} branch - Branch name
 * @param {Object} options - Analysis options
 * @param {number} options.maxFiles - Maximum number of files to analyze
 * @param {string} options.language - Language filter ('jsts', 'cpp', 'python', 'java', 'go', or 'all')
 * @param {boolean} options.includeTests - Whether to include test files (default: false)
 * @returns {Object} Analysis result with tree, parsedFiles, and metadata
 */
async function analyzeDependencies(owner, repo, branch, options = {}) {
  const { maxFiles = 1000, language = 'all', includeTests = false } = options;
  
  try {
    // Get repository tree
    const tree = await githubService.getRepoTree(owner, repo, '', branch);
    
    // Extract files by language (excludes test files by default)
    const allCodeFiles = extractFilesByLanguage(tree, language, { includeTests });
    const filesToAnalyze = maxFiles ? allCodeFiles.slice(0, maxFiles) : allCodeFiles;
    
    console.log(`Found ${allCodeFiles.length} files${includeTests ? '' : ' (excluding tests)'}, analyzing ${filesToAnalyze.length}`);
    
    // Fetch all files in parallel for much faster analysis
    const startTime = Date.now();
    const fileContents = await githubService.getFilesParallel(
      owner, 
      repo, 
      filesToAnalyze, 
      branch,
      { concurrency: FETCH_CONCURRENCY }
    );
    console.log(`Fetched ${fileContents.size} files in ${Date.now() - startTime}ms`);
    
    // Parse all files
    const parsedFiles = [];
    for (const [filePath, content] of fileContents) {
      const parsed = parseFile(content, filePath);
      parsedFiles.push(parsed);
    }
    
    // Export dependency graph with tree structure
    const treeWithDeps = exportDependencyGraphWithTree(parsedFiles, tree);
    
    return {
      success: true,
      data: {
        tree: treeWithDeps
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
  exportDependencyGraphWithTree,
  extractFilesByLanguage,
  analyzeDependencies
};
