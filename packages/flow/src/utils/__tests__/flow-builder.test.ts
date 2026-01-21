/**
 * Flow Builder Tests
 */

import { describe, it, expect } from 'vitest';
import { FlowBuilder } from '../flow-builder';

describe('FlowBuilder', () => {
  describe('Basic Flow Creation', () => {
    it('should create a flow with id and name', () => {
      const builder = new FlowBuilder('test-flow', 'Test Flow');
      const flow = builder.build();

      expect(flow.id).toBe('test-flow');
      expect(flow.name).toBe('Test Flow');
      expect(flow.version).toBe('1.0.0');
      expect(flow.nodes).toEqual([]);
      expect(flow.edges).toEqual([]);
    });

    it('should set description', () => {
      const builder = new FlowBuilder('test', 'Test')
        .description('Test description');
      const flow = builder.build();

      expect(flow.description).toBe('Test description');
    });

    it('should set version', () => {
      const builder = new FlowBuilder('test', 'Test')
        .version('2.0.0');
      const flow = builder.build();

      expect(flow.version).toBe('2.0.0');
    });
  });

  describe('Node Operations', () => {
    it('should add nodes with minimal data', () => {
      const builder = new FlowBuilder('test', 'Test');
      
      builder.addNode({
        type: 'action',
        pluginId: 'test-plugin',
        label: 'Test Node',
        position: { x: 0, y: 0 },
        data: { inputs: {}, outputs: {} },
        config: {},
      });

      const flow = builder.build();
      expect(flow.nodes).toHaveLength(1);
      expect(flow.nodes[0].label).toBe('Test Node');
      expect(flow.nodes[0].id).toBeDefined();
    });

    it('should auto-generate node IDs', () => {
      const builder = new FlowBuilder('test', 'Test');
      
      builder.addNode({
        type: 'action',
        pluginId: 'plugin1',
        label: 'Node 1',
        position: { x: 0, y: 0 },
        data: { inputs: {}, outputs: {} },
        config: {},
      });

      builder.addNode({
        type: 'action',
        pluginId: 'plugin2',
        label: 'Node 2',
        position: { x: 100, y: 0 },
        data: { inputs: {}, outputs: {} },
        config: {},
      });

      const flow = builder.build();
      expect(flow.nodes[0].id).toBe('node-1');
      expect(flow.nodes[1].id).toBe('node-2');
    });

    it('should respect custom node IDs', () => {
      const builder = new FlowBuilder('test', 'Test');
      
      builder.addNode({
        id: 'custom-id',
        type: 'action',
        pluginId: 'test-plugin',
        label: 'Custom ID Node',
        position: { x: 0, y: 0 },
        data: { inputs: {}, outputs: {} },
        config: {},
      });

      const flow = builder.build();
      expect(flow.nodes[0].id).toBe('custom-id');
    });
  });

  describe('Edge Operations', () => {
    it('should connect nodes with edges', () => {
      const builder = new FlowBuilder('test', 'Test');
      
      builder.addNode({
        id: 'node1',
        type: 'action',
        pluginId: 'plugin1',
        label: 'Node 1',
        position: { x: 0, y: 0 },
        data: { inputs: {}, outputs: {} },
        config: {},
      });

      builder.addNode({
        id: 'node2',
        type: 'action',
        pluginId: 'plugin2',
        label: 'Node 2',
        position: { x: 100, y: 0 },
        data: { inputs: {}, outputs: {} },
        config: {},
      });

      builder.connect('node1', 'node2');

      const flow = builder.build();
      expect(flow.edges).toHaveLength(1);
      expect(flow.edges[0].source).toBe('node1');
      expect(flow.edges[0].target).toBe('node2');
    });

    it('should auto-generate edge IDs', () => {
      const builder = new FlowBuilder('test', 'Test');
      
      builder.addNode({ 
        id: 'n1', 
        type: 'action', 
        pluginId: 'p1', 
        label: 'N1', 
        position: { x: 0, y: 0 },
        data: { inputs: {}, outputs: {} },
        config: {},
      });
      builder.addNode({ 
        id: 'n2', 
        type: 'action', 
        pluginId: 'p2', 
        label: 'N2', 
        position: { x: 100, y: 0 },
        data: { inputs: {}, outputs: {} },
        config: {},
      });
      
      builder.connect('n1', 'n2');

      const flow = builder.build();
      expect(flow.edges[0].id).toBe('edge-1');
    });
  });

  describe('Variable Operations', () => {
    it('should add variables', () => {
      const builder = new FlowBuilder('test', 'Test');
      
      builder.addVariable({
        name: 'testVar',
        type: 'string',
        value: 'test value',
        scope: 'global',
      });

      const flow = builder.build();
      expect(flow.variables).toHaveLength(1);
      expect(flow.variables![0].name).toBe('testVar');
      expect(flow.variables![0].value).toBe('test value');
    });

    it('should add multiple variables', () => {
      const builder = new FlowBuilder('test', 'Test');
      
      builder
        .addVariable({ name: 'var1', type: 'string', value: 'value1', scope: 'global' })
        .addVariable({ name: 'var2', type: 'number', value: 42, scope: 'global' });

      const flow = builder.build();
      expect(flow.variables).toHaveLength(2);
    });
  });

  describe('Metadata', () => {
    it('should set custom metadata', () => {
      const builder = new FlowBuilder('test', 'Test');
      
      builder.addMetadata('customField', 'customValue');

      const flow = builder.build();
      expect((flow.metadata as Record<string, unknown>)?.customField).toBe('customValue');
    });

    it('should preserve default metadata fields', () => {
      const builder = new FlowBuilder('test', 'Test');
      const flow = builder.build();

      expect(flow.metadata?.createdAt).toBeInstanceOf(Date);
      expect(flow.metadata?.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Fluent API', () => {
    it('should support method chaining', () => {
      const flow = new FlowBuilder('test', 'Test')
        .description('Chained flow')
        .version('3.0.0')
        .addNode({
          id: 'start',
          type: 'trigger',
          pluginId: 'manual-trigger',
          label: 'Start',
          position: { x: 0, y: 0 },
          data: { inputs: {}, outputs: {} },
          config: {},
        })
        .addNode({
          id: 'end',
          type: 'action',
          pluginId: 'log',
          label: 'End',
          position: { x: 200, y: 0 },
          data: { inputs: {}, outputs: {} },
          config: {},
        })
        .connect('start', 'end')
        .addVariable({
          name: 'counter',
          type: 'number',
          value: 0,
          scope: 'global',
        })
        .build();

      expect(flow.description).toBe('Chained flow');
      expect(flow.nodes).toHaveLength(2);
      expect(flow.edges).toHaveLength(1);
      expect(flow.variables).toHaveLength(1);
    });
  });
});
