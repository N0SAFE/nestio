/**
 * Plugin Registry
 * 
 * Central registry for all flow plugins.
 * Manages plugin registration, validation, and retrieval.
 */

import type { FlowPlugin, PluginCategory, PluginSubCategory } from '../types/plugin';
import type { NodeType } from '../types/flow';

/**
 * Plugin Registry Implementation
 */
export class PluginRegistry {
  private plugins: Map<string, FlowPlugin>;
  private pluginsByCategory: Map<PluginCategory, Set<string>>;
  private pluginsBySubCategory: Map<PluginSubCategory, Set<string>>;
  private pluginsByNodeType: Map<NodeType, Set<string>>;

  constructor() {
    this.plugins = new Map();
    this.pluginsByCategory = new Map();
    this.pluginsBySubCategory = new Map();
    this.pluginsByNodeType = new Map();
  }

  /**
   * Register a plugin
   */
  register(plugin: FlowPlugin): void {
    // Validate plugin
    this.validatePlugin(plugin);

    // Check for duplicates
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin with id "${plugin.id}" is already registered`);
    }

    // Store plugin
    this.plugins.set(plugin.id, plugin);

    // Index by category
    if (!this.pluginsByCategory.has(plugin.category)) {
      this.pluginsByCategory.set(plugin.category, new Set());
    }
    this.pluginsByCategory.get(plugin.category)!.add(plugin.id);

    // Index by sub-category
    if (!this.pluginsBySubCategory.has(plugin.subCategory)) {
      this.pluginsBySubCategory.set(plugin.subCategory, new Set());
    }
    this.pluginsBySubCategory.get(plugin.subCategory)!.add(plugin.id);

    // Index by node type
    if (!this.pluginsByNodeType.has(plugin.nodeType)) {
      this.pluginsByNodeType.set(plugin.nodeType, new Set());
    }
    this.pluginsByNodeType.get(plugin.nodeType)!.add(plugin.id);

    // Note: onInit would be called with ExecutionContext during flow execution
    // Not during plugin registration
  }

  /**
   * Unregister a plugin
   */
  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return;
    }

    // Note: onDestroy would be called with ExecutionContext during flow cleanup
    // Not during plugin unregistration

    // Remove from indexes
    this.pluginsByCategory.get(plugin.category)?.delete(pluginId);
    this.pluginsBySubCategory.get(plugin.subCategory)?.delete(pluginId);
    this.pluginsByNodeType.get(plugin.nodeType)?.delete(pluginId);

    // Remove plugin
    this.plugins.delete(pluginId);
  }

  /**
   * Get a plugin by ID
   */
  get(pluginId: string): FlowPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Check if plugin exists
   */
  has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Get all plugins
   */
  list(): FlowPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by category
   */
  listByCategory(category: PluginCategory): FlowPlugin[] {
    const pluginIds = this.pluginsByCategory.get(category);
    if (!pluginIds) {
      return [];
    }

    return Array.from(pluginIds)
      .map((id) => this.plugins.get(id))
      .filter((plugin): plugin is FlowPlugin => plugin !== undefined);
  }

  /**
   * Get plugins by sub-category
   */
  listBySubCategory(subCategory: PluginSubCategory): FlowPlugin[] {
    const pluginIds = this.pluginsBySubCategory.get(subCategory);
    if (!pluginIds) {
      return [];
    }

    return Array.from(pluginIds)
      .map((id) => this.plugins.get(id))
      .filter((plugin): plugin is FlowPlugin => plugin !== undefined);
  }

  /**
   * Get plugins by node type
   */
  listByNodeType(nodeType: NodeType): FlowPlugin[] {
    const pluginIds = this.pluginsByNodeType.get(nodeType);
    if (!pluginIds) {
      return [];
    }

    return Array.from(pluginIds)
      .map((id) => this.plugins.get(id))
      .filter((plugin): plugin is FlowPlugin => plugin !== undefined);
  }

  /**
   * Get core plugins only
   */
  listCorePlugins(): FlowPlugin[] {
    return this.listByCategory('core');
  }

  /**
   * Get business plugins only
   */
  listBusinessPlugins(): FlowPlugin[] {
    return this.listByCategory('business');
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    // Note: onDestroy would be called with ExecutionContext during flow cleanup
    // Not during registry clear

    this.plugins.clear();
    this.pluginsByCategory.clear();
    this.pluginsBySubCategory.clear();
    this.pluginsByNodeType.clear();
  }

  /**
   * Validate plugin structure
   */
  private validatePlugin(plugin: FlowPlugin): void {
    if (!plugin.id) {
      throw new Error('Plugin must have an id');
    }

    if (!plugin.name) {
      throw new Error(`Plugin ${plugin.id} must have a name`);
    }

    if (!plugin.version) {
      throw new Error(`Plugin ${plugin.id} must have a version`);
    }

    if (!plugin.category) {
      throw new Error(`Plugin ${plugin.id} must have a category`);
    }

    if (!plugin.subCategory) {
      throw new Error(`Plugin ${plugin.id} must have a subCategory`);
    }

    if (!plugin.nodeType) {
      throw new Error(`Plugin ${plugin.id} must have a nodeType`);
    }

    if (!plugin.configSchema) {
      throw new Error(`Plugin ${plugin.id} must have a configSchema`);
    }

    if (!plugin.execute) {
      throw new Error(`Plugin ${plugin.id} must have an execute function`);
    }

    if (!plugin.nodeUIPattern) {
      throw new Error(`Plugin ${plugin.id} must have a nodeUIPattern`);
    }
  }

  /**
   * Get plugin count
   */
  get count(): number {
    return this.plugins.size;
  }

  /**
   * Get categories with plugin counts
   */
  getCategorySummary(): Record<PluginCategory, number> {
    return {
      core: this.pluginsByCategory.get('core')?.size ?? 0,
      business: this.pluginsByCategory.get('business')?.size ?? 0,
    };
  }
}

/**
 * Global plugin registry instance
 */
export const pluginRegistry = new PluginRegistry();
