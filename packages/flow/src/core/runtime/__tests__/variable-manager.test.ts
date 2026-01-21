/**
 * Variable Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VariableManager, ScopeStack } from '../variables';

describe('VariableManager', () => {
  let scopeStack: ScopeStack;
  let manager: VariableManager;

  beforeEach(() => {
    scopeStack = new ScopeStack();
    manager = new VariableManager(scopeStack);
  });

  describe('Basic Operations', () => {
    it('should set and get variables', () => {
      manager.set('test', 42);
      expect(manager.get('test')).toBe(42);
    });

    it('should handle different types', () => {
      manager.set('string', 'hello');
      manager.set('number', 123);
      manager.set('boolean', true);
      manager.set('object', { key: 'value' });
      manager.set('array', [1, 2, 3]);

      expect(manager.get('string')).toBe('hello');
      expect(manager.get('number')).toBe(123);
      expect(manager.get('boolean')).toBe(true);
      expect(manager.get('object')).toEqual({ key: 'value' });
      expect(manager.get('array')).toEqual([1, 2, 3]);
    });

    it('should check existence', () => {
      manager.set('exists', true);
      expect(manager.exists('exists')).toBe(true);
      expect(manager.exists('notExists')).toBe(false);
    });

    it('should delete variables', () => {
      manager.set('temp', 'value');
      expect(manager.exists('temp')).toBe(true);
      
      manager.delete('temp');
      expect(manager.exists('temp')).toBe(false);
    });

    it('should list all variables', () => {
      manager.set('var1', 1);
      manager.set('var2', 2);
      manager.set('var3', 3);

      const vars = manager.list();
      expect(vars).toHaveLength(3);
      expect(vars.map(v => v.name)).toEqual(expect.arrayContaining(['var1', 'var2', 'var3']));
    });
  });

  describe('Scoping', () => {
    it('should handle scoped variables', () => {
      manager.set('global', 'global-value');
      
      scopeStack.push('local');
      manager.set('local', 'local-value');
      
      expect(manager.get('global')).toBe('global-value');
      expect(manager.get('local')).toBe('local-value');
    });

    it('should shadow parent scope variables', () => {
      manager.set('var', 'outer');
      
      scopeStack.push('inner');
      manager.set('var', 'inner');
      
      expect(manager.get('var')).toBe('inner');
      
      scopeStack.pop();
      expect(manager.get('var')).toBe('outer');
    });

    it('should resolve variables through scope chain', () => {
      manager.set('global', 'global');
      
      scopeStack.push('scope1');
      manager.set('scope1Var', 'scope1');
      
      scopeStack.push('scope2');
      manager.set('scope2Var', 'scope2');
      
      expect(manager.get('global')).toBe('global');
      expect(manager.get('scope1Var')).toBe('scope1');
      expect(manager.get('scope2Var')).toBe('scope2');
    });
  });

  describe('Batch Operations', () => {
    it('should set multiple variables', () => {
      const vars = {
        var1: 'value1',
        var2: 42,
        var3: true,
      };

      Object.entries(vars).forEach(([name, value]) => {
        manager.set(name, value);
      });

      expect(manager.get('var1')).toBe('value1');
      expect(manager.get('var2')).toBe(42);
      expect(manager.get('var3')).toBe(true);
    });

    it('should clear scope-specific variables on pop', () => {
      scopeStack.push('scope1');
      manager.set('var1', 1);
      manager.set('var2', 2);
      
      expect(manager.list().length).toBe(2);
      
      scopeStack.pop();
      // After pop, variables are no longer in current scope
      // but still accessible from global map until deleted
      expect(manager.get('var1')).toBe(1);
    });
  });

  describe('Snapshot', () => {
    it('should clone all variables as a Map', () => {
      manager.set('num', 42);
      const snapshot = manager.clone();
      
      expect(snapshot).toBeInstanceOf(Map);
      expect(snapshot.has('num')).toBe(true);
      expect(snapshot.get('num')?.value).toBe(42);
    });

    it('should deep clone object values', () => {
      const original = { nested: { value: 42 } };
      manager.set('obj', original);
      
      const snapshot = manager.clone();
      const clonedVar = snapshot.get('obj');
      
      expect(clonedVar).toBeDefined();
      expect(clonedVar?.value).toEqual({ nested: { value: 42 } });
      
      // Modify original - cloned should be unaffected
      original.nested.value = 99;
      expect(clonedVar?.value).toEqual({ nested: { value: 42 } });
    });

    it('should deep clone array values', () => {
      const original = [1, 2, { key: 'value' }];
      manager.set('arr', original);
      
      const snapshot = manager.clone();
      const clonedVar = snapshot.get('arr');
      
      expect(clonedVar).toBeDefined();
      expect(clonedVar?.value).toEqual([1, 2, { key: 'value' }]);
      
      // Modify original - cloned should be unaffected
      (original[2] as { key: string }).key = 'changed';
      expect(clonedVar?.value).toEqual([1, 2, { key: 'value' }]);
    });
  });
});

