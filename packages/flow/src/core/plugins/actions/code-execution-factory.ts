/**
 * Code Execution Plugin Factory
 *
 * Factory for creating type-safe code execution plugins with schema validation.
 * Provides full context access and proper TypeScript type inference.
 */

import type { FlowPlugin } from '../../types/plugin';
import type { NodeExecutionContext } from '../../types/context';
import { z, type ZodType } from 'zod';

/**
 * Full execution context passed to code execution handlers
 * Contains all upstream node outputs with type safety
 */
export interface CodeExecutionContext {
  /** All upstream node outputs by node ID */
  inputs: Record<string, unknown>;
  /** Current node configuration */
  config: Record<string, unknown>;
  /** Full execution context */
  context: NodeExecutionContext;
}

/**
 * Configuration for creating a code execution plugin
 */
export interface CreateCodeExecutionConfig<TOutput> {
  /** Zod schema for the output validation */
  output: ZodType<TOutput>;
  /** Handler function that receives full context and returns typed output */
  handler: (ctx: CodeExecutionContext) => Promise<TOutput> | TOutput;
  /** Optional plugin metadata */
  metadata?: {
    /** Plugin ID (auto-generated if not provided) */
    id?: string;
    /** Display name */
    name?: string;
    /** Description */
    description?: string;
    /** Icon */
    icon?: string;
    /** Category */
    category?: string;
    /** Sub-category */
    subCategory?: string;
  };
}

/**
 * Create a type-safe code execution plugin
 *
 * @example
 * ```ts
 * const mathPlugin = createCodeExecution({
 *   output: z.object({
 *     sum: z.number(),
 *     product: z.number(),
 *   }),
 *   handler: async ({ inputs }) => {
 *     const a = inputs.nodeA as { value: number };
 *     const b = inputs.nodeB as { value: number };
 *     return {
 *       sum: a.value + b.value,
 *       product: a.value * b.value,
 *     };
 *   },
 *   metadata: {
 *     name: 'Math Operations',
 *     description: 'Performs math operations on upstream values',
 *   },
 * });
 * ```
 */
export function createCodeExecution<TOutput>(
  config: CreateCodeExecutionConfig<TOutput>
): FlowPlugin {
  const {
    output: outputSchema,
    handler,
    metadata = {},
  } = config;

  const pluginId = metadata.id ?? `code-exec-${String(Date.now())}`;

  return {
    id: pluginId,
    name: metadata.name ?? 'Code Execution',
    version: '1.0.0',
    category: metadata.category ?? 'core',
    subCategory: metadata.subCategory ?? 'action',
    nodeType: 'action',
    icon: metadata.icon ?? '💻',
    description: metadata.description ?? 'Executes custom code with type-safe output',

    // No config schema needed - handler receives everything
    configSchema: z.object({}).optional(),

    // Output schema from user definition
    outputSchema,

    nodeUIPattern: 'clickable',

    async execute(context, nodeConfig) {
      try {
        // Build inputs from upstream nodes
        const inputs: Record<string, unknown> = {};
        
        // Get all upstream contexts
        // In a real implementation, this would iterate through connected nodes
        // For now, we'll use the context's inputs directly
        Object.assign(inputs, context.inputs);

        // Create execution context
        const executionContext: CodeExecutionContext = {
          inputs,
          config: nodeConfig,
          context,
        };

        // Execute handler with full context
        const result = await Promise.resolve(handler(executionContext));

        // Validate output against schema
        const validatedResult = outputSchema.parse(result);

        return validatedResult;
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(
            `Output validation failed: ${error.issues.map((i) => i.message).join(', ')}`
          );
        }
        throw error;
      }
    },

    validate(nodeConfig) {
      // Since we don't enforce config schema, always valid
      // Users can add their own validation in the handler
      return { valid: true, errors: [] };
    },
  };
}

/**
 * Helper to create a code execution plugin with input schema validation
 *
 * @example
 * ```ts
 * const plugin = createCodeExecutionWithInputs({
 *   inputs: z.object({
 *     valueA: z.number(),
 *     valueB: z.number(),
 *   }),
 *   output: z.object({
 *     result: z.number(),
 *   }),
 *   handler: async ({ inputs }) => {
 *     return {
 *       result: inputs.valueA + inputs.valueB,
 *     };
 *   },
 * });
 * ```
 */
export function createCodeExecutionWithInputs<TInput, TOutput>(config: {
  inputs: ZodType<TInput>;
  output: ZodType<TOutput>;
  handler: (ctx: CodeExecutionContext & { parsedInputs: TInput }) => Promise<TOutput> | TOutput;
  metadata?: CreateCodeExecutionConfig<TOutput>['metadata'];
}): FlowPlugin {
  const { inputs: inputSchema, output: outputSchema, handler, metadata } = config;

  return createCodeExecution({
    output: outputSchema,
    handler: async (ctx) => {
      // Validate and parse inputs
      const parsedInputs = inputSchema.parse(ctx.inputs);

      // Call handler with typed inputs
      return handler({
        ...ctx,
        parsedInputs,
      });
    },
    metadata,
  });
}
