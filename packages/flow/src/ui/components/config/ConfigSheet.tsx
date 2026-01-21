/**
 * Config Sheet Component
 * 
 * A slide-out panel for editing node configuration.
 * Uses the Sheet component from @repo/ui.
 * Supports both dynamic schema-based rendering and custom components.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@repo/ui/components/shadcn/sheet';
import { Button } from '@repo/ui/components/shadcn/button';
import type { FlowPlugin, NodeConfigProps } from '../../../core/types/plugin';
import type { FlowNode } from '../../../core/types/flow';
import { DynamicConfigRenderer } from './DynamicConfigRenderer';
import { ConfigSection, ConfigField, TextInput } from './ConfigComponents';

export interface ConfigSheetProps {
  /** Whether the sheet is open */
  open: boolean;
  /** Called when the sheet should close */
  onClose: () => void;
  /** The node being configured */
  node: FlowNode | null;
  /** The plugin for this node */
  plugin: FlowPlugin | null;
  /** Called when config changes */
  onChange: (nodeId: string, config: Record<string, unknown>) => void;
  /** Called when node should be deleted */
  onDelete?: (nodeId: string) => void;
  container?: React.ComponentPropsWithoutRef<typeof SheetContent>['container'];
}

/**
 * Config Sheet Component
 */
export function ConfigSheet({
  container,
  open,
  onClose,
  node,
  plugin,
  onChange,
  onDelete,
}: ConfigSheetProps) {
  const [config, setConfig] = useState<Record<string, unknown>>({});

  // Sync config when node changes
  useEffect(() => {
    if (node) {
      setConfig(node.config as Record<string, unknown>);
    }
  }, [node]);

  // Handle config change
  const handleConfigChange = useCallback((newConfig: Record<string, unknown>) => {
    setConfig(newConfig);
    if (node) {
      onChange(node.id, newConfig);
    }
  }, [node, onChange]);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (node && onDelete) {
      onDelete(node.id);
      onClose();
    }
  }, [node, onDelete, onClose]);

  // Get config values safely
  const getConfigString = (key: string, fallback = ''): string => {
    const val = config[key];
    if (typeof val === 'string') return val;
    return fallback;
  };

  // Don't render until we have node, plugin, AND container
  // The container check is critical because Radix Portal doesn't update
  // its container after initial mount (known bug)
  if (!node || !plugin || !container) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent container={container} side="right" className="w-[400px] sm:max-w-[400px] flex flex-col">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            {plugin.icon && (
              <span className="text-2xl">{plugin.icon}</span>
            )}
            <div>
              <SheetTitle>{node.label || plugin.name}</SheetTitle>
              <SheetDescription>{plugin.description}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-6 -mx-6 px-6">
          {/* Node Info Section */}
          <ConfigSection title="Node Info">
            <ConfigField label="Node ID" description="Unique identifier for this node">
              <div className="px-3 py-2 text-sm bg-muted rounded-md text-muted-foreground font-mono">
                {node.id}
              </div>
            </ConfigField>

            <ConfigField label="Label" description="Display name for this node">
              <TextInput
                value={getConfigString('label', node.label)}
                onChange={(value) => { handleConfigChange({ ...config, label: value }); }}
                placeholder={plugin.name}
              />
            </ConfigField>

            <ConfigField label="Description" description="Optional description">
              <TextInput
                value={getConfigString('description', node.description ?? '')}
                onChange={(value) => { handleConfigChange({ ...config, description: value }); }}
                placeholder="Add a description..."
              />
            </ConfigField>
          </ConfigSection>

          {/* Dynamic Config or Custom Component */}
          {plugin.dynamicConfigSchema ? (
            <DynamicConfigRenderer
              schema={plugin.dynamicConfigSchema}
              config={config}
              onChange={handleConfigChange}
            />
          ) : plugin.ConfigComponent ? (
            <plugin.ConfigComponent
              config={config as NodeConfigProps['config']}
              onChange={(newConfig) => { handleConfigChange(newConfig as Record<string, unknown>); }}
            />
          ) : (
            // Fallback: render based on plugin.config definition
            plugin.config && Object.keys(plugin.config).length > 0 && (
              <ConfigSection title="Configuration">
                {Object.entries(plugin.config).map(([key, schema]) => (
                  <ConfigField
                    key={key}
                    label={key}
                    description={schema.description}
                  >
                    <TextInput
                      value={getConfigString(key)}
                      onChange={(value) => { handleConfigChange({ ...config, [key]: value }); }}
                      placeholder={schema.description ?? ''}
                    />
                  </ConfigField>
                ))}
              </ConfigSection>
            )
          )}
        </div>

        {/* Footer */}
        <SheetFooter className="pt-4 border-t flex-row justify-between sm:justify-between">
          {onDelete && (
            <Button variant="destructive" onClick={handleDelete}>
              Delete Node
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className="ml-auto">
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
