/**
 * Node Debug Context Menu
 *
 * Context menu for nodes showing input/output schemas and execution data.
 * Used in debug mode to inspect node state and data flow.
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
  ContextMenuTrigger,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/components/shadcn/tabs';
import { cn } from '@repo/ui/lib/utils';
import {
  Braces,
  Database,
  Eye,
  Code,
  Copy,
  Check,
  ArrowDownToLine,
  ArrowUpFromLine,
  Settings,
  Clock,
  AlertCircle,
  Play,
  Pause,
  SkipForward,
  Trash2,
  RefreshCw,
} from 'lucide-react';

import type { FlowNode } from '../../../core/types/flow';
import type { FlowPlugin } from '../../../core/types/plugin';
import type { NodeExecutionContext } from '../../../core/types/context';
import { SchemaViewer } from './SchemaViewer';

/**
 * Props for NodeDebugContextMenu
 */
export interface NodeDebugContextMenuProps {
  /** Children to wrap with context menu (not needed when asContent=true) */
  children?: React.ReactNode;
  /** The node being inspected */
  node: FlowNode;
  /** Node plugin */
  plugin?: FlowPlugin;
  /** Node execution context (if executed) */
  context?: NodeExecutionContext;
  /** All available upstream contexts */
  upstreamContexts?: NodeExecutionContext[];
  /** Whether debug mode is enabled */
  debugMode?: boolean;
  /** Callback when user wants to run node in isolation */
  onRunNode?: (nodeId: string) => void;
  /** Callback when user wants to set a breakpoint */
  onToggleBreakpoint?: (nodeId: string) => void;
  /** Whether this node has a breakpoint */
  hasBreakpoint?: boolean;
  /** Callback to delete node */
  onDelete?: (nodeId: string) => void;
  /** Callback to duplicate node */
  onDuplicate?: (nodeId: string) => void;
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
 * Format JSON with pretty print
 */
function JsonViewer({ data, maxHeight = 200 }: { data: unknown; maxHeight?: number }) {
  const jsonString = useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);

  return (
    <pre
      className="rounded-md bg-muted p-3 text-xs font-mono overflow-auto"
      style={{ maxHeight }}
    >
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
    running: 'bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse',
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
 * Main Node Debug Context Menu component
 */
export function NodeDebugContextMenu({
  children,
  node,
  plugin,
  context,
  upstreamContexts = [],
  debugMode = true,
  onRunNode,
  onToggleBreakpoint,
  hasBreakpoint = false,
  onDelete,
  onDuplicate,
  asContent = false,
  className,
}: NodeDebugContextMenuProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get schemas
  const outputSchema = plugin?.variableOutputSchema?.output;
  const inputDefs = plugin?.inputs;

  const handleCopy = useCallback((data: unknown) => {
    void navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }, []);

  const handleCopyAll = useCallback(() => {
    const debugData = {
      node: {
        id: node.id,
        label: node.label,
        type: node.type,
        pluginId: node.pluginId,
        config: node.config,
      },
      plugin: plugin
        ? {
            name: plugin.name,
            version: plugin.version,
            outputSchema: plugin.variableOutputSchema,
          }
        : null,
      execution: context
        ? {
            status: context.status,
            duration: context.duration,
            inputs: context.inputs,
            outputs: context.outputs,
            error: context.error?.message,
          }
        : null,
    };
    handleCopy(debugData);
  }, [node, plugin, context, handleCopy]);

  if (!debugMode) {
    return <>{children}</>;
  }

  // Menu content (shared between ContextMenu and asContent modes)
  const menuContent = (
    <>
      {/* Header */}
      <MenuLabel className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Braces className="h-4 w-4" />
          <span className="truncate">{node.label}</span>
        </div>
        {context && <StatusBadge status={context.status} />}
      </MenuLabel>
      <MenuSeparator />

          {/* Schema Info */}
          <MenuSub>
            <MenuSubTrigger className="flex items-center gap-2">
              <ArrowDownToLine className="h-4 w-4 text-blue-400" />
              Input Schema
            </MenuSubTrigger>
            <MenuSubContent className="w-80">
              {inputDefs && Object.keys(inputDefs).length > 0 ? (
                <div className="p-2 space-y-2">
                  {Object.entries(inputDefs).map(([key, def]) => (
                    <div key={key} className="text-xs">
                      <span className="font-medium">{key}</span>
                      <span className="text-muted-foreground ml-1">
                        ({(def as { type?: string }).type})
                      </span>
                      {(def as { description?: string }).description && (
                        <p className="text-muted-foreground mt-0.5">
                          {(def as { description?: string }).description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <MenuItem disabled>No input schema defined</MenuItem>
              )}
            </MenuSubContent>
          </MenuSub>

          <MenuSub>
            <MenuSubTrigger className="flex items-center gap-2">
              <ArrowUpFromLine className="h-4 w-4 text-green-400" />
              Output Schema
            </MenuSubTrigger>
            <MenuSubContent className="w-80">
              {outputSchema ? (
                <div className="p-2">
                  <SchemaViewer
                    schema={outputSchema}
                    compact
                    defaultExpandDepth={2}
                  />
                </div>
              ) : (
                <MenuItem disabled>No output schema defined</MenuItem>
              )}
            </MenuSubContent>
          </MenuSub>

          {/* Execution Data */}
          {context && (
            <>
              <MenuSeparator />
              <MenuSub>
                <MenuSubTrigger className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Input Data
                </MenuSubTrigger>
                <MenuSubContent className="w-80">
                  <div className="max-h-48 overflow-auto p-2">
                    <JsonViewer data={context.inputs} />
                  </div>
                </MenuSubContent>
              </MenuSub>

              <MenuSub>
                <MenuSubTrigger className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Output Data
                </MenuSubTrigger>
                <MenuSubContent className="w-80">
                  <div className="max-h-48 overflow-auto p-2">
                    <JsonViewer data={context.outputs} />
                  </div>
                </MenuSubContent>
              </MenuSub>

              {context.duration !== undefined && (
                <MenuItem disabled className="text-xs">
                  <Clock className="mr-2 h-3 w-3" />
                  Duration: {formatDuration(context.duration)}
                </MenuItem>
              )}

              {context.error && (
                <MenuItem
                  className="text-red-400"
                  onClick={() => {
                    console.error('[Node Error]', context.error);
                  }}
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  View Error
                </MenuItem>
              )}
            </>
          )}

          <MenuSeparator />

          {/* Config */}
          <MenuSub>
            <MenuSubTrigger className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Node Config
            </MenuSubTrigger>
            <MenuSubContent className="w-80">
              <div className="max-h-48 overflow-auto p-2">
                <JsonViewer data={node.config} />
              </div>
            </MenuSubContent>
          </MenuSub>

          <MenuSeparator />

          {/* Actions */}
          <MenuItem
            onClick={() => {
              setDialogOpen(true);
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            View Full Details
          </MenuItem>

          <MenuItem onClick={handleCopyAll}>
            {copied ? (
              <Check className="mr-2 h-4 w-4 text-green-500" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            Copy Debug Info
          </MenuItem>

          <MenuItem
            onClick={() => {
              console.log('[Debug] Node Info:', {
                node,
                plugin,
                context,
                upstreamContexts,
              });
            }}
          >
            <Code className="mr-2 h-4 w-4" />
            Log to Console
          </MenuItem>

          <MenuSeparator />

          {/* Debug Controls */}
          {onRunNode && (
            <MenuItem
              onClick={() => {
                onRunNode(node.id);
              }}
            >
              <Play className="mr-2 h-4 w-4 text-green-400" />
              Run Node
            </MenuItem>
          )}

          {onToggleBreakpoint && (
            <MenuItem
              onClick={() => {
                onToggleBreakpoint(node.id);
              }}
            >
              {hasBreakpoint ? (
                <>
                  <SkipForward className="mr-2 h-4 w-4 text-yellow-400" />
                  Remove Breakpoint
                </>
              ) : (
                <>
                  <Pause className="mr-2 h-4 w-4 text-red-400" />
                  Add Breakpoint
                </>
              )}
            </MenuItem>
          )}

          {onDuplicate && (
            <MenuItem
              onClick={() => {
                onDuplicate(node.id);
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Duplicate Node
            </MenuItem>
          )}

          {onDelete && (
            <>
              <MenuSeparator />
              <MenuItem
                className="text-red-400 focus:text-red-400"
                onClick={() => {
                  onDelete(node.id);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Node
              </MenuItem>
            </>
          )}
    </>
  );

  // If asContent mode, just return the menu items directly (for DropdownMenu usage)
  if (asContent) {
    return (
      <MenuVariantContext.Provider value="dropdown">
        {menuContent}
        {/* Full Details Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Braces className="h-5 w-5" />
                {node.label}
                {context && <StatusBadge status={context.status} />}
                <Badge variant="secondary" className="ml-2">
                  {plugin?.name ?? node.pluginId}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="overview" className="flex-1">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="schema">Schema</TabsTrigger>
                <TabsTrigger value="data">Data</TabsTrigger>
                <TabsTrigger value="config">Config</TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[55vh] mt-4">
                {/* Overview Tab */}
                <TabsContent value="overview" className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border p-4">
                      <h3 className="text-sm font-semibold mb-2">Node Info</h3>
                      <div className="space-y-1 text-xs">
                        <div>
                          <span className="text-muted-foreground">ID:</span>
                          <span className="ml-1 font-mono">{node.id}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Type:</span>
                          <span className="ml-1">{node.type}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Plugin:</span>
                          <span className="ml-1">{node.pluginId}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Position:</span>
                          <span className="ml-1 font-mono">
                            ({node.position.x}, {node.position.y})
                          </span>
                        </div>
                      </div>
                    </div>

                    {context && (
                      <div className="rounded-lg border p-4">
                        <h3 className="text-sm font-semibold mb-2">Execution</h3>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Status:</span>
                            <StatusBadge status={context.status} />
                          </div>
                          <div>
                            <span className="text-muted-foreground">Duration:</span>
                            <span className="ml-1">
                              {formatDuration(context.duration)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Schema Tab */}
                <TabsContent value="schema" className="p-4 space-y-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <ArrowDownToLine className="h-4 w-4 text-blue-400" />
                        Input Schema
                      </h3>
                      {inputDefs && Object.keys(inputDefs).length > 0 ? (
                        <div className="rounded-lg border p-3 space-y-2">
                          {Object.entries(inputDefs).map(([key, def]) => (
                            <div key={key} className="text-xs">
                              <span className="font-medium">{key}</span>
                              <Badge variant="outline" className="ml-2 text-[10px]">
                                {(def as { type?: string }).type}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No inputs defined</p>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <ArrowUpFromLine className="h-4 w-4 text-green-400" />
                        Output Schema
                      </h3>
                      {outputSchema ? (
                        <div className="rounded-lg border p-3">
                          <SchemaViewer schema={outputSchema} defaultExpandDepth={3} />
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No output schema defined</p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Data Tab */}
                <TabsContent value="data" className="p-4 space-y-4">
                  {context ? (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold flex items-center gap-2">
                            <ArrowDownToLine className="h-4 w-4 text-blue-400" />
                            Input Data
                          </h3>
                          <button
                            onClick={() => { handleCopy(context.inputs); }}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                          >
                            <Copy className="h-3 w-3" />
                            Copy
                          </button>
                        </div>
                        <JsonViewer data={context.inputs} maxHeight={300} />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold flex items-center gap-2">
                            <ArrowUpFromLine className="h-4 w-4 text-green-400" />
                            Output Data
                          </h3>
                          <button
                            onClick={() => { handleCopy(context.outputs); }}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                          >
                            <Copy className="h-3 w-3" />
                            Copy
                          </button>
                        </div>
                        <JsonViewer data={context.outputs} maxHeight={300} />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground p-8">
                      Node has not been executed yet
                    </div>
                  )}
                </TabsContent>

                {/* Config Tab */}
                <TabsContent value="config" className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Node Configuration
                    </h3>
                    <button
                      onClick={() => { handleCopy(node.config); }}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                  </div>
                  <JsonViewer data={node.config} maxHeight={400} />
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </DialogContent>
        </Dialog>
      </MenuVariantContext.Provider>
    );
  }

  // Default mode: wrap children with ContextMenu
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className={cn('w-64', className)}>
          {menuContent}
        </ContextMenuContent>
      </ContextMenu>

      {/* Full Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Braces className="h-5 w-5" />
              {node.label}
              {context && <StatusBadge status={context.status} />}
              <Badge variant="secondary" className="ml-2">
                {plugin?.name ?? node.pluginId}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="overview" className="flex-1">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="schema">Schema</TabsTrigger>
              <TabsTrigger value="data">Data</TabsTrigger>
              <TabsTrigger value="config">Config</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[55vh] mt-4">
              {/* Overview Tab */}
              <TabsContent value="overview" className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-semibold mb-2">Node Info</h3>
                    <div className="space-y-1 text-xs">
                      <div>
                        <span className="text-muted-foreground">ID:</span>
                        <span className="ml-1 font-mono">{node.id}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Type:</span>
                        <span className="ml-1">{node.type}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Plugin:</span>
                        <span className="ml-1">{node.pluginId}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Position:</span>
                        <span className="ml-1 font-mono">
                          ({node.position.x}, {node.position.y})
                        </span>
                      </div>
                    </div>
                  </div>

                  {context && (
                    <div className="rounded-lg border p-4">
                      <h3 className="text-sm font-semibold mb-2">Execution</h3>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Status:</span>
                          <StatusBadge status={context.status} />
                        </div>
                        <div>
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="ml-1">
                            {formatDuration(context.duration)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Started:</span>
                          <span className="ml-1">
                            {context.startedAt.toLocaleTimeString()}
                          </span>
                        </div>
                        {context.completedAt && (
                          <div>
                            <span className="text-muted-foreground">
                              Completed:
                            </span>
                            <span className="ml-1">
                              {context.completedAt.toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {context?.error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-red-400 mb-2">
                      <AlertCircle className="h-4 w-4" />
                      Error
                    </div>
                    <pre className="text-xs text-red-300 whitespace-pre-wrap">
                      {context.error.message}
                      {context.error.stack && (
                        <>
                          {'\n\n'}
                          {context.error.stack}
                        </>
                      )}
                    </pre>
                  </div>
                )}
              </TabsContent>

              {/* Schema Tab */}
              <TabsContent value="schema" className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <ArrowDownToLine className="h-4 w-4 text-blue-400" />
                      Input Schema
                    </h3>
                    {inputDefs && Object.keys(inputDefs).length > 0 ? (
                      <div className="rounded-lg border p-3 space-y-2">
                        {Object.entries(inputDefs).map(([key, def]) => (
                          <div key={key} className="text-xs border-b pb-2 last:border-0 last:pb-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{key}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {(def as { type?: string }).type}
                              </Badge>
                              {(def as { required?: boolean }).required && (
                                <Badge variant="destructive" className="text-[10px]">
                                  required
                                </Badge>
                              )}
                            </div>
                            {(def as { description?: string }).description && (
                              <p className="text-muted-foreground mt-1">
                                {(def as { description?: string }).description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground p-3 border rounded-lg">
                        No input schema defined
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <ArrowUpFromLine className="h-4 w-4 text-green-400" />
                      Output Schema
                    </h3>
                    {outputSchema ? (
                      <SchemaViewer
                        schema={outputSchema}
                        defaultExpandDepth={3}
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground p-3 border rounded-lg">
                        No output schema defined
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Data Tab */}
              <TabsContent value="data" className="p-4 space-y-4">
                {context ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <ArrowDownToLine className="h-4 w-4 text-blue-400" />
                          Input Data
                        </h3>
                        <button
                          onClick={() => {
                            handleCopy(context.inputs);
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          <Copy className="h-3 w-3" />
                          Copy
                        </button>
                      </div>
                      <JsonViewer data={context.inputs} maxHeight={300} />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <ArrowUpFromLine className="h-4 w-4 text-green-400" />
                          Output Data
                        </h3>
                        <button
                          onClick={() => {
                            handleCopy(context.outputs);
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          <Copy className="h-3 w-3" />
                          Copy
                        </button>
                      </div>
                      <JsonViewer data={context.outputs} maxHeight={300} />
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground p-8">
                    Node has not been executed yet
                  </div>
                )}
              </TabsContent>

              {/* Config Tab */}
              <TabsContent value="config" className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Node Configuration
                  </h3>
                  <button
                    onClick={() => {
                      handleCopy(node.config);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </button>
                </div>
                <JsonViewer data={node.config} maxHeight={400} />
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
