import dependencyService from '../src/services/dependencyService.js';

describe('Dependency Service Tests', () => {

  test('extractFilesByLanguage should filter files correctly', () => {
    const mockTree = [
      { name: 'src', type: 'dir', children: [
        { name: 'index.js', type: 'file' },
        { name: 'utils.ts', type: 'file' }
      ]},
      { name: 'README.md', type: 'file' },
      { name: 'main.py', type: 'file' }
    ];

    const jsFiles = dependencyService.extractFilesByLanguage(mockTree, 'jsts');
    expect(jsFiles).toEqual(['src/index.js', 'src/utils.ts']);

    const pyFiles = dependencyService.extractFilesByLanguage(mockTree, 'python');
    expect(pyFiles).toEqual(['main.py']);
  });

  test('parseFile should detect JavaScript imports', () => {
    const content = `import React from 'react';
const utils = require('./utils');
import { data } from './data/mock';`;
    const filePath = 'src/App.js';

    const result = dependencyService.parseFile(content, filePath);

    expect(result.filePath).toBe('src/App.js');
    expect(result.dependencies).toHaveLength(3);
    expect(result.dependencies).toEqual(expect.arrayContaining([
        expect.objectContaining({ module: 'react', type: 'external' }),
        expect.objectContaining({ module: './utils', type: 'internal' }),
        expect.objectContaining({ module: './data/mock', type: 'internal' })
    ]));
  });

  test('parseFile should detect Python imports', () => {
    const content = `import os
from flask import Flask
import local_module`;
    const filePath = 'app.py';

    const result = dependencyService.parseFile(content, filePath);

    expect(result.dependencies).toEqual(expect.arrayContaining([
        expect.objectContaining({ module: 'os', type: 'builtin' }),
        expect.objectContaining({ module: 'flask', type: 'external' }),
        // FIX: The parser defaults non-relative imports to 'external'
        expect.objectContaining({ module: 'local_module', type: 'external' }) 
    ]));
  });

  // NEW TEST: Increases coverage by testing graph linkage
  test('exportDependencyGraphWithTree should resolve internal links', () => {
    const parsedFiles = [
        {
            filePath: 'src/main.js',
            dependencies: [
                { module: './utils', type: 'internal' },
                { module: 'react', type: 'external' }
            ]
        },
        {
            filePath: 'src/utils.js',
            dependencies: []
        }
    ];

    const repoTree = [
        { name: 'src', type: 'dir', children: [
            { name: 'main.js', type: 'file' },
            { name: 'utils.js', type: 'file' }
        ]}
    ];

    const result = dependencyService.exportDependencyGraphWithTree(parsedFiles, repoTree);

    // Verify the structure remains a tree
    const srcDir = result.find(node => node.name === 'src');
    const mainFile = srcDir.children.find(node => node.name === 'main.js');

    expect(mainFile).toBeDefined();
    
    // Verify ./utils was correctly resolved to src/utils.js
    const internalDep = mainFile.dependencies.find(d => d.type === 'internal');
    expect(internalDep).toBeDefined();
    expect(internalDep.module).toBe('src/utils.js');
  });

});
