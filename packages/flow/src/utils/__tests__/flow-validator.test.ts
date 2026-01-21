import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateFlow } from '../flow-validator';
import { pluginRegistry } from '../../core/plugins/registry';
import type { Flow, FlowNode } from '../../core/types/flow';
import { z } from 'zod';

describe('FlowValidator', () => {
  // Setup and teardown
  beforeEach(() => {
    // Register test plugins
    pluginRegistry.register({
      id: 'test-trigger',
      name: 'Test Trigger',
      version: '1.0.0',
      category: 'trigger',
      subCategory: 'manual',
      nodeType: 'trigger',
      configSchema: z.object({}),
      nodeUIPattern: 'clickable',
      execute: async () => ({ success: true, data: {} }),
    });

    pluginRegistry.register({
      id: 'test-action',
      name: 'Test Action',
      version: '1.0.0',
      category: 'action',
      subCategory: 'data',
      nodeType: 'action',
      configSchema: z.object({}),
      nodeUIPattern: 'clickable',
      execute: async () => ({ success: true, data: {} }),
    });
  });

  afterEach(() => {
    // Clean up plugins after each test
    pluginRegistry.unregister('test-trigger');
    pluginRegistry.unregister('test-action');
  });

  describe('Basic Structure', () => {
    it('should reject flow with no trigger nodes', () => {
      const flow: Flow = {
        id: 'no-trigger',
        name: 'No Trigger Flow',
        version: '1.0.0',
        nodes: [],
        edges: [],
        variables: [],
        subFlows: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = validateFlow(flow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'FLOW_NO_START')).toBe(true);
    });

    it('should accept flow with valid structure', () => {
      const flow: Flow = {
        id: 'valid',
        name: 'Valid Flow',
        version: '1.0.0',
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            pluginId: 'test-trigger',
            position: { x: 0, y: 0 },
            label: 'Start',
            data: { inputs: {}, outputs: {} },
            config: {},
          },
        ],
        edges: [],
        variables: [],
        subFlows: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = validateFlow(flow);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Edge Validation', () => {
    it('should detect invalid source node', () => {
      const flow: Flow = {
        id: 'invalid-source',
        name: 'Invalid Source',
        version: '1.0.0',
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            pluginId: 'test-trigger',
            position: { x: 0, y: 0 },
            label: 'Start',
            data: { inputs: {}, outputs: {} },
            config: {},
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'non-existent',
            target: 'trigger-1',
          },
        ],
        variables: [],
        subFlows: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = validateFlow(flow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'EDGE_INVALID_SOURCE')).toBe(true);
    });

    it('should detect invalid target node', () => {
      const flow: Flow = {
        id: 'invalid-target',
        name: 'Invalid Target',
        version: '1.0.0',
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            pluginId: 'test-trigger',
            position: { x: 0, y: 0 },
            label: 'Start',
            data: { inputs: {}, outputs: {} },
            config: {},
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'trigger-1',
            target: 'non-existent',
          },
        ],
        variables: [],
        subFlows: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = validateFlow(flow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'EDGE_INVALID_TARGET')).toBe(true);
    });
  });

  describe('Connectivity', () => {
    it('should detect orphaned nodes as warnings', () => {
      const flow: Flow = {
        id: 'orphaned',
        name: 'Orphaned Nodes',
        version: '1.0.0',
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            pluginId: 'test-trigger',
            position: { x: 0, y: 0 },
            label: 'Start',
            data: { inputs: {}, outputs: {} },
            config: {},
          },
          {
            id: 'orphan-1',
            type: 'action',
            pluginId: 'test-action',
            position: { x: 100, y: 100 },
            label: 'Orphan',
            data: { inputs: {}, outputs: {} },
            config: {},
          },
        ],
        edges: [],
        variables: [],
        subFlows: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = validateFlow(flow);

      expect(result.valid).toBe(true); // warnings don't make it invalid
      expect(result.warnings.some(w => w.code === 'NODE_ORPHANED')).toBe(true);
    });

    it('should detect unreachable nodes as warnings', () => {
      const flow: Flow = {
        id: 'unreachable',
        name: 'Unreachable Nodes',
        version: '1.0.0',
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            pluginId: 'test-trigger',
            position: { x: 0, y: 0 },
            label: 'Start',
            data: { inputs: {}, outputs: {} },
            config: {},
          },
          {
            id: 'action-1',
            type: 'action',
            pluginId: 'test-action',
            position: { x: 100, y: 0 },
            label: 'Connected',
            data: { inputs: {}, outputs: {} },
            config: {},
          },
          {
            id: 'action-2',
            type: 'action',
            pluginId: 'test-action',
            position: { x: 100, y: 100 },
            label: 'Unreachable',
            data: { inputs: {}, outputs: {} },
            config: {},
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'trigger-1',
            target: 'action-1',
          },
          // action-2 is not connected
        ],
        variables: [],
        subFlows: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = validateFlow(flow);

      expect(result.valid).toBe(true); // warnings don't make it invalid
      expect(result.warnings.some(w => w.code === 'NODE_UNREACHABLE')).toBe(true);
    });

    it('should detect circular dependencies as warnings', () => {
      const flow: Flow = {
        id: 'circular',
        name: 'Circular Dependencies',
        version: '1.0.0',
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            pluginId: 'test-trigger',
            position: { x: 0, y: 0 },
            label: 'Start',
            data: { inputs: {}, outputs: {} },
            config: {},
          },
          {
            id: 'action-1',
            type: 'action',
            pluginId: 'test-action',
            position: { x: 100, y: 0 },
            label: 'Action 1',
            data: { inputs: {}, outputs: {} },
            config: {},
          },
          {
            id: 'action-2',
            type: 'action',
            pluginId: 'test-action',
            position: { x: 200, y: 0 },
            label: 'Action 2',
            data: { inputs: {}, outputs: {} },
            config: {},
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'trigger-1',
            target: 'action-1',
          },
          {
            id: 'edge-2',
            source: 'action-1',
            target: 'action-2',
          },
          {
            id: 'edge-3',
            source: 'action-2',
            target: 'action-1', // creates cycle
          },
        ],
        variables: [],
        subFlows: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = validateFlow(flow);

      expect(result.valid).toBe(true); // warnings don't make it invalid
      expect(result.warnings.some(w => w.code === 'FLOW_HAS_CYCLES')).toBe(true);
    });
  });

  describe('Node Validation', () => {
    it('should detect missing plugin', () => {
      const flow: Flow = {
        id: 'missing-plugin',
        name: 'Missing Plugin',
        version: '1.0.0',
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            pluginId: 'test-trigger',
            position: { x: 0, y: 0 },
            label: 'Start',
            data: { inputs: {}, outputs: {} },
            config: {},
          },
          {
            id: 'action-1',
            type: 'action',
            pluginId: 'non-existent-plugin',
            position: { x: 100, y: 0 },
            label: 'Missing',
            data: { inputs: {}, outputs: {} },
            config: {},
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'trigger-1',
            target: 'action-1',
          },
        ],
        variables: [],
        subFlows: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = validateFlow(flow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'NODE_PLUGIN_NOT_FOUND')).toBe(true);
    });

    it('should detect duplicate node IDs', () => {
      const flow: Flow = {
        id: 'duplicate-ids',
        name: 'Duplicate IDs',
        version: '1.0.0',
        nodes: [
          {
            id: 'duplicate',
            type: 'trigger',
            pluginId: 'test-trigger',
            position: { x: 0, y: 0 },
            label: 'Start',
            data: { inputs: {}, outputs: {} },
            config: {},
          },
          {
            id: 'duplicate',
            type: 'action',
            pluginId: 'test-action',
            position: { x: 100, y: 0 },
            label: 'Duplicate',
            data: { inputs: {}, outputs: {} },
            config: {},
          },
        ],
        edges: [],
        variables: [],
        subFlows: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = validateFlow(flow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'NODE_DUPLICATE_ID')).toBe(true);
    });
  });

  describe('Variable Validation', () => {
    it('should detect duplicate variable names', () => {
      const flow: Flow = {
        id: 'duplicate-vars',
        name: 'Duplicate Variables',
        version: '1.0.0',
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            pluginId: 'test-trigger',
            position: { x: 0, y: 0 },
            label: 'Start',
            data: { inputs: {}, outputs: {} },
            config: {},
          },
        ],
        edges: [],
        variables: [
          {
            name: 'myVar',
            type: 'string',
            value: 'value1',
            scope: 'flow',
          },
          {
            name: 'myVar',
            type: 'string',
            value: 'value2',
            scope: 'flow',
          },
        ],
        subFlows: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = validateFlow(flow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'VARIABLE_DUPLICATE_NAME')).toBe(true);
    });
  });
});
