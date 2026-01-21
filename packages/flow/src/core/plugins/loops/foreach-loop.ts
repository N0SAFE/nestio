/**
 * ForEach Loop Plugin
 * 
 * Iterates over an array, setting item and index variables.
 */

import type { FlowPlugin } from '../../types/plugin';
import { z } from 'zod';

/**
 * ForEach Loop Configuration Schema
 */
const forEachLoopConfigSchema = z.object({
  array: z.string().describe('Variable name or expression for array (e.g., {{ items }})'),
  itemVariable: z.string().describe('Variable name to store current item'),
  indexVariable: z.string().optional().describe('Variable name to store current index'),
});

export type ForEachLoopConfig = z.infer<typeof forEachLoopConfigSchema>;

/**
 * ForEach Loop Plugin Implementation
 */
export const forEachLoopPlugin: FlowPlugin = {
  id: 'foreach-loop',
  name: 'ForEach Loop',
  version: '1.0.0',
  category: 'core',
  subCategory: 'loop',
  nodeType: 'loop',
  icon: '🔁',
  description: 'Iterates over each item in an array',

  configSchema: forEachLoopConfigSchema,

  nodeUIPattern: 'clickable',

  async execute(context, config) {
    const { array, itemVariable, indexVariable } = config as ForEachLoopConfig;

    // The actual loop iteration is handled by the executor
    // This plugin just validates and returns loop metadata
    return {
      array,
      itemVariable,
      indexVariable,
    };
  },

  validate(config) {
    try {
      forEachLoopConfigSchema.parse(config);
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
