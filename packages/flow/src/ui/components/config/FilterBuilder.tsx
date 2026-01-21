/**
 * Filter Builder
 *
 * A type-safe UI for filtering array data from node inputs.
 * Used for transform nodes that need to filter items based on field conditions.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/shadcn/select';
import { Input } from '@repo/ui/components/shadcn/input';
import { Label } from '@repo/ui/components/shadcn/label';
import { Switch } from '@repo/ui/components/shadcn/switch';
import { ScrollArea } from '@repo/ui/components/shadcn/scroll-area';
import { cn } from '@repo/ui/lib/utils';
import {
  ChevronRight,
  Plus,
  Trash2,
  Filter,
  ArrowRight,
} from 'lucide-react';

import type { VariableSchema, VariableDefinition } from '../../../core/types/variable-schema';
import type {
  ConditionConfig,
  ConditionOperator,
  LogicalOperator,
  ComparisonCondition,
  LogicalCondition,
} from '../../../core/types/condition';
import { SchemaHelpers } from '../../../core/types/variable-schema';

/**
 * Filter configuration for array filtering
 */
export interface FilterConfig {
  /** Whether filtering is enabled */
  enabled: boolean;
  /** Logical mode for combining conditions */
  mode: LogicalOperator;
  /** Individual filter conditions */
  conditions: FilterCondition[];
  /** Maximum items to return (optional) */
  limit?: number;
}

/**
 * A single filter condition
 */
export interface FilterCondition {
  /** Unique ID */
  id: string;
  /** Field path within each array item */
  field: string;
  /** Comparison operator */
  operator: ConditionOperator;
  /** Value to compare against */
  value: unknown;
  /** Whether this condition is active */
  active: boolean;
}

export interface FilterBuilderProps {
  /** Current filter configuration */
  value: FilterConfig;
  /** Callback when configuration changes */
  onChange: (config: FilterConfig) => void;
  /** Schema of array items (what each item looks like) */
  itemSchema?: VariableSchema;
  /** Available variables for dynamic comparisons */
  variables?: VariableDefinition[];
  /** Whether the builder is disabled */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Available operators with metadata
 */
const OPERATORS: Array<{
  value: ConditionOperator;
  label: string;
  types: string[];
}> = [
  { value: 'eq', label: 'equals', types: ['string', 'number', 'boolean'] },
  { value: 'neq', label: 'not equals', types: ['string', 'number', 'boolean'] },
  { value: 'gt', label: 'greater than', types: ['number'] },
  { value: 'gte', label: 'greater or equal', types: ['number'] },
  { value: 'lt', label: 'less than', types: ['number'] },
  { value: 'lte', label: 'less or equal', types: ['number'] },
  { value: 'contains', label: 'contains', types: ['string', 'array'] },
  { value: 'notContains', label: 'not contains', types: ['string', 'array'] },
  { value: 'startsWith', label: 'starts with', types: ['string'] },
  { value: 'endsWith', label: 'ends with', types: ['string'] },
  { value: 'matches', label: 'matches regex', types: ['string'] },
  { value: 'in', label: 'in list', types: ['string', 'number'] },
  { value: 'notIn', label: 'not in list', types: ['string', 'number'] },
  { value: 'exists', label: 'exists', types: ['string', 'number', 'boolean', 'object', 'array'] },
  { value: 'notExists', label: 'not exists', types: ['string', 'number', 'boolean', 'object', 'array'] },
  { value: 'isEmpty', label: 'is empty', types: ['string', 'array', 'object'] },
  { value: 'isNotEmpty', label: 'is not empty', types: ['string', 'array', 'object'] },
];

/**
 * Get available fields from item schema
 */
function getSchemaFields(
  schema: VariableSchema | undefined,
  prefix = ''
): Array<{ path: string; type: string }> {
  if (!schema) return [];

  const fields: Array<{ path: string; type: string }> = [];

  if (schema.type === 'object' && schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const prop = propSchema as VariableSchema;
      const path = prefix ? `${prefix}.${key}` : key;
      
      // Add the field itself
      fields.push({ path, type: prop.type });
      
      // Recursively get nested fields for objects
      if (prop.type === 'object' && prop.properties) {
        fields.push(...getSchemaFields(prop, path));
      }
    }
  }

  return fields;
}

/**
 * Type badge for field types
 */
function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    string: 'bg-blue-500/20 text-blue-400',
    number: 'bg-green-500/20 text-green-400',
    boolean: 'bg-purple-500/20 text-purple-400',
    object: 'bg-orange-500/20 text-orange-400',
    array: 'bg-cyan-500/20 text-cyan-400',
  };

  return (
    <Badge variant="outline" className={cn('text-[10px]', colors[type])}>
      {type}
    </Badge>
  );
}

/**
 * Single condition row
 */
function ConditionRow({
  condition,
  fields,
  onChange,
  onRemove,
}: {
  condition: FilterCondition;
  fields: Array<{ path: string; type: string }>;
  onChange: (condition: FilterCondition) => void;
  onRemove: () => void;
}) {
  const selectedField = fields.find((f) => f.path === condition.field);
  const availableOperators = selectedField
    ? OPERATORS.filter((op) => op.types.includes(selectedField.type))
    : OPERATORS;

  // Check if operator needs a value
  const needsValue = !['exists', 'notExists', 'isEmpty', 'isNotEmpty'].includes(
    condition.operator
  );

  return (
    <div className={cn(
      'flex items-center gap-2 p-3 rounded-lg border transition-opacity',
      condition.active ? 'bg-muted/30' : 'bg-muted/10 opacity-60'
    )}>
      <Switch
        checked={condition.active}
        onCheckedChange={(active) => onChange({ ...condition, active })}
        className="scale-75"
      />

      {/* Field Select */}
      <Select
        value={condition.field}
        onValueChange={(field) => onChange({ ...condition, field })}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Field" />
        </SelectTrigger>
        <SelectContent>
          {fields.map((field) => (
            <SelectItem key={field.path} value={field.path}>
              <div className="flex items-center gap-2">
                <span className="font-mono">{field.path}</span>
                <TypeBadge type={field.type} />
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator Select */}
      <Select
        value={condition.operator}
        onValueChange={(operator) =>
          onChange({ ...condition, operator: operator as ConditionOperator })
        }
      >
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <SelectValue placeholder="Operator" />
        </SelectTrigger>
        <SelectContent>
          {availableOperators.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value Input */}
      {needsValue && (
        <Input
          value={String(condition.value ?? '')}
          onChange={(e) => {
            let value: unknown = e.target.value;
            // Auto-convert numbers
            if (selectedField?.type === 'number' && !isNaN(Number(value))) {
              value = Number(value);
            } else if (selectedField?.type === 'boolean') {
              value = value === 'true';
            }
            onChange({ ...condition, value });
          }}
          placeholder="Value"
          className="flex-1 h-8 text-xs"
        />
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

/**
 * Filter Builder component
 */
export function FilterBuilder({
  value,
  onChange,
  itemSchema,
  variables,
  disabled,
  className,
}: FilterBuilderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  // Get available fields from schema
  const fields = useMemo(() => getSchemaFields(itemSchema), [itemSchema]);

  // Add new condition
  const handleAddCondition = useCallback(() => {
    const newCondition: FilterCondition = {
      id: `filter-${Date.now()}`,
      field: fields[0]?.path ?? '',
      operator: 'eq',
      value: '',
      active: true,
    };
    onChange({
      ...value,
      conditions: [...value.conditions, newCondition],
    });
  }, [value, onChange, fields]);

  // Update condition
  const handleConditionChange = useCallback(
    (index: number, condition: FilterCondition) => {
      const conditions = [...value.conditions];
      conditions[index] = condition;
      onChange({ ...value, conditions });
    },
    [value, onChange]
  );

  // Remove condition
  const handleConditionRemove = useCallback(
    (index: number) => {
      const conditions = value.conditions.filter((_, i) => i !== index);
      onChange({ ...value, conditions });
    },
    [value, onChange]
  );

  const activeCount = value.conditions.filter((c) => c.active).length;
  const totalCount = value.conditions.length;

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
              <Filter className="h-4 w-4" />
              {totalCount === 0
                ? 'Configure Filters'
                : `${activeCount} active filter${activeCount !== 1 ? 's' : ''}`}
            </span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Configuration
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="text-sm font-medium">Enable Filtering</Label>
                <p className="text-xs text-muted-foreground">
                  Filter array items based on conditions
                </p>
              </div>
              <Switch
                checked={value.enabled}
                onCheckedChange={(enabled) => onChange({ ...value, enabled })}
              />
            </div>

            {value.enabled && (
              <>
                {/* Mode Select */}
                <div className="flex items-center gap-4">
                  <Label className="text-sm">Match:</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={value.mode === 'and' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onChange({ ...value, mode: 'and' })}
                    >
                      All conditions (AND)
                    </Button>
                    <Button
                      variant={value.mode === 'or' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onChange({ ...value, mode: 'or' })}
                    >
                      Any condition (OR)
                    </Button>
                  </div>
                </div>

                {/* Conditions */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Conditions</Label>
                  <ScrollArea className="max-h-[300px]">
                    <div className="space-y-2">
                      {value.conditions.map((condition, index) => (
                        <React.Fragment key={condition.id}>
                          {index > 0 && (
                            <div className="flex items-center justify-center">
                              <Badge variant="secondary" className="text-xs">
                                {value.mode.toUpperCase()}
                              </Badge>
                            </div>
                          )}
                          <ConditionRow
                            condition={condition}
                            fields={fields}
                            onChange={(c) => handleConditionChange(index, c)}
                            onRemove={() => handleConditionRemove(index)}
                          />
                        </React.Fragment>
                      ))}
                    </div>
                  </ScrollArea>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddCondition}
                    disabled={fields.length === 0}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Condition
                  </Button>

                  {fields.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                      No fields available. Connect a source with array data.
                    </p>
                  )}
                </div>

                {/* Limit */}
                <div className="flex items-center gap-4">
                  <Label className="text-sm">Limit results:</Label>
                  <Input
                    type="number"
                    min={0}
                    value={value.limit ?? ''}
                    onChange={(e) => {
                      const limit = e.target.value
                        ? parseInt(e.target.value, 10)
                        : undefined;
                      onChange({ ...value, limit });
                    }}
                    placeholder="No limit"
                    className="w-24 h-8"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                onChange({
                  enabled: false,
                  mode: 'and',
                  conditions: [],
                });
              }}
            >
              Reset
            </Button>
            <Button onClick={() => setDialogOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Compact Preview */}
      {value.enabled && activeCount > 0 && (
        <div className="text-xs text-muted-foreground space-y-1">
          {value.conditions
            .filter((c) => c.active)
            .slice(0, 2)
            .map((c) => (
              <div key={c.id} className="flex items-center gap-1">
                <code className="px-1 bg-muted rounded">{c.field}</code>
                <span className="text-primary">{c.operator}</span>
                <code className="px-1 bg-muted rounded">{String(c.value)}</code>
              </div>
            ))}
          {activeCount > 2 && (
            <div className="text-muted-foreground">+{activeCount - 2} more...</div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Default filter configuration
 */
export function createDefaultFilterConfig(): FilterConfig {
  return {
    enabled: false,
    mode: 'and',
    conditions: [],
  };
}
