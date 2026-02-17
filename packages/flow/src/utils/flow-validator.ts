/**
 * Flow Validation Utilities
 * 
 * Comprehensive validation for flow structure, configuration, and integrity.
 */

import type { Flow } from '../core/types/flow';
import { pluginRegistry } from '../core/plugins/registry';

export interface ValidationError {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
  path?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
}

/**
 * Validate a complete flow
 */
export function validateFlow(flow: Flow): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const info: ValidationError[] = [];

  // 1. Validate basic structure
  validateBasicStructure(flow, errors);

  // 2. Validate nodes
  validateNodes(flow, errors, warnings);

  // 3. Validate edges
  validateEdges(flow, errors, warnings);

  // 4. Validate graph connectivity
  validateConnectivity(flow, errors, warnings);

  // 5. Validate variables
  validateVariables(flow, errors, warnings);

  // 6. Validate execution flow
  validateExecutionFlow(flow, warnings, info);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info,
  };
}

/**
 * Validate basic flow structure
 */
function validateBasicStructure(flow: Flow, errors: ValidationError[]): void {
  if (!flow.id) {
    errors.push({
      severity: 'error',
      code: 'FLOW_NO_ID',
      message: 'Flow must have an ID',
    });
  }

  if (!flow.name) {
    errors.push({
      severity: 'error',
      code: 'FLOW_NO_NAME',
      message: 'Flow must have a name',
    });
  }

  if (!Array.isArray(flow.nodes)) {
    errors.push({
      severity: 'error',
      code: 'FLOW_INVALID_NODES',
      message: 'Flow must have a nodes array',
    });
  }

  if (!Array.isArray(flow.edges)) {
    errors.push({
      severity: 'error',
      code: 'FLOW_INVALID_EDGES',
      message: 'Flow must have an edges array',
    });
  }
}

/**
 * Validate all nodes
 */
function validateNodes(
  flow: Flow,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  const nodeIds = new Set<string>();

  flow.nodes.forEach((node, index) => {
    // Check for duplicate IDs
    if (nodeIds.has(node.id)) {
      errors.push({
        severity: 'error',
        code: 'NODE_DUPLICATE_ID',
        message: `Duplicate node ID: ${node.id}`,
        nodeId: node.id,
      });
    }
    nodeIds.add(node.id);

    // Validate node structure
    if (!node.type) {
      errors.push({
        severity: 'error',
        code: 'NODE_NO_TYPE',
        message: `Node at index ${index} has no type`,
        nodeId: node.id,
      });
    }

    if (!node.pluginId) {
      errors.push({
        severity: 'error',
        code: 'NODE_NO_PLUGIN',
        message: `Node ${node.id} has no plugin ID`,
        nodeId: node.id,
      });
    }

    // Validate plugin exists
    const plugin = pluginRegistry.get(node.pluginId);
    if (!plugin) {
      errors.push({
        severity: 'error',
        code: 'NODE_PLUGIN_NOT_FOUND',
        message: `Plugin ${node.pluginId} not found for node ${node.id}`,
        nodeId: node.id,
      });
    } else if (plugin.validate) {
      // Validate node configuration against plugin schema
      const configValidation = plugin.validate(node.config);
      if (!configValidation.valid) {
        configValidation.errors.forEach(err => {
          errors.push({
            severity: 'error',
            code: 'NODE_INVALID_CONFIG',
            message: `Node ${node.id}: ${err.message}`,
            nodeId: node.id,
            path: err.path,
          });
        });
      }
    }

    // Validate position
    if (typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
      warnings.push({
        severity: 'warning',
        code: 'NODE_INVALID_POSITION',
        message: `Node ${node.id} has invalid position`,
        nodeId: node.id,
      });
    }
  });
}

/**
 * Validate all edges
 */
function validateEdges(
  flow: Flow,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  const nodeIds = new Set(flow.nodes.map(n => n.id));
  const edgeIds = new Set<string>();

  flow.edges.forEach(edge => {
    // Check for duplicate IDs
    if (edgeIds.has(edge.id)) {
      errors.push({
        severity: 'error',
        code: 'EDGE_DUPLICATE_ID',
        message: `Duplicate edge ID: ${edge.id}`,
        edgeId: edge.id,
      });
    }
    edgeIds.add(edge.id);

    // Validate source node exists
    if (!nodeIds.has(edge.source)) {
      errors.push({
        severity: 'error',
        code: 'EDGE_INVALID_SOURCE',
        message: `Edge ${edge.id} references non-existent source node: ${edge.source}`,
        edgeId: edge.id,
      });
    }

    // Validate target node exists
    if (!nodeIds.has(edge.target)) {
      errors.push({
        severity: 'error',
        code: 'EDGE_INVALID_TARGET',
        message: `Edge ${edge.id} references non-existent target node: ${edge.target}`,
        edgeId: edge.id,
      });
    }

    // Validate no self-loops
    if (edge.source === edge.target) {
      warnings.push({
        severity: 'warning',
        code: 'EDGE_SELF_LOOP',
        message: `Edge ${edge.id} creates a self-loop on node ${edge.source}`,
        edgeId: edge.id,
      });
    }
  });
}

/**
 * Validate graph connectivity
 */
function validateConnectivity(
  flow: Flow,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  // Check for start nodes
  const startNodes = flow.nodes.filter(n => n.type === 'trigger');
  if (startNodes.length === 0) {
    errors.push({
      severity: 'error',
      code: 'FLOW_NO_START',
      message: 'Flow must have at least one trigger (start) node',
    });
  }

  // Check for orphaned nodes
  const connectedNodes = new Set<string>();
  flow.edges.forEach(edge => {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  });

  flow.nodes.forEach(node => {
    if (!connectedNodes.has(node.id) && node.type !== 'trigger') {
      warnings.push({
        severity: 'warning',
        code: 'NODE_ORPHANED',
        message: `Node ${node.id} is not connected to the flow`,
        nodeId: node.id,
      });
    }
  });

  // Check for unreachable nodes from start
  const reachableFromStart = findReachableNodes(flow, startNodes.map(n => n.id));
  flow.nodes.forEach(node => {
    if (!reachableFromStart.has(node.id) && node.type !== 'trigger') {
      warnings.push({
        severity: 'warning',
        code: 'NODE_UNREACHABLE',
        message: `Node ${node.id} is unreachable from start nodes`,
        nodeId: node.id,
      });
    }
  });
}

/**
 * Find all reachable nodes from starting points
 */
function findReachableNodes(flow: Flow, startNodeIds: string[]): Set<string> {
  const adjacency = new Map<string, string[]>();
  flow.edges.forEach(edge => {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    adjacency.get(edge.source)!.push(edge.target);
  });

  const reachable = new Set<string>();
  const queue = [...startNodeIds];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (reachable.has(nodeId)) continue;
    
    reachable.add(nodeId);
    const neighbors = adjacency.get(nodeId) || [];
    queue.push(...neighbors);
  }

  return reachable;
}

/**
 * Validate variables
 */
function validateVariables(
  flow: Flow,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  const variableNames = new Set<string>();

  flow.variables.forEach(variable => {
    // Check for duplicate names
    if (variableNames.has(variable.name)) {
      errors.push({
        severity: 'error',
        code: 'VARIABLE_DUPLICATE_NAME',
        message: `Duplicate variable name: ${variable.name}`,
      });
    }
    variableNames.add(variable.name);

    // Validate variable structure
    if (!variable.name) {
      errors.push({
        severity: 'error',
        code: 'VARIABLE_NO_NAME',
        message: 'Variable must have a name',
      });
    }

    if (!variable.type) {
      warnings.push({
        severity: 'warning',
        code: 'VARIABLE_NO_TYPE',
        message: `Variable ${variable.name} has no type specified`,
      });
    }
  });
}

/**
 * Validate execution flow patterns
 */
function validateExecutionFlow(
  flow: Flow,
  warnings: ValidationError[],
  info: ValidationError[]
): void {
  // Check for potential infinite loops
  const hasCycles = detectCycles(flow);
  if (hasCycles) {
    warnings.push({
      severity: 'warning',
      code: 'FLOW_HAS_CYCLES',
      message: 'Flow contains cycles which may cause infinite loops',
    });
  }

  // Check for end nodes
  const endNodes = flow.nodes.filter(n => n.pluginId === 'end-flow');
  if (endNodes.length === 0) {
    info.push({
      severity: 'info',
      code: 'FLOW_NO_END',
      message: 'Flow has no explicit end nodes',
    });
  }

  // Check for parallel branches without join
  const splitNodes = flow.nodes.filter(n => n.pluginId === 'split');
  const joinNodes = flow.nodes.filter(n => n.pluginId === 'join');
  if (splitNodes.length > joinNodes.length) {
    warnings.push({
      severity: 'warning',
      code: 'FLOW_UNJOINED_SPLITS',
      message: 'Some parallel splits may not have corresponding join nodes',
    });
  }
}

/**
 * Detect cycles in the flow graph
 */
function detectCycles(flow: Flow): boolean {
  const adjacency = new Map<string, string[]>();
  
  flow.edges.forEach(edge => {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    adjacency.get(edge.source)!.push(edge.target);
  });

  const visited = new Set<string>();
  const inStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId);
    inStack.add(nodeId);

    const neighbors = adjacency.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) {
          return true;
        }
      } else if (inStack.has(neighbor)) {
        return true;
      }
    }

    inStack.delete(nodeId);
    return false;
  }

  for (const node of flow.nodes) {
    if (!visited.has(node.id)) {
      if (hasCycle(node.id)) {
        return true;
      }
    }
  }

  return false;
}
