/**
 * Code Execution Factory Examples
 *
 * Demonstrates how to use the createCodeExecution factory for type-safe plugins.
 */

import { z } from 'zod';
import { createCodeExecution, createCodeExecutionWithInputs } from '../code-execution-factory';

// Example 1: Simple math operations
export const mathPlugin = createCodeExecution({
  output: z.object({
    sum: z.number(),
    product: z.number(),
    average: z.number(),
  }),
  handler: async ({ inputs }) => {
    // Access upstream node outputs with type assertions
    const nodeA = inputs.nodeA as { value: number };
    const nodeB = inputs.nodeB as { value: number };

    const sum = nodeA.value + nodeB.value;
    const product = nodeA.value * nodeB.value;
    const average = sum / 2;

    return {
      sum,
      product,
      average,
    };
  },
  metadata: {
    id: 'math-operations',
    name: 'Math Operations',
    description: 'Performs mathematical operations on two numbers',
    icon: '🔢',
  },
});

// Example 2: String manipulation with validated inputs
export const stringProcessorPlugin = createCodeExecutionWithInputs({
  inputs: z.object({
    text: z.string(),
    prefix: z.string().optional(),
    suffix: z.string().optional(),
    uppercase: z.boolean().default(false),
  }),
  output: z.object({
    processed: z.string(),
    length: z.number(),
    wordCount: z.number(),
  }),
  handler: async ({ parsedInputs }) => {
    // parsedInputs is fully typed!
    let processed = parsedInputs.text;

    if (parsedInputs.prefix) {
      processed = parsedInputs.prefix + processed;
    }

    if (parsedInputs.suffix) {
      processed = processed + parsedInputs.suffix;
    }

    if (parsedInputs.uppercase) {
      processed = processed.toUpperCase();
    }

    return {
      processed,
      length: processed.length,
      wordCount: processed.split(/\s+/).filter(Boolean).length,
    };
  },
  metadata: {
    id: 'string-processor',
    name: 'String Processor',
    description: 'Processes and manipulates text strings',
    icon: '📝',
  },
});

// Example 3: API data aggregator
export const apiAggregatorPlugin = createCodeExecution({
  output: z.object({
    users: z.array(z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    })),
    total: z.number(),
    processed: z.boolean(),
  }),
  handler: async ({ inputs, context }) => {
    // Aggregate data from multiple upstream API calls
    const apiResult1 = inputs.apiCall1 as { users: any[] };
    const apiResult2 = inputs.apiCall2 as { users: any[] };

    const allUsers = [...apiResult1.users, ...apiResult2.users];

    // Filter and transform
    const processedUsers = allUsers.map((user) => ({
      id: user.id?.toString() ?? 'unknown',
      name: user.name ?? 'Anonymous',
      email: user.email ?? 'no-email@example.com',
    }));

    return {
      users: processedUsers,
      total: processedUsers.length,
      processed: true,
    };
  },
  metadata: {
    id: 'api-aggregator',
    name: 'API Aggregator',
    description: 'Aggregates and processes data from multiple API calls',
    icon: '🔗',
  },
});

// Example 4: Conditional logic with complex output
export const conditionalProcessorPlugin = createCodeExecution({
  output: z.discriminatedUnion('status', [
    z.object({
      status: z.literal('success'),
      result: z.unknown(),
      processingTime: z.number(),
    }),
    z.object({
      status: z.literal('error'),
      error: z.string(),
      code: z.string(),
    }),
    z.object({
      status: z.literal('skipped'),
      reason: z.string(),
    }),
  ]),
  handler: async ({ inputs }) => {
    const startTime = Date.now();
    const condition = inputs.condition as { shouldProcess: boolean; value: unknown };

    if (!condition.shouldProcess) {
      return {
        status: 'skipped' as const,
        reason: 'Condition not met',
      };
    }

    try {
      // Process the value
      const result = await processValue(condition.value);

      return {
        status: 'success' as const,
        result,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'PROCESSING_ERROR',
      };
    }
  },
  metadata: {
    id: 'conditional-processor',
    name: 'Conditional Processor',
    description: 'Processes data based on conditions with error handling',
    icon: '🔀',
  },
});

// Helper function for example 4
async function processValue(value: unknown): Promise<unknown> {
  // Simulate processing
  return { processed: true, value };
}

// Example 5: Data validation and transformation
export const dataValidatorPlugin = createCodeExecutionWithInputs({
  inputs: z.object({
    data: z.array(z.record(z.unknown())),
    requiredFields: z.array(z.string()),
    transformations: z.record(z.enum(['uppercase', 'lowercase', 'trim'])).optional(),
  }),
  output: z.object({
    validRecords: z.array(z.record(z.unknown())),
    invalidRecords: z.array(z.object({
      record: z.record(z.unknown()),
      errors: z.array(z.string()),
    })),
    stats: z.object({
      total: z.number(),
      valid: z.number(),
      invalid: z.number(),
    }),
  }),
  handler: async ({ parsedInputs }) => {
    const validRecords: Record<string, unknown>[] = [];
    const invalidRecords: Array<{ record: Record<string, unknown>; errors: string[] }> = [];

    for (const record of parsedInputs.data) {
      const errors: string[] = [];

      // Validate required fields
      for (const field of parsedInputs.requiredFields) {
        if (!(field in record) || record[field] === null || record[field] === undefined) {
          errors.push(`Missing required field: ${field}`);
        }
      }

      if (errors.length > 0) {
        invalidRecords.push({ record, errors });
      } else {
        // Apply transformations
        const transformed = { ...record };
        if (parsedInputs.transformations) {
          for (const [field, transformation] of Object.entries(parsedInputs.transformations)) {
            if (field in transformed && typeof transformed[field] === 'string') {
              const value = transformed[field] as string;
              switch (transformation) {
                case 'uppercase':
                  transformed[field] = value.toUpperCase();
                  break;
                case 'lowercase':
                  transformed[field] = value.toLowerCase();
                  break;
                case 'trim':
                  transformed[field] = value.trim();
                  break;
              }
            }
          }
        }
        validRecords.push(transformed);
      }
    }

    return {
      validRecords,
      invalidRecords,
      stats: {
        total: parsedInputs.data.length,
        valid: validRecords.length,
        invalid: invalidRecords.length,
      },
    };
  },
  metadata: {
    id: 'data-validator',
    name: 'Data Validator',
    description: 'Validates and transforms data records',
    icon: '✅',
  },
});
