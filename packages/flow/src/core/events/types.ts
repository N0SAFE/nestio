/**
 * Event System Types
 */

import type { FlowNode, FlowEdge } from '../types/flow';
import type { ExecutionContext } from '../types/context';

/**
 * Event handler function
 */
export type EventHandler = (data: unknown) => void;

/**
 * Flow execution events
 */
export interface FlowEvent {
  type: string;
  timestamp: Date;
  data?: unknown;
}

/**
 * Node execution events
 */
export interface NodeEvent extends FlowEvent {
  type: 'node:start' | 'node:success' | 'node:error' | 'node:skipped';
  node: FlowNode;
  context: ExecutionContext;
}

/**
 * Flow execution events
 */
export interface ExecutionEvent extends FlowEvent {
  type: 'execution:start' | 'execution:complete' | 'execution:failed' | 'execution:paused';
  executionId: string;
  flowId: string;
}

/**
 * Edge traversal events
 */
export interface EdgeEvent extends FlowEvent {
  type: 'edge:traversed';
  edge: FlowEdge;
  context: ExecutionContext;
}

/**
 * Variable events
 */
export interface VariableEvent extends FlowEvent {
  type: 'variable:set' | 'variable:get' | 'variable:delete';
  name: string;
  value?: unknown;
}

/**
 * Snapshot events
 */
export interface SnapshotEvent extends FlowEvent {
  type: 'snapshot:created';
  snapshotId: string;
  nodeId: string;
}
