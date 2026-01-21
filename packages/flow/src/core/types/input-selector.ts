/**
 * Input Selector System
 * 
 * Allows nodes to explicitly select and transform data from the execution context
 * instead of relying on edge-based data flow.
 */

import { z } from 'zod';

/**
 * Context reference - points to a specific node's output
 */
export const contextReferenceSchema = z.object({
  type: z.literal('context'),
  nodeId: z.string().describe('ID of the node to reference'),
  path: z.string().optional().describe('Optional JSON path within the output (e.g., "data.items[0].name")'),
});

export type ContextReference = z.infer<typeof contextReferenceSchema>;

/**
 * Static value - hardcoded value
 */
export const staticValueSchema = z.object({
  type: z.literal('static'),
  value: z.unknown(),
});

export type StaticValue = z.infer<typeof staticValueSchema>;

/**
 * Base input selector type (for recursion)
 */
type BaseInputSelector = ContextReference | StaticValue;

/**
 * Input selector - defines how to get input data
 */
export const inputSelectorSchema: z.ZodType<BaseInputSelector> = z.discriminatedUnion('type', [
  contextReferenceSchema,
  staticValueSchema,
]);

export type InputSelector = z.infer<typeof inputSelectorSchema>;

/**
 * Map operation - transform array items
 */
export const mapOperationSchema = z.object({
  type: z.literal('map'),
  source: inputSelectorSchema,
  expression: z.string().describe('JavaScript expression to transform each item (use "item" variable)'),
});

export type MapOperation = z.infer<typeof mapOperationSchema>;

/**
 * Filter operation - filter array items
 */
export const filterOperationSchema = z.object({
  type: z.literal('filter'),
  source: inputSelectorSchema,
  expression: z.string().describe('JavaScript expression to filter items (use "item" variable, return boolean)'),
});

export type FilterOperation = z.infer<typeof filterOperationSchema>;

/**
 * Aggregate operation - combine multiple values
 */
export const aggregateOperationSchema = z.object({
  type: z.literal('aggregate'),
  sources: z.array(inputSelectorSchema),
  operation: z.enum(['merge', 'concat', 'sum', 'min', 'max', 'count']).describe(
    'merge: merge objects, concat: concatenate arrays, sum/min/max/count: numeric operations'
  ),
});

export type AggregateOperation = z.infer<typeof aggregateOperationSchema>;

/**
 * Node input configuration - maps input field names to selectors
 */
export const inputConfigSchema = z.record(z.string(), inputSelectorSchema);

export type InputConfig = z.infer<typeof inputConfigSchema>;

/**
 * Helper to create a context reference
 */
export function fromNode(nodeId: string, path?: string): ContextReference {
  return { type: 'context', nodeId, path };
}

/**
 * Helper to create a map operation
 */
export function mapItems(source: InputSelector, expression: string): MapOperation {
  return { type: 'map', source, expression };
}

/**
 * Helper to create a filter operation
 */
export function filterItems(source: InputSelector, expression: string): FilterOperation {
  return { type: 'filter', source, expression };
}

/**
 * Helper to create an aggregate operation
 */
export function aggregate(
  sources: InputSelector[],
  operation: 'merge' | 'concat' | 'sum' | 'min' | 'max' | 'count'
): AggregateOperation {
  return { type: 'aggregate', sources, operation };
}

/**
 * Helper to create a static value
 */
export function staticValue(value: unknown): StaticValue {
  return { type: 'static', value };
}
