/**
 * Flow Serialization Utilities
 * 
 * Import/export flows to/from JSON and validate structure.
 */

import type { Flow } from '../core/types/flow';
import { z } from 'zod';

/**
 * Serialize a flow to JSON string
 */
export function serializeFlow(flow: Flow, pretty = false): string {
  // Convert Dates to ISO strings for JSON serialization
  const serializable = {
    ...flow,
    metadata: {
      ...flow.metadata,
      createdAt: flow.metadata.createdAt.toISOString(),
      updatedAt: flow.metadata.updatedAt.toISOString(),
    },
  };
  return JSON.stringify(serializable, null, pretty ? 2 : 0);
}

/**
 * Deserialize a flow from JSON string
 */
export function deserializeFlow(json: string): Flow {
  try {
    const parsed = JSON.parse(json);
    return validateFlowStructure(parsed);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Validate flow structure matches schema
 */
export function validateFlowStructure(data: unknown): Flow {
  // Basic schema validation
  const flowSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    version: z.string(),
    nodes: z.array(z.any()),
    edges: z.array(z.any()),
    variables: z.array(z.any()),
    subFlows: z.array(z.any()).default([]),
    metadata: z.object({
      createdAt: z.string().or(z.date()),
      updatedAt: z.string().or(z.date()),
    }).passthrough(),
  });

  try {
    const parsed = flowSchema.parse(data);
    // Convert date strings to Date objects if needed
    const metadata = {
      ...parsed.metadata,
      createdAt: typeof parsed.metadata.createdAt === 'string' 
        ? new Date(parsed.metadata.createdAt) 
        : parsed.metadata.createdAt,
      updatedAt: typeof parsed.metadata.updatedAt === 'string' 
        ? new Date(parsed.metadata.updatedAt) 
        : parsed.metadata.updatedAt,
    };
    return { ...parsed, metadata } as Flow;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`);
      throw new Error(`Invalid flow structure:\n${messages.join('\n')}`);
    }
    throw error;
  }
}

/**
 * Export flow to file (browser)
 */
export function exportFlowToFile(flow: Flow, filename?: string): void {
  const json = serializeFlow(flow, true);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${flow.id}.flow.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import flow from file (browser)
 */
export function importFlowFromFile(): Promise<Flow> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.flow.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      try {
        const text = await file.text();
        const flow = deserializeFlow(text);
        resolve(flow);
      } catch (error) {
        reject(error);
      }
    };

    input.click();
  });
}

/**
 * Clone a flow with new ID
 */
export function cloneFlow(flow: Flow, newId?: string, newName?: string): Flow {
  // Deep clone using JSON serialization/deserialization
  const cloned = JSON.parse(JSON.stringify(flow));
  
  return {
    ...cloned,
    id: newId || `${flow.id}-copy`,
    name: newName || `${flow.name} (Copy)`,
    metadata: {
      ...cloned.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

/**
 * Merge multiple flows into one
 */
export function mergeFlows(flows: Flow[], id: string, name: string): Flow {
  const nodes = flows.flatMap(f => f.nodes);
  const edges = flows.flatMap(f => f.edges);
  const variables = flows.flatMap(f => f.variables);

  // Deduplicate variables by name
  const uniqueVariables = Array.from(
    new Map(variables.map(v => [v.name, v])).values()
  );

  return {
    id,
    name,
    version: '1.0.0',
    nodes,
    edges,
    variables: uniqueVariables,
    subFlows: [],
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

/**
 * Extract subflow from a flow
 */
export function extractSubflow(
  flow: Flow,
  nodeIds: string[],
  subflowId: string,
  subflowName: string
): Flow {
  const nodes = flow.nodes.filter(n => nodeIds.includes(n.id));
  const nodeIdSet = new Set(nodeIds);
  const edges = flow.edges.filter(
    e => nodeIdSet.has(e.source) && nodeIdSet.has(e.target)
  );

  // Extract referenced variables
  const referencedVars = new Set<string>();
  nodes.forEach(node => {
    const configStr = JSON.stringify(node.config);
    flow.variables.forEach(v => {
      if (configStr.includes(v.name)) {
        referencedVars.add(v.name);
      }
    });
  });

  const variables = flow.variables.filter(v => referencedVars.has(v.name));

  return {
    id: subflowId,
    name: subflowName,
    version: '1.0.0',
    nodes,
    edges,
    variables,
    subFlows: [],
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

/**
 * Calculate flow statistics
 */
export function getFlowStatistics(flow: Flow): {
  nodeCount: number;
  edgeCount: number;
  variableCount: number;
  nodesByType: Record<string, number>;
  pluginUsage: Record<string, number>;
  maxDepth: number;
  hasCycles: boolean;
} {
  const nodesByType: Record<string, number> = {};
  const pluginUsage: Record<string, number> = {};

  flow.nodes.forEach(node => {
    nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
    pluginUsage[node.pluginId] = (pluginUsage[node.pluginId] || 0) + 1;
  });

  // Calculate max depth (simplified - actual implementation would use graph traversal)
  const maxDepth = estimateMaxDepth(flow);
  const hasCycles = detectCycles(flow);

  return {
    nodeCount: flow.nodes.length,
    edgeCount: flow.edges.length,
    variableCount: flow.variables.length,
    nodesByType,
    pluginUsage,
    maxDepth,
    hasCycles,
  };
}

/**
 * Estimate maximum depth of flow graph
 */
function estimateMaxDepth(flow: Flow): number {
  const adjacency = new Map<string, string[]>();
  
  flow.edges.forEach(edge => {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    adjacency.get(edge.source)!.push(edge.target);
  });

  const startNodes = flow.nodes.filter(n => n.type === 'trigger');
  let maxDepth = 0;

  function dfs(nodeId: string, depth: number, visited: Set<string>): void {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    maxDepth = Math.max(maxDepth, depth);
    
    const neighbors = adjacency.get(nodeId) || [];
    neighbors.forEach(neighbor => {
      dfs(neighbor, depth + 1, new Set(visited));
    });
  }

  startNodes.forEach(node => {
    dfs(node.id, 0, new Set());
  });

  return maxDepth;
}

/**
 * Detect cycles in flow graph
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

    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) {
          return true;
        }
      } else if (inStack.has(neighbor)) {
        return true; // Back edge found - cycle detected
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
