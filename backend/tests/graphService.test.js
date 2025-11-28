import graphService from '../src/services/graphService.js';

describe('Graph Service Tests', () => {

  const mockTree = [
    {
      name: 'src',
      type: 'dir',
      children: [
        {
          name: 'index.js',
          type: 'file',
          dependencies: [
            { module: 'src/utils.js', type: 'internal' },
            { module: 'react', type: 'external' },
            { module: 'fs', type: 'builtin' }
          ]
        },
        {
          name: 'utils.js',
          type: 'file',
          dependencies: []
        }
      ]
    }
  ];

  test('generateStyledMermaidFlowchart should generate valid mermaid code', () => {
    const result = graphService.generateStyledMermaidFlowchart(mockTree, { styled: false });
    
    expect(result).toContain('graph LR');
    expect(result).toContain('index.js');
    expect(result).toContain('utils.js');
    expect(result).toContain('react');
  });

  test('generateStyledMermaidFlowchart should support options', () => {
    const result = graphService.generateStyledMermaidFlowchart(mockTree, { 
        styled: true,
        showExternal: true,
        showBuiltin: true 
    });
    
    expect(result).toContain('classDef codeStyle');
    expect(result).toContain('classDef externalStyle');
    expect(result).toContain('classDef builtinStyle');
    expect(result).toContain('fs'); 
  });

  test('generateFileDependencyDiagram should generate focused graph', () => {
    const targetFile = 'src/index.js';
    const result = graphService.generateFileDependencyDiagram(mockTree, targetFile);

    expect(result).toContain('graph LR');
    expect(result).toContain('index.js');
    expect(result).toContain('utils.js'); // Internal dep
    expect(result).toContain('react'); // External dep
  });

  test('getDiagramStats should return correct node/edge counts', () => {
    const mockDiagram = `
      graph LR
      node1 --> node2
      node1 --> node3
      node2 --> node4
    `;
    
    const stats = graphService.getDiagramStats(mockDiagram);
    
    expect(stats.totalNodes).toBe(4);
    expect(stats.totalEdges).toBe(3);
  });
});
