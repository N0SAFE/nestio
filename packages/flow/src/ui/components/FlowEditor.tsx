/**
 * Flow Editor Component
 * 
 * Main visual flow editor using React Flow
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type NodeTypes,
  BackgroundVariant,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { FlowEditorProps, ReactFlowNode, ReactFlowEdge, FlowNodeData } from '../types';
import type { FlowPlugin } from '../../core/types/plugin';
import type { FlowNode as FlowNodeType } from '../../core/types/flow';
import type { SubFlow, InternalNode } from '../../core/types/subflow';
import { useFlowStore } from '../store/flowStore';
import { FlowNode } from './nodes/FlowNode';
import { SubFlowNode, type SubFlowNodeData } from './nodes/SubFlowNode';
import InternalNodeComponent, { type InternalNodeComponentData } from './nodes/InternalNode';
import { NodePalette } from './NodePalette';
import { ExecutionControls } from './ExecutionControls';
import { VariableInspector } from './VariableInspector';
import { ConfigSheet } from './config/ConfigSheet';
import { SubFlowConfigSheet } from './SubFlowConfigSheet';
import { NodeDebugContextMenu } from './debug/NodeDebugContextMenu';
import { EdgeDebugContextMenu } from './debug/EdgeDebugContextMenu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@repo/ui/components/shadcn/dropdown-menu';
import { flowToReactFlow } from '../utils/flowConverter';
import { pluginRegistry } from '../../core/plugins/registry';

export const FlowEditor: React.FC<FlowEditorProps> = ({
  initialFlow,
  plugins = [],
  onChange,
  onExecutionComplete,
  onExecutionError,
  onNodeSettings,
  onNodeDelete,
  showControls = false,
  showVariables = false,
  showPalette = false,
  readOnly = false,
  theme = 'dark',
  className = '',
  draggedPluginRef: externalDraggedPluginRef,
  draggedSubFlowRef: externalDraggedSubFlowRef,
}) => {

  const {
    flow,
    setFlow,
    selectedNodeId,
    selectNode,
    addNode: addFlowNode,
    addEdge: addFlowEdge,
    updateNode,
    deleteNode,
    executionState,
  } = useFlowStore();

  // React Flow instance
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReturnType<typeof useReactFlow> | null>(null);
  const internalDraggedPluginRef = useRef<FlowPlugin | null>(null);
  const internalDraggedSubFlowRef = useRef<SubFlow | null>(null);
  
  // Container element state for Sheet portal - needs to be state so ConfigSheet re-renders when set
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);
  
  // Config sheet state
  const [configSheetOpen, setConfigSheetOpen] = useState(false);
  
  // SubFlow config sheet state
  const [subFlowConfigOpen, setSubFlowConfigOpen] = useState(false);
  const [selectedSubFlowId, setSelectedSubFlowId] = useState<string | null>(null);
  
  // Debug context menu state
  const [debugNodeId, setDebugNodeId] = useState<string | null>(null);
  const [debugEdgeId, setDebugEdgeId] = useState<string | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Drag hover state - track which SubFlow is being hovered during node drag
  const [hoveredSubFlowId, setHoveredSubFlowId] = useState<string | null>(null);
  
  // Use external refs if provided, otherwise use internal
  const draggedPluginRef = externalDraggedPluginRef ?? internalDraggedPluginRef;
  const draggedSubFlowRef = externalDraggedSubFlowRef ?? internalDraggedSubFlowRef;

  // Track container element for Sheet portal - set when wrapper div mounts
  useEffect(() => {
    if (reactFlowWrapper.current) {
      setContainerElement(reactFlowWrapper.current);
    }
  }, []);

  // Convert flow to React Flow format
  const [nodes, setNodes, onNodesChange] = useNodesState<ReactFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<ReactFlowEdge>([]);

  // Memoize nodeTypes with callbacks
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      flowNode: (props: NodeProps<FlowNodeData>) => (
        <FlowNode
          {...props}
          onSettings={(nodeId) => {
            selectNode(nodeId);
            setConfigSheetOpen(true);
            onNodeSettings?.(nodeId);
          }}
          onDelete={(nodeId) => {
            deleteNode(nodeId);
            if (onChange && flow) {
              onChange({
                ...flow,
                nodes: flow.nodes.filter(n => n.id !== nodeId),
                edges: flow.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
              });
            }
            onNodeDelete?.(nodeId);
          }}
        />
      ),
      subFlowNode: (props: NodeProps<SubFlowNodeData>) => (
        <SubFlowNode
          {...props}
          isDropTarget={hoveredSubFlowId === props.id}
          onSettings={(subFlowId) => {
            setSelectedSubFlowId(subFlowId);
            setSubFlowConfigOpen(true);
            onNodeSettings?.(subFlowId);
          }}
          onDelete={(subFlowId) => {
            // Remove SubFlow from flow.subFlows
            if (flow) {
              const updatedFlow = {
                ...flow,
                subFlows: flow.subFlows.filter(sf => sf.id !== subFlowId),
              };
              setFlow(updatedFlow);
              onChange?.(updatedFlow);
            }
            onNodeDelete?.(subFlowId);
          }}
          onViewStateChange={(subFlowId, viewState) => {
            // Update SubFlow view state
            if (flow) {
              const updatedFlow = {
                ...flow,
                subFlows: flow.subFlows.map(sf => 
                  sf.id === subFlowId ? { ...sf, viewState } : sf
                ),
              };
              setFlow(updatedFlow);
              onChange?.(updatedFlow);
            }
          }}
          onPortUpdate={(subFlowId, portId, updates) => {
            // Update a port in the SubFlow
            if (flow) {
              const updatedFlow = {
                ...flow,
                subFlows: flow.subFlows.map(sf => {
                  if (sf.id !== subFlowId) return sf;
                  return {
                    ...sf,
                    inputs: sf.inputs.map(p => 
                      p.id === portId ? { ...p, ...updates } : p
                    ),
                    outputs: sf.outputs.map(p => 
                      p.id === portId ? { ...p, ...updates } : p
                    ),
                  };
                }),
              };
              setFlow(updatedFlow);
              onChange?.(updatedFlow);
            }
          }}
          onPortDelete={(subFlowId, portId) => {
            // Delete a port from the SubFlow
            if (flow) {
              const updatedFlow = {
                ...flow,
                subFlows: flow.subFlows.map(sf => {
                  if (sf.id !== subFlowId) return sf;
                  return {
                    ...sf,
                    inputs: sf.inputs.filter(p => p.id !== portId),
                    outputs: sf.outputs.filter(p => p.id !== portId),
                  };
                }),
              };
              setFlow(updatedFlow);
              onChange?.(updatedFlow);
            }
          }}
        />
      ),
      internalNode: (props: NodeProps<InternalNodeComponentData>) => (
        <InternalNodeComponent
          {...props}
          onSettings={(nodeId) => {
            selectNode(nodeId);
            setConfigSheetOpen(true);
            onNodeSettings?.(nodeId);
          }}
          onDelete={(nodeId) => {
            // Find the parent SubFlow and remove this internal node
            if (flow) {
              const updatedFlow = {
                ...flow,
                subFlows: flow.subFlows.map(sf => ({
                  ...sf,
                  nodes: sf.nodes.filter(n => n.id !== nodeId),
                  edges: sf.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
                })),
              };
              setFlow(updatedFlow);
              onChange?.(updatedFlow);
            }
            onNodeDelete?.(nodeId);
          }}
        />
      ),
    }),
    [onNodeSettings, onNodeDelete, selectNode, deleteNode, onChange, flow, setFlow, hoveredSubFlowId]
  );

  // Initialize flow
  useEffect(() => {
    if (initialFlow && !flow) {
      setFlow(initialFlow);
    }
  }, [initialFlow, flow, setFlow]);

  // Sync flow with React Flow
  useEffect(() => {
    if (flow) {
      console.log('[FlowEditor] Syncing flow to React Flow...');
      const { nodes: rfNodes, edges: rfEdges } = flowToReactFlow(
        flow,
        executionState
      );
      console.log('[FlowEditor] About to call setNodes with', rfNodes.length, 'nodes');
      console.log('[FlowEditor] Nodes to set:', rfNodes.map(n => ({ id: n.id, type: n.type })));
      setNodes(rfNodes);
      setEdges(rfEdges);
      console.log('[FlowEditor] setNodes and setEdges called');
    }
  }, [flow, executionState, setNodes, setEdges]);

  // Register plugins
  useEffect(() => {
    plugins.forEach((plugin) => {
      if (!pluginRegistry.has(plugin.id)) {
        pluginRegistry.register(plugin);
      }
    });
  }, [plugins]);

  // Handle node selection
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: ReactFlowNode) => {
      selectNode(node.id);
      
      // Check if this is a SubFlow node (has subFlow in data) or a regular node (has node in data)
      const nodeData = node.data as unknown as FlowNodeData | SubFlowNodeData;
      
      // SubFlow nodes - open SubFlowConfigSheet on click
      if ('subFlow' in nodeData) {
        setSelectedSubFlowId(node.id);
        setSubFlowConfigOpen(true);
        return;
      }
      
      // Regular nodes - open config sheet for clickable nodes
      if ('node' in nodeData) {
        const plugin = pluginRegistry.get(nodeData.node.pluginId);
        if (plugin?.nodeUIPattern === 'clickable') {
          setConfigSheetOpen(true);
        }
      }
    },
    [selectNode]
  );

  // Handle node right-click for debug context menu
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: ReactFlowNode) => {
      event.preventDefault();
      setDebugNodeId(node.id);
      setDebugEdgeId(null);
      setContextMenuPosition({ x: event.clientX, y: event.clientY });
    },
    []
  );

  // Handle edge right-click for debug context menu
  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: ReactFlowEdge) => {
      event.preventDefault();
      setDebugEdgeId(edge.id);
      setDebugNodeId(null);
      setContextMenuPosition({ x: event.clientX, y: event.clientY });
    },
    []
  );

  // Handle connection creation
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const edge = {
        id: `edge-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle || undefined,
        targetHandle: connection.targetHandle || undefined,
        condition: undefined,
      };

      addFlowEdge(edge);

      // Notify parent
      if (onChange && flow) {
        onChange({
          ...flow,
          edges: [...flow.edges, edge],
        });
      }
    },
    [addFlowEdge, flow, onChange]
  );

  // Handle node drag (detect hover over SubFlows)
  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, node: ReactFlowNode, nodes: ReactFlowNode[]) => {
      const nodeData = node.data as unknown as FlowNodeData | SubFlowNodeData | InternalNodeComponentData;
      
      console.log('[onNodeDrag]', { nodeId: node.id, nodeType: node.type, hasNodeProp: 'node' in nodeData, hasSubFlowProp: 'subFlow' in nodeData, parentId: node.parentId });
      console.log('[onNodeDrag] Total nodes in array:', nodes.length);
      console.log('[onNodeDrag] All nodes:', nodes.map(n => ({ id: n.id, type: n.type, dataKeys: Object.keys(n.data) })));
      
      // Only check for SubFlow hover if dragging a regular flow node (not SubFlow itself or internal node)
      if (!('node' in nodeData) || node.parentId) {
        setHoveredSubFlowId(null);
        return;
      }
      
      // Find SubFlow nodes
      const subFlowNodes = nodes.filter(n => {
        const data = n.data as unknown as FlowNodeData | SubFlowNodeData;
        const hasSubFlow = 'subFlow' in data;
        console.log('[onNodeDrag] Checking node:', n.id, 'type:', n.type, 'hasSubFlow:', hasSubFlow, 'data keys:', Object.keys(data));
        return hasSubFlow;
      });
      
      console.log('[onNodeDrag] SubFlow nodes found:', subFlowNodes.length);
      
      // Check which SubFlow (if any) the node is hovering over
      let hoveredSubFlow: ReactFlowNode | null = null;
      for (const subFlowNode of subFlowNodes) {
        const subFlowData = subFlowNode.data as SubFlowNodeData;
        const subFlowWidth = subFlowNode.width ?? subFlowData.subFlow.dimensions?.width ?? 300;
        const subFlowHeight = subFlowNode.height ?? subFlowData.subFlow.dimensions?.height ?? 200;
        
        // Check if node center is inside SubFlow bounds
        const nodeCenterX = node.position.x + (node.width ?? 150) / 2;
        const nodeCenterY = node.position.y + (node.height ?? 40) / 2;
        
        const isInside = nodeCenterX >= subFlowNode.position.x &&
          nodeCenterX <= subFlowNode.position.x + subFlowWidth &&
          nodeCenterY >= subFlowNode.position.y &&
          nodeCenterY <= subFlowNode.position.y + subFlowHeight;
        
        console.log('[onNodeDrag] Checking SubFlow', subFlowNode.id, {
          nodeCenterX,
          nodeCenterY,
          subFlowX: subFlowNode.position.x,
          subFlowY: subFlowNode.position.y,
          subFlowWidth,
          subFlowHeight,
          isInside
        });
        
        if (isInside) {
          hoveredSubFlow = subFlowNode;
          break;
        }
      }
      
      console.log('[onNodeDrag] Hovered SubFlow:', hoveredSubFlow?.id ?? 'none');
      setHoveredSubFlowId(hoveredSubFlow?.id ?? null);
    },
    []
  );
  
  // Handle node drag end (update position)
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: ReactFlowNode, nodes: ReactFlowNode[]) => {
      // Clear hover state
      setHoveredSubFlowId(null);
      const nodeData = node.data as unknown as FlowNodeData | SubFlowNodeData | InternalNodeComponentData;
      
      console.log('[onNodeDragStop]', { nodeId: node.id, nodeType: node.type, hasNodeProp: 'node' in nodeData, hasSubFlowProp: 'subFlow' in nodeData });
      
      // Handle SubFlow node drag
      if ('subFlow' in nodeData) {
        if (onChange && flow) {
          onChange({
            ...flow,
            subFlows: (flow.subFlows || []).map((sf) =>
              sf.id === node.id ? { ...sf, position: node.position } : sf
            ),
          });
        }
        return;
      }
      
      // Check if node is being dropped onto a SubFlow
      const subFlowNodes = nodes.filter(n => {
        const data = n.data as unknown as FlowNodeData | SubFlowNodeData;
        return 'subFlow' in data;
      });
      
      console.log('[onNodeDragStop] SubFlow nodes found:', subFlowNodes.length);
      
      let droppedOnSubFlow: ReactFlowNode | null = null;
      for (const subFlowNode of subFlowNodes) {
        const subFlowData = subFlowNode.data as SubFlowNodeData;
        const subFlowWidth = subFlowNode.width || subFlowData.subFlow.dimensions?.width || 300;
        const subFlowHeight = subFlowNode.height || subFlowData.subFlow.dimensions?.height || 200;
        
        // Check if node center is inside SubFlow bounds
        const nodeCenterX = node.position.x + (node.width || 150) / 2;
        const nodeCenterY = node.position.y + (node.height || 40) / 2;
        
        const isInside = nodeCenterX >= subFlowNode.position.x &&
          nodeCenterX <= subFlowNode.position.x + subFlowWidth &&
          nodeCenterY >= subFlowNode.position.y &&
          nodeCenterY <= subFlowNode.position.y + subFlowHeight;
        
        console.log('[onNodeDragStop] Checking SubFlow', subFlowNode.id, {
          nodeCenterX,
          nodeCenterY,
          subFlowX: subFlowNode.position.x,
          subFlowY: subFlowNode.position.y,
          subFlowWidth,
          subFlowHeight,
          isInside
        });
        
        if (isInside) {
          droppedOnSubFlow = subFlowNode;
          break;
        }
      }
      
      console.log('[onNodeDragStop] Dropped on SubFlow:', droppedOnSubFlow?.id ?? 'none', 'hasNodeProp:', 'node' in nodeData);
      
      if (droppedOnSubFlow && 'node' in nodeData && flow) {
        console.log('[onNodeDragStop] Converting to internal node...');
        // Convert regular node to internal node
        const subFlowData = droppedOnSubFlow.data as SubFlowNodeData;
        const subFlowId = subFlowData.subFlow.id;
        
        // Calculate relative position
        const relativeX = node.position.x - droppedOnSubFlow.position.x;
        const relativeY = node.position.y - droppedOnSubFlow.position.y;
        
        // Create internal node from flow node
        const internalNode: InternalNode = {
          id: node.id,
          type: 'action' as const, // Default to action type
          pluginId: nodeData.node.pluginId,
          label: nodeData.node.label || 'Node',
          description: nodeData.node.description,
          position: { x: relativeX, y: relativeY },
          data: nodeData.node.data,
          config: nodeData.node.config,
        };
        
        // Update flow: remove from top-level nodes, add to SubFlow
        const updatedFlow = {
          ...flow,
          nodes: flow.nodes.filter(n => n.id !== node.id),
          edges: flow.edges.filter(e => e.source !== node.id && e.target !== node.id),
          subFlows: (flow.subFlows || []).map(sf =>
            sf.id === subFlowId
              ? {
                  ...sf,
                  nodes: [...sf.nodes, internalNode],
                }
              : sf
          ),
        };
        
        setFlow(updatedFlow);
        onChange?.(updatedFlow);
        return;
      }
      
      // Handle internal node drag (already inside a SubFlow)
      if ('type' in nodeData && typeof nodeData.type === 'string' && flow) {
        // Update internal node position
        const parentId = node.parentId;
        if (parentId) {
          const updatedFlow = {
            ...flow,
            subFlows: (flow.subFlows || []).map(sf =>
              sf.id === parentId
                ? {
                    ...sf,
                    nodes: sf.nodes.map(n =>
                      n.id === node.id ? { ...n, position: node.position } : n
                    ),
                  }
                : sf
            ),
          };
          setFlow(updatedFlow);
          onChange?.(updatedFlow);
        }
        return;
      }
      
      // Handle regular node drag (no SubFlow drop)
      if ('node' in nodeData) {
        updateNode(node.id, {
          position: node.position,
        });

        if (onChange && flow) {
          onChange({
            ...flow,
            nodes: flow.nodes.map((n) =>
              n.id === node.id ? { ...n, position: node.position } : n
            ),
          });
        }
      }
    },
    [updateNode, flow, onChange, setFlow]
  );

  // Handle drag over
  const onDragOver = useCallback((event: React.DragEvent) => {
    console.log('[FlowEditor] onDragOver triggered');
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      console.log('[FlowEditor] onDrop triggered');
      console.log('[FlowEditor] dataTransfer types:', event.dataTransfer.types);
      console.log('[FlowEditor] reactFlowInstance:', !!reactFlowInstance);
      console.log('[FlowEditor] draggedSubFlow:', draggedSubFlowRef.current?.name ?? 'null');
      console.log('[FlowEditor] draggedPlugin:', draggedPluginRef.current?.name ?? 'null');
      
      event.preventDefault();

      if (!reactFlowInstance) {
        console.log('[FlowEditor] Drop cancelled - missing reactFlowInstance');
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) {
        console.log('[FlowEditor] Drop cancelled - no bounds');
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      // Check if dropping a SubFlow (using ref)
      if (draggedSubFlowRef.current) {
        const sourceSubFlow = draggedSubFlowRef.current;
        console.log('[FlowEditor] Dropping SubFlow from ref:', sourceSubFlow.name);
        
        // Create a new SubFlow instance with position and unique ID
        const newSubFlow: SubFlow = {
          ...sourceSubFlow,
          id: `subflow-${String(Date.now())}`,
          position,
          viewState: 'expanded',
          dimensions: sourceSubFlow.dimensions ?? { width: 400, height: 300 },
          // Start with empty internal nodes/edges (template's structure is just for reference)
          nodes: sourceSubFlow.nodes ?? [],
          edges: sourceSubFlow.edges ?? [],
        };

        console.log('[FlowEditor] Creating SubFlow:', newSubFlow);
        draggedSubFlowRef.current = null;

        if (flow) {
          const updatedFlow = {
            ...flow,
            subFlows: [...(flow.subFlows ?? []), newSubFlow],
          };
          console.log('[FlowEditor] Updated flow with SubFlow:', updatedFlow);
          console.log('[FlowEditor] SubFlows in updated flow:', updatedFlow.subFlows);
          console.log('[FlowEditor] SubFlows count:', updatedFlow.subFlows.length);
          
          // Update both internal store AND notify parent
          setFlow(updatedFlow);
          onChange?.(updatedFlow);
        }
        return;
      }

      // Check if dropping a plugin
      if (!draggedPluginRef.current) {
        console.log('[FlowEditor] Drop cancelled - no plugin or SubFlow');
        return;
      }

      const newNode: FlowNodeType = {
        id: `node-${String(Date.now())}`,
        type: draggedPluginRef.current.nodeType,
        pluginId: draggedPluginRef.current.id,
        label: draggedPluginRef.current.name,
        description: draggedPluginRef.current.description,
        config: {},
        data: {
          inputs: {},
          outputs: {},
        },
        position,
      };

      console.log('[FlowEditor] Creating plugin node:', newNode);
      addFlowNode(newNode);
      draggedPluginRef.current = null;

      if (onChange && flow) {
        onChange({
          ...flow,
          nodes: [...flow.nodes, newNode],
        });
      }
    },
    [reactFlowInstance, addFlowNode, flow, onChange, draggedPluginRef, draggedSubFlowRef]
  );

  // Handle execution completion
  useEffect(() => {
    if (executionState.status === 'completed' && onExecutionComplete) {
      onExecutionComplete(executionState.output);
    }
  }, [executionState.status, executionState.output, onExecutionComplete]);

  // Handle execution error
  useEffect(() => {
    if (executionState.status === 'error' && onExecutionError && executionState.error) {
      onExecutionError(executionState.error);
    }
  }, [executionState.status, executionState.error, onExecutionError]);

  // Get selected node and plugin
  const selectedNode = useMemo(() => {
    return flow?.nodes.find((n) => n.id === selectedNodeId);
  }, [flow, selectedNodeId]);

  const selectedPlugin = useMemo(() => {
    if (!selectedNode) return undefined;
    return pluginRegistry.get(selectedNode.pluginId);
  }, [selectedNode]);

  // Get debug node and its plugin
  const debugNode = useMemo(() => {
    if (!debugNodeId || !flow) return null;
    return flow.nodes.find((n) => n.id === debugNodeId) ?? null;
  }, [debugNodeId, flow]);

  const debugNodePlugin = useMemo(() => {
    if (!debugNode) return undefined;
    return pluginRegistry.get(debugNode.pluginId);
  }, [debugNode]);

  // Get debug edge and its source/target nodes
  const debugEdge = useMemo(() => {
    if (!debugEdgeId || !flow) return null;
    return flow.edges.find((e) => e.id === debugEdgeId) ?? null;
  }, [debugEdgeId, flow]);

  const debugEdgeNodes = useMemo(() => {
    if (!debugEdge || !flow) return null;
    const sourceNode = flow.nodes.find((n) => n.id === debugEdge.source);
    const targetNode = flow.nodes.find((n) => n.id === debugEdge.target);
    if (!sourceNode || !targetNode) return null;
    return {
      source: sourceNode,
      target: targetNode,
      sourcePlugin: pluginRegistry.get(sourceNode.pluginId),
      targetPlugin: pluginRegistry.get(targetNode.pluginId),
    };
  }, [debugEdge, flow]);

  return (
    <div 
      ref={reactFlowWrapper}
      className={`flow-editor ${className}`} 
      style={{ width: '100%', height: '100%' }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onConnect={readOnly ? undefined : onConnect}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        colorMode={theme}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: executionState.status === 'running',
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={15} size={1} />
        <Controls />
        <MiniMap />

        {/* Node Palette */}
        {showPalette && (
          <Panel position="top-left" className="!m-2 !p-0 !bg-transparent !border-none !shadow-none">
            <NodePalette
              categories={[
                {
                  id: 'triggers',
                  name: 'Triggers',
                  plugins: plugins.filter((p) => p.subCategory === 'trigger'),
                },
                {
                  id: 'actions',
                  name: 'Actions',
                  plugins: plugins.filter((p) => p.subCategory === 'action'),
                },
                {
                  id: 'conditions',
                  name: 'Conditions',
                  plugins: plugins.filter((p) => p.subCategory === 'condition'),
                },
                {
                  id: 'loops',
                  name: 'Loops',
                  plugins: plugins.filter((p) => p.subCategory === 'loop'),
                },
              ]}
              onPluginDragStart={(plugin) => {
                console.log('[FlowEditor] onPluginDragStart called with:', plugin.name);
                draggedPluginRef.current = plugin;
              }}
            />
          </Panel>
        )}

        {/* Execution Controls */}
        {showControls && (
          <Panel position="top-center">
            <ExecutionControls state={executionState} />
          </Panel>
        )}

        {/* Variable Inspector */}
        {showVariables && (
          <Panel position="top-right">
            <VariableInspector
              variables={executionState.variables}
              editable={!readOnly}
            />
          </Panel>
        )}

      </ReactFlow>
      
      {/* Config Sheet - slide-out panel for node configuration */}
      <ConfigSheet
        container={containerElement}
        open={configSheetOpen}
        onClose={() => {
          setConfigSheetOpen(false);
        }}
        node={selectedNode ?? null}
        plugin={selectedPlugin ?? null}
        onChange={(nodeId, config) => {
          updateNode(nodeId, { config });
          if (onChange && flow) {
            onChange({
              ...flow,
              nodes: flow.nodes.map((n) =>
                n.id === nodeId ? { ...n, config } : n
              ),
            });
          }
        }}
        onDelete={(nodeId) => {
          deleteNode(nodeId);
          setConfigSheetOpen(false);
          if (onChange && flow) {
            onChange({
              ...flow,
              nodes: flow.nodes.filter((n) => n.id !== nodeId),
            });
          }
        }}
      />

      {/* SubFlow Config Sheet - for configuring SubFlow properties */}
      {selectedSubFlowId && flow && (() => {
        const selectedSubFlow = flow.subFlows.find(sf => sf.id === selectedSubFlowId);
        if (!selectedSubFlow) return null;
        return (
          <SubFlowConfigSheet
            subFlow={selectedSubFlow}
            isOpen={subFlowConfigOpen}
            onOpenChange={(open) => {
              setSubFlowConfigOpen(open);
              if (!open) {
                setSelectedSubFlowId(null);
              }
            }}
            onSave={(updates) => {
              const updatedFlow = {
                ...flow,
                subFlows: flow.subFlows.map(sf =>
                  sf.id === selectedSubFlowId ? { ...sf, ...updates } : sf
                ),
              };
              setFlow(updatedFlow);
              onChange?.(updatedFlow);
            }}
            onDelete={() => {
              const updatedFlow = {
                ...flow,
                subFlows: flow.subFlows.filter(sf => sf.id !== selectedSubFlowId),
              };
              setFlow(updatedFlow);
              onChange?.(updatedFlow);
              setSubFlowConfigOpen(false);
              setSelectedSubFlowId(null);
            }}
            readOnly={readOnly}
          />
        );
      })()}

      {/* Debug Context Menu for Nodes */}
      {debugNode && contextMenuPosition && (
        <DropdownMenu 
          open={!!debugNodeId} 
          onOpenChange={(open) => {
            if (!open) {
              setDebugNodeId(null);
              setContextMenuPosition(null);
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <div 
              style={{ 
                position: 'fixed', 
                left: contextMenuPosition.x, 
                top: contextMenuPosition.y,
                width: 1,
                height: 1,
              }}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="start" 
            className="w-64"
            onInteractOutside={() => {
              setDebugNodeId(null);
              setContextMenuPosition(null);
            }}
          >
            <NodeDebugContextMenu
              node={debugNode}
              plugin={debugNodePlugin}
              onDelete={(nodeId) => {
                deleteNode(nodeId);
                setDebugNodeId(null);
                setContextMenuPosition(null);
                if (onChange && flow) {
                  onChange({
                    ...flow,
                    nodes: flow.nodes.filter((n) => n.id !== nodeId),
                  });
                }
              }}
              onDuplicate={(nodeId) => {
                const nodeToDupe = flow?.nodes.find((n) => n.id === nodeId);
                if (nodeToDupe) {
                  const newNode: FlowNodeType = {
                    ...nodeToDupe,
                    id: `node-${String(Date.now())}`,
                    position: {
                      x: nodeToDupe.position.x + 50,
                      y: nodeToDupe.position.y + 50,
                    },
                  };
                  addFlowNode(newNode);
                  if (onChange && flow) {
                    onChange({ ...flow, nodes: [...flow.nodes, newNode] });
                  }
                }
                setDebugNodeId(null);
                setContextMenuPosition(null);
              }}
              asContent
            />
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Debug Context Menu for Edges */}
      {debugEdge && debugEdgeNodes && contextMenuPosition && (
        <DropdownMenu 
          open={!!debugEdgeId} 
          onOpenChange={(open) => {
            if (!open) {
              setDebugEdgeId(null);
              setContextMenuPosition(null);
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <div 
              style={{ 
                position: 'fixed', 
                left: contextMenuPosition.x, 
                top: contextMenuPosition.y,
                width: 1,
                height: 1,
              }}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="start" 
            className="w-64"
            onInteractOutside={() => {
              setDebugEdgeId(null);
              setContextMenuPosition(null);
            }}
          >
            <EdgeDebugContextMenu
              edge={debugEdge}
              sourceNode={debugEdgeNodes.source}
              targetNode={debugEdgeNodes.target}
              sourcePlugin={debugEdgeNodes.sourcePlugin}
              targetPlugin={debugEdgeNodes.targetPlugin}
              asContent
            />
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};
