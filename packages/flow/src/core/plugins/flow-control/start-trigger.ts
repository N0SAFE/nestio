/**
 * Start Trigger Plugin
 * 
 * @deprecated This plugin is deprecated. Use SubFlow-based triggers instead.
 * Triggers should now be created as SubFlows with trigger input ports.
 * See createTriggerSubFlow() in core/types/subflow.ts
 * 
 * Manual trigger to start flow execution.
 */

import type { FlowPlugin } from '../../types/plugin';
import { z } from 'zod';

/**
 * Start Trigger Configuration Schema
 */
const startTriggerConfigSchema = z.object({
  buttonLabel: z.string().default('Start Flow').describe('Label for trigger button'),
  confirmRequired: z.boolean().default(false).describe('Require confirmation before starting'),
});

export type StartTriggerConfig = z.infer<typeof startTriggerConfigSchema>;

/**
 * Start Trigger Plugin Implementation
 */
export const startTriggerPlugin: FlowPlugin = {
  id: 'start-trigger',
  name: 'Manual Start (Deprecated)',
  version: '1.0.0',
  category: 'core',
  subCategory: 'trigger',
  nodeType: 'trigger',
  icon: '▶️',
  description: '[DEPRECATED] Use SubFlow-based triggers instead. This plugin will be removed in a future version.',
  deprecated: true,

  configSchema: startTriggerConfigSchema,

  nodeUIPattern: 'info',

  async execute(context, config) {
    const { buttonLabel } = config as StartTriggerConfig;

    // Manual trigger doesn't do anything on execution
    // It's just an entry point
    return {
      triggered: true,
      timestamp: new Date().toISOString(),
      buttonLabel,
    };
  },

  validate(config) {
    try {
      startTriggerConfigSchema.parse(config);
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
