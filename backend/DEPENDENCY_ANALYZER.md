# Dependency Analyzer - Simple Implementation

## What We Built

A focused, simple dependency analyzer that parses JavaScript files and extracts dependency information.

## Files Created

1. **`src/services/dependencyAnalyzer.js`** (~150 lines)
   - Parses JavaScript `require()` and `import` statements
   - Classifies dependencies as: internal (relative), external (npm), or builtin (node)
   - Analyzes multiple files and provides summary statistics

2. **`test-dependency.js`** (new test file)
   - Tests the analyzer on the sample Express.js repository
   - Prints detailed dependency analysis output

3. **Sample Repository** (cloned to parent directory)
   - Express.js repository at `/CSE210/sample-express-repo`
   - Used as a real-world test case

## How It Works

### Step 1: Parse Individual Files

```javascript
import dependencyAnalyzer from './src/services/dependencyAnalyzer.js';

const content = `
const express = require('express');
const router = require('./router');
const fs = require('node:fs');
`;

const result = dependencyAnalyzer.parseJavaScriptFile(content, 'app.js');
// Returns:
// {
//   filePath: 'app.js',
//   dependencies: [
//     { module: 'express', type: 'external', line: 2 },
//     { module: './router', type: 'internal', line: 3 },
//     { module: 'node:fs', type: 'builtin', line: 4 }
//   ],
//   stats: { total: 3, internal: 1, external: 1, builtin: 1 }
// }
```

### Step 2: Analyze Multiple Files

```javascript
const analysis = dependencyAnalyzer.analyzeDependencies(parsedFiles);
// Returns:
// {
//   summary: { totalFiles, totalDependencies, totalImports },
//   byType: { internal, external, builtin },
//   dependencies: [...], // sorted by usage frequency
//   files: { ... }       // per-file dependency info
// }
```

## Running the Test

```bash
# Test dependency analyzer
cd backend
node test-dependency.js

# Test GitHub API (separate file)
node test.js
```

## Example Output

```
=== Testing Dependency Analysis ===

Found 6 JavaScript files in /sample-express-repo/lib

📄 application.js
   Dependencies: 16 (5 internal, 7 external, 4 builtin)
📄 express.js
   Dependencies: 8 (3 internal, 4 external, 1 builtin)

--- Overall Analysis ---

Summary:
  Total Files: 6
  Unique Dependencies: 43
  Total Import Statements: 62

By Type:
  Internal (relative): 5
  External (npm): 30
  Built-in (node): 8

Most Used Dependencies:
  ./utils (internal) - used in 7 file(s)
  node:http (builtin) - used in 5 file(s)
  node:path (builtin) - used in 4 file(s)
```

## What It Can Do

✅ Parse `require()` statements (CommonJS)
✅ Parse `import` statements (ES6)
✅ Classify dependency types (internal/external/builtin)
✅ Track line numbers where dependencies appear
✅ Count usage frequency across files
✅ Provide summary statistics

## Next Steps

Possible enhancements:
1. Integrate with GitHub API to analyze remote repositories
2. Add support for TypeScript imports
3. Detect circular dependencies
4. Build dependency graph visualization
5. Add more language support (Python, Java, etc.)

## API Reference

### `parseJavaScriptFile(content, filePath)`

Parses a single JavaScript file.

**Parameters:**
- `content` (string): File content
- `filePath` (string): Path to the file

**Returns:** Object with `filePath`, `dependencies`, and `stats`

### `analyzeDependencies(parsedFiles)`

Analyzes multiple parsed files.

**Parameters:**
- `parsedFiles` (array): Array of parsed file objects

**Returns:** Object with `summary`, `byType`, `dependencies`, and `files`

### `classifyDependency(moduleName)`

Classifies a module name.

**Parameters:**
- `moduleName` (string): Name of the module

**Returns:** String: `'internal'`, `'external'`, or `'builtin'`
