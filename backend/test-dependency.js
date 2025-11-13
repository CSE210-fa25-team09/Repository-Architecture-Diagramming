import 'dotenv/config';
import dependencyAnalyzer from './src/services/dependencyAnalyzer.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Test dependency analysis on local sample repo
 */
async function testDependencyAnalysis() {
  console.log('\n=== Testing Dependency Analysis ===\n');
  
  const sampleRepoPath = path.join(process.cwd(), '..', '..', 'sample-express-repo', 'lib');
  
  try {
    // Read all JavaScript files from the lib directory
    const files = await fs.readdir(sampleRepoPath);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    
    console.log(`Found ${jsFiles.length} JavaScript files in ${sampleRepoPath}\n`);
    
    const parsedFiles = [];
    
    // Parse each file
    for (const file of jsFiles) {
      const filePath = path.join(sampleRepoPath, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = dependencyAnalyzer.parseJavaScriptFile(content, `lib/${file}`);
      parsedFiles.push(parsed);
      
      console.log(`📄 ${file}`);
      console.log(`   Dependencies: ${parsed.stats.total} (${parsed.stats.internal} internal, ${parsed.stats.external} external, ${parsed.stats.builtin} builtin)`);
    }
    
    // Analyze all dependencies
    console.log('\n--- Overall Analysis ---\n');
    const analysis = dependencyAnalyzer.analyzeDependencies(parsedFiles);
    
    console.log('Summary:');
    console.log(`  Total Files: ${analysis.summary.totalFiles}`);
    console.log(`  Unique Dependencies: ${analysis.summary.totalDependencies}`);
    console.log(`  Total Import Statements: ${analysis.summary.totalImports}`);
    
    console.log('\nBy Type:');
    console.log(`  Internal (relative): ${analysis.byType.internal}`);
    console.log(`  External (npm): ${analysis.byType.external}`);
    console.log(`  Built-in (node): ${analysis.byType.builtin}`);
    
    // Print visual dependency graph
    dependencyAnalyzer.printDependencyGraph(parsedFiles);
    
    // Print dependency map (reverse view - what depends on what)
    dependencyAnalyzer.printDependencyMap(parsedFiles);
    
    // Build graph data structure (can be used for visualization)
    const graph = dependencyAnalyzer.buildDependencyGraph(parsedFiles);
    console.log('\n📊 Graph Structure:');
    console.log(`  Nodes: ${graph.nodes.length}`);
    console.log(`  Edges: ${graph.edges.length}`);
    console.log('\nNode Types:');
    const nodesByType = {};
    graph.nodes.forEach(node => {
      nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
    });
    Object.entries(nodesByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
  } catch (err) {
    console.error('Error analyzing dependencies:', err.message);
    console.error(err.stack);
  }
}

// Run the test
testDependencyAnalysis();
