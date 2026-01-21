/**
 * Schema Viewer Component
 *
 * Displays variable schemas in a tree structure for debugging.
 * Shows types, properties, and nested structures.
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@repo/ui/lib/utils';
import {
  ChevronDown,
  ChevronRight,
  Hash,
  Type,
  ToggleLeft,
  List,
  Braces,
  Circle,
  FileText,
  Calendar,
  HelpCircle,
  Layers,
} from 'lucide-react';
import type { VariableSchema, ObjectSchema, ArraySchema } from '../../../core/types/variable-schema';
import { SchemaHelpers } from '../../../core/types/variable-schema';

/**
 * Props for SchemaViewer
 */
export interface SchemaViewerProps {
  /** Schema to display */
  schema: VariableSchema;
  /** Optional title */
  title?: string;
  /** Root path for display */
  rootPath?: string;
  /** Maximum depth to expand by default */
  defaultExpandDepth?: number;
  /** Compact mode */
  compact?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Get icon for schema type
 */
function getTypeIcon(type: string) {
  switch (type) {
    case 'string':
      return <Type className="h-3 w-3 text-green-500" />;
    case 'number':
      return <Hash className="h-3 w-3 text-blue-500" />;
    case 'boolean':
      return <ToggleLeft className="h-3 w-3 text-purple-500" />;
    case 'array':
      return <List className="h-3 w-3 text-orange-500" />;
    case 'object':
      return <Braces className="h-3 w-3 text-cyan-500" />;
    case 'null':
      return <Circle className="h-3 w-3 text-gray-400" />;
    case 'file':
      return <FileText className="h-3 w-3 text-yellow-500" />;
    case 'date':
      return <Calendar className="h-3 w-3 text-pink-500" />;
    case 'union':
      return <Layers className="h-3 w-3 text-indigo-500" />;
    case 'record':
      return <Braces className="h-3 w-3 text-teal-500" />;
    default:
      return <HelpCircle className="h-3 w-3 text-gray-400" />;
  }
}

/**
 * Get color for schema type
 */
function getTypeColor(type: string): string {
  switch (type) {
    case 'string':
      return 'text-green-400';
    case 'number':
      return 'text-blue-400';
    case 'boolean':
      return 'text-purple-400';
    case 'array':
      return 'text-orange-400';
    case 'object':
      return 'text-cyan-400';
    case 'null':
      return 'text-gray-500';
    case 'file':
      return 'text-yellow-400';
    case 'date':
      return 'text-pink-400';
    case 'union':
      return 'text-indigo-400';
    case 'record':
      return 'text-teal-400';
    default:
      return 'text-gray-400';
  }
}

/**
 * Schema node in the tree
 */
interface SchemaNodeProps {
  name: string;
  schema: VariableSchema;
  path: string;
  depth: number;
  defaultExpandDepth: number;
  compact: boolean;
}

function SchemaNode({
  name,
  schema,
  path,
  depth,
  defaultExpandDepth,
  compact,
}: SchemaNodeProps) {
  const [expanded, setExpanded] = useState(depth < defaultExpandDepth);
  const hasChildren = SchemaHelpers.hasChildren(schema);
  const typeString = SchemaHelpers.getTypeString(schema);

  const toggleExpand = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  // Get children based on schema type
  const getChildren = (): { name: string; schema: VariableSchema }[] => {
    if (schema.type === 'object') {
      return Object.entries(schema.properties).map(
        ([key, value]) => ({
          name: key,
          schema: value,
        })
      );
    }
    if (schema.type === 'array') {
      return [{ name: '[index]', schema: schema.items }];
    }
    if (schema.type === 'record') {
      return [{ name: '[key]', schema: schema.valueType }];
    }
    if (schema.type === 'union') {
      return schema.oneOf.map((s, i) => ({
        name: `option ${String(i + 1)}`,
        schema: s,
      }));
    }
    return [];
  };

  const children = hasChildren ? getChildren() : [];
  const indentPx = depth * (compact ? 12 : 16);

  return (
    <div className="select-none">
      {/* Node row */}
      <div
        className={cn(
          'flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-muted/50',
          compact ? 'text-xs' : 'text-sm'
        )}
        style={{ paddingLeft: `${String(indentPx + 4)}px` }}
      >
        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            onClick={toggleExpand}
            className="flex h-4 w-4 items-center justify-center rounded hover:bg-muted"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* Type icon */}
        {getTypeIcon(schema.type)}

        {/* Property name */}
        <span className="font-medium text-foreground">{name}</span>

        {/* Separator */}
        <span className="text-muted-foreground">:</span>

        {/* Type string */}
        <span className={cn('font-mono', getTypeColor(schema.type))}>
          {typeString}
        </span>

        {/* Optional indicator */}
        {schema.optional && (
          <span className="text-muted-foreground text-xs">?</span>
        )}

        {/* Description tooltip */}
        {schema.description && !compact && (
          <span
            className="ml-auto max-w-[200px] truncate text-xs text-muted-foreground"
            title={schema.description}
          >
            {schema.description}
          </span>
        )}
      </div>

      {/* Children */}
      {expanded && children.length > 0 && (
        <div>
          {children.map((child, index) => (
            <SchemaNode
              key={`${path}.${child.name}-${String(index)}`}
              name={child.name}
              schema={child.schema}
              path={`${path}.${child.name}`}
              depth={depth + 1}
              defaultExpandDepth={defaultExpandDepth}
              compact={compact}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Main Schema Viewer component
 */
export function SchemaViewer({
  schema,
  title,
  rootPath = 'root',
  defaultExpandDepth = 2,
  compact = false,
  className,
}: SchemaViewerProps) {
  return (
    <div
      className={cn(
        'rounded-md border bg-background',
        compact ? 'p-2' : 'p-3',
        className
      )}
    >
      {title && (
        <div
          className={cn(
            'mb-2 border-b pb-2 font-semibold text-foreground',
            compact ? 'text-xs' : 'text-sm'
          )}
        >
          {title}
        </div>
      )}
      <div className="font-mono">
        <SchemaNode
          name={rootPath}
          schema={schema}
          path={rootPath}
          depth={0}
          defaultExpandDepth={defaultExpandDepth}
          compact={compact}
        />
      </div>
    </div>
  );
}

/**
 * Schema summary - compact inline display
 */
export interface SchemaSummaryProps {
  schema: VariableSchema;
  className?: string;
}

export function SchemaSummary({ schema, className }: SchemaSummaryProps) {
  const typeString = SchemaHelpers.getTypeString(schema);

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {getTypeIcon(schema.type)}
      <span className={cn('font-mono text-xs', getTypeColor(schema.type))}>
        {typeString}
      </span>
    </span>
  );
}
