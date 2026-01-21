/**
 * PortNode Component
 *
 * Special node type that represents a SubFlow's input or output port
 * inside the SubFlow canvas. These nodes connect the external SubFlow
 * interface to the internal node graph.
 */

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { ArrowRight, ArrowLeft, Circle } from 'lucide-react';
import { cn } from '@repo/ui/lib/utils';
import type { InternalNodeType, PortType, PortDataType } from '../../../core/types/subflow';

// ============================================================================
// Types
// ============================================================================

export interface PortNodeData {
  type: InternalNodeType; // 'input-port' or 'output-port'
  pluginId: string;
  label: string;
  description?: string;
  config: {
    portType?: PortType;
    dataType?: PortDataType;
  };
  linkedPortId?: string;
}

export type PortNodeProps = NodeProps<PortNodeData>;

// ============================================================================
// Style Mapping
// ============================================================================

const portTypeStyles: Record<PortType, { color: string; bg: string; border: string }> = {
  trigger: {
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    border: 'border-green-500/40',
  },
  flow: {
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/40',
  },
  data: {
    color: 'text-purple-400',
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/40',
  },
  error: {
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    border: 'border-red-500/40',
  },
};

const dataTypeLabels: Record<PortDataType, string> = {
  string: 'str',
  number: 'num',
  boolean: 'bool',
  object: 'obj',
  array: 'arr',
  file: 'file',
  any: 'any',
};

// ============================================================================
// PortNode Component
// ============================================================================

export const PortNode = memo(function PortNode({
  data,
  selected,
}: PortNodeProps) {
  const isInput = data.type === 'input-port';
  const portType = data.config.portType ?? 'data';
  const dataType = data.config.dataType;
  const styles = portTypeStyles[portType] ?? portTypeStyles.data;
  
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-3 rounded-lg border-2 min-w-[120px]',
        styles.bg,
        styles.border,
        selected && 'ring-2 ring-primary ring-offset-1 ring-offset-background'
      )}
    >
      {/* Input Port: Has only output handle (data flows OUT of this node) */}
      {isInput && (
        <Handle
          type="source"
          position={Position.Right}
          className={cn(
            '!w-4 !h-4 !border-2 !border-background rounded-full',
            portType === 'trigger' && '!bg-green-500',
            portType === 'flow' && '!bg-blue-500',
            portType === 'data' && '!bg-purple-500',
            portType === 'error' && '!bg-red-500'
          )}
        />
      )}
      
      {/* Output Port: Has only input handle (data flows INTO this node) */}
      {!isInput && (
        <Handle
          type="target"
          position={Position.Left}
          className={cn(
            '!w-4 !h-4 !border-2 !border-background rounded-full',
            portType === 'trigger' && '!bg-green-500',
            portType === 'flow' && '!bg-blue-500',
            portType === 'data' && '!bg-purple-500',
            portType === 'error' && '!bg-red-500'
          )}
        />
      )}
      
      {/* Direction Icon */}
      {isInput ? (
        <ArrowRight className={cn('w-4 h-4', styles.color)} />
      ) : (
        <ArrowLeft className={cn('w-4 h-4', styles.color)} />
      )}
      
      {/* Port Info */}
      <div className="flex flex-col">
        <span className="font-medium text-sm">
          {data.label}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground uppercase">
            {isInput ? 'IN' : 'OUT'}
          </span>
          {dataType && (
            <>
              <Circle className="w-1 h-1 fill-current text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">
                {dataTypeLabels[dataType]}
              </span>
            </>
          )}
        </div>
      </div>
      
      {/* Port Type Badge */}
      <span
        className={cn(
          'ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium uppercase',
          styles.bg,
          styles.color
        )}
      >
        {portType}
      </span>
    </div>
  );
});

export default PortNode;
