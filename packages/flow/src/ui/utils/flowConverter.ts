/**
 * Flow Converter Utilities
 * 
 * Convert between Flow types and React Flow types.
 * 
 * React Flow's parent/child relationship:
 * - Parent nodes (SubFlows) act as group containers
 * - Child nodes have `parentId` set to parent's ID
 * - Child positions are relative to parent's top-left (after header)
 * - Children move with parent automatically
 */

import type { Node as RFNode, Edge as RFEdge } from '@xyflow/react';
import type { Flow, FlowNode, FlowEdge } from '../../core/types/flow';
import type { SubFlow, InternalNode, InternalNodeData } from '../../core/types/subflow';
import type { ExecutionState, FlowNodeData } from '../types';
import type { SubFlowNodeData } from '../components/nodes/SubFlowNode';
import type { InternalNodeComponentData } from '../components/nodes/InternalNode';

/** Header height offset for child positioning inside SubFlow */
const SUBFLOW_HEADER_HEIGHT = 48;

/** Scale factor for child nodes inside SubFlows (make them smaller) */
const CHILD_NODE_SCALE = 0.6;

/**
 * Convert Flow to React Flow format.
 * 
 * SubFlows become parent nodes, and their internal nodes become
 * child nodes with `parentId` and `extent: 'parent'`.
 */
export function flowToReactFlow(
  flow: Flow,
  executionState: ExecutionState
): { nodes: RFNode[]; edges: RFEdge[] } {
  // Ensure subFlows array exists (defensive programming)
  const subFlows = flow.subFlows ?? [];
  
  console.log('[flowToReactFlow] Converting flow:', {
    regularNodesCount: flow.nodes.length,
    subFlowsCount: subFlows.length,
    subFlowsArray: subFlows,
    flowHasSubFlowsProp: 'subFlows' in flow,
  });
  
  const allNodes: RFNode[] = [];
  
  // Convert regular top-level nodes
  for (const node of flow.nodes) {
    allNodes.push({
      id: node.id,
      type: 'flowNode',
      position: node.position,
      data: {
        node,
        executing: executionState.currentNodeId === node.id,
        completed: executionState.completedNodes.has(node.id),
        error: false,
      } satisfies FlowNodeData,
    });
  }

  console.log('[flowToReactFlow] After regular nodes, allNodes.length:', allNodes.length);

  // Convert SubFlows and their internal nodes
  for (const subFlow of subFlows) {
    console.log('[flowToReactFlow] Processing SubFlow:', subFlow.id, subFlow.name);
    // Add SubFlow as parent/group node
    const subFlowNode = {
      id: subFlow.id,
      type: 'subFlowNode',
      position: subFlow.position,
      data: {
        subFlow,
        isSelected: false,
        isExecuting: executionState.currentNodeId === subFlow.id,
        hasError: false,
      } satisfies SubFlowNodeData,
      style: {
        width: subFlow.dimensions?.width ?? 300,
        height: subFlow.viewState === 'collapsed' 
          ? SUBFLOW_HEADER_HEIGHT 
          : subFlow.dimensions?.height ?? 200,
      },
    };
    console.log('[flowToReactFlow] Created SubFlow node:', subFlowNode);
    allNodes.push(subFlowNode);
    
    // Add internal nodes as children (only if not collapsed)
    if (subFlow.viewState !== 'collapsed') {
      console.log('[flowToReactFlow] SubFlow not collapsed, adding', subFlow.nodes.length, 'internal nodes');
      for (const internalNode of subFlow.nodes) {
        allNodes.push(internalNodeToReactFlowNode(internalNode, subFlow.id, executionState));
      }
    } else {
      console.log('[flowToReactFlow] SubFlow is collapsed, skipping internal nodes');
    }
  }

  console.log('[flowToReactFlow] Final allNodes.length:', allNodes.length);
  console.log('[flowToReactFlow] Returning nodes:', allNodes);

  // Convert edges
  const edges: RFEdge[] = flow.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: 'smoothstep',
    animated: executionState.status === 'running',
  }));

  return { nodes: allNodes, edges };
}

/**
 * Convert an InternalNode to a React Flow child node.
 * The node will have `parentId` and be positioned relative to the SubFlow.
 */
function internalNodeToReactFlowNode(
  internalNode: InternalNode,
  parentSubFlowId: string,
  executionState: ExecutionState
): RFNode {
  // Determine execution state for this node
  const isExecuting = executionState.currentNodeId === internalNode.id;
  const isCompleted = executionState.completedNodes.has(internalNode.id);
  
  // Update the data.state based on execution state
  const state: InternalNodeData['state'] = isExecuting 
    ? 'running' 
    : isCompleted 
      ? 'success' 
      : internalNode.data.state ?? 'idle';
  
  return {
    id: internalNode.id,
    type: 'internalNode', // Use the InternalNodeComponent
    position: {
      // Position relative to parent's top-left (after header offset)
      x: internalNode.position.x,
      y: internalNode.position.y + SUBFLOW_HEADER_HEIGHT,
    },
    parentId: parentSubFlowId,
    extent: 'parent', // Constrain to parent bounds
    data: {
      type: internalNode.type,
      pluginId: internalNode.pluginId,
      label: internalNode.label,
      description: internalNode.description,
      data: { ...internalNode.data, state },
      config: internalNode.config,
    } satisfies InternalNodeComponentData,
    // Make child nodes smaller via style
    style: {
      transform: `scale(${String(CHILD_NODE_SCALE)})`,
      transformOrigin: 'top left',
    },
  };
}

/**
 * Convert React Flow to Flow format
 */
export function reactFlowToFlow(
  nodes: RFNode[],
  edges: RFEdge[],
  baseFlow: Flow
): Flow {
  // Separate parent nodes from child nodes
  const parentNodes = nodes.filter(n => !n.parentId);
  const childNodes = nodes.filter(n => n.parentId);
  
  // Convert regular nodes (not SubFlows)
  const flowNodes: FlowNode[] = parentNodes
    .filter(node => node.type === 'flowNode')
    .map((node) => {
      const existingNode = baseFlow.nodes.find((n) => n.id === node.id);
      return {
        ...existingNode,
        id: node.id,
        position: node.position,
      } as FlowNode;
    });

  // Update SubFlows with their child nodes
  const subFlows: SubFlow[] = parentNodes
    .filter(node => node.type === 'subFlowNode')
    .map((node) => {
      const existingSubFlow = baseFlow.subFlows.find(sf => sf.id === node.id);
      const subFlowChildren = childNodes.filter(c => c.parentId === node.id);
      
      return {
        ...existingSubFlow,
        id: node.id,
        position: node.position,
        nodes: subFlowChildren.map(child => reactFlowNodeToInternalNode(child)),
      } as SubFlow;
    });

  const flowEdges: FlowEdge[] = edges.map((edge) => {
    const existingEdge = baseFlow.edges.find((e) => e.id === edge.id);
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? undefined,
      targetHandle: edge.targetHandle ?? undefined,
      condition: existingEdge?.condition,
    };
  });

  return {
    ...baseFlow,
    nodes: flowNodes,
    edges: flowEdges,
    subFlows,
  };
}

/**
 * Convert a React Flow child node back to an InternalNode
 */
function reactFlowNodeToInternalNode(node: RFNode): InternalNode {
  const nodeData = node.data as InternalNodeComponentData;
  return {
    id: node.id,
    type: nodeData.type,
    pluginId: nodeData.pluginId,
    label: nodeData.label,
    description: nodeData.description,
    position: {
      x: node.position.x,
      y: node.position.y - SUBFLOW_HEADER_HEIGHT, // Remove header offset
    },
    data: nodeData.data,
    config: nodeData.config,
  };
}
