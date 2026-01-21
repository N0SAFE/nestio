/**
 * SubFlowCanvas Component
 *
 * The internal canvas of a SubFlow, showing the nodes and edges inside.
 * Includes special port nodes that represent the SubFlow's inputs/outputs.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react';
import { cn } from '@repo/ui/lib/utils';
import type { SubFlow, InternalNode, InternalEdge } from '../../core/types/subflow';
import InternalNodeComponent from './nodes/InternalNode';
import PortNode from './nodes/PortNode';

// ============================================================================
// Types
// ============================================================================

export interface SubFlowCanvasProps {
  subFlow: SubFlow;
  onChange?: (updatedSubFlow: SubFlow) => void;
  onNodeSelect?: (nodeId: string | null) => void;
  readOnly?: boolean;
  theme?: 'light' | 'dark';
  className?: string;
}

// ============================================================================
// Convert Internal Types to React Flow Types
// ============================================================================

function internalNodeToRFNode(node: InternalNode): Node {
  return {
    id: node.id,
    type: node.type === 'input-port' || node.type === 'output-port' ? 'portNode' : 'internalNode',
    position: node.position,
    data: {
      ...node,
      label: node.label,
      description: node.description,
    },
  };
}

function internalEdgeToRFEdge(edge: InternalEdge): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    label: edge.label,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { strokeWidth: 2 },
    labelStyle: { fontSize: 11 },
  };
}

function rfNodeToInternalNode(node: Node): InternalNode {
  return {
    id: node.id,
    type: node.data.type,
    pluginId: node.data.pluginId,
    label: node.data.label,
    description: node.data.description,
    position: node.position,
    data: node.data.data ?? { inputs: {}, outputs: {} },
    config: node.data.config ?? {},
    linkedPortId: node.data.linkedPortId,
  };
}

function rfEdgeToInternalEdge(edge: Edge): InternalEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
    label: typeof edge.label === 'string' ? edge.label : undefined,
  };
}

// ============================================================================
// SubFlowCanvas Component
// ============================================================================

export const SubFlowCanvas = memo(function SubFlowCanvas({
  subFlow,
  onChange,
  onNodeSelect,
  readOnly = false,
  theme = 'dark',
  className,
}: SubFlowCanvasProps) {
  // Convert internal nodes/edges to React Flow format
  const initialNodes = useMemo(
    () => subFlow.nodes.map(internalNodeToRFNode),
    [subFlow.nodes]
  );
  
  const initialEdges = useMemo(
    () => subFlow.edges.map(internalEdgeToRFEdge),
    [subFlow.edges]
  );
  
  // Local state for nodes/edges
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  
  // Node types
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      internalNode: InternalNodeComponent,
      portNode: PortNode,
    }),
    []
  );
  
  // Handlers
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      if (readOnly) return;
      setNodes((nds) => {
        const updatedNodes = applyNodeChanges(changes, nds);
        // Notify parent of changes
        if (onChange) {
          const internalNodes = updatedNodes.map(rfNodeToInternalNode);
          onChange({
            ...subFlow,
            nodes: internalNodes,
          });
        }
        return updatedNodes;
      });
    },
    [readOnly, onChange, subFlow]
  );
  
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      if (readOnly) return;
      setEdges((eds) => {
        const updatedEdges = applyEdgeChanges(changes, eds);
        // Notify parent of changes
        if (onChange) {
          const internalEdges = updatedEdges.map(rfEdgeToInternalEdge);
          onChange({
            ...subFlow,
            edges: internalEdges,
          });
        }
        return updatedEdges;
      });
    },
    [readOnly, onChange, subFlow]
  );
  
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;
      setEdges((eds) => {
        const newEdge: Edge = {
          ...connection,
          id: `edge-${Date.now()}`,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { strokeWidth: 2 },
        } as Edge;
        const updatedEdges = addEdge(newEdge, eds);
        // Notify parent of changes
        if (onChange) {
          const internalEdges = updatedEdges.map(rfEdgeToInternalEdge);
          onChange({
            ...subFlow,
            edges: internalEdges,
          });
        }
        return updatedEdges;
      });
    },
    [readOnly, onChange, subFlow]
  );
  
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeSelect?.(node.id);
    },
    [onNodeSelect]
  );
  
  const onPaneClick = useCallback(() => {
    onNodeSelect?.(null);
  }, [onNodeSelect]);
  
  return (
    <div className={cn('w-full h-full', className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        colorMode={theme}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color={theme === 'dark' ? '#ffffff15' : '#00000015'}
        />
        <Controls
          showZoom={true}
          showFitView={true}
          showInteractive={false}
          position="bottom-left"
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'portNode') {
              return node.data.type === 'input-port' ? '#22c55e' : '#3b82f6';
            }
            return '#6366f1';
          }}
          maskColor={theme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)'}
          position="bottom-right"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
});

export default SubFlowCanvas;
