import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DelayPlugin } from '../flow-control/delay';
import { EndFlowPlugin } from '../flow-control/end-flow';
import { LogPlugin } from '../flow-control/log';
import type { ExecutionContext, FlowNode } from '../../types';
import { VariableManager } from '../../runtime/variables/manager';
import { ScopeStack } from '../../runtime/variables/scope';
import { FlowEventEmitter } from '../../engine/events';

describe('Flow Control Plugins', () => {
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

  describe('DelayPlugin', () => {
    it('should delay execution in milliseconds', async () => {
      const plugin = new DelayPlugin();
      const node: FlowNode = {
        id: 'delay-1',
        type: 'action',
        pluginId: 'delay',
        position: { x: 0, y: 0 },
        label: 'Delay',
        data: { inputs: {}, outputs: {} },
        config: {
          duration: 100,
          durationUnit: 'ms',
        },
      };

      const startTime = Date.now();
      const result = await plugin.execute(node, context);
      const elapsed = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow 10ms tolerance
    });

    it('should convert seconds to milliseconds', async () => {
      const plugin = new DelayPlugin();
      const node: FlowNode = {
        id: 'delay-2',
        type: 'action',
        pluginId: 'delay',
        position: { x: 0, y: 0 },
        label: 'Delay',
        data: { inputs: {}, outputs: {} },
        config: {
          duration: 1,
          durationUnit: 's',
        },
      };

      const startTime = Date.now();
      const result = await plugin.execute(node, context);
      const elapsed = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(elapsed).toBeGreaterThanOrEqual(900);
    });

    it('should validate delay config', () => {
      const plugin = new DelayPlugin();
      
      const validConfig = {
        duration: 1000,
        durationUnit: 'ms',
      };
      const validResult = plugin.validate(validConfig);
      expect(validResult.valid).toBe(true);

      const invalidConfig = {
        duration: -100,
      };
      const invalidResult = plugin.validate(invalidConfig);
      expect(invalidResult.valid).toBe(false);
    });
  });

  describe('EndFlowPlugin', () => {
    it('should end flow with success', async () => {
      const plugin = new EndFlowPlugin();
      const node: FlowNode = {
        id: 'end-1',
        type: 'action',
        pluginId: 'end-flow',
        position: { x: 0, y: 0 },
        label: 'End',
        data: { inputs: {}, outputs: {} },
        config: {
          reason: 'completed',
        },
      };

      const result = await plugin.execute(node, context);

      expect(result.success).toBe(true);
      expect(result.outputs?.reason).toBe('completed');
      expect(result.outputs?.flowEnded).toBe(true);
    });

    it('should end flow with error', async () => {
      const plugin = new EndFlowPlugin();
      const node: FlowNode = {
        id: 'end-2',
        type: 'action',
        pluginId: 'end-flow',
        position: { x: 0, y: 0 },
        label: 'End',
        data: { inputs: {}, outputs: {} },
        config: {
          reason: 'error',
          message: 'Something went wrong',
        },
      };

      const result = await plugin.execute(node, context);

      expect(result.success).toBe(true);
      expect(result.outputs?.reason).toBe('error');
      expect(result.outputs?.message).toBe('Something went wrong');
    });

    it('should validate end flow config', () => {
      const plugin = new EndFlowPlugin();
      
      const validConfig = {
        reason: 'completed',
      };
      const validResult = plugin.validate(validConfig);
      expect(validResult.valid).toBe(true);

      const invalidConfig = {
        reason: '',
      };
      const invalidResult = plugin.validate(invalidConfig);
      expect(invalidResult.valid).toBe(false);
    });
  });

  describe('LogPlugin', () => {
    it('should log message to console', async () => {
      const plugin = new LogPlugin();
      const node: FlowNode = {
        id: 'log-1',
        type: 'action',
        pluginId: 'log',
        position: { x: 0, y: 0 },
        label: 'Log',
        data: { inputs: {}, outputs: {} },
        config: {
          level: 'info',
          message: 'Test log message',
        },
      };

      const result = await plugin.execute(node, context);

      expect(result.success).toBe(true);
      expect(context.logger.info).toHaveBeenCalledWith('Test log message');
    });

    it('should log with variable interpolation', async () => {
      const plugin = new LogPlugin();
      context.variables.set('userName', 'John');

      const node: FlowNode = {
        id: 'log-2',
        type: 'action',
        pluginId: 'log',
        position: { x: 0, y: 0 },
        label: 'Log',
        data: { inputs: {}, outputs: {} },
        config: {
          level: 'info',
          message: 'User: {{ userName }}',
        },
      };

      const result = await plugin.execute(node, context);

      expect(result.success).toBe(true);
    });

    it('should log at different levels', async () => {
      const plugin = new LogPlugin();

      const levels = ['debug', 'info', 'warn', 'error'];

      for (const level of levels) {
        const node: FlowNode = {
          id: `log-${level}`,
          type: 'action',
          pluginId: 'log',
          position: { x: 0, y: 0 },
          label: 'Log',
          data: { inputs: {}, outputs: {} },
          config: {
            level,
            message: `${level} message`,
          },
        };

        const result = await plugin.execute(node, context);
        expect(result.success).toBe(true);
      }
    });

    it('should validate log config', () => {
      const plugin = new LogPlugin();
      
      const validConfig = {
        level: 'info',
        message: 'Test message',
      };
      const validResult = plugin.validate(validConfig);
      expect(validResult.valid).toBe(true);

      const invalidConfig = {
        level: 'invalid',
        message: '',
      };
      const invalidResult = plugin.validate(invalidConfig);
      expect(invalidResult.valid).toBe(false);
    });
  });
});
