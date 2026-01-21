/**
 * Delay Plugin
 * 
 * Pauses flow execution for a specified duration.
 * Useful for rate limiting, timeouts, or scheduling.
 */

import type { FlowPlugin } from '../../types/plugin';
import { z } from 'zod';

/**
 * Delay Configuration Schema
 */
const delayConfigSchema = z.object({
  duration: z.number().positive().describe('Delay duration in milliseconds'),
  durationUnit: z.enum(['ms', 's', 'm', 'h']).default('ms').describe('Time unit'),
  durationExpression: z.string().optional().describe('Optional expression for dynamic duration (e.g., {{ delay }})'),
});

export type DelayConfig = z.infer<typeof delayConfigSchema>;

/**
 * Delay Plugin Implementation
 */
export const delayPlugin: FlowPlugin = {
  id: 'delay',
  name: 'Delay',
  version: '1.0.0',
  category: 'core',
  subCategory: 'action',
  nodeType: 'action',
  icon: '⏱️',
  description: 'Pauses execution for specified duration',

  configSchema: delayConfigSchema,

  outputSchema: z.object({
    delayedFor: z.number(),
    startTime: z.string(),
    endTime: z.string(),
  }),

  nodeUIPattern: 'clickable',

  async execute(context, config) {
    const typedConfig = config as DelayConfig;

    // Convert duration to milliseconds
    const durationMs = (() => {
      const { duration, durationUnit } = typedConfig;
      switch (durationUnit) {
        case 's': return duration * 1000;
        case 'm': return duration * 60 * 1000;
        case 'h': return duration * 60 * 60 * 1000;
        default: return duration;
      }
    })();

    const startTime = new Date().toISOString();

    // Perform the delay
    await new Promise((resolve) => setTimeout(resolve, durationMs));

    const endTime = new Date().toISOString();

    return {
      delayedFor: durationMs,
      startTime,
      endTime,
    };
  },

  validate(config) {
    try {
      delayConfigSchema.parse(config);
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
