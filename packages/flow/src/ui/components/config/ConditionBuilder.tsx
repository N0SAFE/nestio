/**
 * Condition Builder UI
 *
 * Visual builder for creating type-safe conditions.
 * Supports variable selection, operator selection, and value input.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@repo/ui/components/shadcn/button';
import { Input } from '@repo/ui/components/shadcn/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/shadcn/select';
import { Switch } from '@repo/ui/components/shadcn/switch';
import { Label } from '@repo/ui/components/shadcn/label';
import { cn } from '@repo/ui/lib/utils';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Parentheses,
  X,
} from 'lucide-react';

import type {
  Condition,
  ConditionGroup,
  ComparisonCondition,
  ConditionSchema,
  ConditionOperand,
  ComparisonOperator,
  LogicalOperator,
  OperatorInfo,
} from '../../../core/types/condition';
import {
  OPERATORS,
  getOperatorsForType,
  createConditionGroup,
  createComparisonCondition,
  createLiteralValue,
  createVariableRef,
  createConditionSchema,
} from '../../../core/types/condition';
import type { VariableDefinition, VariableSchema } from '../../../core/types/variable-schema';
import { SchemaHelpers } from '../../../core/types/variable-schema';

/**
 * Props for ConditionBuilder
 */
export interface ConditionBuilderProps {
  /** Current condition schema */
  value: ConditionSchema | null;
  /** Change handler */
  onChange: (schema: ConditionSchema) => void;
  /** Available variables */
  variables: VariableDefinition[];
  /** Disabled state */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Main Condition Builder component
 */
export function ConditionBuilder({
  value,
  onChange,
  variables,
  disabled = false,
  className,
}: ConditionBuilderProps) {
  // Initialize with empty schema if null
  const schema = value ?? createConditionSchema();

  const handleRootChange = useCallback(
    (newRoot: Condition) => {
      onChange({ ...schema, root: newRoot });
    },
    [schema, onChange]
  );

  return (
    <div className={cn('space-y-2', className)}>
      <ConditionNode
        condition={schema.root}
        onChange={handleRootChange}
        onRemove={() => {
          // Can't remove root, reset to empty group
          onChange(createConditionSchema());
        }}
        variables={variables}
        disabled={disabled}
        isRoot
        depth={0}
      />
    </div>
  );
}

/**
 * Props for ConditionNode
 */
interface ConditionNodeProps {
  condition: Condition;
  onChange: (condition: Condition) => void;
  onRemove: () => void;
  variables: VariableDefinition[];
  disabled: boolean;
  isRoot?: boolean;
  depth: number;
}

/**
 * Renders a condition (comparison or group)
 */
function ConditionNode({
  condition,
  onChange,
  onRemove,
  variables,
  disabled,
  isRoot = false,
  depth,
}: ConditionNodeProps) {
  if (condition.type === 'comparison') {
    return (
      <ComparisonRow
        condition={condition}
        onChange={onChange as (c: ComparisonCondition) => void}
        onRemove={onRemove}
        variables={variables}
        disabled={disabled}
        canRemove={!isRoot}
      />
    );
  }

  return (
    <GroupNode
      group={condition}
      onChange={onChange as (g: ConditionGroup) => void}
      onRemove={onRemove}
      variables={variables}
      disabled={disabled}
      isRoot={isRoot}
      depth={depth}
    />
  );
}

/**
 * Props for GroupNode
 */
interface GroupNodeProps {
  group: ConditionGroup;
  onChange: (group: ConditionGroup) => void;
  onRemove: () => void;
  variables: VariableDefinition[];
  disabled: boolean;
  isRoot: boolean;
  depth: number;
}

/**
 * Renders a condition group (AND/OR)
 */
function GroupNode({
  group,
  onChange,
  onRemove,
  variables,
  disabled,
  isRoot,
  depth,
}: GroupNodeProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleOperatorChange = useCallback(
    (operator: LogicalOperator) => {
      onChange({ ...group, operator });
    },
    [group, onChange]
  );

  const handleConditionChange = useCallback(
    (index: number, newCondition: Condition) => {
      const newConditions = [...group.conditions];
      newConditions[index] = newCondition;
      onChange({ ...group, conditions: newConditions });
    },
    [group, onChange]
  );

  const handleRemoveCondition = useCallback(
    (index: number) => {
      const newConditions = group.conditions.filter((_, i) => i !== index);
      onChange({ ...group, conditions: newConditions });
    },
    [group, onChange]
  );

  const handleAddCondition = useCallback(() => {
    const firstVariable = variables[0];
    const newCondition = firstVariable
      ? createComparisonCondition(firstVariable.name)
      : createComparisonCondition('');
    onChange({ ...group, conditions: [...group.conditions, newCondition] });
  }, [group, variables, onChange]);

  const handleAddGroup = useCallback(() => {
    const newGroup = createConditionGroup(group.operator === 'and' ? 'or' : 'and');
    onChange({ ...group, conditions: [...group.conditions, newGroup] });
  }, [group, onChange]);

  const handleNegateChange = useCallback(
    (negate: boolean) => {
      onChange({ ...group, negate });
    },
    [group, onChange]
  );

  // Determine border color based on depth
  const borderColors = [
    'border-l-blue-500',
    'border-l-green-500',
    'border-l-purple-500',
    'border-l-orange-500',
    'border-l-pink-500',
  ];
  const borderColor = borderColors[depth % borderColors.length];

  return (
    <div
      className={cn(
        'rounded-md border bg-card',
        depth > 0 && `border-l-4 ${borderColor}`,
        isRoot && 'border-muted'
      )}
    >
      {/* Group Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-muted rounded"
          disabled={disabled}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {/* Operator Toggle */}
        <div className="flex items-center gap-1 rounded-md border p-0.5">
          <button
            type="button"
            onClick={() => handleOperatorChange('and')}
            className={cn(
              'px-2 py-0.5 text-xs font-medium rounded',
              group.operator === 'and'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
            disabled={disabled}
          >
            AND
          </button>
          <button
            type="button"
            onClick={() => handleOperatorChange('or')}
            className={cn(
              'px-2 py-0.5 text-xs font-medium rounded',
              group.operator === 'or'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
            disabled={disabled}
          >
            OR
          </button>
        </div>

        {/* Negate Toggle */}
        <div className="flex items-center gap-1.5">
          <Switch
            id={`negate-${group.id}`}
            checked={group.negate ?? false}
            onCheckedChange={handleNegateChange}
            disabled={disabled}
            className="h-4 w-7"
          />
          <Label htmlFor={`negate-${group.id}`} className="text-xs text-muted-foreground">
            NOT
          </Label>
        </div>

        <div className="flex-1" />

        {/* Condition count */}
        <span className="text-xs text-muted-foreground">
          {group.conditions.length} condition{group.conditions.length !== 1 ? 's' : ''}
        </span>

        {/* Remove group button (not for root) */}
        {!isRoot && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Group Content */}
      {!isCollapsed && (
        <div className="p-3 space-y-2">
          {group.conditions.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No conditions. Click "Add Condition" to start.
            </div>
          ) : (
            group.conditions.map((condition, index) => (
              <div key={condition.id} className="relative">
                {index > 0 && (
                  <div className="absolute -top-1 left-4 px-2 text-xs font-medium text-muted-foreground bg-card z-10">
                    {group.operator.toUpperCase()}
                  </div>
                )}
                <ConditionNode
                  condition={condition}
                  onChange={(c) => handleConditionChange(index, c)}
                  onRemove={() => handleRemoveCondition(index)}
                  variables={variables}
                  disabled={disabled}
                  depth={depth + 1}
                />
              </div>
            ))
          )}

          {/* Add buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCondition}
              disabled={disabled}
              className="h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Condition
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddGroup}
              disabled={disabled}
              className="h-7 text-xs"
            >
              <Parentheses className="h-3 w-3 mr-1" />
              Add Group
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Props for ComparisonRow
 */
interface ComparisonRowProps {
  condition: ComparisonCondition;
  onChange: (condition: ComparisonCondition) => void;
  onRemove: () => void;
  variables: VariableDefinition[];
  disabled: boolean;
  canRemove: boolean;
}

/**
 * Renders a single comparison condition row
 */
function ComparisonRow({
  condition,
  onChange,
  onRemove,
  variables,
  disabled,
  canRemove,
}: ComparisonRowProps) {
  // Get the variable's schema for operator filtering
  const leftVariable = useMemo(() => {
    if (condition.left.type === 'variable') {
      return variables.find((v) => v.name === condition.left.variableName);
    }
    return undefined;
  }, [condition.left, variables]);

  const leftSchema = useMemo((): VariableSchema => {
    if (!leftVariable) return { type: 'any' };

    // Resolve path if present
    if (condition.left.type === 'variable' && condition.left.path) {
      const resolved = SchemaHelpers.resolvePathSchema(
        leftVariable.schema,
        condition.left.path
      );
      return resolved ?? { type: 'any' };
    }

    return leftVariable.schema;
  }, [leftVariable, condition.left]);

  // Get applicable operators for the left variable type
  const applicableOperators = useMemo(() => {
    return getOperatorsForType(leftSchema.type);
  }, [leftSchema.type]);

  // Current operator info
  const operatorInfo = OPERATORS[condition.operator];

  const handleVariableChange = useCallback(
    (variablePath: string) => {
      const [variableName, ...pathParts] = variablePath.split('.');
      const path = pathParts.length > 0 ? pathParts.join('.') : undefined;

      onChange({
        ...condition,
        left: createVariableRef(variableName!, path),
        // Reset right value when variable changes
        right: undefined,
      });
    },
    [condition, onChange]
  );

  const handleOperatorChange = useCallback(
    (operator: ComparisonOperator) => {
      onChange({
        ...condition,
        operator,
        // Reset right value if operator doesn't need it
        right: OPERATORS[operator]?.requiresValue ? condition.right : undefined,
        rightSecondary: OPERATORS[operator]?.requiresSecondValue
          ? condition.rightSecondary
          : undefined,
      });
    },
    [condition, onChange]
  );

  const handleValueChange = useCallback(
    (value: string) => {
      // Determine value type based on operator
      let parsedValue: string | number | boolean = value;
      if (operatorInfo?.valueType === 'number') {
        parsedValue = parseFloat(value) || 0;
      } else if (operatorInfo?.valueType === 'boolean') {
        parsedValue = value === 'true';
      }

      onChange({
        ...condition,
        right: createLiteralValue(parsedValue),
      });
    },
    [condition, operatorInfo, onChange]
  );

  const handleSecondaryValueChange = useCallback(
    (value: string) => {
      let parsedValue: string | number = value;
      if (operatorInfo?.valueType === 'number') {
        parsedValue = parseFloat(value) || 0;
      }

      onChange({
        ...condition,
        rightSecondary: createLiteralValue(parsedValue),
      });
    },
    [condition, operatorInfo, onChange]
  );

  const handleNegateChange = useCallback(
    (negate: boolean) => {
      onChange({ ...condition, negate });
    },
    [condition, onChange]
  );

  // Build variable options (flattened with paths)
  const variableOptions = useMemo(() => {
    const options: Array<{ value: string; label: string; type: string }> = [];

    for (const variable of variables) {
      // Add root variable
      options.push({
        value: variable.name,
        label: variable.name,
        type: SchemaHelpers.getTypeString(variable.schema),
      });

      // Add nested properties for objects
      if (variable.schema.type === 'object') {
        addNestedOptions(options, variable.name, variable.schema, 1);
      }
    }

    return options;
  }, [variables]);

  // Get current variable path for select
  const currentVariablePath = useMemo(() => {
    if (condition.left.type === 'variable') {
      return condition.left.path
        ? `${condition.left.variableName}.${condition.left.path}`
        : condition.left.variableName;
    }
    return '';
  }, [condition.left]);

  // Get current value for input
  const currentValue = useMemo(() => {
    if (condition.right?.type === 'literal') {
      return String(condition.right.value ?? '');
    }
    return '';
  }, [condition.right]);

  const currentSecondaryValue = useMemo(() => {
    if (condition.rightSecondary?.type === 'literal') {
      return String(condition.rightSecondary.value ?? '');
    }
    return '';
  }, [condition.rightSecondary]);

  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border">
      {/* Variable Selector */}
      <Select
        value={currentVariablePath}
        onValueChange={handleVariableChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-[180px] h-8 text-sm">
          <SelectValue placeholder="Select variable" />
        </SelectTrigger>
        <SelectContent>
          {variableOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <span>{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.type}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator Selector */}
      <Select
        value={condition.operator}
        onValueChange={(v) => handleOperatorChange(v as ComparisonOperator)}
        disabled={disabled}
      >
        <SelectTrigger className="w-[160px] h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {applicableOperators.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value Input (if operator requires it) */}
      {operatorInfo?.requiresValue && (
        <>
          <Input
            value={currentValue}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={operatorInfo.valueType === 'number' ? '0' : 'Value'}
            type={operatorInfo.valueType === 'number' ? 'number' : 'text'}
            disabled={disabled}
            className="w-[120px] h-8 text-sm"
          />

          {/* Secondary value for 'between' */}
          {operatorInfo.requiresSecondValue && (
            <>
              <span className="text-sm text-muted-foreground">and</span>
              <Input
                value={currentSecondaryValue}
                onChange={(e) => handleSecondaryValueChange(e.target.value)}
                placeholder="0"
                type="number"
                disabled={disabled}
                className="w-[120px] h-8 text-sm"
              />
            </>
          )}
        </>
      )}

      {/* Negate toggle */}
      <div className="flex items-center gap-1.5 ml-auto">
        <Switch
          id={`negate-${condition.id}`}
          checked={condition.negate ?? false}
          onCheckedChange={handleNegateChange}
          disabled={disabled}
          className="h-4 w-7"
        />
        <Label htmlFor={`negate-${condition.id}`} className="text-xs text-muted-foreground">
          NOT
        </Label>
      </div>

      {/* Remove button */}
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
          disabled={disabled}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Add nested property options for object schemas
 */
function addNestedOptions(
  options: Array<{ value: string; label: string; type: string }>,
  basePath: string,
  schema: VariableSchema,
  depth: number,
  maxDepth = 3
) {
  if (depth >= maxDepth) return;

  if (schema.type === 'object') {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const fullPath = `${basePath}.${key}`;
      const indent = '  '.repeat(depth);

      options.push({
        value: fullPath,
        label: `${indent}${key}`,
        type: SchemaHelpers.getTypeString(propSchema),
      });

      // Recurse for nested objects
      if (propSchema.type === 'object') {
        addNestedOptions(options, fullPath, propSchema, depth + 1, maxDepth);
      }
    }
  } else if (schema.type === 'array' && schema.items.type === 'object') {
    // For arrays of objects, show [0].property notation
    const itemSchema = schema.items;
    for (const [key, propSchema] of Object.entries(itemSchema.properties)) {
      const fullPath = `${basePath}[0].${key}`;
      const indent = '  '.repeat(depth);

      options.push({
        value: fullPath,
        label: `${indent}[0].${key}`,
        type: SchemaHelpers.getTypeString(propSchema),
      });
    }
  }
}

/**
 * Export props type
 */
export type { ConditionBuilderProps };
