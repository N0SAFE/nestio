/**
 * Switch Condition Plugin
 * 
 * Provides switch/case branching logic.
 * Creates multiple output handles based on cases.
 */

import type { FlowPlugin } from '../../types/plugin';
import { z } from 'zod';

/**
 * Switch Case Definition
 */
const switchCaseSchema = z.object({
  value: z.unknown().describe('Value to match against'),
  handle: z.string().describe('Output handle ID for this case'),
  label: z.string().optional().describe('Display label for this case'),
});

/**
 * Switch Condition Configuration Schema
 */
const switchConditionConfigSchema = z.object({
  expression: z.string().describe('Expression to evaluate (e.g., {{ status }})'),
  cases: z.array(switchCaseSchema).min(1).describe('Array of case definitions'),
  defaultHandle: z.string().optional().describe('Output handle ID for default case'),
});

export type SwitchConditionConfig = z.infer<typeof switchConditionConfigSchema>;

/**
 * Switch Condition Plugin Implementation
 */
export const switchConditionPlugin: FlowPlugin = {
  id: 'switch-condition',
  name: 'Switch Condition',
  version: '1.0.0',
  category: 'core',
  subCategory: 'condition',
  nodeType: 'condition',
  icon: '🔀',
  description: 'Routes flow based on multiple cases (switch/case)',

  configSchema: switchConditionConfigSchema,

  nodeUIPattern: 'clickable',

  async execute(context, config) {
    const { expression, cases } = config as SwitchConditionConfig;

    // The case matching and edge selection is handled by the executor
    // This plugin just validates and returns metadata
    return {
      expression,
      cases: cases.map(c => ({ value: c.value, handle: c.handle })),
      evaluated: true,
    };
  },

  validate(config) {
    try {
      switchConditionConfigSchema.parse(config);
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
