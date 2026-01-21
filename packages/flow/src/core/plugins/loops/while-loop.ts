/**
 * While Loop Plugin
 * 
 * Provides condition-based iteration.
 * Continues looping while condition is true.
 */

import type { FlowPlugin } from '../../types/plugin';
import { z } from 'zod';

/**
 * While Loop Configuration Schema
 */
const whileLoopConfigSchema = z.object({
  condition: z.string().describe('Boolean expression to evaluate (e.g., {{ count < 10 }})'),
  maxIterations: z.number().int().positive().default(1000).describe('Maximum iterations (safety limit)'),
});

export type WhileLoopConfig = z.infer<typeof whileLoopConfigSchema>;

/**
 * While Loop Plugin Implementation
 */
export const whileLoopPlugin: FlowPlugin = {
  id: 'while-loop',
  name: 'While Loop',
  version: '1.0.0',
  category: 'core',
  subCategory: 'loop',
  nodeType: 'loop',
  icon: '🔁',
  description: 'Iterates while a condition is true',

  configSchema: whileLoopConfigSchema,

  nodeUIPattern: 'clickable',

  async execute(context, config) {
    const { condition, maxIterations } = config as WhileLoopConfig;

    // The actual loop iteration and condition evaluation is handled by the executor
    // This plugin just validates and returns loop metadata
    return {
      condition,
      maxIterations,
    };
  },

  validate(config) {
    try {
      whileLoopConfigSchema.parse(config);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.issues.map((err: any) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        };
      }
      return {
        valid: false,
        errors: [{ path: '', message: 'Invalid configuration' }],
      };
    }
  },
};
