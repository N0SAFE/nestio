/**
 * SubFlowNode Component
 *
 * A React Flow group node that acts as a container for child nodes.
 * Uses React Flow's native parent/child relationship:
 * - Child nodes have `parentId` set to this SubFlow's id
 * - Child nodes are positioned relative to this node's top-left
 * - Children move with the parent automatically
 *
 * Structure:
 * - Header (name, type indicator, controls)
 * - Body (empty area where React Flow renders children)
 * - Input/Output handles on edges
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  ChevronDown,
  ChevronRight,
  Zap,
  Code2,
  Settings,
  Trash2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { cn } from '@repo/ui/lib/utils';
import type {
  SubFlow,
  SubFlowInputPort,
  SubFlowOutputPort,
  SubFlowViewState,
  SubFlowPort,
} from '../../../core/types/subflow';
import { PortContextMenu } from '../PortContextMenu';
import { PortConfigSheet } from '../PortConfigSheet';

// ============================================================================
// Types
// ============================================================================

export interface SubFlowNodeData {
  subFlow: SubFlow;
  isSelected?: boolean;
  isExecuting?: boolean;
  hasError?: boolean;
  executionProgress?: number;
}

export interface SubFlowNodeProps extends NodeProps<SubFlowNodeData> {
  onSettings?: (subFlowId: string) => void;
  onDelete?: (subFlowId: string) => void;
  onViewStateChange?: (subFlowId: string, viewState: SubFlowViewState) => void;
  onPortUpdate?: (subFlowId: string, portId: string, updates: Partial<SubFlowPort>) => void;
  onPortDelete?: (subFlowId: string, portId: string) => void;
  isDropTarget?: boolean;
}

// ============================================================================
// Color/Style Mapping
// ============================================================================

const colorClassMap: Record<string, { bg: string; border: string; header: string }> = {
  green: {
    bg: 'bg-green-950/50',
    border: 'border-green-500/30',
    header: 'bg-green-500/20 border-green-500/40',
  },
  blue: {
    bg: 'bg-blue-950/50',
    border: 'border-blue-500/30',
    header: 'bg-blue-500/20 border-blue-500/40',
  },
  purple: {
    bg: 'bg-purple-950/50',
    border: 'border-purple-500/30',
    header: 'bg-purple-500/20 border-purple-500/40',
  },
  orange: {
    bg: 'bg-orange-950/50',
    border: 'border-orange-500/30',
    header: 'bg-orange-500/20 border-orange-500/40',
  },
  red: {
    bg: 'bg-red-950/50',
    border: 'border-red-500/30',
    header: 'bg-red-500/20 border-red-500/40',
  },
  cyan: {
    bg: 'bg-cyan-950/50',
    border: 'border-cyan-500/30',
    header: 'bg-cyan-500/20 border-cyan-500/40',
  },
  yellow: {
    bg: 'bg-yellow-950/50',
    border: 'border-yellow-500/30',
    header: 'bg-yellow-500/20 border-yellow-500/40',
  },
  pink: {
    bg: 'bg-pink-950/50',
    border: 'border-pink-500/30',
    header: 'bg-pink-500/20 border-pink-500/40',
  },
};

const portTypeColorMap: Record<string, string> = {
  trigger: 'bg-green-500',
  flow: 'bg-blue-500',
  data: 'bg-purple-500',
  error: 'bg-red-500',
};

// ============================================================================
// SubFlowNode Component
// ============================================================================

export const SubFlowNode = memo(function SubFlowNode({
  data,
  selected,
  onSettings,
  onDelete,
  onViewStateChange,
  onPortUpdate,
  onPortDelete,
  isDropTarget = false,
}: SubFlowNodeProps) {
  // Cast data to proper type (React Flow NodeProps types data as unknown)
  const nodeData = data as SubFlowNodeData;
  const { subFlow, isExecuting, hasError, executionProgress } = nodeData;
  const [isHovered, setIsHovered] = useState(false);
  
  // Get color classes (always defaults to blue if not found)
  const defaultColorClasses = { bg: 'bg-blue-950/50', border: 'border-blue-500/30', header: 'bg-blue-500/20 border-blue-500/40' };
  const colors = colorClassMap[subFlow.color ?? 'blue'] ?? defaultColorClasses;
  
  // View state
  const isCollapsed = subFlow.viewState === 'collapsed';
  const isMaximized = subFlow.viewState === 'maximized';
  
  // Handlers
  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newState: SubFlowViewState = isCollapsed ? 'expanded' : 'collapsed';
    onViewStateChange?.(subFlow.id, newState);
  }, [isCollapsed, onViewStateChange, subFlow.id]);
  
  const handleMaximize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onViewStateChange?.(subFlow.id, isMaximized ? 'expanded' : 'maximized');
  }, [isMaximized, onViewStateChange, subFlow.id]);
  
  const handleSettings = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSettings?.(subFlow.id);
  }, [onSettings, subFlow.id]);
  
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(subFlow.id);
  }, [onDelete, subFlow.id]);
  
  // Computed dimensions
  const width = subFlow.dimensions?.width ?? 400;
  const height = subFlow.dimensions?.height ?? 300;
  
  // Calculate handle positions for inputs and outputs
  const inputHandlePositions = useMemo(() => {
    return subFlow.inputs.map((port, index) => ({
      port,
      top: subFlow.inputs.length > 1 
        ? `${String(((index + 1) / (subFlow.inputs.length + 1)) * 100)}%`
        : '50%',
    }));
  }, [subFlow.inputs]);
  
  const outputHandlePositions = useMemo(() => {
    return subFlow.outputs.map((port, index) => ({
      port,
      top: subFlow.outputs.length > 1 
        ? `${String(((index + 1) / (subFlow.outputs.length + 1)) * 100)}%`
        : '50%',
    }));
  }, [subFlow.outputs]);
  
  // Handlers for port config
  const [configPort, setConfigPort] = useState<SubFlowInputPort | SubFlowOutputPort | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  const handlePortConfigure = useCallback((port: SubFlowInputPort | SubFlowOutputPort) => {
    setConfigPort(port);
    setIsConfigOpen(true);
  }, []);
  
  const handlePortDelete = useCallback((portId: string) => {
    onPortDelete?.(subFlow.id, portId);
  }, [onPortDelete, subFlow.id]);
  
  const handlePortCopyId = useCallback((portId: string) => {
    void navigator.clipboard.writeText(portId);
  }, []);
  
  const handlePortSave = useCallback((updates: Partial<SubFlowPort>) => {
    if (configPort) {
      onPortUpdate?.(subFlow.id, configPort.id, updates);
    }
    setIsConfigOpen(false);
    setConfigPort(null);
  }, [onPortUpdate, subFlow.id, configPort]);
  
  return (
    <div
      className={cn(
        'rounded-xl border-2 transition-all duration-200 relative',
        colors.bg,
        colors.border,
        selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : undefined,
        isExecuting ? 'animate-pulse' : undefined,
        hasError ? 'border-red-500' : undefined,
        isDropTarget ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-background border-blue-500' : undefined
      )}
      style={{ width, minHeight: typeof height === 'number' ? height : undefined }}
      onMouseEnter={() => { setIsHovered(true); }}
      onMouseLeave={() => { setIsHovered(false); }}
    >
      {/* Input Handles - with context menu support */}
      {inputHandlePositions.map(({ port, top }) => (
        <div 
          key={port.id}
          onClick={(e) => { e.stopPropagation(); }}
          onMouseDown={(e) => { e.stopPropagation(); }}
        >
          <PortContextMenu
            portId={port.id}
            portName={port.name}
            isInput={true}
            onConfigure={() => { handlePortConfigure(port); }}
            onDelete={() => { handlePortDelete(port.id); }}
            onCopy={() => { handlePortCopyId(port.id); }}
          >
            <Handle
              id={port.id}
              type="target"
              position={Position.Left}
              className={cn(
                '!w-3 !h-3 !border-2 !border-background rounded-full transition-transform hover:scale-125',
                portTypeColorMap[port.type] ?? 'bg-gray-500'
              )}
              style={{ top }}
            />
          </PortContextMenu>
        </div>
      ))}
      
      {/* Output Handles - with context menu support */}
      {outputHandlePositions.map(({ port, top }) => (
        <div 
          key={port.id}
          onClick={(e) => { e.stopPropagation(); }}
          onMouseDown={(e) => { e.stopPropagation(); }}
        >
          <PortContextMenu
            portId={port.id}
            portName={port.name}
            isInput={false}
            onConfigure={() => { handlePortConfigure(port); }}
            onDelete={() => { handlePortDelete(port.id); }}
            onCopy={() => { handlePortCopyId(port.id); }}
          >
            <Handle
              id={port.id}
              type="source"
              position={Position.Right}
              className={cn(
                '!w-3 !h-3 !border-2 !border-background rounded-full transition-transform hover:scale-125',
                portTypeColorMap[port.type] ?? 'bg-gray-500'
              )}
              style={{ top }}
            />
          </PortContextMenu>
        </div>
      ))}
      
      {/* Port Config Sheet */}
      {configPort && (
        <PortConfigSheet
          port={configPort}
          isOpen={isConfigOpen}
          onOpenChange={setIsConfigOpen}
          onSave={handlePortSave}
          onDelete={() => { handlePortDelete(configPort.id); }}
        />
      )}
      
      {/* Execution Progress */}
      {isExecuting && typeof executionProgress === 'number' && (
        <div
          className="absolute top-0 left-0 h-1 bg-primary rounded-t-xl transition-all"
          style={{ width: `${String(executionProgress)}%` }}
        />
      )}
      
      {/* Header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-t-lg border-b',
          colors.header
        )}
      >
        {/* Expand/Collapse Toggle */}
        <button
          onClick={handleToggleExpand}
          className="p-0.5 hover:bg-white/10 rounded transition-colors"
        >
          {subFlow.viewState === 'collapsed' ? (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        
        {/* Type Icon */}
        {subFlow.type === 'trigger' ? (
          <Zap className="w-4 h-4 text-purple-400" />
        ) : (
          <Code2 className="w-4 h-4 text-blue-400" />
        )}
        
        {/* Name */}
        <span className="font-medium text-sm flex-1 truncate">
          {subFlow.name}
        </span>
        
        {/* Type Badge */}
        <span
          className={cn(
            'text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider',
            subFlow.type === 'trigger'
              ? 'bg-purple-500/20 text-purple-300'
              : 'bg-blue-500/20 text-blue-300'
          )}
        >
          {subFlow.type}
        </span>
        
        {/* Controls (visible on hover) */}
        <div
          className={cn(
            'flex items-center gap-1 transition-opacity',
            isHovered || selected ? 'opacity-100' : 'opacity-0'
          )}
        >
          <button
            onClick={handleMaximize}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? (
              <Minimize2 className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
          <button
            onClick={handleSettings}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="Settings"
          >
            <Settings className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 hover:bg-red-500/20 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-400" />
          </button>
        </div>
      </div>
      
      {/* Body - Container for child nodes (rendered by React Flow) */}
      {!isCollapsed && (
        <div 
          className="relative rounded-b-lg overflow-visible"
          style={{
            // Fixed size for the body area - child nodes will be positioned within this
            minHeight: Math.max(100, (subFlow.dimensions?.height ?? 200) - 48), // Subtract header height
          }}
        >
          {/* Grid pattern background */}
          <div 
            className="absolute inset-0 bg-black/20 rounded-b-lg pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />
        </div>
      )}
      
      {/* Error Indicator */}
      {hasError && (
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
          !
        </div>
      )}
    </div>
  );
});

export default SubFlowNode;