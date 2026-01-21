/**
 * Flow Builder Core Types
 * 
 * These types define the fundamental data structures for the flow builder system.
 * They represent the complete flow definition and all its components.
 * 
 * These types are designed to be compatible with React Flow's base Node and Edge types,
 * allowing seamless integration with the React Flow library.
 */

import type { z } from 'zod';
import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from 'reactflow';
import type { SubFlow as VisualSubFlow } from './subflow';

/**
 * Node type categories
 */
export type NodeType =
  | 'trigger'      // Entry point
  | 'action'       // Perform operation
  | 'condition'    // If/Switch
  | 'loop'         // For/While
  | 'subflow'      // Call sub-flow
  | 'parallel'     // Parallel split/join
  | 'transform'    // Transform data
  | 'code';        // Custom TypeScript code

/**
 * Variable types supported by the system
 */
export type VariableType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'file'
  | 'any';

/**
 * Variable scope
 */
export type VariableScope = 'global' | 'local';

/**
 * Flow variable definition
 */
export interface FlowVariable {
  id: string;
  name: string;
  type: VariableType;
  value?: unknown;
  scope: VariableScope;
  description?: string;
}

/**
 * Node data - runtime state and configuration
 */
export interface NodeData {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  errors?: Record<string, ErrorOutput>;  // Typed error outputs
  state?: 'idle' | 'running' | 'success' | 'error' | 'warning';
  error?: Error;
  errorHandling?: NodeErrorHandling;
}

/**
 * Error output definition for typed error handling
 */
export interface ErrorOutput {
  type: string;  // Error type identifier
  code?: string | number;  // Error code
  message: string;
  data?: unknown;  // Additional error data
  schema?: z.ZodType;  // Validation schema for error data
  recoverable: boolean;  // Can this error be recovered from?
}

/**
 * Node error handling configuration
 */
export interface NodeErrorHandling {
  strategy: 'throw' | 'catch' | 'retry' | 'ignore';
  retryConfig?: {
    maxAttempts: number;
    backoffStrategy: 'fixed' | 'exponential' | 'linear';
    initialDelay: number;  // milliseconds
    maxDelay?: number;
  };
  timeout?: number;  // milliseconds
  onTimeout?: 'fail' | 'continue-partial' | 'default-value';
}

/**
 * Flow node definition - extends React Flow's base Node type
 * React Flow properties (id, position, type, data) are included
 */
export interface FlowNode extends Omit<ReactFlowNode, 'data' | 'type'> {
  id: string;
  type: NodeType;
  pluginId: string;
  label: string;
  description?: string;
  position: { x: number; y: number };
  data: NodeData;
  config: NodeConfig;
}

/**
 * Node configuration (plugin-specific)
 */
export type NodeConfig = Record<string, unknown>;

/**
 * Edge type for different connection purposes
 */
export type EdgeType = 'default' | 'conditional' | 'loop' | 'parallel' | 'error';

/**
 * Flow edge definition - extends React Flow's base Edge type
 * React Flow properties (id, source, target, type, label) are included
 */
export interface FlowEdge extends Omit<ReactFlowEdge, 'type'> {
  id: string;
  source: string;      // Source node ID
  target: string;      // Target node ID
  sourceHandle?: string;
  targetHandle?: string;
  type?: EdgeType;
  label?: string;
  condition?: EdgeCondition;
  parallelBranch?: string;  // Branch ID for parallel execution
  errorFilter?: ErrorFilter;  // Filter specific error types
}

/**
 * Edge condition for conditional execution
 */
export interface EdgeCondition {
  expression: string;  // e.g., "{{ output.status === 'success' }}"
  variables?: string[];
}

/**
 * Error filter for error-type edges
 */
export interface ErrorFilter {
  errorTypes?: string[];  // Match specific error types
  errorCodes?: (string | number)[];  // Match specific error codes
  matchUnknown?: boolean;  // Match unknown/unhandled errors
  severity?: 'critical' | 'error' | 'warning';  // Filter by severity
}

/**
 * Sub-flow parameter definition
 */
export interface SubFlowParameter {
  name: string;
  type: VariableType;
  required: boolean;
  defaultValue?: unknown;
  description?: string;
}

/**
 * @deprecated Use VisualSubFlow from subflow.ts instead
 * Legacy sub-flow definition (reusable flow component)
 */
export interface LegacySubFlow {
  id: string;
  name: string;
  description?: string;
  inputs: SubFlowParameter[];
  outputs: SubFlowParameter[];
  flow: Flow;
}

/**
 * Flow metadata
 */
export interface FlowMetadata {
  createdAt: Date;
  updatedAt: Date;
  author?: string;
  tags?: string[];
  category?: string;
}

/**
 * Complete flow definition
 * 
 * The subFlows property uses VisualSubFlow (from subflow.ts) which supports:
 * - Visual positioning on canvas
 * - Expandable/collapsible view state
 * - Internal nodes and edges
 */
export interface Flow {
  id: string;
  name: string;
  description?: string;
  version: string;  // User-facing semantic version (e.g., "1.0.0", "2.1.3")
  nodes: FlowNode[];
  edges: FlowEdge[];
  variables: FlowVariable[];
  subFlows?: VisualSubFlow[];  // Optional for backward compatibility
  metadata: FlowMetadata;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validation error
 */
export interface ValidationError {
  path: string;
  message: string;
  code?: string;
}
