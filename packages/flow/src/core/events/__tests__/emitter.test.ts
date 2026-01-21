/**
 * Event Emitter Tests
 * 
 * Tests for flow execution event system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from '../emitter';

describe('EventEmitter', () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  describe('Basic Event Handling', () => {
    it('should register event handler', () => {
      const handler = vi.fn();
      emitter.on('test', handler);
      emitter.emit('test');
      
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should call handler with event data', () => {
      const handler = vi.fn();
      emitter.on('test', handler);
      emitter.emit('test', { value: 42 });
      
      expect(handler).toHaveBeenCalledWith({ value: 42 });
    });

    it('should support multiple handlers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      emitter.on('test', handler1);
      emitter.on('test', handler2);
      emitter.emit('test');
      
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should not call handler for different event', () => {
      const handler = vi.fn();
      emitter.on('event1', handler);
      emitter.emit('event2');
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle events with no handlers gracefully', () => {
      expect(() => emitter.emit('nonexistent')).not.toThrow();
    });
  });

  describe('One-time Handlers', () => {
    it('should call once handler only once', () => {
      const handler = vi.fn();
      emitter.once('test', handler);
      
      emitter.emit('test');
      emitter.emit('test');
      emitter.emit('test');
      
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should pass data to once handler', () => {
      const handler = vi.fn();
      emitter.once('test', handler);
      emitter.emit('test', { data: 'hello' });
      
      expect(handler).toHaveBeenCalledWith({ data: 'hello' });
    });

    it('should auto-remove once handler after execution', () => {
      const handler = vi.fn();
      emitter.once('test', handler);
      
      expect(emitter.listenerCount('test')).toBe(1);
      emitter.emit('test');
      expect(emitter.listenerCount('test')).toBe(0);
    });

    it('should support mix of on and once handlers', () => {
      const onHandler = vi.fn();
      const onceHandler = vi.fn();
      
      emitter.on('test', onHandler);
      emitter.once('test', onceHandler);
      
      emitter.emit('test');
      emitter.emit('test');
      
      expect(onHandler).toHaveBeenCalledTimes(2);
      expect(onceHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Handler Removal', () => {
    it('should remove specific handler', () => {
      const handler = vi.fn();
      emitter.on('test', handler);
      emitter.off('test', handler);
      emitter.emit('test');
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should only remove specified handler', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      emitter.on('test', handler1);
      emitter.on('test', handler2);
      emitter.off('test', handler1);
      emitter.emit('test');
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should handle removing non-existent handler gracefully', () => {
      const handler = vi.fn();
      expect(() => emitter.off('test', handler)).not.toThrow();
    });

    it('should handle removing handler for non-existent event', () => {
      const handler = vi.fn();
      expect(() => emitter.off('nonexistent', handler)).not.toThrow();
    });
  });

  describe('Clear Operations', () => {
    it('should clear all handlers for specific event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      emitter.on('test', handler1);
      emitter.on('test', handler2);
      emitter.clear('test');
      emitter.emit('test');
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should clear all handlers for all events', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      emitter.on('event1', handler1);
      emitter.on('event2', handler2);
      emitter.clear();
      
      emitter.emit('event1');
      emitter.emit('event2');
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should not affect other events when clearing specific event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      emitter.on('event1', handler1);
      emitter.on('event2', handler2);
      emitter.clear('event1');
      
      emitter.emit('event1');
      emitter.emit('event2');
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('Listener Count', () => {
    it('should return 0 for event with no handlers', () => {
      expect(emitter.listenerCount('test')).toBe(0);
    });

    it('should return correct count for event with handlers', () => {
      emitter.on('test', () => {});
      emitter.on('test', () => {});
      emitter.on('test', () => {});
      
      expect(emitter.listenerCount('test')).toBe(3);
    });

    it('should update count after adding handlers', () => {
      expect(emitter.listenerCount('test')).toBe(0);
      
      emitter.on('test', () => {});
      expect(emitter.listenerCount('test')).toBe(1);
      
      emitter.on('test', () => {});
      expect(emitter.listenerCount('test')).toBe(2);
    });

    it('should update count after removing handlers', () => {
      const handler1 = () => {};
      const handler2 = () => {};
      
      emitter.on('test', handler1);
      emitter.on('test', handler2);
      expect(emitter.listenerCount('test')).toBe(2);
      
      emitter.off('test', handler1);
      expect(emitter.listenerCount('test')).toBe(1);
    });
  });

  describe('Event Names', () => {
    it('should return empty array when no events registered', () => {
      expect(emitter.eventNames()).toEqual([]);
    });

    it('should return all registered event names', () => {
      emitter.on('event1', () => {});
      emitter.on('event2', () => {});
      emitter.on('event3', () => {});
      
      const names = emitter.eventNames();
      expect(names).toContain('event1');
      expect(names).toContain('event2');
      expect(names).toContain('event3');
      expect(names).toHaveLength(3);
    });

    it('should not duplicate event names', () => {
      emitter.on('test', () => {});
      emitter.on('test', () => {});
      emitter.on('test', () => {});
      
      const names = emitter.eventNames();
      expect(names).toEqual(['test']);
    });

    it('should update after clearing events', () => {
      emitter.on('event1', () => {});
      emitter.on('event2', () => {});
      
      emitter.clear('event1');
      
      const names = emitter.eventNames();
      expect(names).not.toContain('event1');
      expect(names).toContain('event2');
    });
  });

  describe('Error Handling', () => {
    it('should continue executing handlers if one throws', () => {
      const handler1 = vi.fn(() => { throw new Error('Handler 1 error'); });
      const handler2 = vi.fn();
      
      // Mock console.error to avoid test output pollution
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      emitter.on('test', handler1);
      emitter.on('test', handler2);
      emitter.emit('test');
      
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalled();
      
      consoleError.mockRestore();
    });

    it('should log errors from handlers', () => {
      const error = new Error('Test error');
      const handler = vi.fn(() => { throw error; });
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      emitter.on('test', handler);
      emitter.emit('test');
      
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error in event handler'),
        error
      );
      
      consoleError.mockRestore();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple events with multiple handlers', () => {
      const handlers = {
        event1_1: vi.fn(),
        event1_2: vi.fn(),
        event2_1: vi.fn(),
        event2_2: vi.fn(),
      };
      
      emitter.on('event1', handlers.event1_1);
      emitter.on('event1', handlers.event1_2);
      emitter.on('event2', handlers.event2_1);
      emitter.on('event2', handlers.event2_2);
      
      emitter.emit('event1', { id: 1 });
      emitter.emit('event2', { id: 2 });
      
      expect(handlers.event1_1).toHaveBeenCalledWith({ id: 1 });
      expect(handlers.event1_2).toHaveBeenCalledWith({ id: 1 });
      expect(handlers.event2_1).toHaveBeenCalledWith({ id: 2 });
      expect(handlers.event2_2).toHaveBeenCalledWith({ id: 2 });
    });

    it('should handle re-registering same handler', () => {
      const handler = vi.fn();
      
      emitter.on('test', handler);
      emitter.on('test', handler);
      emitter.emit('test');
      
      // Handler should be called only once (Set prevents duplicates)
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid emit/on/off operations', () => {
      const handler = vi.fn();
      
      emitter.on('test', handler);
      emitter.emit('test');
      emitter.off('test', handler);
      emitter.emit('test');
      emitter.on('test', handler);
      emitter.emit('test');
      
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should support chainable event pattern', () => {
      const result: string[] = [];
      
      emitter.on('step1', () => {
        result.push('step1');
        emitter.emit('step2');
      });
      
      emitter.on('step2', () => {
        result.push('step2');
        emitter.emit('step3');
      });
      
      emitter.on('step3', () => {
        result.push('step3');
      });
      
      emitter.emit('step1');
      
      expect(result).toEqual(['step1', 'step2', 'step3']);
    });
  });
});
