import { describe, it, expect, beforeEach } from 'vitest';
import {
  serializeFlow,
  deserializeFlow,
  cloneFlow,
  mergeFlows,
  extractSubflow,
} from '../flow-serializer';
import type { Flow } from '../../core/types/flow';

describe('FlowSerializer', () => {
  let sampleFlow: Flow;

  beforeEach(() => {
    sampleFlow = {
      id: 'test-flow',
      name: 'Test Flow',
      description: 'A test flow',
      version: '1.0.0',
      nodes: [
        {
          id: 'node-1',
          type: 'trigger',
          pluginId: 'start-trigger',
          position: { x: 0, y: 0 },
          label: 'Start',
          data: { inputs: {}, outputs: {} },
          config: { type: 'manual' },
        },
        {
          id: 'node-2',
          type: 'action',
          pluginId: 'log',
          position: { x: 100, y: 100 },
          label: 'Log',
          data: { inputs: {}, outputs: {} },
          config: { message: 'Hello', level: 'info' },
        },
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'node-1',
          target: 'node-2',
          sourceHandle: 'default',
          targetHandle: 'default',
        },
      ],
      variables: [
        {
          id: 'var-1',
          name: 'testVar',
          type: 'string',
          value: 'test',
          scope: 'global',
        },
      ],
      subFlows: [],
      metadata: {
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      },
    };
  });

  describe('Serialization', () => {
    it('should serialize flow to JSON string', () => {
      const json = serializeFlow(sampleFlow);
      
      expect(json).toBeDefined();
      expect(typeof json).toBe('string');
      
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe('test-flow');
      expect(parsed.name).toBe('Test Flow');
      expect(parsed.nodes).toHaveLength(2);
      expect(parsed.edges).toHaveLength(1);
    });

    it('should serialize with pretty formatting', () => {
      const json = serializeFlow(sampleFlow, true);
      
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });

    it('should convert Date objects to ISO strings', () => {
      const json = serializeFlow(sampleFlow);
      const parsed = JSON.parse(json);
      
      expect(typeof parsed.metadata.createdAt).toBe('string');
      expect(typeof parsed.metadata.updatedAt).toBe('string');
      expect(parsed.metadata.createdAt).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('Deserialization', () => {
    it('should deserialize flow from JSON string', () => {
      const json = serializeFlow(sampleFlow);
      const deserialized = deserializeFlow(json);
      
      expect(deserialized.id).toBe('test-flow');
      expect(deserialized.name).toBe('Test Flow');
      expect(deserialized.nodes).toHaveLength(2);
      expect(deserialized.edges).toHaveLength(1);
      expect(deserialized.variables).toHaveLength(1);
    });

    it('should convert ISO strings back to Date objects', () => {
      const json = serializeFlow(sampleFlow);
      const deserialized = deserializeFlow(json);
      
      expect(deserialized.metadata.createdAt).toBeInstanceOf(Date);
      expect(deserialized.metadata.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => deserializeFlow('invalid json')).toThrow();
    });

    it('should throw error for invalid flow structure', () => {
      expect(() => deserializeFlow('{}')).toThrow('Invalid flow structure');
    });
  });

  describe('Flow Cloning', () => {
    it('should clone flow with new ID', () => {
      const cloned = cloneFlow(sampleFlow, 'new-id');
      
      expect(cloned.id).toBe('new-id');
      expect(cloned.name).toBe('Test Flow (Copy)');
      expect(cloned.nodes).toHaveLength(2);
      expect(cloned.metadata.createdAt).toBeInstanceOf(Date);
    });

    it('should clone flow with new name', () => {
      const cloned = cloneFlow(sampleFlow, undefined, 'New Name');
      
      expect(cloned.id).toBe('test-flow-copy');
      expect(cloned.name).toBe('New Name');
    });

    it('should deep clone nodes and variables', () => {
      const cloned = cloneFlow(sampleFlow);
      
      cloned.nodes[0]!.config.type = 'modified';
      expect(sampleFlow.nodes[0]!.config.type).toBe('manual');
    });
  });

  describe('Flow Merging', () => {
    it('should merge multiple flows', () => {
      const flow2: Flow = {
        ...sampleFlow,
        id: 'flow-2',
        nodes: [
          {
            id: 'node-3',
            type: 'action',
            pluginId: 'delay',
            position: { x: 200, y: 200 },
            label: 'Delay',
            data: { inputs: {}, outputs: {} },
            config: { duration: 1000 },
          },
        ],
        edges: [],
        variables: [],
      };

      const merged = mergeFlows(
        [sampleFlow, flow2],
        'merged-flow',
        'Merged Flow'
      );

      expect(merged.id).toBe('merged-flow');
      expect(merged.name).toBe('Merged Flow');
      expect(merged.nodes).toHaveLength(3);
      expect(merged.edges).toHaveLength(1);
    });

    it('should deduplicate variables by name', () => {
      const flow2: Flow = {
        ...sampleFlow,
        id: 'flow-2',
        variables: [
          {
            id: 'var-2',
            name: 'testVar',
            type: 'string',
            value: 'duplicate',
            scope: 'global',
          },
        ],
      };

      const merged = mergeFlows(
        [sampleFlow, flow2],
        'merged',
        'Merged'
      );

      expect(merged.variables).toHaveLength(1);
      expect(merged.variables[0]!.name).toBe('testVar');
    });
  });

  describe('Subflow Extraction', () => {
    it('should extract subflow from nodes', () => {
      const subflow = extractSubflow(
        sampleFlow,
        ['node-2'],
        'subflow-1',
        'Extracted Subflow'
      );

      expect(subflow.id).toBe('subflow-1');
      expect(subflow.name).toBe('Extracted Subflow');
      expect(subflow.nodes).toHaveLength(1);
      expect(subflow.nodes[0]!.id).toBe('node-2');
    });

    it('should include related edges in subflow', () => {
      const subflow = extractSubflow(
        sampleFlow,
        ['node-1', 'node-2'],
        'subflow-1',
        'Extracted'
      );

      expect(subflow.edges).toHaveLength(1);
      expect(subflow.edges[0]!.source).toBe('node-1');
      expect(subflow.edges[0]!.target).toBe('node-2');
    });

    it('should include variables used by extracted nodes', () => {
      // Add variable reference to node config
      sampleFlow.nodes[1]!.config.message = '{{ testVar }}';

      const subflow = extractSubflow(
        sampleFlow,
        ['node-2'],
        'subflow-1',
        'Extracted'
      );

      expect(subflow.variables).toHaveLength(1);
      expect(subflow.variables[0]!.name).toBe('testVar');
    });
  });
});
