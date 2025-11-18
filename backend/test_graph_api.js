/**
 * Test script for Graph API endpoints
 * Tests the new analyzeDependencies and getMermaid endpoints
 */

import dependencyService from './src/services/dependencyService.js';
import githubService from './src/services/githubService.js';

async function testAnalyzeDependencies() {
  console.log('\n=== Testing analyzeDependencies Function ===\n');
  
  const owner = 'CSE210-fa25-team09';
  const repo = 'Repository-Architecture-Diagramming';
  const branch = 'main';
  
  try {
    const result = await dependencyService.analyzeDependencies(
      githubService,
      owner,
      repo,
      branch,
      { maxFiles: 10, language: 'jsts', verbose: true }
    );
    
    if (result.success) {
      console.log('\n✅ Analysis successful!');
      console.log('Metadata:', JSON.stringify(result.data.metadata, null, 2));
      console.log(`\nAnalyzed ${result.data.parsedFiles.length} files`);
      console.log(`Total dependencies found: ${result.data.parsedFiles.reduce((sum, f) => sum + f.dependencies.length, 0)}`);
    } else {
      console.error('❌ Analysis failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testAPIEndpoints() {
  console.log('\n=== API Endpoint Information ===\n');
  console.log('Available endpoints:');
  console.log('');
  console.log('1. POST /api/analyzeDep');
  console.log('   Query params: owner, repo, branch (optional), language (optional, default: "all")');
  console.log('   Description: Analyzes repository dependencies and caches result');
  console.log('   Example: http://localhost:3000/api/analyzeDep?owner=CSE210-fa25-team09&repo=Repository-Architecture-Diagramming&branch=main');
  console.log('');
  console.log('2. GET /api/getMermaid');
  console.log('   Query params: owner, repo, branch (optional), diagramType (optional: "all", "full", "internal"), styled (optional: "true"/"false")');
  console.log('   Description: Returns Mermaid diagrams, checks cache first');
  console.log('   Example: http://localhost:3000/api/getMermaid?owner=CSE210-fa25-team09&repo=Repository-Architecture-Diagramming&diagramType=all&styled=true');
  console.log('');
  console.log('💡 The getMermaid endpoint will automatically call analyzeDependencies if cache is missing');
  console.log('');
}

// Run tests
console.log('🧪 Graph API Test Suite\n');
testAPIEndpoints();
testAnalyzeDependencies();
