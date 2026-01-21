/**
 * End Flow Plugin
 * 
 * Terminates flow execution.
 */

import type { FlowPlugin } from '../../types/plugin';
import { z } from 'zod';

/**
 * End Flow Configuration Schema
 */
const endFlowConfigSchema = z.object({
  returnValue: z.unknown().optional().describe('Optional value to return'),
  message: z.string().optional().describe('Optional completion message'),
});

export type EndFlowConfig = z.infer<typeof endFlowConfigSchema>;

/**
 * End Flow Plugin Implementation
 */
export const endFlowPlugin: FlowPlugin = {
  id: 'end-flow',
  name: 'End Flow',
  version: '1.0.0',
  category: 'core',
  subCategory: 'action',
  nodeType: 'action',
  icon: '⏹️',
  description: 'Terminates flow execution',

  configSchema: endFlowConfigSchema,

  nodeUIPattern: 'info',

  async execute(context, config) {
    const { returnValue, message } = config as EndFlowConfig;

    // Mark flow as completed
    context.state.status = 'completed';
    context.state.endTime = new Date();

    return {
      ended: true,
      timestamp: new Date().toISOString(),
      returnValue,
      message,
    };
  },

  validate(config) {
    try {
      endFlowConfigSchema.parse(config);
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
