/**
 * Edge Debug Context Menu
 *
 * Context menu for edges showing input/output schemas of connected nodes.
 * Used in debug mode to inspect data flow between nodes.
 */

import React, { useState, useCallback, useMemo, createContext, useContext } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@repo/ui/components/shadcn/context-menu';
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@repo/ui/components/shadcn/dropdown-menu';

// Context to determine which menu components to use
const MenuVariantContext = createContext<'context' | 'dropdown'>('context');

// Polymorphic menu components that switch between Context and Dropdown variants
function MenuLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  const variant = useContext(MenuVariantContext);
  return variant === 'dropdown' 
    ? <DropdownMenuLabel className={className}>{children}</DropdownMenuLabel>
    : <ContextMenuLabel className={className}>{children}</ContextMenuLabel>;
}

function MenuSeparator() {
  const variant = useContext(MenuVariantContext);
  return variant === 'dropdown' ? <DropdownMenuSeparator /> : <ContextMenuSeparator />;
}

function MenuItem({ children, className, disabled, onClick }: { 
  children: React.ReactNode; 
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const variant = useContext(MenuVariantContext);
  return variant === 'dropdown'
    ? <DropdownMenuItem className={className} disabled={disabled} onClick={onClick}>{children}</DropdownMenuItem>
    : <ContextMenuItem className={className} disabled={disabled} onClick={onClick}>{children}</ContextMenuItem>;
}

function MenuSub({ children }: { children: React.ReactNode }) {
  const variant = useContext(MenuVariantContext);
  return variant === 'dropdown'
    ? <DropdownMenuSub>{children}</DropdownMenuSub>
    : <ContextMenuSub>{children}</ContextMenuSub>;
}

function MenuSubTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
  const variant = useContext(MenuVariantContext);
  return variant === 'dropdown'
    ? <DropdownMenuSubTrigger className={className}>{children}</DropdownMenuSubTrigger>
    : <ContextMenuSubTrigger className={className}>{children}</ContextMenuSubTrigger>;
}

function MenuSubContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const variant = useContext(MenuVariantContext);
  return variant === 'dropdown'
    ? <DropdownMenuSubContent className={className}>{children}</DropdownMenuSubContent>
    : <ContextMenuSubContent className={className}>{children}</ContextMenuSubContent>;
}
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/shadcn/dialog';
import { Badge } from '@repo/ui/components/shadcn/badge';
import { ScrollArea } from '@repo/ui/components/shadcn/scroll-area';
import { cn } from '@repo/ui/lib/utils';
import {
  ArrowRight,
  ArrowDown,
  Database,
  Eye,
  Code,
  Copy,
  Check,
  Braces,
  FileJson,
  AlertCircle,
  Clock,
} from 'lucide-react';

import type { FlowNode, FlowEdge } from '../../../core/types/flow';
import type { FlowPlugin } from '../../../core/types/plugin';
import type { NodeExecutionContext } from '../../../core/types/context';
import { SchemaViewer } from './SchemaViewer';

/**
 * Props for EdgeDebugContextMenu
 */
export interface EdgeDebugContextMenuProps {
  /** Children to wrap with context menu (not needed when asContent=true) */
  children?: React.ReactNode;
  /** The edge being inspected */
  edge: FlowEdge;
  /** Source node */
  sourceNode: FlowNode;
  /** Target node */
  targetNode: FlowNode;
  /** Source node plugin */
  sourcePlugin?: FlowPlugin;
  /** Target node plugin */
  targetPlugin?: FlowPlugin;
  /** Source node execution context (if executed) */
  sourceContext?: NodeExecutionContext;
  /** Target node execution context (if executed) */
  targetContext?: NodeExecutionContext;
  /** Whether debug mode is enabled */
  debugMode?: boolean;
  /** If true, renders only the menu content (for use inside DropdownMenuContent) */
  asContent?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Format duration in human readable form
 */
function formatDuration(ms?: number): string {
  if (ms === undefined) return 'N/A';
  if (ms < 1000) return `${String(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format JSON with syntax highlighting
 */
function JsonViewer({ data }: { data: unknown }) {
  const jsonString = useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);

  return (
    <pre className="rounded-md bg-muted p-3 text-xs font-mono overflow-auto max-h-[300px]">
      <code>{jsonString}</code>
    </pre>
  );
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: NodeExecutionContext['status'] }) {
  const variants: Record<string, string> = {
    pending: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    running: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
    skipped: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  };

  return (
    <Badge variant="outline" className={cn('text-xs', variants[status])}>
      {status}
    </Badge>
  );
}

/**
 * Node info panel for the dialog
 */
function NodeInfoPanel({
  title,
  node,
  plugin,
  context,
  position,
}: {
  title: string;
  node: FlowNode;
  plugin?: FlowPlugin;
  context?: NodeExecutionContext;
  position: 'source' | 'target';
}) {
  const [copied, setCopied] = useState(false);
  const schema = plugin?.variableOutputSchema;

  const handleCopy = useCallback((data: unknown) => {
    void navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md',
              position === 'source'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-green-500/20 text-green-400'
            )}
          >
            {position === 'source' ? (
              <ArrowRight className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )}
          </div>
          <div>
            <div className="font-semibold text-sm">{title}</div>
            <div className="text-xs text-muted-foreground">{node.label}</div>
          </div>
        </div>
        {context && <StatusBadge status={context.status} />}
      </div>

      {/* Node Info */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Node ID:</span>
          <span className="ml-1 font-mono">{node.id}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Plugin:</span>
          <span className="ml-1">{plugin?.name ?? node.pluginId}</span>
        </div>
        {context?.duration !== undefined && (
          <div>
            <span className="text-muted-foreground">Duration:</span>
            <span className="ml-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(context.duration)}
            </span>
          </div>
        )}
      </div>

      {/* Schema Section */}
      {schema && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Braces className="h-3 w-3" />
            Output Schema
          </div>
          <SchemaViewer
            schema={schema.output}
            compact
            defaultExpandDepth={1}
            className="text-xs"
          />
        </div>
      )}

      {/* Actual Data Section (if executed) */}
      {context && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Database className="h-3 w-3" />
              {position === 'source' ? 'Output Data' : 'Input Data'}
            </div>
            <button
              onClick={() => {
                handleCopy(
                  position === 'source' ? context.outputs : context.inputs
                );
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              Copy
            </button>
          </div>
          <JsonViewer
            data={position === 'source' ? context.outputs : context.inputs}
          />
        </div>
      )}

      {/* Error Section */}
      {context?.error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2">
          <div className="flex items-center gap-2 text-xs font-medium text-red-400">
            <AlertCircle className="h-3 w-3" />
            Error
          </div>
          <div className="mt-1 text-xs text-red-300">
            {context.error.message}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Main Edge Debug Context Menu component
 */
export function EdgeDebugContextMenu({
  children,
  edge,
  sourceNode,
  targetNode,
  sourcePlugin,
  targetPlugin,
  sourceContext,
  targetContext,
  debugMode = true,
  asContent = false,
  className,
}: EdgeDebugContextMenuProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  // Get schemas
  const sourceSchema = sourcePlugin?.variableOutputSchema?.output;

  if (!debugMode) {
    return <>{children}</>;
  }

  // Menu content (shared between ContextMenu and asContent modes)
  const menuContent = (
    <>
      <MenuLabel className="flex items-center gap-2">
        <Braces className="h-4 w-4" />
        Edge Debug Info
      </MenuLabel>
      <MenuSeparator />

      {/* Source Node Info */}
      <MenuSub>
        <MenuSubTrigger className="flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-blue-400" />
          <span className="truncate">{sourceNode.label}</span>
          {sourceContext && (
            <StatusBadge status={sourceContext.status} />
          )}
        </MenuSubTrigger>
        <MenuSubContent className="w-72">
          <MenuLabel>Output Schema</MenuLabel>
          {sourceSchema ? (
            <div className="p-2">
              <SchemaViewer
                schema={sourceSchema}
                compact
                defaultExpandDepth={2}
              />
            </div>
          ) : (
            <MenuItem disabled>No schema defined</MenuItem>
          )}
          <MenuSeparator />
          {sourceContext && (
            <>
              <MenuLabel>Output Data</MenuLabel>
              <div className="max-h-40 overflow-auto p-2">
                <JsonViewer data={sourceContext.outputs} />
              </div>
            </>
          )}
        </MenuSubContent>
      </MenuSub>

      {/* Target Node Info */}
      <MenuSub>
            <MenuSubTrigger className="flex items-center gap-2">
              <ArrowDown className="h-4 w-4 text-green-400" />
              <span className="truncate">{targetNode.label}</span>
              {targetContext && (
                <StatusBadge status={targetContext.status} />
              )}
            </MenuSubTrigger>
            <MenuSubContent className="w-72">
              <MenuLabel>Input Data</MenuLabel>
              {targetContext ? (
                <div className="max-h-40 overflow-auto p-2">
                  <JsonViewer data={targetContext.inputs} />
                </div>
              ) : (
                <MenuItem disabled>Not yet executed</MenuItem>
              )}
            </MenuSubContent>
          </MenuSub>

          <MenuSeparator />

          {/* Quick Actions */}
          <MenuItem
            onClick={() => {
              setDialogOpen(true);
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            View Full Details
          </MenuItem>

          <MenuItem
            onClick={() => {
              const data = {
                edge,
                sourceNode: {
                  id: sourceNode.id,
                  label: sourceNode.label,
                  schema: sourceSchema,
                  outputs: sourceContext?.outputs,
                },
                targetNode: {
                  id: targetNode.id,
                  label: targetNode.label,
                  inputs: targetContext?.inputs,
                },
              };
              void navigator.clipboard.writeText(JSON.stringify(data, null, 2));
            }}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Debug Info
          </MenuItem>

          <MenuItem
            onClick={() => {
              console.log('[Debug] Edge Info:', {
                edge,
                sourceNode,
                targetNode,
                sourceSchema,
                sourceContext,
                targetContext,
              });
            }}
          >
            <Code className="mr-2 h-4 w-4" />
            Log to Console
          </MenuItem>
    </>
  );

  // If asContent mode, just return the menu items directly (for DropdownMenu usage)
  if (asContent) {
    return (
      <MenuVariantContext.Provider value="dropdown">
        {menuContent}
        {/* Full Details Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Braces className="h-5 w-5" />
                Edge Debug Details
                <Badge variant="outline" className="ml-2">
                  {sourceNode.label} → {targetNode.label}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh]">
              <div className="grid gap-6 md:grid-cols-2 p-4">
                {/* Source Node */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-blue-400" />
                      Source: {sourceNode.label}
                    </h3>
                    {sourceContext && <StatusBadge status={sourceContext.status} />}
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">
                        Output Schema
                      </h4>
                      {sourceSchema ? (
                        <SchemaViewer schema={sourceSchema} defaultExpandDepth={2} />
                      ) : (
                        <p className="text-xs text-muted-foreground">No schema</p>
                      )}
                    </div>
                    
                    {sourceContext && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-1">
                          Output Data
                        </h4>
                        <JsonViewer data={sourceContext.outputs} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Target Node */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <ArrowDown className="h-4 w-4 text-green-400" />
                      Target: {targetNode.label}
                    </h3>
                    {targetContext && <StatusBadge status={targetContext.status} />}
                  </div>
                  
                  <div className="space-y-3">
                    {targetContext && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-1">
                          Input Data
                        </h4>
                        <JsonViewer data={targetContext.inputs} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Edge Info */}
              <div className="border-t p-4">
                <h3 className="text-sm font-semibold mb-2">Edge Properties</h3>
                <div className="text-xs space-y-1">
                  <div>
                    <span className="text-muted-foreground">ID:</span>
                    <span className="ml-1 font-mono">{edge.id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Source:</span>
                    <span className="ml-1 font-mono">{edge.source}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Target:</span>
                    <span className="ml-1 font-mono">{edge.target}</span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </MenuVariantContext.Provider>
    );
  }

  // Default mode: wrap children with ContextMenu
  return (
    <>
      <ContextMenu>
        <div className={className}>{children}</div>
        <ContextMenuContent className="w-64">
          {menuContent}
        </ContextMenuContent>
      </ContextMenu>

      {/* Full Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Braces className="h-5 w-5" />
              Edge Debug Details
              <Badge variant="outline" className="ml-2">
                {sourceNode.label} → {targetNode.label}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="grid gap-6 md:grid-cols-2 p-4">
              {/* Source Node */}
              <div className="rounded-lg border p-4">
                <NodeInfoPanel
                  title="Source Node"
                  node={sourceNode}
                  plugin={sourcePlugin}
                  context={sourceContext}
                  position="source"
                />
              </div>

              {/* Target Node */}
              <div className="rounded-lg border p-4">
                <NodeInfoPanel
                  title="Target Node"
                  node={targetNode}
                  plugin={targetPlugin}
                  context={targetContext}
                  position="target"
                />
              </div>
            </div>

            {/* Edge Info */}
            <div className="border-t p-4">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <FileJson className="h-4 w-4" />
                Edge Configuration
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Edge ID:</span>
                  <span className="ml-1 font-mono">{edge.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Source Handle:</span>
                  <span className="ml-1 font-mono">
                    {edge.sourceHandle ?? 'default'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Target Handle:</span>
                  <span className="ml-1 font-mono">
                    {edge.targetHandle ?? 'default'}
                  </span>
                </div>
                {edge.condition && (
                  <div>
                    <span className="text-muted-foreground">Condition:</span>
                    <span className="ml-1 font-mono">
                      {JSON.stringify(edge.condition)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
