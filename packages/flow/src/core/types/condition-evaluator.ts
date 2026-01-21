/**
 * Condition Evaluator
 *
 * Runtime evaluation of condition schemas against variable context.
 * Supports all comparison and logical operators with type coercion.
 */

import type {
  Condition,
  ConditionGroup,
  ComparisonCondition,
  ConditionOperand,
  ConditionSchema,
  VariableRef,
  LiteralValue,
  ExpressionValue,
} from './condition';
import type { VariableDefinition } from './variable-schema';

/**
 * Evaluation context with variables
 */
export interface EvaluationContext {
  /** Available variables */
  variables: Map<string, unknown>;
  /** Expression evaluator function */
  evaluateExpression?: (expression: string) => unknown;
}

/**
 * Evaluation result with debugging info
 */
export interface EvaluationResult {
  /** Final result */
  result: boolean;
  /** Evaluation trace for debugging */
  trace?: EvaluationTrace;
}

/**
 * Trace entry for debugging
 */
export interface EvaluationTrace {
  /** Condition ID */
  conditionId: string;
  /** Condition type */
  type: 'comparison' | 'group';
  /** Result of this condition */
  result: boolean;
  /** Left value (for comparisons) */
  leftValue?: unknown;
  /** Right value (for comparisons) */
  rightValue?: unknown;
  /** Operator used */
  operator?: string;
  /** Child traces (for groups) */
  children?: EvaluationTrace[];
  /** Error if evaluation failed */
  error?: string;
}

/**
 * Evaluate a condition schema against a context
 */
export function evaluateCondition(
  schema: ConditionSchema,
  context: EvaluationContext,
  trace = false
): EvaluationResult {
  const result = evaluateConditionNode(schema.root, context, trace);
  return result;
}

/**
 * Evaluate a single condition node (comparison or group)
 */
function evaluateConditionNode(
  condition: Condition,
  context: EvaluationContext,
  trace: boolean
): EvaluationResult {
  if (condition.type === 'comparison') {
    return evaluateComparison(condition, context, trace);
  } else {
    return evaluateGroup(condition, context, trace);
  }
}

/**
 * Evaluate a comparison condition
 */
function evaluateComparison(
  condition: ComparisonCondition,
  context: EvaluationContext,
  trace: boolean
): EvaluationResult {
  try {
    const leftValue = resolveOperand(condition.left, context);
    const rightValue = condition.right
      ? resolveOperand(condition.right, context)
      : undefined;
    const rightSecondary = condition.rightSecondary
      ? resolveOperand(condition.rightSecondary, context)
      : undefined;

    let result = evaluateOperator(
      condition.operator,
      leftValue,
      rightValue,
      rightSecondary
    );

    // Apply negation
    if (condition.negate) {
      result = !result;
    }

    const evalResult: EvaluationResult = { result };

    if (trace) {
      evalResult.trace = {
        conditionId: condition.id,
        type: 'comparison',
        result,
        leftValue,
        rightValue,
        operator: condition.operator,
      };
    }

    return evalResult;
  } catch (error) {
    const evalResult: EvaluationResult = { result: false };

    if (trace) {
      evalResult.trace = {
        conditionId: condition.id,
        type: 'comparison',
        result: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return evalResult;
  }
}

/**
 * Evaluate a condition group
 */
function evaluateGroup(
  group: ConditionGroup,
  context: EvaluationContext,
  trace: boolean
): EvaluationResult {
  if (group.conditions.length === 0) {
    // Empty group evaluates to true
    return {
      result: true,
      trace: trace
        ? { conditionId: group.id, type: 'group', result: true, children: [] }
        : undefined,
    };
  }

  const childResults: EvaluationResult[] = [];
  let result: boolean;

  if (group.operator === 'and') {
    result = true;
    for (const child of group.conditions) {
      const childResult = evaluateConditionNode(child, context, trace);
      childResults.push(childResult);
      if (!childResult.result) {
        result = false;
        // Short-circuit for AND
        if (!trace) break;
      }
    }
  } else {
    // OR
    result = false;
    for (const child of group.conditions) {
      const childResult = evaluateConditionNode(child, context, trace);
      childResults.push(childResult);
      if (childResult.result) {
        result = true;
        // Short-circuit for OR
        if (!trace) break;
      }
    }
  }

  // Apply negation
  if (group.negate) {
    result = !result;
  }

  const evalResult: EvaluationResult = { result };

  if (trace) {
    evalResult.trace = {
      conditionId: group.id,
      type: 'group',
      result,
      operator: group.operator,
      children: childResults.map((r) => r.trace!).filter(Boolean),
    };
  }

  return evalResult;
}

/**
 * Resolve an operand to its actual value
 */
function resolveOperand(
  operand: ConditionOperand,
  context: EvaluationContext
): unknown {
  switch (operand.type) {
    case 'literal':
      return (operand as LiteralValue).value;

    case 'variable': {
      const ref = operand as VariableRef;
      let value = context.variables.get(ref.variableName);

      // Resolve path if present
      if (ref.path && value != null) {
        value = resolvePath(value, ref.path);
      }

      return value;
    }

    case 'expression': {
      const expr = operand as ExpressionValue;
      if (context.evaluateExpression) {
        return context.evaluateExpression(expr.expression);
      }
      throw new Error('Expression evaluation not available');
    }

    default:
      throw new Error(`Unknown operand type: ${(operand as ConditionOperand).type}`);
  }
}

/**
 * Resolve a dot-notation path on a value
 */
function resolvePath(value: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = value;

  for (const part of parts) {
    if (current == null) return undefined;

    // Handle array index: items[0]
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const propName = arrayMatch[1]!;
      const index = parseInt(arrayMatch[2]!, 10);
      current = (current as Record<string, unknown>)[propName];
      if (Array.isArray(current)) {
        current = current[index];
      } else {
        return undefined;
      }
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  return current;
}

/**
 * Evaluate a comparison operator
 */
function evaluateOperator(
  operator: string,
  left: unknown,
  right: unknown,
  rightSecondary?: unknown
): boolean {
  switch (operator) {
    // Equality
    case 'equals':
      return left === right;
    case 'notEquals':
      return left !== right;

    // String operators
    case 'contains':
      if (typeof left === 'string' && typeof right === 'string') {
        return left.includes(right);
      }
      if (Array.isArray(left)) {
        return left.includes(right);
      }
      return false;

    case 'notContains':
      if (typeof left === 'string' && typeof right === 'string') {
        return !left.includes(right);
      }
      if (Array.isArray(left)) {
        return !left.includes(right);
      }
      return true;

    case 'startsWith':
      return typeof left === 'string' && typeof right === 'string' && left.startsWith(right);

    case 'endsWith':
      return typeof left === 'string' && typeof right === 'string' && left.endsWith(right);

    case 'matches':
      if (typeof left === 'string' && typeof right === 'string') {
        try {
          return new RegExp(right).test(left);
        } catch {
          return false;
        }
      }
      return false;

    case 'isEmpty':
      if (typeof left === 'string') return left.length === 0;
      if (Array.isArray(left)) return left.length === 0;
      if (typeof left === 'object' && left !== null) {
        return Object.keys(left).length === 0;
      }
      return !left;

    case 'isNotEmpty':
      if (typeof left === 'string') return left.length > 0;
      if (Array.isArray(left)) return left.length > 0;
      if (typeof left === 'object' && left !== null) {
        return Object.keys(left).length > 0;
      }
      return Boolean(left);

    // Number operators
    case 'greaterThan':
      return typeof left === 'number' && typeof right === 'number' && left > right;

    case 'greaterThanOrEqual':
      return typeof left === 'number' && typeof right === 'number' && left >= right;

    case 'lessThan':
      return typeof left === 'number' && typeof right === 'number' && left < right;

    case 'lessThanOrEqual':
      return typeof left === 'number' && typeof right === 'number' && left <= right;

    case 'between':
      return (
        typeof left === 'number' &&
        typeof right === 'number' &&
        typeof rightSecondary === 'number' &&
        left >= right &&
        left <= rightSecondary
      );

    case 'notBetween':
      return (
        typeof left === 'number' &&
        typeof right === 'number' &&
        typeof rightSecondary === 'number' &&
        (left < right || left > rightSecondary)
      );

    // Boolean operators
    case 'isTrue':
      return left === true;

    case 'isFalse':
      return left === false;

    // Array operators
    case 'lengthEquals':
      return Array.isArray(left) && typeof right === 'number' && left.length === right;

    case 'lengthGreaterThan':
      return Array.isArray(left) && typeof right === 'number' && left.length > right;

    case 'lengthLessThan':
      return Array.isArray(left) && typeof right === 'number' && left.length < right;

    // Object operators
    case 'hasProperty':
      return (
        typeof left === 'object' &&
        left !== null &&
        typeof right === 'string' &&
        right in left
      );

    case 'notHasProperty':
      return (
        typeof left === 'object' &&
        left !== null &&
        typeof right === 'string' &&
        !(right in left)
      );

    // Null operators
    case 'isNull':
      return left === null;

    case 'isNotNull':
      return left !== null;

    case 'isDefined':
      return left !== undefined;

    case 'isUndefined':
      return left === undefined;

    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}

/**
 * Create an evaluation context from variable definitions
 */
export function createEvaluationContext(
  variables: VariableDefinition[],
  values: Record<string, unknown>,
  evaluateExpression?: (expression: string) => unknown
): EvaluationContext {
  const variableMap = new Map<string, unknown>();

  for (const variable of variables) {
    if (variable.name in values) {
      variableMap.set(variable.name, values[variable.name]);
    }
  }

  return {
    variables: variableMap,
    evaluateExpression,
  };
}

/**
 * Validate a condition schema (check for errors)
 */
export function validateConditionSchema(
  schema: ConditionSchema,
  availableVariables: VariableDefinition[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const variableNames = new Set(availableVariables.map((v) => v.name));

  function validateCondition(condition: Condition) {
    if (condition.type === 'comparison') {
      validateOperand(condition.left);
      if (condition.right) {
        validateOperand(condition.right);
      }
      if (condition.rightSecondary) {
        validateOperand(condition.rightSecondary);
      }
    } else {
      for (const child of condition.conditions) {
        validateCondition(child);
      }
    }
  }

  function validateOperand(operand: ConditionOperand) {
    if (operand.type === 'variable') {
      const ref = operand as VariableRef;
      if (!variableNames.has(ref.variableName)) {
        errors.push(`Unknown variable: ${ref.variableName}`);
      }
    }
  }

  validateCondition(schema.root);

  return {
    valid: errors.length === 0,
    errors,
  };
}
