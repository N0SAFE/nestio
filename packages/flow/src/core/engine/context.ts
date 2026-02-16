/**
 * Execution Context
 * 
 * Provides the runtime environment for flow execution.
 * Contains variables, state, events, and utilities.
 */

import type { ExecutionContext as IExecutionContext, ExecutionState, ExecutionPathItem, Logger, ErrorHandler } from '../types/context';
import type { VariableManager, ScopeStack } from '../runtime/variables';
import { EventEmitter } from '../events/emitter';

/**
 * Console Logger Implementation
 */
class ConsoleLogger implements Logger {
  debug(message: string, ...args: unknown[]): void {
    console.debug(message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    console.info(message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(message, ...args);
  }
}

/**
 * Default Error Handler Implementation
 */
class DefaultErrorHandler implements ErrorHandler {
  handle(error: Error, context: IExecutionContext): void {
    context.logger.error('Execution error:', error);
  }

  canRecover(): boolean {
    return false;
  }
}

/**
 * Execution Context Implementation
 */
export class ExecutionContext implements IExecutionContext {
  // Execution identifiers
  flowId: string;
  executionId: string;

  // Variable management
  variables: VariableManager;
  scopes: ScopeStack;

  // Node inputs/outputs
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;

  // Execution state
  state: ExecutionState;

  // Execution path tracking
  executionPath: ExecutionPathItem[];

  // Event system
  events: EventEmitter;

  // Utilities
  logger: Logger;
  errorHandler: ErrorHandler;

  // Internal state tracking
  currentAttempt: number;
  lastSnapshotId?: string;
  nodeStartTime: number;
  skipNodes?: Set<string>;
  stopAtNode?: string;

  constructor(
    flowId: string,
    executionId: string,
    variables: VariableManager,
    scopes: ScopeStack
  ) {
    this.flowId = flowId;
    this.executionId = executionId;
    this.variables = variables;
    this.scopes = scopes;
    this.inputs = {};
    this.outputs = {};
    this.executionPath = [];
    this.events = new EventEmitter();
    this.logger = new ConsoleLogger();
    this.errorHandler = new DefaultErrorHandler();
    this.currentAttempt = 1;
    this.nodeStartTime = Date.now();

    // Initialize state
    this.state = {
      status: 'idle',
      currentNode: undefined,
      startTime: undefined,
      endTime: undefined,
      error: undefined,
      nodeStartTime: Date.now(),
      resumedFrom: undefined,
      skipNodes: undefined,
      stopAtNode: undefined,
    };
  }

  /**
   * Reset context for new execution
   */
  reset(): void {
    this.inputs = {};
    this.outputs = {};
    this.executionPath = [];
    this.currentAttempt = 1;
    this.lastSnapshotId = undefined;
    this.skipNodes = undefined;
    this.stopAtNode = undefined;

    this.state = {
      status: 'idle',
      currentNode: undefined,
      startTime: undefined,
      endTime: undefined,
      error: undefined,
      nodeStartTime: Date.now(),
    };
  }

  /**
   * Add node to execution path
   */
  addToPath(nodeId: string, nodeName: string, status: 'success' | 'error'): void {
    this.executionPath.push({
      nodeId,
      nodeName,
      timestamp: new Date(),
      status,
    });
  }

  /**
   * Get execution duration in milliseconds
   */
  getDuration(): number | undefined {
    if (!this.state.startTime) return undefined;
    
    const endTime = this.state.endTime ?? new Date();
    return endTime.getTime() - this.state.startTime.getTime();
  }

  /**
   * Check if node should be skipped
   */
  shouldSkipNode(nodeId: string): boolean {
    return this.skipNodes?.has(nodeId) ?? false;
  }

  /**
   * Check if execution should stop at node
   */
  shouldStopAtNode(nodeId: string): boolean {
    return this.stopAtNode === nodeId;
  }

  /**
   * Clone context for sub-flow execution
   */
  clone(newExecutionId: string): ExecutionContext {
    const cloned = new ExecutionContext(
      this.flowId,
      newExecutionId,
      this.variables,
      this.scopes
    );

    // Copy state
    cloned.inputs = { ...this.inputs };
    cloned.outputs = { ...this.outputs };
    cloned.executionPath = [...this.executionPath];

    return cloned;
  }
}
