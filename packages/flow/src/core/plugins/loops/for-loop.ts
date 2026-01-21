/**
 * For Loop Plugin
 * 
 * Provides fixed iteration loop with start, end, and step.
 */

import type { FlowPlugin } from '../../types/plugin';
import { z } from 'zod';

/**
 * For Loop Configuration Schema
 */
const forLoopConfigSchema = z.object({
  start: z.number().int().describe('Starting index'),
  end: z.number().int().describe('Ending index (exclusive)'),
  step: z.number().int().positive().default(1).describe('Step increment'),
  indexVariable: z.string().describe('Variable name to store current index'),
});

export type ForLoopConfig = z.infer<typeof forLoopConfigSchema>;

/**
 * For Loop Plugin Implementation
 */
export const forLoopPlugin: FlowPlugin = {
  id: 'for-loop',
  name: 'For Loop',
  version: '1.0.0',
  category: 'core',
  subCategory: 'loop',
  nodeType: 'loop',
  icon: '🔁',
  description: 'Iterates a fixed number of times with start, end, and step',

  configSchema: forLoopConfigSchema,

  nodeUIPattern: 'clickable',

  async execute(context, config) {
    const { start, end, step, indexVariable } = config as ForLoopConfig;

    // Validate range
    if (end <= start) {
      throw new Error('For loop: end must be greater than start');
    }

    // The actual loop iteration is handled by the executor
    // This plugin just validates and returns loop metadata
    return {
      start,
      end,
      step,
      indexVariable,
      iterations: Math.ceil((end - start) / step),
    };
  },

  validate(config) {
    try {
      const parsed = forLoopConfigSchema.parse(config) as ForLoopConfig;
      
      // Additional validation
      if (parsed.end <= parsed.start) {
        return {
          valid: false,
          errors: [{ path: 'end', message: 'End must be greater than start' }],
        };
      }

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
