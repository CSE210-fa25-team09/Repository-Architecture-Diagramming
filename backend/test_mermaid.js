import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import graphService from './src/services/graphService.js';

async function generateMermaidDiagrams(options = {}) {
  const { processAll = false } = options;
  
  console.log(`🎨 Generating Mermaid diagrams ${processAll ? 'for all graphs' : 'for Repository-Architecture-Diagramming'}...\n`);

  try {
    const graphsDir = path.join(process.cwd(), 'dependency_graphs');
    const graphFiles = await fs.readdir(graphsDir);
    let jsonFiles = graphFiles.filter(f => f.endsWith('.json')).sort();

    if (jsonFiles.length === 0) {
      console.error('❌ No dependency graphs found in dependency_graphs/');
      console.log('   Run: node test_dependency.js [JS|CPP|PYTHON|JAVA|GO] first\n');
      return;
    }

    // If not processing all, find Repository-Architecture-Diagramming or use latest
    if (!processAll) {
      const repoArchGraph = jsonFiles.find(f => f.startsWith('Repository-Architecture-Diagramming_'));
      if (repoArchGraph) {
        jsonFiles = [repoArchGraph];
      } else {
        jsonFiles = [jsonFiles[jsonFiles.length - 1]];
        console.log('⚠️  Repository-Architecture-Diagramming graph not found, using latest instead\n');
      }
    }

    console.log(`Found ${jsonFiles.length} dependency graph(s) to process\n`);

    for (const filename of jsonFiles) {
      // Parse filename: reponame_branch_commit.json
      const match = filename.match(/^(.+?)_(.+?)_([^_]+)\.json$/);
      if (!match) {
        console.log(`⚠️  Skipping ${filename} (invalid format)\n`);
        continue;
      }

      const [, repoName, branch, commit] = match;
      const folderName = `${repoName}_${branch}_${commit}`;

      console.log(`📊 Processing: ${repoName} (${branch}@${commit})`);

      // Read the dependency graph
      const graphPath = path.join(graphsDir, filename);
      const graphData = JSON.parse(await fs.readFile(graphPath, 'utf-8'));

      // Generate diagrams
      const internalDiagram = graphService.generateStyledMermaidFlowchart(graphData.children, {
        direction: 'LR',
        showExternal: false,
        showBuiltin: false
      });

      const allDiagram = graphService.generateStyledMermaidFlowchart(graphData.children, {
        direction: 'LR',
        showExternal: true,
        showBuiltin: true
      });

      // Get statistics
      const internalStats = graphService.getDiagramStats(internalDiagram);
      const allStats = graphService.getDiagramStats(allDiagram);

      console.log(`   Internal: ${internalStats.totalNodes} nodes, ${internalStats.totalEdges} edges`);
      console.log(`   All deps: ${allStats.totalNodes} nodes, ${allStats.totalEdges} edges`);

      // Save diagrams
      const outputDir = path.join(process.cwd(), 'mermaid_diagrams', folderName);
      await fs.mkdir(outputDir, { recursive: true });

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

      // Create HTML viewer
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dependency Diagrams - ${repoName} (${branch}@${commit})</title>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: true, theme: 'default' });
  </script>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .diagram-container { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1, h2 { color: #333; }
    .legend { margin: 20px 0; padding: 15px; background: #f0f0f0; border-radius: 5px; }
    .legend-item { display: inline-block; margin: 5px 15px 5px 0; }
    .legend-color { display: inline-block; width: 20px; height: 20px; margin-right: 5px; vertical-align: middle; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>Repository Dependency Diagrams</h1>
  <p><strong>Repository:</strong> ${repoName} | <strong>Branch:</strong> ${branch} | <strong>Commit:</strong> ${commit}</p>
  
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
    <div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 5px;">
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
    <div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 5px;">
      <strong>Statistics:</strong>
      <ul style="margin: 10px 0;">
        <li>Nodes: ${allStats.totalNodes}</li>
        <li>Edges: ${allStats.totalEdges}</li>
        <li>Average Degree: ${allStats.avgDegree}</li>
      </ul>
    </div>
  </div>
</body>
</html>`;

      await fs.writeFile(
        path.join(outputDir, 'diagrams.html'),
        htmlContent,
        'utf-8'
      );

      console.log(`   ✅ Saved to: mermaid_diagrams/${folderName}/\n`);
    }

    console.log(`\n🎉 Generated Mermaid diagrams for ${jsonFiles.length} repository/repositories!`);
    console.log('\n💡 Open any diagrams.html file in a browser to view the visualizations!\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
  }
}

// CLI argument handling - detect ALL for processing all graphs
const args = process.argv.slice(2);
const processAll = args.some(arg => arg.toUpperCase() === 'ALL');

generateMermaidDiagrams({ processAll });
