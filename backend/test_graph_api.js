/**
 * Combined test script for Graph API
 * Tests analyzeDependencies function, generates Mermaid diagrams, and creates HTML output
 */

import fs from 'fs/promises';
import path from 'path';
import dependencyService from './src/services/dependencyService.js';
import githubService from './src/services/githubService.js';
import graphService from './src/services/graphService.js';

async function testAnalyzeDependenciesAndGenerateHTML() {
  console.log('\n🧪 Graph API Test Suite\n');
  console.log('=== Testing analyzeDependencies Function ===\n');
  
  const owner = 'CSE210-fa25-team09';
  const repo = 'Repository-Architecture-Diagramming';
  const branch = 'main';
  const language = 'jsts';
  
  try {
    // Run dependency analysis (analyze all files for complete diagram)
    const result = await dependencyService.analyzeDependencies(
      githubService,
      owner,
      repo,
      branch,
      { language }  // No maxFiles limit - analyze all files
    );
    
    if (!result.success) {
      console.error('❌ Analysis failed:', result.error);
      return;
    }

    console.log('✅ Analysis successful!');
    console.log('Tree returned:', Array.isArray(result.data.tree));
    console.log('Tree has', result.data.tree.length, 'root nodes');
    
    // Generate Mermaid diagrams
    console.log('\n=== Generating Mermaid Diagrams ===\n');
    
    const internalDiagram = graphService.generateStyledMermaidFlowchart(
      result.data.tree,
      { styled: true, showExternal: false, showBuiltin: false }
    );
    
    const allDiagram = graphService.generateStyledMermaidFlowchart(
      result.data.tree,
      { styled: true, showExternal: true, showBuiltin: false }
    );
    
    const internalStats = graphService.getDiagramStats(internalDiagram);
    const allStats = graphService.getDiagramStats(allDiagram);
    
    console.log('✅ Internal dependencies diagram:', internalDiagram.length, 'characters');
    console.log(`   Nodes: ${internalStats.totalNodes}, Edges: ${internalStats.totalEdges}`);
    console.log('✅ Full dependencies diagram:', allDiagram.length, 'characters');
    console.log(`   Nodes: ${allStats.totalNodes}, Edges: ${allStats.totalEdges}`);

    // Save HTML output
    console.log('\n=== Generating HTML Output ===\n');
    
    // Get latest commit SHA for folder naming (or use timestamp as fallback)
    let commitSha = 'latest';
    try {
      commitSha = await githubService.getLatestCommit(owner, repo, branch);
    } catch (err) {
      console.log('Note: Could not fetch commit SHA, using "latest"');
      console.log('Error:', err.message);
    }
    
    const folderName = `${repo}_${branch}_${commitSha}`;
    const outputDir = path.join(process.cwd(), 'mermaid_diagrams', folderName);
    await fs.mkdir(outputDir, { recursive: true });
    
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dependency Diagrams - ${repo} (${branch}@${commitSha})</title>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: true, theme: 'default' });
  </script>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .diagram-container { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1, h2 { color: #333; }
    .info { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .legend { margin: 20px 0; padding: 15px; background: #f0f0f0; border-radius: 5px; }
    .legend-item { display: inline-block; margin: 5px 15px 5px 0; }
    .legend-color { display: inline-block; width: 20px; height: 20px; margin-right: 5px; vertical-align: middle; border-radius: 3px; }
    .stats { margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 5px; }
  </style>
</head>
<body>
  <h1>Repository Dependency Diagrams</h1>
  
  <div class="info">
    <strong>Repository:</strong> ${owner}/${repo}<br>
    <strong>Branch:</strong> ${branch}<br>
    <strong>Commit:</strong> ${commitSha}<br>
    <strong>Language:</strong> ${language}<br>
    <strong>Generated:</strong> ${new Date().toLocaleString()}<br>
  </div>
  
  <div class="legend">
    <h3>Legend:</h3>
    <div class="legend-item">
      <span class="legend-color" style="background: #4A90E2;"></span>
      <span>Source Files</span>
    </div>
    <div class="legend-item">
      <span class="legend-color" style="background: #50C878;"></span>
      <span>Internal Dependencies</span>
    </div>
    <div class="legend-item">
      <span class="legend-color" style="background: #FF6B6B;"></span>
      <span>External Dependencies</span>
    </div>
    <div class="legend-item">
      <span class="legend-color" style="background: #FFA500;"></span>
      <span>Built-in Modules</span>
    </div>
  </div>

  <div class="diagram-container">
    <h2>1. Internal Dependencies Only (Project Structure)</h2>
    <p>This diagram shows only the dependencies between files within the project, excluding external libraries.</p>
    <pre class="mermaid">
${internalDiagram}
    </pre>
    <div class="stats">
      <strong>Statistics:</strong>
      <ul style="margin: 10px 0;">
        <li>Nodes: ${internalStats.totalNodes}</li>
        <li>Edges: ${internalStats.totalEdges}</li>
        <li>Average Degree: ${internalStats.avgDegree}</li>
      </ul>
    </div>
  </div>

  <div class="diagram-container">
    <h2>2. All Dependencies (Including External Libraries)</h2>
    <p>This diagram shows all dependencies including external packages and built-in modules.</p>
    <pre class="mermaid">
${allDiagram}
    </pre>
    <div class="stats">
      <strong>Statistics:</strong>
      <ul style="margin: 10px 0;">
        <li>Nodes: ${allStats.totalNodes}</li>
        <li>Edges: ${allStats.totalEdges}</li>
        <li>Average Degree: ${allStats.avgDegree}</li>
      </ul>
    </div>
  </div>

  <div class="info" style="background: #f1f8e9;">
    <h3>API Endpoint Information</h3>
    <p><strong>GET /api/getMermaid</strong></p>
    <p>Query params: owner, repo, branch (optional), language (optional)</p>
    <p>Example: <code>http://localhost:3000/api/getMermaid?owner=${owner}&repo=${repo}&branch=${branch}&language=${language}</code></p>
    <p>Returns: <code>{ "allDependencies": "graph LR\\n...", "internalDependencies": "graph LR\\n..." }</code></p>
  </div>
</body>
</html>`;

    // Save the HTML file
    const htmlFilePath = path.join(outputDir, 'diagrams.html');
    await fs.writeFile(htmlFilePath, htmlContent, 'utf-8');
    
    // Also save the raw .mmd files
    await fs.writeFile(
      path.join(outputDir, 'internal_dependencies.mmd'),
      internalDiagram,
      'utf-8'
    );
    await fs.writeFile(
      path.join(outputDir, 'all_dependencies.mmd'),
      allDiagram,
      'utf-8'
    );
    
    console.log(`✅ Diagrams saved to: mermaid_diagrams/${folderName}/`);
    console.log('   - diagrams.html (interactive viewer)');
    console.log('   - internal_dependencies.mmd');
    console.log('   - all_dependencies.mmd');
    console.log('\n💡 Open diagrams.html in a browser to view the visualizations!');
    console.log('\n✨ Test completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run the combined test
testAnalyzeDependenciesAndGenerateHTML();
