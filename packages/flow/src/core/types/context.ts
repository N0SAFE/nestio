/**
 * Execution Context Types
 *
 * Defines the execution context and related types used during flow execution.
 */

import type { FlowVariable, VariableType } from './flow';
import type { PluginOutputSchema, VariableSchema } from './variable-schema';

/**
 * Execution state
 */
export interface ExecutionState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  currentNode?: string;
  startTime?: Date;
  endTime?: Date;
  error?: Error;
  output?: unknown;
  nodeStartTime: number;
  resumedFrom?: string;
  skipNodes?: Set<string>;
  stopAtNode?: string;
}

/**
 * Execution path item
 */
export interface ExecutionPathItem {
  nodeId: string;
  nodeName: string;
  timestamp: Date;
  status: 'success' | 'error';
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Event emitter interface
 */
export interface EventEmitter {
  emit(event: string, ...args: unknown[]): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
  once(event: string, handler: (...args: unknown[]) => void): void;
}

/**
 * Variable manager interface
 */
export interface VariableManager {
  set(name: string, value: unknown, type?: VariableType): void;
  get<T = unknown>(name: string): T | undefined;
  exists(name: string): boolean;
  delete(name: string): void;
  clear(): void;
  list(): FlowVariable[];
  resolve(name: string): FlowVariable | undefined;
}

/**
 * Scope definition
 */
export interface Scope {
  name: string;
  level: number;
  variables: Map<string, FlowVariable>;
}

/**
 * Scope stack interface
 */
export interface ScopeStack {
  push(name: string): void;
  pop(): void;
  current(): Scope;
  global(): Scope;
  resolve(name: string): FlowVariable | undefined;
  clear(): void;
}

/**
 * Error handler interface
 */
export interface ErrorHandler {
  handle(error: Error, context: ExecutionContext): void;
  canRecover(error: Error): boolean;
}

/**
 * Node execution context - captured after a node executes
 */
export interface NodeExecutionContext {
  /** Node ID */
  nodeId: string;
  /** Node label */
  nodeLabel: string;
  /** Plugin ID */
  pluginId: string;
  /** Timestamp when node started */
  startedAt: Date;
  /** Timestamp when node completed */
  completedAt?: Date;
  /** Execution status */
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  /** Input data received */
  inputs: Record<string, unknown>;
  /** Output data produced */
  outputs: Record<string, unknown>;
  /** Input schema (from upstream nodes) */
  inputSchema?: PluginOutputSchema;
  /** Output schema (from plugin definition) */
  outputSchema?: PluginOutputSchema;
  /** Error if failed */
  error?: Error;
  /** Duration in milliseconds */
  duration?: number;
}

/**
 * Trigger context - initial context from flow trigger
 */
export interface TriggerContext {
  /** Trigger type (e.g., 'manual', 'webhook', 'schedule') */
  type: string;
  /** Trigger timestamp */
  triggeredAt: Date;
  /** Trigger node ID */
  triggeredBy: string;
  /** Input data from trigger */
  data: Record<string, unknown>;
  /** Input data schema */
  dataSchema?: VariableSchema;
  /** Metadata (headers, query params, etc.) */
  metadata?: Record<string, unknown>;
}

/**
 * Execution context - passed to all plugins during execution
 */
export interface ExecutionContext {
  // Identity
  flowId: string;
  executionId: string;

  // Variable management (CORE runtime, not plugin)
  variables: VariableManager;
  scopes: ScopeStack;

  // Node inputs/outputs
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;

  // State
  state: ExecutionState;

  // Execution path (for debugging/history)
  executionPath: ExecutionPathItem[];

  // For snapshots
  lastSnapshotId?: string;
  currentAttempt?: number;

  // Events
  events: EventEmitter;

  // Utilities
  logger: Logger;
  errorHandler: ErrorHandler;

  // === NEW: Enhanced context tracking ===

  /** Context from the flow trigger */
  triggerContext?: TriggerContext;

  /** Context from the last executed node */
  lastNodeContext?: NodeExecutionContext;

  /** All node contexts by node ID */
  nodeContextsById: Map<string, NodeExecutionContext>;

  /**
   * Get context for a specific node
   */
  getNodeContext(nodeId: string): NodeExecutionContext | undefined;

  /**
   * Get all upstream node contexts (nodes that executed before current)
   */
  getUpstreamContexts(currentNodeId: string): NodeExecutionContext[];

  /**
   * Get merged output schema from all upstream nodes
   */
  getAvailableInputSchema(): PluginOutputSchema;
}

/**
 * Execution options
 */
export interface ExecutionOptions {
  // Initial variables
  variables?: Record<string, unknown>;

  // Initial inputs
  inputs?: Record<string, unknown>;

  // Execution mode
  mode?: 'normal' | 'debug' | 'resume';

  // Debug options
  debugOptions?: {
    breakpoints?: string[];  // Node IDs to pause at
    stepMode?: boolean;
    logLevel?: 'verbose' | 'normal' | 'minimal';
  };

  // For resume mode
  resumeOptions?: {
    snapshotId: string;
    stateModifications?: {
      variables?: Record<string, unknown>;
      inputs?: Record<string, unknown>;
    };
  };

  // Version selection (for reruns)
  versionId?: string;
}

/**
 * Execution result
 */
export interface ExecutionResult {
  executionId: string;
  status: 'completed' | 'failed';
  outputs?: Record<string, unknown>;
  error?: Error;
  duration: number;  // milliseconds
  executedNodes: number;
  failedNodes: number;
}
