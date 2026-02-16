/**
 * Condition Schema Types
 *
 * Type-safe condition definitions for building conditions visually.
 * Supports comparison operators, logical operators, and nested groups.
 */

import type { VariableSchema } from './variable-schema';

/**
 * Comparison operators for different types
 */
export type StringOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'matches' // regex
  | 'isEmpty'
  | 'isNotEmpty';

export type NumberOperator =
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'between'
  | 'notBetween';

export type BooleanOperator = 'isTrue' | 'isFalse';

export type ArrayOperator =
  | 'isEmpty'
  | 'isNotEmpty'
  | 'contains'
  | 'notContains'
  | 'lengthEquals'
  | 'lengthGreaterThan'
  | 'lengthLessThan'
  | 'every' // all items match condition
  | 'some'; // at least one item matches

export type ObjectOperator =
  | 'hasProperty'
  | 'notHasProperty'
  | 'isEmpty'
  | 'isNotEmpty';

export type NullOperator = 'isNull' | 'isNotNull' | 'isDefined' | 'isUndefined';

export type AnyOperator = 'equals' | 'notEquals' | 'isNull' | 'isNotNull' | 'isDefined' | 'isUndefined';

/**
 * All comparison operators
 */
export type ComparisonOperator =
  | StringOperator
  | NumberOperator
  | BooleanOperator
  | ArrayOperator
  | ObjectOperator
  | NullOperator
  | AnyOperator;

/**
 * Logical operators for combining conditions
 */
export type LogicalOperator = 'and' | 'or';

/**
 * Variable reference in a condition
 */
export interface VariableRef {
  type: 'variable';
  /** Variable name (e.g., "httpRequest_output") */
  variableName: string;
  /** Optional path within variable (e.g., "data.items[0].status") */
  path?: string;
  /** Resolved schema type (for validation) */
  schema?: VariableSchema;
}

/**
 * Literal value in a condition
 */
export interface LiteralValue {
  type: 'literal';
  /** The literal value */
  value: string | number | boolean | null;
  /** Value type */
  valueType: 'string' | 'number' | 'boolean' | 'null';
}

/**
 * Expression value (evaluated at runtime)
 */
export interface ExpressionValue {
  type: 'expression';
  /** Expression string (e.g., "{{ user.age * 2 }}") */
  expression: string;
}

/**
 * Operand in a comparison (left or right side)
 */
export type ConditionOperand = VariableRef | LiteralValue | ExpressionValue;

/**
 * Single comparison condition
 */
export interface ComparisonCondition {
  type: 'comparison';
  /** Unique ID for this condition */
  id: string;
  /** Left operand (usually a variable) */
  left: ConditionOperand;
  /** Comparison operator */
  operator: ComparisonOperator;
  /** Right operand (value to compare against) */
  right?: ConditionOperand;
  /** Secondary right operand (for 'between' operators) */
  rightSecondary?: ConditionOperand;
  /** Negate the result */
  negate?: boolean;
}

/**
 * Group of conditions combined with AND/OR
 */
export interface ConditionGroup {
  type: 'group';
  /** Unique ID for this group */
  id: string;
  /** Logical operator to combine conditions */
  operator: LogicalOperator;
  /** Child conditions or groups */
  conditions: Condition[];
  /** Negate the entire group result */
  negate?: boolean;
}

/**
 * A condition can be a comparison or a group
 */
export type Condition = ComparisonCondition | ConditionGroup;

/**
 * Root condition schema
 */
export interface ConditionSchema {
  /** Version for schema migration */
  version: 1;
  /** Root condition (usually a group) */
  root: Condition;
}

/**
 * Operator metadata for UI
 */
export interface OperatorInfo {
  /** Operator key */
  value: ComparisonOperator;
  /** Display label */
  label: string;
  /** Description */
  description: string;
  /** Whether it requires a right operand */
  requiresValue: boolean;
  /** Whether it requires two values (for 'between') */
  requiresSecondValue?: boolean;
  /** Expected type for the right operand */
  valueType?: 'string' | 'number' | 'boolean' | 'any';
  /** Applicable variable types */
  applicableTo: VariableSchema['type'][];
}

/**
 * Operator definitions with metadata
 */
export const OPERATORS: Record<ComparisonOperator, OperatorInfo> = {
  // String operators
  equals: {
    value: 'equals',
    label: 'equals',
    description: 'Value equals',
    requiresValue: true,
    valueType: 'any',
    applicableTo: ['string', 'number', 'boolean', 'any'],
  },
  notEquals: {
    value: 'notEquals',
    label: 'does not equal',
    description: 'Value does not equal',
    requiresValue: true,
    valueType: 'any',
    applicableTo: ['string', 'number', 'boolean', 'any'],
  },
  contains: {
    value: 'contains',
    label: 'contains',
    description: 'String contains substring or array contains item',
    requiresValue: true,
    valueType: 'string',
    applicableTo: ['string', 'array'],
  },
  notContains: {
    value: 'notContains',
    label: 'does not contain',
    description: 'String does not contain substring or array does not contain item',
    requiresValue: true,
    valueType: 'string',
    applicableTo: ['string', 'array'],
  },
  startsWith: {
    value: 'startsWith',
    label: 'starts with',
    description: 'String starts with prefix',
    requiresValue: true,
    valueType: 'string',
    applicableTo: ['string'],
  },
  endsWith: {
    value: 'endsWith',
    label: 'ends with',
    description: 'String ends with suffix',
    requiresValue: true,
    valueType: 'string',
    applicableTo: ['string'],
  },
  matches: {
    value: 'matches',
    label: 'matches regex',
    description: 'String matches regular expression',
    requiresValue: true,
    valueType: 'string',
    applicableTo: ['string'],
  },
  isEmpty: {
    value: 'isEmpty',
    label: 'is empty',
    description: 'Value is empty (empty string, empty array, or empty object)',
    requiresValue: false,
    applicableTo: ['string', 'array', 'object'],
  },
  isNotEmpty: {
    value: 'isNotEmpty',
    label: 'is not empty',
    description: 'Value is not empty',
    requiresValue: false,
    applicableTo: ['string', 'array', 'object'],
  },

  // Number operators
  greaterThan: {
    value: 'greaterThan',
    label: 'is greater than',
    description: 'Number is greater than value',
    requiresValue: true,
    valueType: 'number',
    applicableTo: ['number'],
  },
  greaterThanOrEqual: {
    value: 'greaterThanOrEqual',
    label: 'is greater than or equal to',
    description: 'Number is greater than or equal to value',
    requiresValue: true,
    valueType: 'number',
    applicableTo: ['number'],
  },
  lessThan: {
    value: 'lessThan',
    label: 'is less than',
    description: 'Number is less than value',
    requiresValue: true,
    valueType: 'number',
    applicableTo: ['number'],
  },
  lessThanOrEqual: {
    value: 'lessThanOrEqual',
    label: 'is less than or equal to',
    description: 'Number is less than or equal to value',
    requiresValue: true,
    valueType: 'number',
    applicableTo: ['number'],
  },
  between: {
    value: 'between',
    label: 'is between',
    description: 'Number is between two values (inclusive)',
    requiresValue: true,
    requiresSecondValue: true,
    valueType: 'number',
    applicableTo: ['number'],
  },
  notBetween: {
    value: 'notBetween',
    label: 'is not between',
    description: 'Number is not between two values',
    requiresValue: true,
    requiresSecondValue: true,
    valueType: 'number',
    applicableTo: ['number'],
  },

  // Boolean operators
  isTrue: {
    value: 'isTrue',
    label: 'is true',
    description: 'Boolean is true',
    requiresValue: false,
    applicableTo: ['boolean'],
  },
  isFalse: {
    value: 'isFalse',
    label: 'is false',
    description: 'Boolean is false',
    requiresValue: false,
    applicableTo: ['boolean'],
  },

  // Array operators
  lengthEquals: {
    value: 'lengthEquals',
    label: 'has length',
    description: 'Array length equals',
    requiresValue: true,
    valueType: 'number',
    applicableTo: ['array'],
  },
  lengthGreaterThan: {
    value: 'lengthGreaterThan',
    label: 'has length greater than',
    description: 'Array length is greater than',
    requiresValue: true,
    valueType: 'number',
    applicableTo: ['array'],
  },
  lengthLessThan: {
    value: 'lengthLessThan',
    label: 'has length less than',
    description: 'Array length is less than',
    requiresValue: true,
    valueType: 'number',
    applicableTo: ['array'],
  },
  every: {
    value: 'every',
    label: 'all items match',
    description: 'All items in array match condition',
    requiresValue: false, // Nested condition
    applicableTo: ['array'],
  },
  some: {
    value: 'some',
    label: 'some items match',
    description: 'At least one item in array matches condition',
    requiresValue: false, // Nested condition
    applicableTo: ['array'],
  },

  // Object operators
  hasProperty: {
    value: 'hasProperty',
    label: 'has property',
    description: 'Object has property',
    requiresValue: true,
    valueType: 'string',
    applicableTo: ['object'],
  },
  notHasProperty: {
    value: 'notHasProperty',
    label: 'does not have property',
    description: 'Object does not have property',
    requiresValue: true,
    valueType: 'string',
    applicableTo: ['object'],
  },

  // Null operators
  isNull: {
    value: 'isNull',
    label: 'is null',
    description: 'Value is null',
    requiresValue: false,
    applicableTo: ['string', 'number', 'boolean', 'array', 'object', 'any', 'null'],
  },
  isNotNull: {
    value: 'isNotNull',
    label: 'is not null',
    description: 'Value is not null',
    requiresValue: false,
    applicableTo: ['string', 'number', 'boolean', 'array', 'object', 'any', 'null'],
  },
  isDefined: {
    value: 'isDefined',
    label: 'is defined',
    description: 'Value is defined (not undefined)',
    requiresValue: false,
    applicableTo: ['string', 'number', 'boolean', 'array', 'object', 'any', 'null'],
  },
  isUndefined: {
    value: 'isUndefined',
    label: 'is undefined',
    description: 'Value is undefined',
    requiresValue: false,
    applicableTo: ['string', 'number', 'boolean', 'array', 'object', 'any', 'null'],
  },
};

/**
 * Get operators applicable to a variable type
 */
export function getOperatorsForType(type: VariableSchema['type']): OperatorInfo[] {
  return Object.values(OPERATORS).filter((op) => op.applicableTo.includes(type));
}

/**
 * Create a new empty condition group
 */
export function createConditionGroup(operator: LogicalOperator = 'and'): ConditionGroup {
  return {
    type: 'group',
    id: generateId(),
    operator,
    conditions: [],
  };
}

/**
 * Create a new comparison condition
 */
export function createComparisonCondition(
  variableName: string,
  operator: ComparisonOperator = 'equals'
): ComparisonCondition {
  return {
    type: 'comparison',
    id: generateId(),
    left: {
      type: 'variable',
      variableName,
    },
    operator,
  };
}

/**
 * Create a variable reference
 */
export function createVariableRef(
  variableName: string,
  path?: string,
  schema?: VariableSchema
): VariableRef {
  return {
    type: 'variable',
    variableName,
    path,
    schema,
  };
}

/**
 * Create a literal value
 */
export function createLiteralValue(
  value: string | number | boolean | null
): LiteralValue {
  let valueType: LiteralValue['valueType'];
  if (value === null) {
    valueType = 'null';
  } else if (typeof value === 'string') {
    valueType = 'string';
  } else if (typeof value === 'number') {
    valueType = 'number';
  } else {
    valueType = 'boolean';
  }

  return {
    type: 'literal',
    value,
    valueType,
  };
}

/**
 * Create an expression value
 */
export function createExpressionValue(expression: string): ExpressionValue {
  return {
    type: 'expression',
    expression,
  };
}

/**
 * Create a default condition schema
 */
export function createConditionSchema(): ConditionSchema {
  return {
    version: 1,
    root: createConditionGroup('and'),
  };
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `cond_${String(Date.now())}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Add a condition to a group
 */
export function addConditionToGroup(
  group: ConditionGroup,
  condition: Condition
): ConditionGroup {
  return {
    ...group,
    conditions: [...group.conditions, condition],
  };
}

/**
 * Remove a condition from a group by ID
 */
export function removeConditionFromGroup(
  group: ConditionGroup,
  conditionId: string
): ConditionGroup {
  return {
    ...group,
    conditions: group.conditions.filter((c) => c.id !== conditionId),
  };
}

/**
 * Update a condition in a group by ID
 */
export function updateConditionInGroup(
  group: ConditionGroup,
  conditionId: string,
  updates: Partial<Condition>
): ConditionGroup {
  return {
    ...group,
    conditions: group.conditions.map((c) =>
      c.id === conditionId ? { ...c, ...updates } : c
    ),
  };
}

/**
 * Find a condition by ID (recursive)
 */
export function findConditionById(
  root: Condition,
  conditionId: string
): Condition | undefined {
  if (root.id === conditionId) {
    return root;
  }

  if (root.type === 'group') {
    for (const child of root.conditions) {
      const found = findConditionById(child, conditionId);
      if (found) return found;
    }
  }

  return undefined;
}

/**
 * Get the full path for a variable reference
 */
export function getVariableRefPath(ref: VariableRef): string {
  if (ref.path) {
    return `${ref.variableName}.${ref.path}`;
  }
  return ref.variableName;
}

/**
 * Parse a path string into variable name and path
 */
export function parseVariablePath(fullPath: string): { variableName: string; path?: string } {
  const parts = fullPath.split('.');
  const variableName = parts[0]!;
  const path = parts.length > 1 ? parts.slice(1).join('.') : undefined;
  return { variableName, path };
}
