/**
 * Flow Builder Utilities
 * 
 * Helper functions for creating and manipulating flows programmatically.
 */

import type { Flow, FlowNode, FlowEdge, FlowVariable } from '../core/types/flow';

/**
 * Flow Builder - Fluent API for creating flows
 */
export class FlowBuilder {
  private flow: Partial<Flow>;
  private nodes: FlowNode[] = [];
  private edges: FlowEdge[] = [];
  private variables: FlowVariable[] = [];
  private nodeCounter = 0;
  private edgeCounter = 0;

  constructor(id: string, name: string) {
    this.flow = {
      id,
      name,
      version: '1.0.0',
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }

  /**
   * Set flow description
   */
  description(description: string): this {
    this.flow.description = description;
    return this;
  }

  /**
   * Set flow version
   */
  version(version: string): this {
    this.flow.version = version;
    return this;
  }

  /**
   * Add a node to the flow
   */
  addNode(node: Omit<FlowNode, 'id'> & { id?: string }): this {
    const nodeId = node.id || `node-${++this.nodeCounter}`;
    this.nodes.push({
      ...node,
      id: nodeId,
    } as FlowNode);
    return this;
  }

  /**
   * Add multiple nodes
   */
  addNodes(nodes: Array<Omit<FlowNode, 'id'> & { id?: string }>): this {
    nodes.forEach(node => this.addNode(node));
    return this;
  }

  /**
   * Connect two nodes with an edge
   */
  connect(
    source: string,
    target: string,
    options?: {
      sourceHandle?: string;
      targetHandle?: string;
      condition?: { expression: string; type: 'simple' | 'complex' };
      label?: string;
    }
  ): this {
    const edgeId = `edge-${++this.edgeCounter}`;
    this.edges.push({
      id: edgeId,
      source,
      target,
      sourceHandle: options?.sourceHandle || 'output',
      targetHandle: options?.targetHandle || 'input',
      condition: options?.condition,
      label: options?.label,
    });
    return this;
  }

  /**
   * Add a flow variable
   */
  addVariable(variable: Omit<FlowVariable, 'id'> & { id?: string }): this {
    const varId = variable.id || `var-${this.variables.length + 1}`;
    this.variables.push({
      ...variable,
      id: varId,
    } as FlowVariable);
    return this;
  }

  /**
   * Add metadata to the flow
   */
  addMetadata(key: string, value: unknown): this {
    if (!this.flow.metadata) {
      this.flow.metadata = {
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    (this.flow.metadata as unknown as Record<string, unknown>)[key] = value;
    return this;
  }

  /**
   * Build and return the complete flow
   */
  build(): Flow {
    if (!this.flow.id || !this.flow.name) {
      throw new Error('Flow must have id and name');
    }

    return {
      id: this.flow.id,
      name: this.flow.name,
      description: this.flow.description,
      version: this.flow.version || '1.0.0',
      nodes: this.nodes,
      edges: this.edges,
      variables: this.variables,
      subFlows: [],
      metadata: this.flow.metadata || {
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }

  /**
   * Validate the flow structure
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for start node
    const hasStartNode = this.nodes.some(n => n.type === 'trigger');
    if (!hasStartNode) {
      errors.push('Flow must have at least one trigger node');
    }

    // Check for orphaned nodes
    const connectedNodes = new Set<string>();
    this.edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    this.nodes.forEach(node => {
      if (!connectedNodes.has(node.id) && node.type !== 'trigger') {
        errors.push(`Node ${node.id} is not connected to the flow`);
      }
    });

    // Check for invalid edge references
    const nodeIds = new Set(this.nodes.map(n => n.id));
    this.edges.forEach(edge => {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge ${edge.id} references non-existent source node: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge ${edge.id} references non-existent target node: ${edge.target}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get current node count
   */
  getNodeCount(): number {
    return this.nodes.length;
  }

  /**
   * Get current edge count
   */
  getEdgeCount(): number {
    return this.edges.length;
  }

  /**
   * Find node by ID
   */
  findNode(id: string): FlowNode | undefined {
    return this.nodes.find(n => n.id === id);
  }

  /**
   * Remove node by ID (and its edges)
   */
  removeNode(id: string): this {
    this.nodes = this.nodes.filter(n => n.id !== id);
    this.edges = this.edges.filter(e => e.source !== id && e.target !== id);
    return this;
  }

  /**
   * Remove edge by ID
   */
  removeEdge(id: string): this {
    this.edges = this.edges.filter(e => e.id !== id);
    return this;
  }

  /**
   * Clone the builder
   */
  clone(): FlowBuilder {
    const cloned = new FlowBuilder(this.flow.id!, this.flow.name!);
    cloned.flow = { ...this.flow };
    cloned.nodes = [...this.nodes];
    cloned.edges = [...this.edges];
    cloned.variables = [...this.variables];
    cloned.nodeCounter = this.nodeCounter;
    cloned.edgeCounter = this.edgeCounter;
    return cloned;
  }
}

/**
 * Create a new flow builder
 */
export function createFlow(id: string, name: string): FlowBuilder {
  return new FlowBuilder(id, name);
}

/**
 * Create a flow from existing flow object
 */
export function fromFlow(flow: Flow): FlowBuilder {
  const builder = new FlowBuilder(flow.id, flow.name);
  builder.description(flow.description || '');
  builder.version(flow.version);
  
  flow.nodes.forEach(node => builder.addNode(node));
  flow.edges.forEach(edge => builder.addNodes);
  flow.variables.forEach(variable => builder.addVariable(variable));

  return builder;
}

/**
 * Quick node creation helpers
 */
export const NodeFactory = {
  /**
   * Create a start trigger node
   */
  start(config: Record<string, unknown> = {}, position = { x: 0, y: 0 }): Omit<FlowNode, 'id'> {
    return {
      type: 'trigger',
      pluginId: 'start-trigger',
      position,
      config: { type: 'manual', ...config },
      label: 'Start',
      data: { inputs: {}, outputs: {} },
    };
  },

  /**
   * Create an end node
   */
  end(reason = 'completed', position = { x: 0, y: 0 }): Omit<FlowNode, 'id'> {
    return {
      type: 'action',
      pluginId: 'end-flow',
      position,
      config: { reason },
      label: 'End',
      data: { inputs: {}, outputs: {} },
    };
  },

  /**
   * Create an if-condition node
   */
  if(
    ifCondition: string,
    elseIfBranches: Array<{ condition: string; handle: string }> = [],
    position = { x: 0, y: 0 }
  ): Omit<FlowNode, 'id'> {
    return {
      type: 'condition',
      pluginId: 'if-condition',
      position,
      config: {
        ifCondition,
        ifHandle: 'if-true',
        elseIfBranches,
        elseHandle: 'else',
      },
      label: 'If Condition',
      data: { inputs: {}, outputs: {} },
    };
  },

  /**
   * Create a for-loop node
   */
  forLoop(
    start: number,
    end: number,
    indexVariable: string,
    step = 1,
    position = { x: 0, y: 0 }
  ): Omit<FlowNode, 'id'> {
    return {
      type: 'loop',
      pluginId: 'for-loop',
      position,
      config: {
        start,
        end,
        step,
        indexVariable,
        loopHandle: 'loop',
      },
      label: 'For Loop',
      data: { inputs: {}, outputs: {} },
    };
  },

  /**
   * Create a transform node
   */
  transform(
    rules: Array<{ operation: string; targetVariable?: string; value?: string }>,
    position = { x: 0, y: 0 }
  ): Omit<FlowNode, 'id'> {
    return {
      type: 'action',
      pluginId: 'transform',
      position,
      config: { rules },
      label: 'Transform',
      data: { inputs: {}, outputs: {} },
    };
  },

  /**
   * Create an HTTP request node
   */
  httpRequest(
    url: string,
    method: string = 'GET',
    config: Record<string, unknown> = {},
    position = { x: 0, y: 0 }
  ): Omit<FlowNode, 'id'> {
    return {
      type: 'action',
      pluginId: 'http-request',
      position,
      config: {
        url,
        method,
        ...config,
      },
      label: 'HTTP Request',
      data: { inputs: {}, outputs: {} },
    };
  },

  /**
   * Create a delay node
   */
  delay(
    duration: number,
    durationUnit: 'ms' | 's' | 'm' | 'h' = 'ms',
    position = { x: 0, y: 0 }
  ): Omit<FlowNode, 'id'> {
    return {
      type: 'action',
      pluginId: 'delay',
      position,
      config: {
        duration,
        durationUnit,
      },
      label: 'Delay',
      data: { inputs: {}, outputs: {} },
    };
  },
};
