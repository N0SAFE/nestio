/**
 * InternalNode Component
 *
 * Represents a node inside a SubFlow canvas.
 * These are the action, condition, loop, transform, etc. nodes.
 */

import React, { memo, useCallback, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Zap,
  GitBranch,
  Repeat,
  Shuffle,
  Code,
  Timer,
  AlertTriangle,
  ArrowRightLeft,
  Layers,
  Settings,
  Trash2,
} from 'lucide-react';
import { cn } from '@repo/ui/lib/utils';
import type { InternalNodeType, InternalNodeData } from '../../../core/types/subflow';

// ============================================================================
// Types
// ============================================================================

export interface InternalNodeComponentData {
  type: InternalNodeType;
  pluginId: string;
  label: string;
  description?: string;
  data: InternalNodeData;
  config: Record<string, unknown>;
}

export interface InternalNodeComponentProps extends NodeProps<InternalNodeComponentData> {
  onSettings?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
}

// ============================================================================
// Icon & Color Mapping
// ============================================================================

const nodeTypeConfig: Record<InternalNodeType, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  'input-port': {
    icon: ArrowRightLeft,
    color: 'text-green-400',
    bg: 'bg-green-950/50',
    border: 'border-green-500/30',
  },
  'output-port': {
    icon: ArrowRightLeft,
    color: 'text-blue-400',
    bg: 'bg-blue-950/50',
    border: 'border-blue-500/30',
  },
  'action': {
    icon: Zap,
    color: 'text-purple-400',
    bg: 'bg-purple-950/50',
    border: 'border-purple-500/30',
  },
  'condition': {
    icon: GitBranch,
    color: 'text-amber-400',
    bg: 'bg-amber-950/50',
    border: 'border-amber-500/30',
  },
  'loop': {
    icon: Repeat,
    color: 'text-cyan-400',
    bg: 'bg-cyan-950/50',
    border: 'border-cyan-500/30',
  },
  'transform': {
    icon: Shuffle,
    color: 'text-indigo-400',
    bg: 'bg-indigo-950/50',
    border: 'border-indigo-500/30',
  },
  'code': {
    icon: Code,
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/50',
    border: 'border-emerald-500/30',
  },
  'subflow-call': {
    icon: Layers,
    color: 'text-pink-400',
    bg: 'bg-pink-950/50',
    border: 'border-pink-500/30',
  },
  'parallel': {
    icon: Layers,
    color: 'text-violet-400',
    bg: 'bg-violet-950/50',
    border: 'border-violet-500/30',
  },
  'delay': {
    icon: Timer,
    color: 'text-sky-400',
    bg: 'bg-sky-950/50',
    border: 'border-sky-500/30',
  },
  'error-handler': {
    icon: AlertTriangle,
    color: 'text-red-400',
    bg: 'bg-red-950/50',
    border: 'border-red-500/30',
  },
};

const stateColorMap: Record<string, string> = {
  idle: 'ring-transparent',
  running: 'ring-yellow-500 animate-pulse',
  success: 'ring-green-500',
  error: 'ring-red-500',
  warning: 'ring-amber-500',
};

// ============================================================================
// InternalNode Component
// ============================================================================

export const InternalNodeComponent = memo(function InternalNodeComponent({
  id,
  data,
  selected,
  onSettings,
  onDelete,
}: InternalNodeComponentProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const config = nodeTypeConfig[data.type] ?? nodeTypeConfig.action;
  const Icon = config.icon;
  const state = data.data.state ?? 'idle';
  
  const handleSettings = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSettings?.(id);
  }, [id, onSettings]);
  
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(id);
  }, [id, onDelete]);
  
  return (
    <div
      className={cn(
        'rounded-lg border-2 min-w-[140px] transition-all duration-200',
        config.bg,
        config.border,
        selected && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
        stateColorMap[state]
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-white/80 !border-2 !border-background"
      />
      
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <Icon className={cn('w-4 h-4', config.color)} />
        <span className="font-medium text-sm flex-1 truncate">
          {data.label}
        </span>
        
        {/* Controls */}
        <div
          className={cn(
            'flex items-center gap-1 transition-opacity',
            isHovered || selected ? 'opacity-100' : 'opacity-0'
          )}
        >
          <button
            onClick={handleSettings}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="Settings"
          >
            <Settings className="w-3 h-3 text-muted-foreground" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 hover:bg-red-500/20 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3 h-3 text-muted-foreground hover:text-red-400" />
          </button>
        </div>
      </div>
      
      {/* Description (if exists) */}
      {data.description && (
        <div className="px-3 pb-2">
          <p className="text-xs text-muted-foreground truncate">
            {data.description}
          </p>
        </div>
      )}
      
      {/* State indicator */}
      {state !== 'idle' && (
        <div
          className={cn(
            'absolute -top-1 -right-1 w-3 h-3 rounded-full',
            state === 'running' && 'bg-yellow-500 animate-pulse',
            state === 'success' && 'bg-green-500',
            state === 'error' && 'bg-red-500',
            state === 'warning' && 'bg-amber-500'
          )}
        />
      )}
      
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-white/80 !border-2 !border-background"
      />
    </div>
  );
});

export default InternalNodeComponent;
