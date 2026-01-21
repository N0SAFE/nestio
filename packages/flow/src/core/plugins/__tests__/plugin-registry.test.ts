/**
 * Plugin Registry Tests
 * 
 * Tests the basic plugin registration, retrieval, and management functionality.
 * Note: Plugin objects are complex - these tests use minimal mock plugins just to test registry operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { PluginRegistry } from '../registry';
import type { FlowPlugin } from '../../types/plugin';

// Helper to create a minimal mock plugin for testing
const createMockPlugin = (id: string, overrides: Partial<FlowPlugin> = {}): FlowPlugin => ({
  id,
  name: `Plugin ${id}`,
  version: '1.0.0',
  category: 'core',
  subCategory: 'action',
  nodeType: 'action',
  nodeUIPattern: 'clickable',
  configSchema: z.object({}),
  execute: async () => ({ outputs: {} }),
  validate: () => ({ valid: true, errors: [] }),
  ...overrides,
});

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  describe('Plugin Registration', () => {
    it('should register a plugin', () => {
      const plugin = createMockPlugin('test-plugin');
      registry.register(plugin);
      expect(registry.get('test-plugin')).toBe(plugin);
    });

    it('should throw when registering duplicate plugin ID', () => {
      const plugin = createMockPlugin('duplicate');
      registry.register(plugin);
      expect(() => registry.register(plugin)).toThrow(/already registered/);
    });

    it('should list all plugins', () => {
      const plugin1 = createMockPlugin('plugin1');
      const plugin2 = createMockPlugin('plugin2', { subCategory: 'trigger' });

      registry.register(plugin1);
      registry.register(plugin2);

      const plugins = registry.list();
      expect(plugins).toHaveLength(2);
      expect(plugins.map(p => p.id)).toEqual(expect.arrayContaining(['plugin1', 'plugin2']));
    });
  });

  describe('Plugin Retrieval', () => {
    it('should get plugin by ID', () => {
      const plugin = createMockPlugin('get-test');
      registry.register(plugin);
      expect(registry.get('get-test')).toBe(plugin);
    });

    it('should return undefined for unknown plugin', () => {
      expect(registry.get('unknown')).toBeUndefined();
    });

    it('should check if plugin exists', () => {
      const plugin = createMockPlugin('exists-test');
      registry.register(plugin);
      expect(registry.has('exists-test')).toBe(true);
      expect(registry.has('not-exists')).toBe(false);
    });
  });

  describe('Plugin Unregistration', () => {
    it('should unregister a plugin', () => {
      const plugin = createMockPlugin('unregister-test');
      registry.register(plugin);
      expect(registry.has('unregister-test')).toBe(true);
      
      registry.unregister('unregister-test');
      expect(registry.has('unregister-test')).toBe(false);
    });

    it('should do nothing when unregistering unknown plugin', () => {
      expect(() => registry.unregister('unknown')).not.toThrow();
    });
  });
});
