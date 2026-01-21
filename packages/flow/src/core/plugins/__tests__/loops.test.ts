import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForLoopPlugin } from '../loops/for-loop';
import { WhileLoopPlugin } from '../loops/while-loop';
import { ForEachLoopPlugin } from '../loops/foreach-loop';
import type { ExecutionContext, FlowNode } from '../../types';
import { VariableManager } from '../../runtime/variables/manager';
import { ScopeStack } from '../../runtime/variables/scope';
import { FlowEventEmitter } from '../../engine/events';

describe('Loop Plugins', () => {
  let context: ExecutionContext;

  beforeEach(() => {
    const scopeStack = new ScopeStack();
    
    context = {
      flowId: 'test-flow',
      variables: new VariableManager(scopeStack),
      scopeStack,
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      eventEmitter: new FlowEventEmitter(),
    } as ExecutionContext;
  });

  describe('ForLoopPlugin', () => {
    it('should execute for loop with correct iterations', async () => {
      const plugin = new ForLoopPlugin();
      const node: FlowNode = {
        id: 'for-1',
        type: 'loop',
        pluginId: 'for-loop',
        position: { x: 0, y: 0 },
        label: 'For Loop',
        data: { inputs: {}, outputs: {} },
        config: {
          start: 0,
          end: 5,
          step: 1,
          indexVariable: 'i',
          loopHandle: 'loop',
        },
      };

      const result = await plugin.execute(node, context);

      expect(result.success).toBe(true);
      expect(result.outputs?.iterations).toBe(5);
      expect(result.outputs?.nextHandle).toBe('loop');
    });

    it('should execute for loop with custom step', async () => {
      const plugin = new ForLoopPlugin();
      const node: FlowNode = {
        id: 'for-2',
        type: 'loop',
        pluginId: 'for-loop',
        position: { x: 0, y: 0 },
        label: 'For Loop',
        data: { inputs: {}, outputs: {} },
        config: {
          start: 0,
          end: 10,
          step: 2,
          indexVariable: 'i',
          loopHandle: 'loop',
        },
      };

      const result = await plugin.execute(node, context);

      expect(result.success).toBe(true);
      expect(result.outputs?.iterations).toBe(5);
    });

    it('should validate for loop config', () => {
      const plugin = new ForLoopPlugin();
      
      const validConfig = {
        start: 0,
        end: 10,
        step: 1,
        indexVariable: 'i',
        loopHandle: 'loop',
      };
      const validResult = plugin.validate(validConfig);
      expect(validResult.valid).toBe(true);

      const invalidConfig = {
        start: 'invalid',
        end: 10,
      };
      const invalidResult = plugin.validate(invalidConfig);
      expect(invalidResult.valid).toBe(false);
    });
  });

  describe('WhileLoopPlugin', () => {
    it('should execute while loop until condition is false', async () => {
      const plugin = new WhileLoopPlugin();
      context.variables.set('counter', 0);

      const node: FlowNode = {
        id: 'while-1',
        type: 'loop',
        pluginId: 'while-loop',
        position: { x: 0, y: 0 },
        label: 'While Loop',
        data: { inputs: {}, outputs: {} },
        config: {
          condition: '{{ counter }} < 5',
          maxIterations: 100,
          loopHandle: 'loop',
        },
      };

      const result = await plugin.execute(node, context);

      expect(result.success).toBe(true);
      expect(result.outputs?.continue).toBeDefined();
    });

    it('should respect max iterations limit', async () => {
      const plugin = new WhileLoopPlugin();
      context.variables.set('alwaysTrue', true);

      const node: FlowNode = {
        id: 'while-2',
        type: 'loop',
        pluginId: 'while-loop',
        position: { x: 0, y: 0 },
        label: 'While Loop',
        data: { inputs: {}, outputs: {} },
        config: {
          condition: '{{ alwaysTrue }}',
          maxIterations: 10,
          loopHandle: 'loop',
        },
      };

      const result = await plugin.execute(node, context);

      expect(result.success).toBe(true);
      expect(result.outputs?.iterations).toBeLessThanOrEqual(10);
    });

    it('should validate while loop config', () => {
      const plugin = new WhileLoopPlugin();
      
      const validConfig = {
        condition: '{{ x }} < 10',
        maxIterations: 100,
        loopHandle: 'loop',
      };
      const validResult = plugin.validate(validConfig);
      expect(validResult.valid).toBe(true);

      const invalidConfig = {
        condition: '',
      };
      const invalidResult = plugin.validate(invalidConfig);
      expect(invalidResult.valid).toBe(false);
    });
  });

  describe('ForEachLoopPlugin', () => {
    it('should iterate over array', async () => {
      const plugin = new ForEachLoopPlugin();
      context.variables.set('items', ['a', 'b', 'c', 'd']);

      const node: FlowNode = {
        id: 'foreach-1',
        type: 'loop',
        pluginId: 'foreach-loop',
        position: { x: 0, y: 0 },
        label: 'ForEach Loop',
        data: { inputs: {}, outputs: {} },
        config: {
          arrayVariable: 'items',
          itemVariable: 'item',
          indexVariable: 'index',
          loopHandle: 'loop',
        },
      };

      const result = await plugin.execute(node, context);

      expect(result.success).toBe(true);
      expect(result.outputs?.iterations).toBe(4);
    });

    it('should handle empty array', async () => {
      const plugin = new ForEachLoopPlugin();
      context.variables.set('items', []);

      const node: FlowNode = {
        id: 'foreach-2',
        type: 'loop',
        pluginId: 'foreach-loop',
        position: { x: 0, y: 0 },
        label: 'ForEach Loop',
        data: { inputs: {}, outputs: {} },
        config: {
          arrayVariable: 'items',
          itemVariable: 'item',
          loopHandle: 'loop',
        },
      };

      const result = await plugin.execute(node, context);

      expect(result.success).toBe(true);
      expect(result.outputs?.iterations).toBe(0);
    });

    it('should iterate over object properties', async () => {
      const plugin = new ForEachLoopPlugin();
      context.variables.set('user', { name: 'John', age: 30, city: 'NYC' });

      const node: FlowNode = {
        id: 'foreach-3',
        type: 'loop',
        pluginId: 'foreach-loop',
        position: { x: 0, y: 0 },
        label: 'ForEach Loop',
        data: { inputs: {}, outputs: {} },
        config: {
          arrayVariable: 'user',
          itemVariable: 'value',
          indexVariable: 'key',
          loopHandle: 'loop',
        },
      };

      const result = await plugin.execute(node, context);

      expect(result.success).toBe(true);
      expect(result.outputs?.iterations).toBe(3);
    });

    it('should validate foreach config', () => {
      const plugin = new ForEachLoopPlugin();
      
      const validConfig = {
        arrayVariable: 'items',
        itemVariable: 'item',
        loopHandle: 'loop',
      };
      const validResult = plugin.validate(validConfig);
      expect(validResult.valid).toBe(true);

      const invalidConfig = {
        arrayVariable: '',
      };
      const invalidResult = plugin.validate(invalidConfig);
      expect(invalidResult.valid).toBe(false);
    });
  });
});
