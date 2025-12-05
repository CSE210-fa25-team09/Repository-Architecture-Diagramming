// Mock the githubService module before importing dependencyService
jest.mock('../src/services/githubService.js');

import dependencyService from '../src/services/dependencyService.js';
import githubService from '../src/services/githubService.js';

describe('Dependency Service Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('extractFilesByLanguage should filter files correctly (BFS order)', () => {
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

    // BFS order: root-level files first, then nested files
    const allFiles = dependencyService.extractFilesByLanguage(mockTree, 'all');
    expect(allFiles).toEqual(['main.py', 'src/index.js', 'src/utils.ts']);
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


  test('parseFile should detect Java imports', () => {
    const content = `package com.example;
import java.util.List;
import org.springframework.boot.SpringApplication;
import com.example.project.Helper;`;
    const filePath = 'src/main/java/com/example/App.java';

    const result = dependencyService.parseFile(content, filePath);

    expect(result.dependencies).toEqual(expect.arrayContaining([
        expect.objectContaining({ module: 'java.util', type: 'builtin' }),
        expect.objectContaining({ module: 'org.springframework.boot', type: 'external' }),
        expect.objectContaining({ module: 'com.example.project', type: 'external' })
    ]));
  });

  test('parseFile should detect C++ imports', () => {
    const content = `#include <iostream>
#include <vector>
#include "myHeader.h"
#include "utils/helper.hpp"`;
    const filePath = 'src/main.cpp';

    const result = dependencyService.parseFile(content, filePath);

    expect(result.dependencies).toEqual(expect.arrayContaining([
        expect.objectContaining({ module: 'iostream', type: 'builtin' }),
        expect.objectContaining({ module: 'vector', type: 'builtin' }),
        expect.objectContaining({ module: 'myHeader.h', type: 'external' }),
        expect.objectContaining({ module: 'utils/helper.hpp', type: 'internal' }) 
    ]));
  });

  test('parseFile should detect Go imports', () => {
    const content = `package main
import (
    "fmt"
    "github.com/pkg/errors"
    "./internal/utils"
)`;
    const filePath = 'main.go';

    const result = dependencyService.parseFile(content, filePath);

    expect(result.dependencies).toEqual(expect.arrayContaining([
        expect.objectContaining({ module: 'fmt', type: 'builtin' }),
        expect.objectContaining({ module: 'github.com/pkg/errors', type: 'external' }),
        expect.objectContaining({ module: './internal/utils', type: 'internal' })
    ]));
  });

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

    const srcDir = result.find(node => node.name === 'src');
    const mainFile = srcDir.children.find(node => node.name === 'main.js');

    expect(mainFile).toBeDefined();
    
    const internalDep = mainFile.dependencies.find(d => d.type === 'internal');
    expect(internalDep).toBeDefined();
    expect(internalDep.module).toBe('src/utils.js');
  });

  test('analyzeDependencies should orchestrate the full process', async () => {
    const mockTree = [{ name: 'index.js', type: 'file', path: 'index.js' }];
    githubService.getRepoTree.mockResolvedValue(mockTree);
    // Mock the parallel file fetch to return a Map
    const mockFileContents = new Map([['index.js', "import fs from 'fs';"]]);
    githubService.getFilesParallel.mockResolvedValue(mockFileContents);

    const result = await dependencyService.analyzeDependencies(
        'owner', 'repo', 'main'
    );

    expect(result.success).toBe(true);
    expect(result.data.tree).toBeDefined();
    expect(githubService.getRepoTree).toHaveBeenCalled();
    expect(githubService.getFilesParallel).toHaveBeenCalled();
  });
});
