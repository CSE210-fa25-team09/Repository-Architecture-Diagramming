import 'dotenv/config';
import dependencyAnalyzer from './src/services/dependencyService.js';
import githubService from './src/services/githubService.js';
import { FILE_EXTENSIONS } from './src/config/parserConfig.js';
import fs from 'fs/promises';
import path from 'path';

async function analyzeDependenciesJS() {
  // Analyze our own project (mixed JS/TS)
  const owner = 'CSE210-fa25-team09', repo = 'Repository-Architecture-Diagramming', branch = 'main', maxFiles = null;
  
  console.log(`\nAnalyzing JS/TS project: ${owner}/${repo} (${branch})${maxFiles ? `, max ${maxFiles} files` : ' (all files)'}\n`);
  
  try {
    const tree = await githubService.getRepoTree(owner, repo, '', branch);
    const allCodeFiles = dependencyAnalyzer.extractFilesByLanguage(tree, 'jsts');
    const filesToAnalyze = maxFiles ? allCodeFiles.slice(0, maxFiles) : allCodeFiles;
    
    console.log(`Found ${allCodeFiles.length} files, analyzing ${filesToAnalyze.length}\n`);
    
    const parsedFiles = [];
    for (const filePath of filesToAnalyze) {
      const content = await githubService.getFile(owner, repo, filePath, branch);
      const parsed = dependencyAnalyzer.parseFile(content, filePath); // Auto-detects language
      parsedFiles.push(parsed);
      
      console.log(`✓ ${filePath} (${parsed.dependencies.length} deps)`);
    }
    
    const treeWithDeps = dependencyAnalyzer.exportDependencyGraphWithTree(parsedFiles, tree);
    
    const outputDir = path.join(process.cwd(), 'dependency_graphs');
    await fs.mkdir(outputDir, { recursive: true });
    
    // Get the latest commit SHA for filename
    const commitSha = await githubService.getLatestCommit(owner, repo, branch);
    const filename = `${repo}_${branch}_${commitSha}.json`;
    const outputPath = path.join(outputDir, filename);
    
    await fs.writeFile(outputPath, JSON.stringify({ name: repo, type: 'dir', children: treeWithDeps }, null, 2), 'utf-8');
    
    console.log(`\n✅ Saved: ${outputPath}`);
    console.log(`Files analyzed: ${parsedFiles.length}\n`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

async function analyzeDependenciesCpp() {
  // Small C++ projects for full analysis:
  // const owner = 'nlohmann', repo = 'json', branch = 'develop', maxFiles = null; // 481 files - too big
  const owner = 'jarro2783', repo = 'cxxopts', branch = 'master', maxFiles = null; // ~20-30 files - perfect size
  
  console.log(`\nAnalyzing C++ project: ${owner}/${repo} (${branch})${maxFiles ? `, max ${maxFiles} files` : ' (all files)'}\n`);
  
  try {
    const tree = await githubService.getRepoTree(owner, repo, '', branch);
    const allCodeFiles = dependencyAnalyzer.extractFilesByLanguage(tree, 'cpp');
    const filesToAnalyze = maxFiles ? allCodeFiles.slice(0, maxFiles) : allCodeFiles;
    
    console.log(`Found ${allCodeFiles.length} C++ files, analyzing ${filesToAnalyze.length}\n`);
    
    const parsedFiles = [];
    for (const filePath of filesToAnalyze) {
      const content = await githubService.getFile(owner, repo, filePath, branch);
      const parsed = dependencyAnalyzer.parseFile(content, filePath);
      parsedFiles.push(parsed);
      
      const stats = parsed.dependencies.reduce((acc, d) => (acc[d.type] = (acc[d.type] || 0) + 1, acc), {});
      console.log(`✓ ${filePath} (${parsed.dependencies.length} deps: ${stats.internal || 0} int, ${stats.external || 0} ext, ${stats.builtin || 0} std)`);
    }
    
    const graphJSON = dependencyAnalyzer.exportDependencyGraphWithTree(parsedFiles, tree);
    
    const outputDir = path.join(process.cwd(), 'dependency_graphs');
    await fs.mkdir(outputDir, { recursive: true });
    
    const commitSha = await githubService.getLatestCommit(owner, repo, branch);
    const filename = `${repo}_${branch}_${commitSha}.json`;
    const outputPath = path.join(outputDir, filename);
    
    await fs.writeFile(outputPath, JSON.stringify({ name: repo, type: "dir", children: graphJSON }, null, 2), 'utf-8');
    
    console.log(`\n✅ Saved: ${outputPath}`);
    console.log(`Files analyzed: ${parsedFiles.length}\n`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

async function analyzeDependenciesPython() {
  // Popular Python projects for testing:
  const owner = 'pallets', repo = 'flask', branch = 'main', maxFiles = null; // ~50 Python files
  
  console.log(`\nAnalyzing Python project: ${owner}/${repo} (${branch})${maxFiles ? `, max ${maxFiles} files` : ' (all files)'}\n`);
  
  try {
    const tree = await githubService.getRepoTree(owner, repo, '', branch);
    const allCodeFiles = dependencyAnalyzer.extractFilesByLanguage(tree, 'python');
    const filesToAnalyze = maxFiles ? allCodeFiles.slice(0, maxFiles) : allCodeFiles;
    
    console.log(`Found ${allCodeFiles.length} Python files, analyzing ${filesToAnalyze.length}\n`);
    
    const parsedFiles = [];
    for (const filePath of filesToAnalyze) {
      const content = await githubService.getFile(owner, repo, filePath, branch);
      const parsed = dependencyAnalyzer.parseFile(content, filePath);
      parsedFiles.push(parsed);
      
      const stats = parsed.dependencies.reduce((acc, d) => (acc[d.type] = (acc[d.type] || 0) + 1, acc), {});
      console.log(`✓ ${filePath} (${parsed.dependencies.length} deps: ${stats.internal || 0} int, ${stats.external || 0} ext, ${stats.builtin || 0} std)`);
    }
    
    const graphJSON = dependencyAnalyzer.exportDependencyGraphWithTree(parsedFiles, tree);
    
    const outputDir = path.join(process.cwd(), 'dependency_graphs');
    await fs.mkdir(outputDir, { recursive: true });
    
    const commitSha = await githubService.getLatestCommit(owner, repo, branch);
    const filename = `${repo}_${branch}_${commitSha}.json`;
    const outputPath = path.join(outputDir, filename);
    
    await fs.writeFile(outputPath, JSON.stringify({ name: repo, type: "dir", children: graphJSON }, null, 2), 'utf-8');
    
    console.log(`\n✅ Saved: ${outputPath}`);
    console.log(`Files analyzed: ${parsedFiles.length}\n`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

async function analyzeDependenciesJava() {
  // Simple Java project for testing - a basic Spring Boot REST API example
  const owner = 'spring-guides', repo = 'gs-rest-service', branch = 'main', maxFiles = 30; // Small Spring Boot tutorial
  
  console.log(`\nAnalyzing Java project: ${owner}/${repo} (${branch})${maxFiles ? `, max ${maxFiles} files` : ' (all files)'}\n`);
  
  try {
    const tree = await githubService.getRepoTree(owner, repo, '', branch);
    const allCodeFiles = dependencyAnalyzer.extractFilesByLanguage(tree, 'java');
    const filesToAnalyze = maxFiles ? allCodeFiles.slice(0, maxFiles) : allCodeFiles;
    
    console.log(`Found ${allCodeFiles.length} Java files, analyzing ${filesToAnalyze.length}\n`);
    
    const parsedFiles = [];
    for (const filePath of filesToAnalyze) {
      const content = await githubService.getFile(owner, repo, filePath, branch);
      const parsed = dependencyAnalyzer.parseFile(content, filePath);
      parsedFiles.push(parsed);
      
      const stats = parsed.dependencies.reduce((acc, d) => (acc[d.type] = (acc[d.type] || 0) + 1, acc), {});
      console.log(`✓ ${filePath} (${parsed.dependencies.length} deps: ${stats.internal || 0} int, ${stats.external || 0} ext, ${stats.builtin || 0} std)`);
    }
    
    const graphJSON = dependencyAnalyzer.exportDependencyGraphWithTree(parsedFiles, tree);
    
    const outputDir = path.join(process.cwd(), 'dependency_graphs');
    await fs.mkdir(outputDir, { recursive: true });
    
    const commitSha = await githubService.getLatestCommit(owner, repo, branch);
    const filename = `${repo}_${branch}_${commitSha}.json`;
    const outputPath = path.join(outputDir, filename);
    
    await fs.writeFile(outputPath, JSON.stringify({ name: repo, type: "dir", children: graphJSON }, null, 2), 'utf-8');
    
    console.log(`\n✅ Saved: ${outputPath}`);
    console.log(`Files analyzed: ${parsedFiles.length}\n`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

async function analyzeDependenciesGo() {
  // Simple Go project for testing - a popular CLI tool
  const owner = 'spf13', repo = 'cobra', branch = 'main', maxFiles = 50; // Cobra CLI library
  
  console.log(`\nAnalyzing Go project: ${owner}/${repo} (${branch})${maxFiles ? `, max ${maxFiles} files` : ' (all files)'}\n`);
  
  try {
    const tree = await githubService.getRepoTree(owner, repo, '', branch);
    const allCodeFiles = dependencyAnalyzer.extractFilesByLanguage(tree, 'go');
    const filesToAnalyze = maxFiles ? allCodeFiles.slice(0, maxFiles) : allCodeFiles;
    
    console.log(`Found ${allCodeFiles.length} Go files, analyzing ${filesToAnalyze.length}\n`);
    
    const parsedFiles = [];
    for (const filePath of filesToAnalyze) {
      const content = await githubService.getFile(owner, repo, filePath, branch);
      const parsed = dependencyAnalyzer.parseFile(content, filePath);
      parsedFiles.push(parsed);
      
      const stats = parsed.dependencies.reduce((acc, d) => (acc[d.type] = (acc[d.type] || 0) + 1, acc), {});
      console.log(`✓ ${filePath} (${parsed.dependencies.length} deps: ${stats.internal || 0} int, ${stats.external || 0} ext, ${stats.builtin || 0} std)`);
    }
    
    const graphJSON = dependencyAnalyzer.exportDependencyGraphWithTree(parsedFiles, tree);
    
    // Save to file
    const outputDir = './dependency_graphs';
    await fs.mkdir(outputDir, { recursive: true });
    
    const commitSha = await githubService.getLatestCommit(owner, repo, branch);
    const filename = `${repo}_${branch}_${commitSha}.json`;
    const outputPath = path.join(outputDir, filename);
    
    await fs.writeFile(outputPath, JSON.stringify({ name: repo, type: "dir", children: graphJSON }, null, 2), 'utf-8');
    
    console.log(`\n✅ Saved: ${outputPath}`);
    console.log(`Files analyzed: ${parsedFiles.length}\n`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

async function analyzeDependenciesTS() {
  // Pure TypeScript project for testing enhanced TS features
  const owner = 'microsoft', repo = 'TypeScript', branch = 'main', maxFiles = 30; // TypeScript compiler itself
  
  console.log(`\nAnalyzing TypeScript project: ${owner}/${repo} (${branch})${maxFiles ? `, max ${maxFiles} files` : ' (all files)'}\n`);
  
  try {
    const tree = await githubService.getRepoTree(owner, repo, '', branch);
    const allCodeFiles = dependencyAnalyzer.extractFilesByLanguage(tree, 'jsts');
    const filesToAnalyze = maxFiles ? allCodeFiles.slice(0, maxFiles) : allCodeFiles;
    
    console.log(`Found ${allCodeFiles.length} TS files, analyzing ${filesToAnalyze.length}\n`);
    
    const parsedFiles = [];
    for (const filePath of filesToAnalyze) {
      const content = await githubService.getFile(owner, repo, filePath, branch);
      const parsed = dependencyAnalyzer.parseFile(content, filePath);
      parsedFiles.push(parsed);
      
      const stats = parsed.dependencies.reduce((acc, d) => (acc[d.type] = (acc[d.type] || 0) + 1, acc), {});
      console.log(`✓ ${filePath} (${parsed.dependencies.length} deps: ${stats.internal || 0} int, ${stats.external || 0} ext, ${stats.builtin || 0} std)`);
    }
    
    const graphJSON = dependencyAnalyzer.exportDependencyGraphWithTree(parsedFiles, tree);
    
    // Save to file
    const outputDir = './dependency_graphs';
    await fs.mkdir(outputDir, { recursive: true });
    
    const commitSha = await githubService.getLatestCommit(owner, repo, branch);
    const filename = `${repo}_${branch}_${commitSha}.json`;
    const outputPath = path.join(outputDir, filename);
    
    await fs.writeFile(outputPath, JSON.stringify({ name: repo, type: "dir", children: graphJSON }, null, 2), 'utf-8');
    
    console.log(`\n✅ Saved: ${outputPath}`);
    console.log(`Files analyzed: ${parsedFiles.length}\n`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

async function analyzeDependenciesMixed() {
  // Mixed-language project for testing multi-language support
  // Using a repo that has multiple languages
  const owner = 'electron', repo = 'electron', branch = 'main', maxFiles = 50;
  
  console.log(`\n🌐 Analyzing MIXED-LANGUAGE project: ${owner}/${repo} (${branch})${maxFiles ? `, max ${maxFiles} files` : ' (all files)'}\n`);
  
  try {
    const tree = await githubService.getRepoTree(owner, repo, '', branch);
    const allCodeFiles = dependencyAnalyzer.extractFilesByLanguage(tree, 'all');
    const filesToAnalyze = maxFiles ? allCodeFiles.slice(0, maxFiles) : allCodeFiles;
    
    console.log(`Found ${allCodeFiles.length} code files (all languages), analyzing ${filesToAnalyze.length}\n`);
    
    // Group files by language for stats
    const languageStats = {};
    const parsedFiles = [];
    
    for (const filePath of filesToAnalyze) {
      const content = await githubService.getFile(owner, repo, filePath, branch);
      const parsed = dependencyAnalyzer.parseFile(content, filePath); // Auto-detects language!
      parsedFiles.push(parsed);
      
      // Detect language from extension
      const ext = filePath.substring(filePath.lastIndexOf('.'));
      let lang = 'unknown';
      if (FILE_EXTENSIONS.jsts.includes(ext)) lang = 'JS/TS';
      else if (FILE_EXTENSIONS.cpp.includes(ext)) lang = 'C++';
      else if (FILE_EXTENSIONS.python.includes(ext)) lang = 'Python';
      else if (FILE_EXTENSIONS.java.includes(ext)) lang = 'Java';
      else if (FILE_EXTENSIONS.go.includes(ext)) lang = 'Go';
      
      languageStats[lang] = (languageStats[lang] || 0) + 1;
      
      const stats = parsed.dependencies.reduce((acc, d) => (acc[d.type] = (acc[d.type] || 0) + 1, acc), {});
      console.log(`✓ [${lang}] ${filePath} (${parsed.dependencies.length} deps: ${stats.internal || 0} int, ${stats.external || 0} ext, ${stats.builtin || 0} std)`);
    }
    
    console.log(`\n📊 Language breakdown:`);
    Object.entries(languageStats).sort((a, b) => b[1] - a[1]).forEach(([lang, count]) => {
      console.log(`  ${lang}: ${count} files`);
    });
    
    const graphJSON = dependencyAnalyzer.exportDependencyGraphWithTree(parsedFiles, tree);
    
    // Save to file
    const outputDir = './dependency_graphs';
    await fs.mkdir(outputDir, { recursive: true });
    
    const commitSha = await githubService.getLatestCommit(owner, repo, branch);
    const filename = `${repo}_${branch}_${commitSha}_mixed.json`;
    const outputPath = path.join(outputDir, filename);
    
    await fs.writeFile(outputPath, JSON.stringify({ name: repo, type: "dir", children: graphJSON }, null, 2), 'utf-8');
    
    console.log(`\n✅ Saved: ${outputPath}`);
    console.log(`Files analyzed: ${parsedFiles.length}\n`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

// Command-line argument handling
const testType = process.argv[2]?.toUpperCase() || 'JS';

if (testType === 'JS') {
  analyzeDependenciesJS();
} else if (testType === 'TS' || testType === 'TYPESCRIPT') {
  analyzeDependenciesTS();
} else if (testType === 'CPP') {
  analyzeDependenciesCpp();
} else if (testType === 'PYTHON' || testType === 'PY') {
  analyzeDependenciesPython();
} else if (testType === 'JAVA') {
  analyzeDependenciesJava();
} else if (testType === 'GO' || testType === 'GOLANG') {
  analyzeDependenciesGo();
} else if (testType === 'MIXED' || testType === 'ALL') {
  analyzeDependenciesMixed();
} else {
  console.log('Valid options: JS (default), TS/TYPESCRIPT, CPP, PYTHON/PY, JAVA, GO/GOLANG, MIXED/ALL');
  console.log('Usage: node test_dependency.js [JS|TS|CPP|PYTHON|JAVA|GO|MIXED]');
  process.exit(1);
}
