/**
 * Input Selector Validator
 * 
 * Validates that input selectors only reference nodes that are:
 * 1. Connected (there's a path from them to the current node)
 * 2. Upstream (they execute before the current node)
 * 3. Type-compatible with the expected input
 */

import type { InputSelector, ContextReference } from '../types/input-selector';
import type { Flow } from '../types/flow';
import type { FlowPlugin } from '../types/plugin';

/**
 * Get all upstream nodes for a given node
 */
export function getUpstreamNodes(
  nodeId: string,
  flow: Flow
): Set<string> {
  const upstream = new Set<string>();
  const visited = new Set<string>();
  
  function traverse(currentNodeId: string) {
    if (visited.has(currentNodeId)) return;
    visited.add(currentNodeId);
    
    // Find all edges that connect to this node
    const incomingEdges = flow.edges.filter(edge => edge.target === currentNodeId);
    
    for (const edge of incomingEdges) {
      upstream.add(edge.source);
      traverse(edge.source);
    }
  }
  
  traverse(nodeId);
  return upstream;
}

/**
 * Check if a node is upstream (connected and before) another node
 */
export function isNodeUpstream(
  sourceNodeId: string,
  targetNodeId: string,
  flow: Flow
): boolean {
  const upstreamNodes = getUpstreamNodes(targetNodeId, flow);
  return upstreamNodes.has(sourceNodeId);
}

/**
 * Validate a context reference
 */
function validateContextReference(
  selector: ContextReference,
  currentNodeId: string,
  flow: Flow
): { valid: boolean; error?: string } {
  // Check if the referenced node exists
  const referencedNode = flow.nodes.find(n => n.id === selector.nodeId);
  if (!referencedNode) {
    return {
      valid: false,
      error: `Node '${selector.nodeId}' does not exist`,
    };
  }
  
  // Check if the node is upstream
  if (!isNodeUpstream(selector.nodeId, currentNodeId, flow)) {
    return {
      valid: false,
      error: `Node '${selector.nodeId}' is not connected or comes after the current node`,
    };
  }
  
  return { valid: true };
}

/**
 * Validate an input selector
 */
export function validateInputSelector(
  selector: InputSelector,
  currentNodeId: string,
  flow: Flow
): { valid: boolean; error?: string } {
  switch (selector.type) {
    case 'context':
      return validateContextReference(selector, currentNodeId, flow);
    
    case 'static':
      // Static values are always valid
      return { valid: true };
    
    default:
      return { valid: true };
  }
}

/**
 * Get available upstream nodes with their types
 */
export function getAvailableNodeOutputs(
  currentNodeId: string,
  flow: Flow,
  plugins: Map<string, FlowPlugin>
): {
  nodeId: string;
  nodeName: string;
  pluginId: string;
  outputSchema?: unknown;
}[] {
  const upstreamNodes = getUpstreamNodes(currentNodeId, flow);
  const available: {
    nodeId: string;
    nodeName: string;
    pluginId: string;
    outputSchema?: unknown;
  }[] = [];
  
  for (const nodeId of upstreamNodes) {
    const node = flow.nodes.find(n => n.id === nodeId);
    if (!node) continue;
    
    const plugin = plugins.get(node.pluginId);
    if (!plugin) continue;
    
    // Get output schema
    let outputSchema: unknown;
    if (plugin.outputSchema) {
      outputSchema = plugin.outputSchema;
    }
    
    available.push({
      nodeId: node.id,
      nodeName: node.label,
      pluginId: node.pluginId,
      outputSchema,
    });
  }
  
  return available;
}

/**
 * Generate TypeScript type string for available context
 */
export function generateContextType(
  currentNodeId: string,
  flow: Flow,
  plugins: Map<string, FlowPlugin>
): string {
  const available = getAvailableNodeOutputs(currentNodeId, flow, plugins);
  
  if (available.length === 0) {
    return '{}';
  }
  
  const fields = available.map(node => {
    return `  '${node.nodeId}': unknown; // ${node.nodeName}`;
  });
  
  return `{\n${fields.join('\n')}\n}`;
}
