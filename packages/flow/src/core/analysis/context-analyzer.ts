/**
 * Flow Context Analyzer
 * 
 * Analyzes the flow graph to determine what variables are available
 * at each node position, tracking outputs from upstream nodes.
 */

import type { Flow, FlowNode, FlowVariable } from '../types/flow';
import type { FlowPlugin } from '../types/plugin';
import type {
  VariableSchema,
  VariableDefinition,
  PluginOutputSchema,
} from '../types/variable-schema';
import { SchemaHelpers } from '../types/variable-schema';

/**
 * Node context info - variables available at a specific node
 */
export interface NodeContextInfo {
  /** Node ID */
  nodeId: string;
  /** Variables available at this node */
  availableVariables: VariableDefinition[];
  /** Variables produced by this node */
  producedVariables: VariableDefinition[];
  /** Upstream nodes */
  upstreamNodes: string[];
  /** Scope level */
  scopeLevel: number;
}

/**
 * Flow analysis result
 */
export interface FlowAnalysis {
  /** Context info for each node */
  nodeContexts: Map<string, NodeContextInfo>;
  /** Global variables defined at flow level */
  globalVariables: VariableDefinition[];
  /** All variables in the flow */
  allVariables: VariableDefinition[];
  /** Execution order (topologically sorted) */
  executionOrder: string[];
  /** Errors found during analysis */
  errors: AnalysisError[];
}

/**
 * Analysis error
 */
export interface AnalysisError {
  type: 'undefined-variable' | 'type-mismatch' | 'circular-dependency' | 'unreachable-node';
  message: string;
  nodeId?: string;
  variableName?: string;
}

/**
 * Plugin registry interface for analyzer
 */
export interface PluginLookup {
  get(pluginId: string): FlowPlugin | undefined;
}

/**
 * Flow Context Analyzer
 */
export class FlowContextAnalyzer {
  private pluginLookup: PluginLookup;
  private nodeOutputSchemas: Map<string, PluginOutputSchema>;

  constructor(pluginLookup: PluginLookup) {
    this.pluginLookup = pluginLookup;
    this.nodeOutputSchemas = new Map();
  }

  /**
   * Register output schema for a plugin
   */
  registerPluginOutputSchema(pluginId: string, schema: PluginOutputSchema): void {
    this.nodeOutputSchemas.set(pluginId, schema);
  }

  /**
   * Analyze a flow and return context information
   */
  analyze(flow: Flow): FlowAnalysis {
    const errors: AnalysisError[] = [];
    const nodeContexts = new Map<string, NodeContextInfo>();
    const globalVariables: VariableDefinition[] = [];
    const allVariables: VariableDefinition[] = [];

    // Build adjacency list for graph traversal
    const adjacencyList = this.buildAdjacencyList(flow);
    const reverseAdjacencyList = this.buildReverseAdjacencyList(flow);

    // Topological sort for execution order
    const executionOrder = this.topologicalSort(flow, adjacencyList, errors);

    // Extract global variables from flow definition
    for (const variable of flow.variables) {
      const def = this.flowVariableToDefinition(variable);
      globalVariables.push(def);
      allVariables.push(def);
    }

    // Analyze each node in execution order
    for (const nodeId of executionOrder) {
      const node = flow.nodes.find(n => n.id === nodeId);
      if (!node) continue;

      const contextInfo = this.analyzeNode(
        node,
        flow,
        reverseAdjacencyList,
        nodeContexts,
        globalVariables,
        errors
      );

      nodeContexts.set(nodeId, contextInfo);

      // Add produced variables to all variables
      for (const produced of contextInfo.producedVariables) {
        allVariables.push(produced);
      }
    }

    return {
      nodeContexts,
      globalVariables,
      allVariables,
      executionOrder,
      errors,
    };
  }

  /**
   * Get available variables at a specific node
   */
  getAvailableVariablesAtNode(
    nodeId: string,
    flow: Flow,
    analysis?: FlowAnalysis
  ): VariableDefinition[] {
    const flowAnalysis = analysis ?? this.analyze(flow);
    const contextInfo = flowAnalysis.nodeContexts.get(nodeId);

    if (!contextInfo) {
      return [...flowAnalysis.globalVariables];
    }

    return contextInfo.availableVariables;
  }

  /**
   * Analyze a single node
   */
  private analyzeNode(
    node: FlowNode,
    flow: Flow,
    reverseAdjacencyList: Map<string, string[]>,
    nodeContexts: Map<string, NodeContextInfo>,
    globalVariables: VariableDefinition[],
    errors: AnalysisError[]
  ): NodeContextInfo {
    const upstreamNodes = this.getUpstreamNodes(node.id, reverseAdjacencyList);
    const availableVariables: VariableDefinition[] = [...globalVariables];

    // Collect variables from all upstream nodes
    for (const upstreamId of upstreamNodes) {
      const upstreamContext = nodeContexts.get(upstreamId);
      if (upstreamContext) {
        // Add variables produced by upstream node
        for (const produced of upstreamContext.producedVariables) {
          // Check for conflicts
          const existing = availableVariables.find(v => v.name === produced.name);
          if (existing) {
            // Later variable shadows earlier one - this is okay
            const index = availableVariables.indexOf(existing);
            availableVariables[index] = produced;
          } else {
            availableVariables.push(produced);
          }
        }

        // Also include variables available at upstream (for transitive access)
        for (const available of upstreamContext.availableVariables) {
          if (!availableVariables.some(v => v.name === available.name)) {
            availableVariables.push(available);
          }
        }
      }
    }

    // Get variables produced by this node
    const producedVariables = this.getNodeProducedVariables(node);

    // Validate variable references in node config
    this.validateVariableReferences(node, availableVariables, errors);

    return {
      nodeId: node.id,
      availableVariables,
      producedVariables,
      upstreamNodes,
      scopeLevel: 0, // TODO: Handle nested scopes
    };
  }

  /**
   * Get variables produced by a node
   */
  private getNodeProducedVariables(node: FlowNode): VariableDefinition[] {
    const produced: VariableDefinition[] = [];
    const plugin = this.pluginLookup.get(node.pluginId);

    if (!plugin) return produced;

    // Check if plugin has registered output schema
    const outputSchema = this.nodeOutputSchemas.get(plugin.id);
    if (outputSchema) {
      // Add main output as variable with node ID
        produced.push({
          name: `${node.id}_output`,
          schema: outputSchema.output,
          source: node.id,
          sourceLabel: node.label,
        });

      // Add named outputs
      if (outputSchema.namedOutputs) {
        for (const [name, schema] of Object.entries(outputSchema.namedOutputs)) {
            produced.push({
              name: `${node.id}_${name}`,
              schema,
              source: node.id,
              sourceLabel: node.label,
              path: name,
            });
        }
      }

      // Add explicitly set variables
      if (outputSchema.setsVariables) {
        for (const setVar of outputSchema.setsVariables) {
            produced.push({
              name: setVar.name,
              schema: { ...setVar.schema, description: setVar.description },
              source: node.id,
              sourceLabel: node.label,
            });
        }
      }
    } else {
      // Infer from plugin's outputSchema (Zod)
      if (plugin.outputSchema) {
          produced.push({
            name: `${node.id}_output`,
            schema: SchemaHelpers.any({ description: `Output from ${plugin.name}` }),
            source: node.id,
            sourceLabel: node.label,
          });
      }
    }

    // Check node config for variable assignments
    const config = node.config as Record<string, unknown>;
    if (typeof config.outputVariable === 'string') {
      produced.push({
        name: config.outputVariable,
        schema: outputSchema?.output ?? SchemaHelpers.any(),
        source: node.id,
        sourceLabel: node.label,
      });
    }

    return produced;
  }

  /**
   * Validate variable references in node config
   */
  private validateVariableReferences(
    node: FlowNode,
    availableVariables: VariableDefinition[],
    errors: AnalysisError[]
  ): void {
    const config = node.config;

    // Recursively check all string values for variable references
    const checkValue = (value: unknown) => {
      if (typeof value === 'string' && value.includes('{{')) {
        const varRefs = this.extractVariableReferences(value);
        for (const varRef of varRefs) {
          const [varName] = varRef.split('.');
          if (!varName) continue;
          const available = availableVariables.find(v => v.name === varName);
            if (!available) {
            errors.push({
              type: 'undefined-variable',
                message: `Variable "${varName}" is not defined at node "${node.label}"`,
              nodeId: node.id,
              variableName: varName,
            });
          }
        }
      } else if (Array.isArray(value)) {
        for (const item of value) {
          checkValue(item);
        }
      } else if (typeof value === 'object' && value !== null) {
        for (const val of Object.values(value)) {
          checkValue(val);
        }
      }
    };

    checkValue(config);
  }

  /**
   * Extract variable references from a string
   */
  private extractVariableReferences(str: string): string[] {
    const refs: string[] = [];
    const matchPattern = /\{\{\s*([^}]+)\s*\}\}/g;
    let match = matchPattern.exec(str);
    while (match) {
      const expr = match[1]?.trim();
      if (expr) {
        const varMatch = /^([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*(?:\[\d+\])?)/.exec(expr);
        if (varMatch?.[1]) {
          refs.push(varMatch[1]);
        }
      }
      match = matchPattern.exec(str);
    }

    return refs;
  }

  /**
   * Convert FlowVariable to VariableDefinition
   */
  private flowVariableToDefinition(variable: FlowVariable): VariableDefinition {
    return {
      name: variable.name,
      schema: this.typeToSchema(variable.type, variable.value),
      source: 'global',
      sourceLabel: 'Global Variables',
    };
  }

  /**
   * Convert variable type to schema
   */
  private typeToSchema(type: string, value?: unknown): VariableSchema {
    switch (type) {
      case 'string':
        return SchemaHelpers.string();
      case 'number':
        return SchemaHelpers.number();
      case 'boolean':
        return SchemaHelpers.boolean();
      case 'array':
        return SchemaHelpers.array(SchemaHelpers.any());
      case 'object':
        // Try to infer object shape from value
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          const properties: Record<string, VariableSchema> = {};
          for (const [key, val] of Object.entries(value)) {
            properties[key] = this.inferSchemaFromValue(val);
          }
          return SchemaHelpers.object(properties);
        }
        return SchemaHelpers.object({});
      case 'file':
        return SchemaHelpers.file();
      default:
        return SchemaHelpers.any();
    }
  }

  /**
   * Infer schema from a runtime value
   */
  private inferSchemaFromValue(value: unknown): VariableSchema {
    if (value === null) return { type: 'null' };
    if (value === undefined) return SchemaHelpers.any({ optional: true });
    if (typeof value === 'string') return SchemaHelpers.string();
    if (typeof value === 'number') return SchemaHelpers.number();
    if (typeof value === 'boolean') return SchemaHelpers.boolean();
    if (Array.isArray(value)) {
      if (value.length > 0) {
        return SchemaHelpers.array(this.inferSchemaFromValue(value[0]));
      }
      return SchemaHelpers.array(SchemaHelpers.any());
    }
    if (typeof value === 'object') {
      const properties: Record<string, VariableSchema> = {};
      for (const [key, val] of Object.entries(value)) {
        properties[key] = this.inferSchemaFromValue(val);
      }
      return SchemaHelpers.object(properties);
    }
    return SchemaHelpers.any();
  }

  /**
   * Build adjacency list (node -> downstream nodes)
   */
  private buildAdjacencyList(flow: Flow): Map<string, string[]> {
    const adjacencyList = new Map<string, string[]>();

    for (const node of flow.nodes) {
      adjacencyList.set(node.id, []);
    }

    for (const edge of flow.edges) {
      const downstream = adjacencyList.get(edge.source);
      if (downstream) {
        downstream.push(edge.target);
      }
    }

    return adjacencyList;
  }

  /**
   * Build reverse adjacency list (node -> upstream nodes)
   */
  private buildReverseAdjacencyList(flow: Flow): Map<string, string[]> {
    const reverseAdjacencyList = new Map<string, string[]>();

    for (const node of flow.nodes) {
      reverseAdjacencyList.set(node.id, []);
    }

    for (const edge of flow.edges) {
      const upstream = reverseAdjacencyList.get(edge.target);
      if (upstream) {
        upstream.push(edge.source);
      }
    }

    return reverseAdjacencyList;
  }

  /**
   * Get all upstream nodes (transitive)
   */
  private getUpstreamNodes(
    nodeId: string,
    reverseAdjacencyList: Map<string, string[]>
  ): string[] {
    const visited = new Set<string>();
    const queue = [...reverseAdjacencyList.get(nodeId) ?? []];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      if (visited.has(current)) continue;

      visited.add(current);
      const upstream = reverseAdjacencyList.get(current) ?? [];
      queue.push(...upstream);
    }

    return Array.from(visited);
  }

  /**
   * Topological sort of nodes
   */
  private topologicalSort(
    flow: Flow,
    adjacencyList: Map<string, string[]>,
    errors: AnalysisError[]
  ): string[] {
    const inDegree = new Map<string, number>();
    const sorted: string[] = [];

    // Initialize in-degree
    for (const node of flow.nodes) {
      inDegree.set(node.id, 0);
    }

    // Calculate in-degree
    for (const edge of flow.edges) {
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }

    // Start with nodes that have no incoming edges
    const queue = flow.nodes
      .filter(n => (inDegree.get(n.id) ?? 0) === 0)
      .map(n => n.id);

    while (queue.length > 0) {
      const nodeId = queue.shift();
      if (!nodeId) continue;
      sorted.push(nodeId);

      const downstream = adjacencyList.get(nodeId) ?? [];
      for (const next of downstream) {
        const newDegree = (inDegree.get(next) ?? 0) - 1;
        inDegree.set(next, newDegree);

        if (newDegree === 0) {
          queue.push(next);
        }
      }
    }

    // Check for cycles
    if (sorted.length !== flow.nodes.length) {
      const unreached = flow.nodes
        .filter(n => !sorted.includes(n.id))
        .map(n => n.id);

      errors.push({
        type: 'circular-dependency',
        message: `Circular dependency detected involving nodes: ${unreached.join(', ')}`,
      });

      // Add remaining nodes anyway (they may still be useful)
      sorted.push(...unreached);
    }

    return sorted;
  }
}

/**
 * Create a flow context analyzer with the plugin registry
 */
export function createFlowContextAnalyzer(pluginLookup: PluginLookup): FlowContextAnalyzer {
  return new FlowContextAnalyzer(pluginLookup);
}
