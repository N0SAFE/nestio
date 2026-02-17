/**
 * Data Picker Builder
 *
 * A type-safe UI for selecting and transforming data from node inputs.
 * Used for transform nodes that need to pick specific fields from input data.
 * Provides visual field selection instead of string interpolation.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/shadcn/dialog';
import { Button } from '@repo/ui/components/shadcn/button';
import { Badge } from '@repo/ui/components/shadcn/badge';
import { Input } from '@repo/ui/components/shadcn/input';
import { Label } from '@repo/ui/components/shadcn/label';
import { ScrollArea } from '@repo/ui/components/shadcn/scroll-area';
import { cn } from '@repo/ui/lib/utils';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  GripVertical,
  Check,
  Braces,
  ArrowRight,
} from 'lucide-react';

import type { VariableSchema, VariableDefinition } from '../../../core/types/variable-schema';
import { SchemaHelpers } from '../../../core/types/variable-schema';

/**
 * A single field pick operation
 */
export interface FieldPick {
  /** Unique ID for this pick */
  id: string;
  /** Source path in dot notation (e.g., "user.profile.name") */
  sourcePath: string;
  /** Target key in output object */
  targetKey: string;
  /** Optional default value if source is undefined */
  defaultValue?: unknown;
  /** Optional transform function name */
  transform?: string;
}

/**
 * Data picker configuration
 */
export interface DataPickerConfig {
  /** Mode: pick specific fields or spread all with exclusions */
  mode: 'pick' | 'spread' | 'merge';
  /** Fields to pick (in pick mode) */
  picks?: FieldPick[];
  /** Fields to exclude (in spread mode) */
  excludes?: string[];
  /** Sources to merge (in merge mode) */
  mergeSources?: string[];
}

export interface DataPickerBuilderProps {
  /** Current configuration */
  value: DataPickerConfig;
  /** Callback when configuration changes */
  onChange: (config: DataPickerConfig) => void;
  /** Available variables with their schemas */
  variables: VariableDefinition[];
  /** Source node schema (the input to transform) */
  sourceSchema?: VariableSchema;
  /** Whether the builder is disabled */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Schema tree node for field selection
 */
interface SchemaTreeNode {
  path: string;
  name: string;
  schema: VariableSchema;
  children?: SchemaTreeNode[];
  expanded?: boolean;
}

/**
 * Build tree from schema
 */
function buildSchemaTree(
  schema: VariableSchema,
  parentPath = '',
  name = 'root'
): SchemaTreeNode {
  const path = parentPath ? `${parentPath}.${name}` : name;
  const node: SchemaTreeNode = {
    path,
    name,
    schema,
    children: [],
  };

  if (schema.type === 'object') {
    node.children = Object.entries(schema.properties).map(([key, childSchema]) =>
      buildSchemaTree(childSchema, path === 'root' ? '' : path, key)
    );
  } else if (schema.type === 'array') {
    // Show array items as [n] notation
    node.children = [
      buildSchemaTree(schema.items, path, '[*]'),
    ];
  }

  return node;
}

/**
 * Type badge for schema types
 */
function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    string: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    number: 'bg-green-500/20 text-green-400 border-green-500/30',
    boolean: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    object: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    array: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    null: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    any: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  };

  return (
    <Badge
      variant="outline"
      className={cn('text-[10px] font-mono', colors[type] ?? colors.any)}
    >
      {type}
    </Badge>
  );
}

/**
 * Schema field tree item
 */
function SchemaTreeItem({
  node,
  depth = 0,
  onSelect,
  selected,
}: {
  node: SchemaTreeNode;
  depth?: number;
  onSelect: (path: string, schema: VariableSchema) => void;
  selected: Set<string>;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selected.has(node.path);

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors',
          isSelected && 'bg-primary/20'
        )}
        style={{ paddingLeft: `${String(depth * 16 + 8)}px` }}
        onClick={() => {
          if (hasChildren) {
            setExpanded(!expanded);
          } else {
            onSelect(node.path, node.schema);
          }
        }}
      >
        {hasChildren ? (
          <button
            className="p-0.5 hover:bg-muted rounded"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}
        <span className="text-sm font-mono flex-1 truncate">{node.name}</span>
        <TypeBadge type={node.schema.type} />
        {!hasChildren && (
          <button
            className={cn(
              'p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity',
              isSelected ? 'opacity-100 text-primary' : 'hover:bg-muted'
            )}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(node.path, node.schema);
            }}
          >
            {isSelected ? (
              <Check className="h-3 w-3" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
          </button>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children?.map((child) => (
            <SchemaTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selected={selected}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Single pick editor row
 */
function PickRow({
  pick,
  onChange,
  onRemove,
  schema,
}: {
  pick: FieldPick;
  onChange: (pick: FieldPick) => void;
  onRemove: () => void;
  schema?: VariableSchema;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/30 group">
      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
      
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[120px]">
          {pick.sourcePath}
        </code>
        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
        {editing ? (
          <Input
            value={pick.targetKey}
            onChange={(e) => {onChange({ ...pick, targetKey: e.target.value })}}
            onBlur={() => {setEditing(false)}}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setEditing(false);
            }}
            className="h-6 text-xs w-24"
            autoFocus
          />
        ) : (
          <code
            className="text-xs bg-primary/20 text-primary px-2 py-1 rounded cursor-pointer hover:bg-primary/30 transition-colors truncate max-w-[120px]"
            onClick={() => {setEditing(true)}}
          >
            {pick.targetKey}
          </code>
        )}
      </div>

      {schema && (
        <TypeBadge type={schema.type} />
      )}

      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onRemove}
      >
        <Trash2 className="h-3 w-3 text-destructive" />
      </Button>
    </div>
  );
}

/**
 * Data Picker Builder component
 */
export function DataPickerBuilder({
  value,
  onChange,
  sourceSchema,
  disabled,
  className,
}: DataPickerBuilderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  // Build schema tree from source schema
  const schemaTree = useMemo(() => {
    if (!sourceSchema) return null;
    return buildSchemaTree(sourceSchema, '', 'input');
  }, [sourceSchema]);

  // Track selected paths
  const selectedPaths = useMemo(() => {
    return new Set(value.picks?.map((p) => p.sourcePath) ?? []);
  }, [value.picks]);

  // Handle field selection
  const handleFieldSelect = useCallback(
    (path: string) => {
      const picks = value.picks ?? [];
      const existingIndex = picks.findIndex((p) => p.sourcePath === path);

      if (existingIndex >= 0) {
        // Remove if already selected
        onChange({
          ...value,
          picks: picks.filter((_, i) => i !== existingIndex),
        });
      } else {
        // Add new pick
        const pathParts = path.split('.');
        const targetKey = pathParts[pathParts.length - 1] ?? path;
        const newPick: FieldPick = {
          id: `pick-${String(Date.now())}`,
          sourcePath: path.replace(/^input\.?/, ''),
          targetKey: targetKey === '[*]' ? 'items' : targetKey,
        };
        onChange({
          ...value,
          mode: 'pick',
          picks: [...picks, newPick],
        });
      }
    },
    [value, onChange]
  );

  // Handle pick update
  const handlePickChange = useCallback(
    (index: number, updatedPick: FieldPick) => {
      const picks = [...(value.picks ?? [])];
      picks[index] = updatedPick;
      onChange({ ...value, picks });
    },
    [value, onChange]
  );

  // Handle pick removal
  const handlePickRemove = useCallback(
    (index: number) => {
      const picks = (value.picks ?? []).filter((_, i) => i !== index);
      onChange({ ...value, picks });
    },
    [value, onChange]
  );

  const picksCount = value.picks?.length ?? 0;

  return (
    <div className={cn('space-y-2', className)}>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="flex items-center gap-2">
              <Braces className="h-4 w-4" />
              {picksCount === 0
                ? 'Configure Field Mapping'
                : `${String(picksCount)} field${picksCount > 1 ? 's' : ''} mapped`}
            </span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Braces className="h-5 w-5" />
              Data Field Picker
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Schema Tree */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Available Fields</Label>
              <div className="border rounded-lg">
                <ScrollArea className="h-[400px]">
                  {schemaTree ? (
                    <div className="p-2">
                      {schemaTree.children?.map((child) => (
                        <SchemaTreeItem
                          key={child.path}
                          node={child}
                          onSelect={handleFieldSelect}
                          selected={selectedPaths}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No source schema available
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>

            {/* Selected Picks */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Field Mappings</Label>
              <div className="border rounded-lg">
                <ScrollArea className="h-[400px]">
                  <div className="p-2 space-y-2">
                    {value.picks && value.picks.length > 0 ? (
                      value.picks.map((pick, index) => {
                        // Try to get schema for this path
                        const pathSchema = sourceSchema
                          ? SchemaHelpers.getNestedSchema(sourceSchema, pick.sourcePath)
                          : undefined;

                        return (
                          <PickRow
                            key={pick.id}
                            pick={pick}
                            schema={pathSchema ?? undefined}
                            onChange={(updated) => {handlePickChange(index, updated)}}
                            onRemove={() => {handlePickRemove(index)}}
                          />
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        Click fields on the left to add mappings
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Preview */}
              {value.picks && value.picks.length > 0 && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Output Preview
                  </Label>
                  <pre className="text-xs font-mono">
                    {JSON.stringify(
                      Object.fromEntries(
                        value.picks.map((p) => [p.targetKey, `{{${p.sourcePath}}}`])
                      ),
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                onChange({ mode: 'pick', picks: [] });
              }}
            >
              Clear All
            </Button>
            <Button onClick={() => {setDialogOpen(false)}}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Compact Preview */}
      {picksCount > 0 && (
        <div className="text-xs text-muted-foreground space-y-1">
          {value.picks.slice(0, 3).map((pick) => (
            <div key={pick.id} className="flex items-center gap-1">
              <code className="px-1 bg-muted rounded">{pick.sourcePath}</code>
              <ArrowRight className="h-2.5 w-2.5" />
              <code className="px-1 bg-primary/20 text-primary rounded">
                {pick.targetKey}
              </code>
            </div>
          ))}
          {picksCount > 3 && (
            <div className="text-muted-foreground">
              +{picksCount - 3} more...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
