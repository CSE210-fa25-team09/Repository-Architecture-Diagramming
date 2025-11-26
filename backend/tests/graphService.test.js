import graphService from '../src/services/graphService.js';

describe('Graph Service Tests', () => {

  // Logic requires 'name' and 'type' to traverse correctly
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
            { module: 'react', type: 'external' }
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
    // We expect the graph to generate ids based on the paths constructed from 'name'
    const result = graphService.generateStyledMermaidFlowchart(mockTree, { styled: false });
    
    expect(result).toContain('graph LR');
    // The service generates node IDs, but includes labels with the filenames
    expect(result).toContain('index.js');
    expect(result).toContain('utils.js');
    // It should contain the external dependency
    expect(result).toContain('react');
  });

  test('getDiagramStats should return correct node/edge counts', () => {
    // The service specifically counts nodes matching /node\d+/
    // So we must mock the input format it actually generates
    const mockDiagram = `
      graph LR
      node1 --> node2
      node1 --> node3
      node2 --> node4
    `;
    
    const stats = graphService.getDiagramStats(mockDiagram);
    
    // 4 Nodes (node1, node2, node3, node4) and 3 Edges
    expect(stats.totalNodes).toBe(4);
    expect(stats.totalEdges).toBe(3);
  });
});
