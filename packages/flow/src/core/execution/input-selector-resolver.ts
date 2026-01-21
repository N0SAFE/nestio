/**
 * Input Selector Resolver
 * 
 * Resolves input selectors to actual values from the execution context
 */

import type {
  InputSelector,
  ContextReference,
  MapOperation,
  FilterOperation,
  AggregateOperation,
  StaticValue,
  InputConfig,
} from '../types/input-selector';
import type { ExecutionContext } from '../types/context';

/**
 * Extended context with node outputs tracking
 */
interface ContextWithNodeOutputs extends ExecutionContext {
  nodeOutputs?: Record<string, unknown>;
}

/**
 * Get value from object using JSON path
 */
function getValueByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  
  const parts = path.split('.');
  let current: unknown = obj;
  
  for (const part of parts) {
    // Handle array indexing like "items[0]"
    const arrayRegex = /^(.+)\[(\d+)\]$/;
    const arrayMatch = arrayRegex.exec(part);
    if (arrayMatch) {
      const [, prop, index] = arrayMatch;
      if (prop && typeof current === 'object' && current !== null) {
        current = (current as Record<string, unknown>)[prop];
      }
      if (Array.isArray(current) && index) {
        current = current[Number.parseInt(index, 10)];
      }
    } else if (typeof current === 'object' && current !== null) {
      current = (current as Record<string, unknown>)[part];
    }
    
    if (current === undefined) return undefined;
  }
  
  return current;
}

/**
 * Resolve a context reference
 */
function resolveContextReference(
  selector: ContextReference,
  context: ContextWithNodeOutputs
): unknown {
  if (!context.nodeOutputs) {
    throw new Error('Node outputs not available in execution context');
  }
  
  const nodeOutput = context.nodeOutputs[selector.nodeId];
  if (nodeOutput === undefined) {
    throw new Error(`Node output not found: ${selector.nodeId}`);
  }
  
  if (selector.path) {
    return getValueByPath(nodeOutput, selector.path);
  }
  
  return nodeOutput;
}

/**
 * Resolve a map operation
 */
function resolveMapOperation(
  selector: MapOperation,
  context: ContextWithNodeOutputs
): unknown[] {
  const sourceValue = resolveInputSelector(selector.source, context);
  
  if (!Array.isArray(sourceValue)) {
    throw new Error('Map operation requires an array source');
  }
  
  // Create a safe evaluation function
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const transformFn = new Function('item', 'index', `return ${selector.expression}`) as (
    item: unknown,
    index: number
  ) => unknown;
  
  return sourceValue.map(transformFn);
}

/**
 * Resolve a filter operation
 */
function resolveFilterOperation(
  selector: FilterOperation,
  context: ContextWithNodeOutputs
): unknown[] {
  const sourceValue = resolveInputSelector(selector.source, context);
  
  if (!Array.isArray(sourceValue)) {
    throw new Error('Filter operation requires an array source');
  }
  
  // Create a safe evaluation function
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const filterFn = new Function('item', 'index', `return ${selector.expression}`) as (
    item: unknown,
    index: number
  ) => boolean;
  
  return sourceValue.filter(filterFn);
}

/**
 * Resolve an aggregate operation
 */
function resolveAggregateOperation(
  selector: AggregateOperation,
  context: ContextWithNodeOutputs
): unknown {
  const values = selector.sources.map((source) => resolveInputSelector(source, context));
  
  switch (selector.operation) {
    case 'merge': {
      // Merge objects
      return values.reduce<Record<string, unknown>>((acc, val) => {
        if (typeof val === 'object' && val !== null) {
          return { ...acc, ...(val as Record<string, unknown>) };
        }
        return acc;
      }, {});
    }
    
    case 'concat': {
      // Concatenate arrays
      return values.flat();
    }
    
    case 'sum': {
      // Sum numbers
      return values.reduce((acc, val) => (acc as number) + (val as number), 0);
    }
    
    case 'min': {
      // Get minimum
      return Math.min(...values.map((v) => v as number));
    }
    
    case 'max': {
      // Get maximum
      return Math.max(...values.map((v) => v as number));
    }
    
    case 'count': {
      // Count items
      return values.length;
    }
    
    default:
      throw new Error(`Unknown aggregate operation: ${selector.operation as string}`);
  }
}

/**
 * Resolve a static value
 */
function resolveStaticValue(selector: StaticValue): unknown {
  return selector.value;
}

/**
 * Resolve an input selector to its actual value
 */
export function resolveInputSelector(
  selector: InputSelector | MapOperation | FilterOperation | AggregateOperation,
  context: ContextWithNodeOutputs
): unknown {
  switch (selector.type) {
    case 'context':
      return resolveContextReference(selector, context);
    
    case 'map':
      return resolveMapOperation(selector, context);
    
    case 'filter':
      return resolveFilterOperation(selector, context);
    
    case 'aggregate':
      return resolveAggregateOperation(selector, context);
    
    case 'static':
      return resolveStaticValue(selector);
    
    default:
      throw new Error(`Unknown selector type: ${(selector as { type: string }).type}`);
  }
}

/**
 * Resolve all input selectors in an input configuration
 */
export function resolveInputConfig(
  inputConfig: InputConfig,
  context: ContextWithNodeOutputs
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, selector] of Object.entries(inputConfig)) {
    result[key] = resolveInputSelector(selector, context);
  }
  
  return result;
}
