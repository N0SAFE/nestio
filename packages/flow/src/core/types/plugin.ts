/**
 * Plugin System Types
 * 
 * Defines the plugin interface and related types for extending
 * the flow builder with custom node types and functionality.
 */

import type { z } from 'zod';
import type { NodeType, NodeConfig, ValidationResult } from './flow';
import type { ExecutionContext } from './context';
import type { DynamicConfigSchema } from '../../ui/components/config/schema';
import type { PluginOutputSchema, VariableSchema } from './variable-schema';

/**
 * Plugin category
 */
export type PluginCategory = 'core' | 'business';

/**
 * Plugin sub-category for organization
 */
export type PluginSubCategory =
  | 'action'
  | 'trigger'
  | 'condition'
  | 'loop'
  | 'variable'
  | 'subflow'
  | 'transform'
  | 'storage';

/**
 * Node UI pattern
 */
export type NodeUIPattern =
  | 'info'      // Display-only node showing status/information
  | 'editable'  // Node with inline editing capabilities
  | 'clickable'; // Node that opens modal/sheet on click

/**
 * Node UI configuration
 */
export interface NodeUIConfig {
  pattern: NodeUIPattern;

  // For 'info' nodes
  displayFields?: string[];  // Which fields to display

  // For 'editable' nodes
  editableFields?: Array<{
    key: string;
    type: 'text' | 'number' | 'select';
    label: string;
    options?: Array<{ label: string; value: any }>;
  }>;

  // For 'clickable' nodes
  onClick?: {
    action: 'modal' | 'sheet' | 'panel' | 'custom';
    component?: React.ComponentType<any>;
  };
}

/**
 * Error output definition for plugins
 */
export interface ErrorOutputDefinition {
  type: string;  // Error class/type name
  code?: string | number;  // Standard error code
  description: string;  // Human-readable description
  dataSchema?: z.ZodType;  // Schema for error data
  recoverable: boolean;  // Can this be retried?
  severity: 'critical' | 'error' | 'warning';  // Error severity
  suggestedActions?: string[];  // Hints for handling
}

/**
 * Port definition for node inputs/outputs
 */
export interface PortDefinition {
  id: string;  // Unique port identifier (e.g., 'input-1', 'output-success')
  label: string;  // Display label
  type?: 'data' | 'flow' | 'error';  // Port type (default: 'flow')
  required?: boolean;  // Whether connection is required
  dataType?: string;  // Expected data type (for validation)
  description?: string;  // Port description
}

/**
 * Port configuration - can be static or dynamic
 */
export interface PortConfig {
  /** Static ports that are always present */
  static?: PortDefinition[];
  /** Dynamic ports generated from node config */
  dynamic?: (config: NodeConfig) => PortDefinition[];
}

/**
 * Plugin interface
 */
export interface FlowPlugin {
  // Identity
  id: string;
  name: string;
  version: string;
  category: PluginCategory;
  subCategory: PluginSubCategory;
  icon?: string;
  description?: string;
  
  /** Whether this plugin is deprecated */
  deprecated?: boolean;

  // Node definition
  nodeType: NodeType;

  // Configuration schema (Zod)
  configSchema: z.ZodType;
  
  // Configuration definition for UI (maps to configSchema)
  config?: Record<string, { description?: string; type?: string; [key: string]: any }>;

  // Input/Output schema
  inputSchema?: z.ZodType;
  outputSchema?: z.ZodType;
  
  /**
   * Typed variable output schema for autocomplete and analysis.
   * Defines what variables this node produces and their types.
   * Used by the flow analyzer to enable autocomplete suggestions.
   */
  variableOutputSchema?: PluginOutputSchema;

  // Error outputs
  errorOutputs?: Record<string, ErrorOutputDefinition>;

  // Input/Output ports
  inputs?: PortConfig;
  outputs?: PortConfig;

  // Execution handler
  execute: (context: ExecutionContext, config: NodeConfig) => Promise<any>;

  // Validation
  validate?: (config: NodeConfig) => ValidationResult;

  // UI Configuration - use ONE of these:
  // 1. dynamicConfigSchema - declarative schema for auto-generated UI
  // 2. ConfigComponent - custom React component for full control
  dynamicConfigSchema?: DynamicConfigSchema;
  ConfigComponent?: React.ComponentType<NodeConfigProps>;
  
  // Custom node component (optional)
  NodeComponent?: React.ComponentType<CustomNodeProps>;

  // Node UI pattern
  nodeUIPattern: NodeUIPattern;

  // Node UI configuration
  nodeUIConfig?: NodeUIConfig;

  // Lifecycle hooks
  onInit?: (context: ExecutionContext) => Promise<void>;
  onDestroy?: (context: ExecutionContext) => Promise<void>;
}

/**
 * Node configuration component props
 */
export interface NodeConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

/**
 * Custom node component props
 */
export interface CustomNodeProps {
  id: string;
  data: {
    label: string;
    config: NodeConfig;
    state?: 'idle' | 'running' | 'success' | 'error' | 'warning';
    error?: Error;
    pluginName?: string;
    type?: NodeType;
  };
  selected: boolean;
  onClick?: () => void;
  onChange?: (config: NodeConfig) => void;
}

/**
 * Plugin registry configuration
 */
export interface PluginRegistryConfig {
  plugins: FlowPlugin[];
  allowDuplicateIds?: boolean;
}

/**
 * Plugin metadata for registry
 */
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  category: PluginCategory;
  subCategory: PluginSubCategory;
  nodeType: NodeType;
}
