/**
 * Flow Node Component
 * 
 * Individual node in the flow editor with dynamic input/output ports
 * Styled like shadcn-next-workflows NodeCard
 */

import React, { memo, useMemo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { BaseNode, BaseNodeHeader, BaseNodeContent, BaseNodeFooter } from '@repo/ui/components/base-node';
import { BaseHandle } from '@repo/ui/components/base-handle';
import { NodeCardDescription } from '@repo/ui/components/node-card-description';
import { Settings, Trash2, Play, Check, XCircle } from 'lucide-react';
import type { FlowNodeData } from '../../types';
import type { PortDefinition } from '../../../core/types/plugin';
import { pluginRegistry } from '../../../core/plugins/registry';
import { getPluginIcon } from '../../constants/plugin-icons';
import type { GradientColorKey } from '../../constants/gradient-colors';

interface FlowNodeProps extends NodeProps<FlowNodeData> {
  onSettings?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
}

export const FlowNode = memo<FlowNodeProps>(({ data, selected, id, onSettings, onDelete }) => {
  const { node, executing, completed, error, errorMessage } = data;

  // Check if this is a SubFlow node
  const isSubFlowNode = node.pluginId.startsWith('subflow:');
  
  // Get plugin to access port definitions and custom component
  const plugin = useMemo(() => {
    if (isSubFlowNode) return undefined; // SubFlow nodes don't have plugins
    return pluginRegistry.get(node.pluginId);
  }, [node.pluginId, isSubFlowNode]);

  // Calculate input ports
  const inputPorts = useMemo((): PortDefinition[] => {
    if (!plugin) return [{ id: 'default', label: 'In', type: 'flow' }];
    
    const staticPorts = plugin.inputs?.static || [];
    const dynamicPorts = plugin.inputs?.dynamic?.(node.config) || [];
    
    // If no ports defined, use default
    if (staticPorts.length === 0 && dynamicPorts.length === 0) {
      return [{ id: 'default', label: 'In', type: 'flow' }];
    }
    
    return [...staticPorts, ...dynamicPorts];
  }, [plugin, node.config]);

  // Calculate output ports
  const outputPorts = useMemo((): PortDefinition[] => {
    if (!plugin) return [{ id: 'default', label: 'Out', type: 'flow' }];
    
    const staticPorts = plugin.outputs?.static || [];
    const dynamicPorts = plugin.outputs?.dynamic?.(node.config) || [];
    
    // If no ports defined, use default
    if (staticPorts.length === 0 && dynamicPorts.length === 0) {
      return [{ id: 'default', label: 'Out', type: 'flow' }];
    }
    
    return [...staticPorts, ...dynamicPorts];
  }, [plugin, node.config]);

  // Get icon configuration from plugin ID
  const iconConfig = useMemo(() => {
    if (isSubFlowNode) {
      // SubFlow nodes get special icons based on their type
      const subFlowType = node.config?.subFlowType;
      const triggerType = node.config?.triggerType;
      
      if (subFlowType === 'trigger') {
        // Trigger SubFlows use trigger-specific icons
        if (triggerType === 'manual') return { icon: 'play', gradientColor: 'purple' as GradientColorKey };
        if (triggerType === 'webhook') return { icon: 'webhook', gradientColor: 'purple' as GradientColorKey };
        if (triggerType === 'schedule') return { icon: 'clock', gradientColor: 'purple' as GradientColorKey };
        return { icon: 'zap', gradientColor: 'purple' as GradientColorKey };
      }
      
      // Callable SubFlows use code icon
      return { icon: 'code', gradientColor: 'blue' as GradientColorKey };
    }
    
    return getPluginIcon(node.pluginId);
  }, [node.pluginId, isSubFlowNode, node.config]);

  // Determine node gradient color based on status (overrides plugin default)
  const gradientColor: string = useMemo(() => {
    if (error) return 'from-red-700';
    if (executing) return 'from-blue-700';
    if (completed) return 'from-green-700';
    if (iconConfig.gradientColor) return `from-${iconConfig.gradientColor}-700`;
    return 'from-primary/40';
  }, [error, executing, completed, iconConfig.gradientColor]);

  // Custom node component if provided
  if (plugin?.NodeComponent) {
    return (
      <div className={`flow-node-custom ${selected ? 'selected' : ''}`}>
        <plugin.NodeComponent
          id={node.id}
          data={{
            label: node.label,
            config: node.config,
            state: executing ? 'running' : completed ? 'success' : error ? 'error' : 'idle',
            error: error ? new Error(errorMessage) : undefined,
            pluginName: plugin.name,
            type: node.type,
          }}
          selected={selected}
        />
      </div>
    );
  }

  return (
    <BaseNode data-selected={selected}>
      {/* Input Handles - positioned on the left side */}
      {inputPorts.map((port, index) => {
        const total = inputPorts.length;
        // For single port, center it. For multiple, distribute evenly
        const topPercent = total === 1 ? 50 : 20 + (index / Math.max(total - 1, 1)) * 60;
        
        return (
          <BaseHandle
            key={port.id}
            type="target"
            position={Position.Left}
            id={port.id}
            style={{ top: `${topPercent}%` }}
            title={port.description || port.label}
          />
        );
      })}

      <BaseNodeHeader
        icon={iconConfig.icon}
        title={node.label ?? plugin?.name ?? node.pluginId}
        gradientColor={gradientColor}
        actions={
          <>
            <button
              type="button"
              className="size-7 flex items-center justify-center hover:bg-card-foreground/10 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onSettings?.(id);
              }}
            >
              <Settings className="size-4" />
            </button>
            <button
              type="button"
              className="size-7 flex items-center justify-center hover:bg-card-foreground/10 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(id);
              }}
            >
              <Trash2 className="size-4 text-red-500" />
            </button>
          </>
        }
      />

      <BaseNodeContent>
        {/* Node description */}
        {node.description && (
          <div className="px-4 py-2">
            <div className="text-xs font-medium text-card-foreground">
              Message Content
            </div>
            <div className="line-clamp-4 mt-2 text-sm leading-snug text-card-foreground/80">
              {node.description}
            </div>
          </div>
        )}

        {/* Plugin description */}
        {plugin?.description && !node.description && (
          <NodeCardDescription description={plugin.description} />
        )}

        {/* Status Indicator */}
        {(executing || completed || error) && (
          <div className="px-4 py-2">
            {executing && (
              <div className="flex items-center gap-2 text-xs text-blue-500">
                <Play className="size-3 animate-pulse" />
                <span className="font-medium">Executing...</span>
              </div>
            )}
            {completed && (
              <div className="flex items-center gap-2 text-xs text-green-500">
                <Check className="size-3" />
                <span className="font-medium">Completed</span>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-500">
                <XCircle className="size-3" />
                <span className="font-medium">{errorMessage || 'Error'}</span>
              </div>
            )}
          </div>
        )}

        {/* Port information */}
        {(inputPorts.length > 1 || outputPorts.length > 1) && (
          <div className="px-4 py-2 text-[10px] text-card-foreground/60">
            {inputPorts.length > 1 && (
              <div>
                <span className="font-semibold">Inputs:</span> {inputPorts.map(p => p.label).join(', ')}
              </div>
            )}
            {outputPorts.length > 1 && (
              <div>
                <span className="font-semibold">Outputs:</span> {outputPorts.map(p => p.label).join(', ')}
              </div>
            )}
          </div>
        )}
      </BaseNodeContent>

      <BaseNodeFooter nodeId={id} />

      {/* Output Handles - positioned on the right side */}
      {outputPorts.map((port, index) => {
        const total = outputPorts.length;
        // For single port, center it. For multiple, distribute evenly
        const topPercent = total === 1 ? 50 : 20 + (index / Math.max(total - 1, 1)) * 60;
        
        return (
          <BaseHandle
            key={port.id}
            type="source"
            position={Position.Right}
            id={port.id}
            style={{ top: `${topPercent}%` }}
            title={port.description ?? port.label}
          />
        );
      })}
    </BaseNode>
  );
});

FlowNode.displayName = 'FlowNode';
