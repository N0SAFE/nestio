/**
 * SubFlowEditor Component
 *
 * The main editor for SubFlow-based architecture.
 * Shows SubFlows as nodes at the root level, with the ability
 * to drill down into each SubFlow to edit its internal structure.
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
  Panel,
} from '@xyflow/react';
import { cn } from '@repo/ui/lib/utils';
import { ChevronLeft, Home, Plus, Undo2, Redo2, Zap, Calendar, Webhook, Play } from 'lucide-react';
import { Button } from '@repo/ui/components/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/shadcn/dropdown-menu';
import type {
  SubFlowBasedFlow,
  SubFlow,
  SubFlowEdge,
  SubFlowViewState,
  TriggerType,
} from '../../core/types/subflow';
import { createTriggerSubFlow, createCallableSubFlow } from '../../core/types/subflow';
import { SubFlowNode, type SubFlowNodeData } from './nodes/SubFlowNode';
import SubFlowCanvas from './SubFlowCanvas';

// ============================================================================
// Types
// ============================================================================

export interface SubFlowEditorProps {
  /** The flow being edited */
  flow: SubFlowBasedFlow;
  /** Callback when flow changes */
  onChange?: (flow: SubFlowBasedFlow) => void;
  /** Theme */
  theme?: 'light' | 'dark';
  /** Read-only mode */
  readOnly?: boolean;
  /** CSS class name */
  className?: string;
}

interface BreadcrumbItem {
  id: string;
  name: string;
  type: 'root' | 'subflow';
}

// ============================================================================
// Convert Types
// ============================================================================

function subFlowToNode(subFlow: SubFlow): Node<SubFlowNodeData> {
  return {
    id: subFlow.id,
    type: 'subFlowNode',
    position: subFlow.position,
    data: {
      subFlow,
      isSelected: false,
      isExecuting: false,
      hasError: false,
    },
    style: subFlow.dimensions
      ? { width: subFlow.dimensions.width, height: subFlow.dimensions.height }
      : undefined,
  };
}

function subFlowEdgeToRFEdge(edge: SubFlowEdge): Edge {
  return {
    id: edge.id,
    source: edge.sourceSubFlowId,
    sourceHandle: edge.sourcePortId,
    target: edge.targetSubFlowId,
    targetHandle: edge.targetPortId,
    label: edge.label,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { strokeWidth: 2 },
    labelStyle: { fontSize: 12 },
  };
}

function rfEdgeToSubFlowEdge(edge: Edge): SubFlowEdge {
  return {
    id: edge.id,
    sourceSubFlowId: edge.source,
    sourcePortId: edge.sourceHandle ?? '',
    targetSubFlowId: edge.target,
    targetPortId: edge.targetHandle ?? '',
    label: typeof edge.label === 'string' ? edge.label : undefined,
  };
}

// ============================================================================
// SubFlowEditor Component
// ============================================================================

export const SubFlowEditor = memo(function SubFlowEditor({
  flow,
  onChange,
  theme = 'dark',
  readOnly = false,
  className,
}: SubFlowEditorProps) {
  // Navigation state
  const [navigationStack, setNavigationStack] = useState<BreadcrumbItem[]>([
    { id: 'root', name: flow.name, type: 'root' },
  ]);
  
  // Currently viewed SubFlow (null = root level)
  const currentView = navigationStack[navigationStack.length - 1];
  const isAtRoot = currentView?.type === 'root';
  
  // Selected SubFlow for detail panel
  const [selectedSubFlowId, setSelectedSubFlowId] = useState<string | null>(null);
  
  // Convert flow data to React Flow nodes/edges
  const nodes = useMemo(() => {
    if (!isAtRoot) {
      // When inside a SubFlow, we don't show nodes here (SubFlowCanvas handles it)
      return [];
    }
    return flow.subFlows.map(subFlowToNode);
  }, [flow.subFlows, isAtRoot]);
  
  const edges = useMemo(() => {
    if (!isAtRoot) return [];
    return flow.edges.map(subFlowEdgeToRFEdge);
  }, [flow.edges, isAtRoot]);
  
  // Get current SubFlow if drilling down
  const currentSubFlow = useMemo(() => {
    if (isAtRoot) return null;
    return flow.subFlows.find((sf) => sf.id === currentView.id);
  }, [flow.subFlows, currentView, isAtRoot]);
  
  // Node types
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      subFlowNode: (props) => (
        <SubFlowNode
          {...props}
          onSettings={handleSubFlowSettings}
          onDelete={handleSubFlowDelete}
          onViewStateChange={handleViewStateChange}
        />
      ),
    }),
    []
  );
  
  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────
  
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      if (readOnly || !isAtRoot) return;
      
      // Apply position changes to SubFlows
      const positionChanges = changes.filter(
        (c) => c.type === 'position' && c.position
      );
      
      if (positionChanges.length > 0 && onChange) {
        const updatedSubFlows = flow.subFlows.map((sf) => {
          const change = positionChanges.find((c) => c.id === sf.id);
          if (change && change.type === 'position' && change.position) {
            return { ...sf, position: change.position };
          }
          return sf;
        });
        
        onChange({
          ...flow,
          subFlows: updatedSubFlows,
        });
      }
    },
    [readOnly, isAtRoot, flow, onChange]
  );
  
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      if (readOnly || !isAtRoot) return;
      
      // Handle edge deletions
      const deletions = changes.filter((c) => c.type === 'remove');
      if (deletions.length > 0 && onChange) {
        const deletedIds = new Set(deletions.map((d) => d.id));
        onChange({
          ...flow,
          edges: flow.edges.filter((e) => !deletedIds.has(e.id)),
        });
      }
    },
    [readOnly, isAtRoot, flow, onChange]
  );
  
  const handleConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (readOnly || !isAtRoot) return;
      
      if (connection.source && connection.target && onChange) {
        const newEdge: SubFlowEdge = {
          id: `edge-${Date.now()}`,
          sourceSubFlowId: connection.source,
          sourcePortId: connection.sourceHandle ?? '',
          targetSubFlowId: connection.target,
          targetPortId: connection.targetHandle ?? '',
        };
        
        onChange({
          ...flow,
          edges: [...flow.edges, newEdge],
        });
      }
    },
    [readOnly, isAtRoot, flow, onChange]
  );
  
  const handleSubFlowSettings = useCallback((subFlowId: string) => {
    setSelectedSubFlowId(subFlowId);
    // TODO: Open settings panel/dialog
    console.log('Settings for SubFlow:', subFlowId);
  }, []);
  
  const handleSubFlowDelete = useCallback(
    (subFlowId: string) => {
      if (readOnly || !onChange) return;
      
      // Remove SubFlow and its connections
      onChange({
        ...flow,
        subFlows: flow.subFlows.filter((sf) => sf.id !== subFlowId),
        edges: flow.edges.filter(
          (e) => e.sourceSubFlowId !== subFlowId && e.targetSubFlowId !== subFlowId
        ),
      });
    },
    [readOnly, flow, onChange]
  );
  
  const handleViewStateChange = useCallback(
    (subFlowId: string, viewState: SubFlowViewState) => {
      if (readOnly || !onChange) return;
      
      onChange({
        ...flow,
        subFlows: flow.subFlows.map((sf) =>
          sf.id === subFlowId ? { ...sf, viewState } : sf
        ),
      });
    },
    [readOnly, flow, onChange]
  );
  
  const handleNavigateBack = useCallback(() => {
    setNavigationStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);
  
  const handleNavigateTo = useCallback((index: number) => {
    setNavigationStack((prev) => prev.slice(0, index + 1));
  }, []);
  
  const handleSubFlowChange = useCallback(
    (updatedSubFlow: SubFlow) => {
      if (readOnly || !onChange) return;
      
      onChange({
        ...flow,
        subFlows: flow.subFlows.map((sf) =>
          sf.id === updatedSubFlow.id ? updatedSubFlow : sf
        ),
      });
    },
    [readOnly, flow, onChange]
  );
  
  const handleAddSubFlow = useCallback(
    (type: 'trigger' | 'callable', triggerType?: TriggerType) => {
      if (readOnly || !onChange) return;
      
      const count = flow.subFlows.length + 1;
      
      let newSubFlow: SubFlow;
      
      if (type === 'trigger') {
        // Create trigger SubFlow with specified trigger type
        const tType = triggerType ?? 'manual';
        newSubFlow = createTriggerSubFlow(
          `${tType.charAt(0).toUpperCase() + tType.slice(1)} Trigger ${String(count)}`,
          tType,
          {
            position: { x: 100 + flow.subFlows.length * 50, y: 100 + flow.subFlows.length * 50 },
          }
        );
      } else {
        // Create callable SubFlow
        newSubFlow = createCallableSubFlow(
          `Function ${String(count)}`,
          [{ id: 'input-1', name: 'input', type: 'data', dataType: 'any' }],
          [{ id: 'output-1', name: 'output', type: 'data', dataType: 'any' }],
          {
            position: { x: 100 + flow.subFlows.length * 50, y: 100 + flow.subFlows.length * 50 },
          }
        );
      }
      
      onChange({
        ...flow,
        subFlows: [...flow.subFlows, newSubFlow],
      });
    },
    [readOnly, flow, onChange]
  );
  
  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  
  return (
    <div className={cn('flex flex-col w-full h-full', className)}>
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 px-4 py-2 bg-background/80 backdrop-blur border-b">
        {/* Back Button */}
        {!isAtRoot && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNavigateBack}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        )}
        
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-sm">
          {navigationStack.map((item, index) => (
            <React.Fragment key={item.id}>
              {index > 0 && <span className="text-muted-foreground">/</span>}
              <button
                onClick={() => handleNavigateTo(index)}
                className={cn(
                  'px-2 py-1 rounded hover:bg-muted transition-colors',
                  index === navigationStack.length - 1
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {item.type === 'root' && <Home className="w-3 h-3 inline mr-1" />}
                {item.name}
              </button>
            </React.Fragment>
          ))}
        </div>
        
        {/* Spacer */}
        <div className="flex-1" />
        
        {/* Actions */}
        {isAtRoot && !readOnly && (
          <div className="flex items-center gap-2">
            {/* Add Trigger Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Zap className="w-4 h-4" />
                  Add Trigger
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { handleAddSubFlow('trigger', 'manual'); }}>
                  <Play className="w-4 h-4 mr-2" />
                  Manual Trigger
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { handleAddSubFlow('trigger', 'webhook'); }}>
                  <Webhook className="w-4 h-4 mr-2" />
                  Webhook Trigger
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { handleAddSubFlow('trigger', 'schedule'); }}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Trigger
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { handleAddSubFlow('trigger', 'event'); }}>
                  <Zap className="w-4 h-4 mr-2" />
                  Event Trigger
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Add Function */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => { handleAddSubFlow('callable'); }}
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Function
            </Button>
          </div>
        )}
      </div>
      
      {/* Canvas */}
      <div className="flex-1 relative">
        {isAtRoot ? (
          // Root Level - Show SubFlows as nodes
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
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
              gap={20}
              size={1}
              color={theme === 'dark' ? '#ffffff10' : '#00000010'}
            />
            <Controls position="bottom-left" />
            <MiniMap
              nodeColor={(node) => {
                const data = node.data as unknown as SubFlowNodeData;
                return data.subFlow.type === 'trigger' ? '#a855f7' : '#3b82f6';
              }}
              maskColor={theme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)'}
              position="bottom-right"
              pannable
              zoomable
            />
          </ReactFlow>
        ) : currentSubFlow ? (
          // Inside SubFlow - Show internal canvas
          <SubFlowCanvas
            subFlow={currentSubFlow}
            onChange={handleSubFlowChange}
            onNodeSelect={setSelectedSubFlowId}
            readOnly={readOnly}
            theme={theme}
          />
        ) : (
          // SubFlow not found
          <div className="flex items-center justify-center h-full text-muted-foreground">
            SubFlow not found
          </div>
        )}
      </div>
    </div>
  );
});

export default SubFlowEditor;
