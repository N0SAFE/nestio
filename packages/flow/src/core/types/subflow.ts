/**
 * SubFlow Core Types
 * 
 * The fundamental architecture where EVERYTHING is a SubFlow.
 * SubFlows are the primary building blocks that can contain nodes, edges,
 * and have their own input/output ports.
 * 
 * Two types of SubFlows:
 * - Trigger SubFlows: Entry points with trigger input ports (manual, webhook, schedule, event)
 * - Callable SubFlows: Reusable function-like blocks with defined I/O
 *
 * IMPORTANT: Triggers are NOT nodes - they are SubFlows with special trigger input ports!
 */

import type { z } from 'zod';

// ============================================================================
// Port Definitions
// ============================================================================

/**
 * Port types for SubFlow inputs/outputs
 */
export type PortType = 
  | 'trigger'    // Execution trigger (start flow)
  | 'flow'       // Flow control (continue execution)
  | 'data'       // Data passing
  | 'error';     // Error channel

/**
 * Data types for typed ports
 */
export type PortDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'file'
  | 'date'
  | 'any';

/**
 * Port definition for SubFlow inputs/outputs
 * These appear as handles on the SubFlow node
 */
export interface SubFlowPort {
  id: string;
  name: string;
  type: PortType;
  dataType?: PortDataType;
  schema?: z.ZodType;          // Validation schema
  required?: boolean;
  defaultValue?: unknown;
  description?: string;
  position?: number;           // Order in the port list (0 = top)
}

/**
 * Trigger types for SubFlow entry points
 */
export type TriggerType = 'manual' | 'webhook' | 'schedule' | 'event';

/**
 * Trigger configuration for trigger input ports
 */
export interface TriggerConfig {
  type: TriggerType;
  /** Manual trigger: no additional config */
  /** Webhook trigger: endpoint path, auth, etc. */
  /** Schedule trigger: cron expression, timezone, etc. */
  /** Event trigger: event name, filters, etc. */
  config?: Record<string, unknown>;
}

/**
 * Input port with additional trigger configuration
 */
export interface SubFlowInputPort extends SubFlowPort {
  /** For trigger ports - what triggers this input */
  triggerConfig?: TriggerConfig;
}

/**
 * Output port with completion semantics
 */
export interface SubFlowOutputPort extends SubFlowPort {
  /** Whether this output represents completion */
  isCompletion?: boolean;
  /** Whether this output represents an error state */
  isError?: boolean;
}

// ============================================================================
// Internal Node Types (nodes inside a SubFlow)
// ============================================================================

/**
 * Node types that can exist inside a SubFlow
 * 
 * NOTE: 'trigger' is NOT a node type - triggers are SubFlows with trigger input ports!
 */
export type InternalNodeType =
  | 'input-port'     // Represents a SubFlow input port inside the canvas
  | 'output-port'    // Represents a SubFlow output port inside the canvas
  | 'action'         // Perform an operation
  | 'condition'      // If/Switch branching
  | 'loop'           // For/While loops
  | 'transform'      // Data transformation
  | 'code'           // Custom code execution
  | 'subflow-call'   // Call another SubFlow
  | 'parallel'       // Parallel split/join
  | 'delay'          // Wait/delay execution
  | 'error-handler'; // Catch and handle errors

/**
 * Node data for internal nodes
 */
export interface InternalNodeData {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  state?: 'idle' | 'running' | 'success' | 'error' | 'warning';
  error?: Error;
}

/**
 * Internal node definition (nodes inside a SubFlow)
 */
export interface InternalNode {
  id: string;
  type: InternalNodeType;
  pluginId: string;
  label: string;
  description?: string;
  position: { x: number; y: number };
  data: InternalNodeData;
  config: Record<string, unknown>;
  
  /** For input-port/output-port types - links to the SubFlow port */
  linkedPortId?: string;
}

/**
 * Edge between internal nodes
 */
export interface InternalEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  condition?: {
    expression: string;
    variables?: string[];
  };
}

// ============================================================================
// SubFlow Definition
// ============================================================================

/**
 * SubFlow type
 * - 'trigger': Entry point with trigger input port (manual, webhook, schedule, event)
 * - 'callable': Reusable function, called by other SubFlows
 */
export type SubFlowType = 'trigger' | 'callable';

/**
 * SubFlow visual state
 */
export type SubFlowViewState = 'collapsed' | 'expanded' | 'maximized';

/**
 * SubFlow - The fundamental building block
 * 
 * A SubFlow is a self-contained unit that:
 * - Has defined input/output ports
 * - Contains internal nodes and edges
 * - Can be called from other SubFlows (callable)
 * - Can be triggered from external sources (trigger with trigger input port)
 * - Can be visually expanded/collapsed
 */
export interface SubFlow {
  id: string;
  name: string;
  type: SubFlowType;
  description?: string;
  
  // ─────────────────────────────────────────────────────────────────────────
  // Ports (external interface)
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Input ports - data/triggers coming into this SubFlow */
  inputs: SubFlowInputPort[];
  
  /** Output ports - data/results going out of this SubFlow */
  outputs: SubFlowOutputPort[];
  
  // ─────────────────────────────────────────────────────────────────────────
  // Internal Structure (the canvas inside)
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Nodes inside this SubFlow */
  nodes: InternalNode[];
  
  /** Edges connecting internal nodes */
  edges: InternalEdge[];
  
  // ─────────────────────────────────────────────────────────────────────────
  // Visual Properties
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Position in parent canvas (when used as a node) */
  position: { x: number; y: number };
  
  /** Dimensions when displayed as a node */
  dimensions?: { width: number; height: number };
  
  /** Current view state */
  viewState?: SubFlowViewState;
  
  /** Color/theme for visual distinction */
  color?: string;
  
  /** Icon identifier */
  icon?: string;
  
  // ─────────────────────────────────────────────────────────────────────────
  // Metadata
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Tags for organization */
  tags?: string[];
  
  /** Category for grouping */
  category?: string;
  
  /** Version for callable SubFlows */
  version?: string;
  
  /** Author information */
  author?: string;
  
  /** Creation timestamp */
  createdAt?: Date;
  
  /** Last update timestamp */
  updatedAt?: Date;
}

// ============================================================================
// Flow Definition (Collection of SubFlows)
// ============================================================================

/**
 * Edge between SubFlows (connecting SubFlow outputs to inputs)
 */
export interface SubFlowEdge {
  id: string;
  sourceSubFlowId: string;
  sourcePortId: string;
  targetSubFlowId: string;
  targetPortId: string;
  label?: string;
}

/**
 * SubFlow-based flow variables (global across all SubFlows)
 */
export interface SubFlowBasedFlowVariable {
  id: string;
  name: string;
  type: PortDataType;
  value?: unknown;
  scope: 'global' | 'local';
  description?: string;
}

/**
 * Complete SubFlow-based Flow definition
 * 
 * A Flow is a collection of SubFlows with connections between them.
 * The root level shows SubFlows as nodes, and drilling down shows
 * the internal structure of each SubFlow.
 */
export interface SubFlowBasedFlow {
  id: string;
  name: string;
  description?: string;
  version: string;
  
  /** All SubFlows in this flow */
  subFlows: SubFlow[];
  
  /** Connections between SubFlows at the root level */
  edges: SubFlowEdge[];
  
  /** Global variables accessible by all SubFlows */
  variables: SubFlowBasedFlowVariable[];
  
  /** Flow metadata */
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    author?: string;
    tags?: string[];
    category?: string;
  };
}

// ============================================================================
// Execution Context
// ============================================================================

/**
 * SubFlow execution state
 */
export interface SubFlowExecutionState {
  subFlowId: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'cancelled';
  startTime?: number;
  endTime?: number;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  error?: Error;
  
  /** Execution state of internal nodes */
  nodeStates: Map<string, {
    status: 'pending' | 'running' | 'completed' | 'error' | 'skipped';
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
    error?: Error;
    startTime?: number;
    endTime?: number;
  }>;
}

/**
 * Flow execution context
 */
export interface FlowExecutionContext {
  flowId: string;
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'cancelled';
  startTime: number;
  endTime?: number;
  
  /** Global variables state */
  variables: Record<string, unknown>;
  
  /** Execution state of each SubFlow */
  subFlowStates: Map<string, SubFlowExecutionState>;
  
  /** Call stack for nested SubFlow calls */
  callStack: string[];
  
  /** Errors encountered */
  errors: {
    subFlowId: string;
    nodeId?: string;
    error: Error;
    timestamp: number;
  }[];
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * SubFlow reference for calling
 */
export interface SubFlowReference {
  subFlowId: string;
  inputMappings: Record<string, string | { expression: string }>;
  outputMappings: Record<string, string>;
}

/**
 * SubFlow validation result
 */
export interface SubFlowValidationResult {
  valid: boolean;
  errors: {
    path: string;
    message: string;
    severity: 'error' | 'warning';
  }[];
}

/**
 * SubFlow template for creating new SubFlows
 */
export interface SubFlowTemplate {
  name: string;
  type: SubFlowType;
  description?: string;
  inputs: SubFlowInputPort[];
  outputs: SubFlowOutputPort[];
  defaultNodes?: InternalNode[];
  defaultEdges?: InternalEdge[];
  category?: string;
  icon?: string;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new trigger SubFlow (entry point with trigger port)
 */
export function createTriggerSubFlow(
  name: string,
  triggerType: TriggerType,
  options?: Partial<SubFlow> & { triggerConfig?: Record<string, unknown> }
): SubFlow {
  const id = `subflow-${String(Date.now())}-${Math.random().toString(36).slice(2, 9)}`;
  const inputPortId = `port-trigger-${String(Date.now())}`;
  const outputPortId = `port-output-${String(Date.now())}`;
  
  return {
    id,
    name,
    type: 'trigger',
    description: options?.description ?? `Trigger: ${triggerType}`,
    inputs: options?.inputs ?? [{
      id: inputPortId,
      name: 'trigger',
      type: 'trigger',
      description: `${triggerType} trigger`,
      triggerConfig: {
        type: triggerType,
        config: options?.triggerConfig,
      },
    }],
    outputs: options?.outputs ?? [{
      id: outputPortId,
      name: 'complete',
      type: 'flow',
      description: 'Flow completed',
      isCompletion: true,
    }],
    nodes: options?.nodes ?? [
      // Trigger input port node
      {
        id: `node-input-${inputPortId}`,
        type: 'input-port',
        pluginId: 'system:input-port',
        label: `Trigger (${triggerType})`,
        position: { x: 100, y: 200 },
        data: { inputs: {}, outputs: {} },
        config: { triggerType },
        linkedPortId: inputPortId,
      },
      // Output port node
      {
        id: `node-output-${outputPortId}`,
        type: 'output-port',
        pluginId: 'system:output-port',
        label: 'End',
        position: { x: 500, y: 200 },
        data: { inputs: {}, outputs: {} },
        config: {},
        linkedPortId: outputPortId,
      },
    ],
    edges: options?.edges ?? [],
    position: options?.position ?? { x: 0, y: 0 },
    dimensions: options?.dimensions ?? { width: 300, height: 200 },
    viewState: 'collapsed',
    color: options?.color ?? 'purple',
    icon: options?.icon ?? 'zap',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...options,
  };
}

/**
 * Create a new callable SubFlow (reusable function)
 */
export function createCallableSubFlow(
  name: string,
  inputs: SubFlowInputPort[],
  outputs: SubFlowOutputPort[],
  options?: Partial<SubFlow>
): SubFlow {
  const id = `subflow-${String(Date.now())}-${Math.random().toString(36).slice(2, 9)}`;
  
  // Create input port nodes
  const inputNodes: InternalNode[] = inputs.map((port, index) => ({
    id: `node-input-${port.id}`,
    type: 'input-port' as const,
    pluginId: 'system:input-port',
    label: port.name,
    position: { x: 50, y: 100 + index * 80 },
    data: { inputs: {}, outputs: {} },
    config: { portType: port.type, dataType: port.dataType },
    linkedPortId: port.id,
  }));
  
  // Create output port nodes
  const outputNodes: InternalNode[] = outputs.map((port, index) => ({
    id: `node-output-${port.id}`,
    type: 'output-port' as const,
    pluginId: 'system:output-port',
    label: port.name,
    position: { x: 500, y: 100 + index * 80 },
    data: { inputs: {}, outputs: {} },
    config: { portType: port.type, dataType: port.dataType },
    linkedPortId: port.id,
  }));
  
  return {
    id,
    name,
    type: 'callable',
    description: options?.description,
    inputs,
    outputs,
    nodes: [...inputNodes, ...outputNodes, ...(options?.nodes ?? [])],
    edges: options?.edges ?? [],
    position: options?.position ?? { x: 0, y: 0 },
    dimensions: options?.dimensions ?? { width: 300, height: 150 },
    viewState: 'collapsed',
    color: options?.color ?? 'blue',
    icon: options?.icon ?? 'function',
    version: options?.version ?? '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...options,
  };
}

/**
 * Create a new empty SubFlow-based Flow
 */
export function createSubFlowBasedFlow(name: string, options?: Partial<SubFlowBasedFlow>): SubFlowBasedFlow {
  const manualTrigger = createTriggerSubFlow(`${name} Start`, 'manual');
  
  return {
    id: `flow-${String(Date.now())}-${Math.random().toString(36).slice(2, 9)}`,
    name,
    description: options?.description,
    version: options?.version ?? '1.0.0',
    subFlows: [manualTrigger, ...(options?.subFlows ?? [])],
    edges: options?.edges ?? [],
    variables: options?.variables ?? [],
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      author: options?.metadata?.author,
      tags: options?.metadata?.tags ?? [],
      category: options?.metadata?.category,
    },
    ...options,
  };
}
