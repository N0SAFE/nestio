/**
 * Scope Stack Tests
 * 
 * Tests for nested variable scoping system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ScopeStack } from '../scope';

describe('ScopeStack', () => {
  let scopeStack: ScopeStack;

  beforeEach(() => {
    scopeStack = new ScopeStack();
  });

  describe('Basic Operations', () => {
    it('should start with global scope', () => {
      const current = scopeStack.current();
      expect(current.name).toBe('global');
      expect(current.level).toBe(0);
    });

    it('should push new scope', () => {
      scopeStack.push('loop');
      const current = scopeStack.current();
      expect(current.name).toBe('loop');
      expect(current.level).toBe(1);
    });

    it('should pop scope', () => {
      scopeStack.push('loop');
      scopeStack.pop();
      const current = scopeStack.current();
      expect(current.name).toBe('global');
      expect(current.level).toBe(0);
    });

    it('should not pop global scope', () => {
      scopeStack.pop();
      scopeStack.pop(); // Try to pop again
      const current = scopeStack.current();
      expect(current.name).toBe('global');
      expect(current.level).toBe(0);
    });
  });

  describe('Nested Scopes', () => {
    it('should support multiple nested scopes', () => {
      scopeStack.push('function');
      scopeStack.push('loop');
      scopeStack.push('condition');
      
      expect(scopeStack.getLevel()).toBe(3);
      expect(scopeStack.current().name).toBe('condition');
    });

    it('should pop scopes in order', () => {
      scopeStack.push('function');
      scopeStack.push('loop');
      
      scopeStack.pop();
      expect(scopeStack.current().name).toBe('function');
      
      scopeStack.pop();
      expect(scopeStack.current().name).toBe('global');
    });

    it('should track correct levels', () => {
      expect(scopeStack.getLevel()).toBe(0);
      
      scopeStack.push('scope1');
      expect(scopeStack.getLevel()).toBe(1);
      
      scopeStack.push('scope2');
      expect(scopeStack.getLevel()).toBe(2);
      
      scopeStack.pop();
      expect(scopeStack.getLevel()).toBe(1);
    });
  });

  describe('Variable Resolution', () => {
    it('should resolve variable from current scope', () => {
      const variable = {
        id: '1',
        name: 'x',
        type: 'number' as const,
        value: 42,
        scope: 'local' as const,
      };
      
      scopeStack.current().variables.set('x', variable);
      const resolved = scopeStack.resolve('x');
      
      expect(resolved).toBe(variable);
      expect(resolved?.value).toBe(42);
    });

    it('should resolve variable from parent scope', () => {
      const globalVar = {
        id: '1',
        name: 'global',
        type: 'string' as const,
        value: 'global value',
        scope: 'global' as const,
      };
      
      scopeStack.global().variables.set('global', globalVar);
      scopeStack.push('nested');
      
      const resolved = scopeStack.resolve('global');
      expect(resolved).toBe(globalVar);
    });

    it('should prioritize closer scopes over parent scopes', () => {
      const globalVar = {
        id: '1',
        name: 'x',
        type: 'number' as const,
        value: 1,
        scope: 'global' as const,
      };
      
      const localVar = {
        id: '2',
        name: 'x',
        type: 'number' as const,
        value: 2,
        scope: 'local' as const,
      };
      
      scopeStack.global().variables.set('x', globalVar);
      scopeStack.push('nested');
      scopeStack.current().variables.set('x', localVar);
      
      const resolved = scopeStack.resolve('x');
      expect(resolved?.value).toBe(2); // Local wins
    });

    it('should return undefined for non-existent variable', () => {
      const resolved = scopeStack.resolve('nonexistent');
      expect(resolved).toBeUndefined();
    });
  });

  describe('Scope Access', () => {
    it('should get global scope', () => {
      scopeStack.push('nested');
      const global = scopeStack.global();
      expect(global.name).toBe('global');
      expect(global.level).toBe(0);
    });

    it('should get all scopes', () => {
      scopeStack.push('scope1');
      scopeStack.push('scope2');
      
      const allScopes = scopeStack.getAllScopes();
      expect(allScopes).toHaveLength(3);
      expect(allScopes[0]?.name).toBe('global');
      expect(allScopes[1]?.name).toBe('scope1');
      expect(allScopes[2]?.name).toBe('scope2');
    });

    it('should get scope by level', () => {
      scopeStack.push('scope1');
      scopeStack.push('scope2');
      
      const scope = scopeStack.getScope(1);
      expect(scope?.name).toBe('scope1');
      expect(scope?.level).toBe(1);
    });

    it('should return undefined for invalid level', () => {
      const scope = scopeStack.getScope(10);
      expect(scope).toBeUndefined();
    });

    it('should check if in global scope', () => {
      expect(scopeStack.isGlobalScope()).toBe(true);
      
      scopeStack.push('nested');
      expect(scopeStack.isGlobalScope()).toBe(false);
      
      scopeStack.pop();
      expect(scopeStack.isGlobalScope()).toBe(true);
    });
  });

  describe('Clear Operation', () => {
    it('should clear all scopes except global', () => {
      scopeStack.push('scope1');
      scopeStack.push('scope2');
      
      const variable = {
        id: '1',
        name: 'x',
        type: 'number' as const,
        value: 42,
        scope: 'global' as const,
      };
      scopeStack.global().variables.set('x', variable);
      
      scopeStack.clear();
      
      expect(scopeStack.getLevel()).toBe(0);
      expect(scopeStack.current().name).toBe('global');
      expect(scopeStack.resolve('x')).toBeUndefined();
    });

    it('should preserve global scope structure', () => {
      scopeStack.push('scope1');
      scopeStack.clear();
      
      const global = scopeStack.global();
      expect(global).toBeDefined();
      expect(global.name).toBe('global');
      expect(global.level).toBe(0);
    });
  });

  describe('Clone and Restore', () => {
    it('should clone scope stack', () => {
      const variable1 = {
        id: '1',
        name: 'x',
        type: 'number' as const,
        value: 42,
        scope: 'global' as const,
      };
      
      scopeStack.global().variables.set('x', variable1);
      scopeStack.push('nested');
      
      const variable2 = {
        id: '2',
        name: 'y',
        type: 'string' as const,
        value: 'hello',
        scope: 'local' as const,
      };
      scopeStack.current().variables.set('y', variable2);
      
      const cloned = scopeStack.clone();
      
      expect(cloned).toHaveLength(2);
      expect(cloned[0]?.name).toBe('global');
      expect(cloned[0]?.variables.x).toBe(42);
      expect(cloned[1]?.name).toBe('nested');
      expect(cloned[1]?.variables.y).toBe('hello');
    });

    it('should restore scope stack from clone', () => {
      const variable = {
        id: '1',
        name: 'x',
        type: 'number' as const,
        value: 100,
        scope: 'global' as const,
      };
      scopeStack.global().variables.set('x', variable);
      
      const cloned = scopeStack.clone();
      
      // Modify original
      scopeStack.clear();
      scopeStack.push('new-scope');
      
      // Restore from clone
      scopeStack.restore(cloned);
      
      const restored = scopeStack.resolve('x');
      expect(restored?.value).toBe(100);
      expect(scopeStack.getLevel()).toBe(0);
    });

    it('should restore nested scopes', () => {
      scopeStack.push('scope1');
      scopeStack.push('scope2');
      
      const var1 = {
        id: '1',
        name: 'a',
        type: 'number' as const,
        value: 1,
        scope: 'global' as const,
      };
      const var2 = {
        id: '2',
        name: 'b',
        type: 'number' as const,
        value: 2,
        scope: 'local' as const,
      };
      const var3 = {
        id: '3',
        name: 'c',
        type: 'number' as const,
        value: 3,
        scope: 'local' as const,
      };
      
      scopeStack.getScope(0)?.variables.set('a', var1);
      scopeStack.getScope(1)?.variables.set('b', var2);
      scopeStack.getScope(2)?.variables.set('c', var3);
      
      const cloned = scopeStack.clone();
      
      scopeStack.clear();
      scopeStack.restore(cloned);
      
      expect(scopeStack.getLevel()).toBe(2);
      expect(scopeStack.resolve('a')?.value).toBe(1);
      expect(scopeStack.resolve('b')?.value).toBe(2);
      expect(scopeStack.resolve('c')?.value).toBe(3);
    });

    it('should clone variable values as-is (shallow)', () => {
      const obj = { nested: { value: 42 } };
      const variable = {
        id: '1',
        name: 'obj',
        type: 'object' as const,
        value: obj,
        scope: 'global' as const,
      };
      
      scopeStack.global().variables.set('obj', variable);
      const cloned = scopeStack.clone();
      
      // ScopeStack.clone() does shallow copy for variables
      // The object value is the same reference
      expect(cloned[0]?.variables.obj).toBe(obj);
    });
  });

  describe('Type Inference', () => {
    it('should infer string type', () => {
      const cloned = scopeStack.clone();
      scopeStack.restore([{
        name: 'global',
        level: 0,
        variables: { test: 'hello' },
      }]);
      
      const variable = scopeStack.resolve('test');
      expect(variable?.type).toBe('string');
    });

    it('should infer number type', () => {
      scopeStack.restore([{
        name: 'global',
        level: 0,
        variables: { test: 42 },
      }]);
      
      const variable = scopeStack.resolve('test');
      expect(variable?.type).toBe('number');
    });

    it('should infer boolean type', () => {
      scopeStack.restore([{
        name: 'global',
        level: 0,
        variables: { test: true },
      }]);
      
      const variable = scopeStack.resolve('test');
      expect(variable?.type).toBe('boolean');
    });

    it('should infer array type', () => {
      scopeStack.restore([{
        name: 'global',
        level: 0,
        variables: { test: [1, 2, 3] },
      }]);
      
      const variable = scopeStack.resolve('test');
      expect(variable?.type).toBe('array');
    });

    it('should infer object type', () => {
      scopeStack.restore([{
        name: 'global',
        level: 0,
        variables: { test: { key: 'value' } },
      }]);
      
      const variable = scopeStack.resolve('test');
      expect(variable?.type).toBe('object');
    });

    it('should infer any type for null', () => {
      scopeStack.restore([{
        name: 'global',
        level: 0,
        variables: { test: null },
      }]);
      
      const variable = scopeStack.resolve('test');
      expect(variable?.type).toBe('any');
    });
  });
});
