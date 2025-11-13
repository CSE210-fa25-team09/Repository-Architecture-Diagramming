import 'dotenv/config';
import dependencyAnalyzer from './src/services/dependencyService.js';
import githubService from './src/services/githubService.js';
import fs from 'fs/promises';
import path from 'path';

function extractCodeFiles(tree) {
  const codeFiles = [];
  const exts = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
  
  function traverse(nodes, currentPath = '') {
    if (!Array.isArray(nodes)) return;
    nodes.forEach(node => {
      const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;
      if (node.type === 'file' && exts.includes(node.name.substring(node.name.lastIndexOf('.')))) {
        codeFiles.push(fullPath);
      } else if (node.type === 'dir' && node.children) {
        traverse(node.children, fullPath);
      }
    });
  }
  
  traverse(tree);
  return codeFiles;
}

async function analyzeDependenciesJS() {
  // Analyze our own project!
  const owner = 'CSE210-fa25-team09', repo = 'Repository-Architecture-Diagramming', branch = 'main', maxFiles = null;
  
  console.log(`\nAnalyzing: ${owner}/${repo} (${branch})${maxFiles ? `, max ${maxFiles} files` : ' (all files)'}\n`);
  
  try {
    const tree = await githubService.getRepoTree(owner, repo, '', branch);
    const allCodeFiles = extractCodeFiles(tree);
    const filesToAnalyze = maxFiles ? allCodeFiles.slice(0, maxFiles) : allCodeFiles;
    
    console.log(`Found ${allCodeFiles.length} files, analyzing ${filesToAnalyze.length}\n`);
    
    const parsedFiles = [];
    for (const filePath of filesToAnalyze) {
      const content = await githubService.getFile(owner, repo, filePath, branch);
      const parsed = dependencyAnalyzer.parseJavaScriptFile(content, filePath);
      parsedFiles.push(parsed);
      
      const stats = parsed.dependencies.reduce((acc, d) => (acc[d.type] = (acc[d.type] || 0) + 1, acc), {});
      console.log(`✓ ${filePath} (${parsed.dependencies.length} deps)`);
    }
    
    const graphJSON = dependencyAnalyzer.exportDependencyGraphJSON(parsedFiles);
    
    const outputDir = path.join(process.cwd(), 'dependency_graphs');
    await fs.mkdir(outputDir, { recursive: true });
    
    // Get the latest commit SHA for filename
    const commitSha = await githubService.getLatestCommit(owner, repo, branch);
    const filename = `${repo}_${branch}_${commitSha}.json`;
    const outputPath = path.join(outputDir, filename);
    
    await fs.writeFile(outputPath, JSON.stringify(graphJSON, null, 2), 'utf-8');
    
    console.log(`\n✅ Saved: ${outputPath}`);
    console.log(`Nodes: ${graphJSON.nodes.length}, Edges: ${Object.values(graphJSON.dependencies).reduce((s, d) => s + d.length, 0)}\n`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

analyzeDependenciesJS();
