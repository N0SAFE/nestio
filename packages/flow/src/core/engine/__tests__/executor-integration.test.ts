import { describe, it, expect, beforeEach } from 'vitest';
import { FlowExecutor } from '../executor';
import { pluginRegistry } from '../../plugins/registry';
import type { Flow } from '../../types/flow';
import { z } from 'zod';

describe('FlowExecutor Integration Tests', () => {
  let executor: FlowExecutor;
  let executionId: string;
  let flowId: string;

  beforeEach(() => {
    // Clean up any previously registered plugins
    ['start-trigger', 'set-variable', 'log-message', 'error-plugin'].forEach(id => {
      try {
        pluginRegistry.unregister(id);
      } catch {
        // Ignore if not registered
      }
    });

    flowId = 'test-flow';
    executionId = 'test-execution';
    executor = new FlowExecutor(flowId, executionId, {});
    
    // Register test plugins
    pluginRegistry.register({
      id: 'start-trigger',
      name: 'Start Trigger',
      version: '1.0.0',
      category: 'trigger',
      subCategory: 'manual',
      nodeType: 'trigger',
      configSchema: z.object({}),
      nodeUIPattern: 'clickable',
      execute: (context) => {
        context.logger.info('Flow started');
        return { success: true, data: { started: true } };
      },
    });

    pluginRegistry.register({
      id: 'set-variable',
      name: 'Set Variable',
      version: '1.0.0',
      category: 'action',
      subCategory: 'variable',
      nodeType: 'action',
      configSchema: z.object({
        name: z.string(),
        value: z.unknown(),
      }),
      nodeUIPattern: 'clickable',
      execute: (context, config) => {
        const { name, value } = config as { name: string; value: unknown };
        // CORRECT API: context.variables.set() not context.setVariable()
        context.variables.set(name, value);
        context.logger.info(`Set variable ${name} = ${JSON.stringify(value)}`);
        return { success: true, data: { set: name, value } };
      },
    });

    pluginRegistry.register({
      id: 'log-message',
      name: 'Log Message',
      version: '1.0.0',
      category: 'action',
      subCategory: 'output',
      nodeType: 'action',
      configSchema: z.object({
        message: z.string(),
      }),
      nodeUIPattern: 'clickable',
      execute: (context, config) => {
        const { message } = config as { message: string };
        context.logger.info(message);
        return { success: true, data: { logged: message } };
      },
    });
  });

  describe('Basic Flow Execution', () => {
    it('should execute a simple linear flow', async () => {
      const flow: Flow = {
        id: 'simple-flow',
        name: 'Simple Linear Flow',
        version: '1.0.0',
        nodes: [
          {
            id: 'trigger',
            type: 'trigger',
            pluginId: 'start-trigger',
            position: { x: 0, y: 0 },
            label: 'Start',
            data: { inputs: {}, outputs: {} },
            config: {},
          },
          {
            id: 'set-var',
            type: 'action',
            pluginId: 'set-variable',
            position: { x: 100, y: 0 },
            label: 'Set Variable',
            data: { inputs: {}, outputs: {} },
            config: { name: 'counter', value: 42 },
          },
          {
            id: 'log',
            type: 'action',
            pluginId: 'log-message',
            position: { x: 200, y: 0 },
            label: 'Log',
            data: { inputs: {}, outputs: {} },
            config: { message: 'Flow completed!' },
          },
        ],
        edges: [
          { id: 'edge-1', source: 'trigger', target: 'set-var' },
          { id: 'edge-2', source: 'set-var', target: 'log' },
        ],
        variables: [],
        subFlows: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      // CORRECT: execute() returns Promise<void>, not a result object
      await executor.execute(flow);

      // Check state after execution
      const state = executor.getState();
      expect(state.status).toBe('completed');
      
      // Check execution path
      const path = executor.getExecutionPath();
      expect(path).toHaveLength(3);
      expect(path[0].nodeId).toBe('trigger');
      expect(path[1].nodeId).toBe('set-var');
      expect(path[2].nodeId).toBe('log');
      
      // Check variables
      const variables = executor.getVariables();
      expect(variables.get('counter')).toBe(42);
    });

    it('should execute flow with no edges (single trigger)', async () => {
      const flow: Flow = {
        id: 'single-node-flow',
        name: 'Single Node Flow',
        version: '1.0.0',
        nodes: [
          {
            id: 'trigger',
            type: 'trigger',
            pluginId: 'start-trigger',
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

      await executor.execute(flow);

      const state = executor.getState();
      expect(state.status).toBe('completed');
      
      const path = executor.getExecutionPath();
      expect(path).toHaveLength(1);
      expect(path[0].nodeId).toBe('trigger');
    });
  });

  describe('Variable Handling', () => {
    it('should pass variables between nodes', async () => {
      const flow: Flow = {
        id: 'variable-flow',
        name: 'Variable Passing Flow',
        version: '1.0.0',
        nodes: [
          {
            id: 'trigger',
            type: 'trigger',
            pluginId: 'start-trigger',
            position: { x: 0, y: 0 },
            label: 'Start',
            data: { inputs: {}, outputs: {} },
            config: {},
          },
          {
            id: 'set-name',
            type: 'action',
            pluginId: 'set-variable',
            position: { x: 100, y: 0 },
            label: 'Set Name',
            data: { inputs: {}, outputs: {} },
            config: { name: 'userName', value: 'Alice' },
          },
          {
            id: 'set-age',
            type: 'action',
            pluginId: 'set-variable',
            position: { x: 200, y: 0 },
            label: 'Set Age',
            data: { inputs: {}, outputs: {} },
            config: { name: 'userAge', value: 30 },
          },
        ],
        edges: [
          { id: 'edge-1', source: 'trigger', target: 'set-name' },
          { id: 'edge-2', source: 'set-name', target: 'set-age' },
        ],
        variables: [],
        subFlows: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      await executor.execute(flow);

      const state = executor.getState();
      expect(state.status).toBe('completed');
      
      const variables = executor.getVariables();
      expect(variables.get('userName')).toBe('Alice');
      expect(variables.get('userAge')).toBe(30);
    });

    it('should support initial flow variables', async () => {
      // Create executor with initial variables
      const testExecutor = new FlowExecutor('init-vars-flow', 'test-exec-2', {
        initialVariables: {
          initialValue: 'Hello World',
          counter: 0,
        },
      });

      const flow: Flow = {
        id: 'init-vars-flow',
        name: 'Initial Variables Flow',
        version: '1.0.0',
        nodes: [
          {
            id: 'trigger',
            type: 'trigger',
            pluginId: 'start-trigger',
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

      await testExecutor.execute(flow);

      const state = testExecutor.getState();
      expect(state.status).toBe('completed');
      
      const variables = testExecutor.getVariables();
      expect(variables.get('initialValue')).toBe('Hello World');
      expect(variables.get('counter')).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing plugin gracefully', async () => {
      const flow: Flow = {
        id: 'missing-plugin-flow',
        name: 'Missing Plugin Flow',
        version: '1.0.0',
        nodes: [
          {
            id: 'trigger',
            type: 'trigger',
            pluginId: 'nonexistent-plugin',
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

      // CORRECT: execute() throws on error, doesn't return result
      await expect(executor.execute(flow)).rejects.toThrow('Plugin nonexistent-plugin not found');

      const state = executor.getState();
      expect(state.status).toBe('failed');
      expect(state.error).toBeDefined();
    });

    it('should capture node execution errors', async () => {
      // Register a plugin that throws an error
      pluginRegistry.register({
        id: 'error-plugin',
        name: 'Error Plugin',
        version: '1.0.0',
        category: 'action',
        subCategory: 'test',
        nodeType: 'action',
        configSchema: z.object({}),
        nodeUIPattern: 'clickable',
        execute: () => {
          throw new Error('Intentional test error');
        },
      });

      const flow: Flow = {
        id: 'error-flow',
        name: 'Error Flow',
        version: '1.0.0',
        nodes: [
          {
            id: 'trigger',
            type: 'trigger',
            pluginId: 'start-trigger',
            position: { x: 0, y: 0 },
            label: 'Start',
            data: { inputs: {}, outputs: {} },
            config: {},
          },
          {
            id: 'error-node',
            type: 'action',
            pluginId: 'error-plugin',
            position: { x: 100, y: 0 },
            label: 'Error',
            data: { inputs: {}, outputs: {} },
            config: {},
          },
        ],
        edges: [
          { id: 'edge-1', source: 'trigger', target: 'error-node' },
        ],
        variables: [],
        subFlows: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      await expect(executor.execute(flow)).rejects.toThrow('Intentional test error');

      const state = executor.getState();
      expect(state.status).toBe('failed');
      expect(state.error).toBeDefined();
      expect(state.error?.message).toContain('Intentional test error');
      
      // Check execution path shows error
      const path = executor.getExecutionPath();
      expect(path.some(p => p.nodeId === 'error-node' && p.status === 'error')).toBe(true);

      // Clean up
      pluginRegistry.unregister('error-plugin');
    });
  });

  describe('Flow Metrics', () => {
    it('should track execution duration', async () => {
      const flow: Flow = {
        id: 'timed-flow',
        name: 'Timed Flow',
        version: '1.0.0',
        nodes: [
          {
            id: 'trigger',
            type: 'trigger',
            pluginId: 'start-trigger',
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

      const startTime = Date.now();
      await executor.execute(flow);
      const endTime = Date.now();

      const state = executor.getState();
      expect(state.status).toBe('completed');
      expect(state.startTime).toBeDefined();
      expect(state.endTime).toBeDefined();
      
      const duration = state.endTime!.getTime() - state.startTime!.getTime();
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThanOrEqual(endTime - startTime + 10); // 10ms tolerance
    });

    it('should count completed nodes', async () => {
      const flow: Flow = {
        id: 'count-flow',
        name: 'Count Flow',
        version: '1.0.0',
        nodes: [
          {
            id: 'trigger',
            type: 'trigger',
            pluginId: 'start-trigger',
            position: { x: 0, y: 0 },
            label: 'Start',
            data: { inputs: {}, outputs: {} },
            config: {},
          },
          {
            id: 'log-1',
            type: 'action',
            pluginId: 'log-message',
            position: { x: 100, y: 0 },
            label: 'Log 1',
            data: { inputs: {}, outputs: {} },
            config: { message: 'First log' },
          },
          {
            id: 'log-2',
            type: 'action',
            pluginId: 'log-message',
            position: { x: 200, y: 0 },
            label: 'Log 2',
            data: { inputs: {}, outputs: {} },
            config: { message: 'Second log' },
          },
        ],
        edges: [
          { id: 'edge-1', source: 'trigger', target: 'log-1' },
          { id: 'edge-2', source: 'log-1', target: 'log-2' },
        ],
        variables: [],
        subFlows: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      await executor.execute(flow);

      const state = executor.getState();
      expect(state.status).toBe('completed');
      
      const path = executor.getExecutionPath();
      expect(path).toHaveLength(3);
      expect(path[0].nodeId).toBe('trigger');
      expect(path[1].nodeId).toBe('log-1');
      expect(path[2].nodeId).toBe('log-2');
      expect(path.every(p => p.status === 'success')).toBe(true);
    });
  });

  describe('Multiple Trigger Nodes', () => {
    it('should execute all trigger nodes', async () => {
      const flow: Flow = {
        id: 'multi-trigger-flow',
        name: 'Multiple Triggers Flow',
        version: '1.0.0',
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            pluginId: 'start-trigger',
            position: { x: 0, y: 0 },
            label: 'Start 1',
            data: { inputs: {}, outputs: {} },
            config: {},
          },
          {
            id: 'trigger-2',
            type: 'trigger',
            pluginId: 'start-trigger',
            position: { x: 0, y: 100 },
            label: 'Start 2',
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

      await executor.execute(flow);

      const state = executor.getState();
      expect(state.status).toBe('completed');
      
      const path = executor.getExecutionPath();
      expect(path).toHaveLength(2);
      
      const nodeIds = path.map(p => p.nodeId);
      expect(nodeIds).toContain('trigger-1');
      expect(nodeIds).toContain('trigger-2');
      expect(path.every(p => p.status === 'success')).toBe(true);
    });
  });
});
