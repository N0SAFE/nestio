/**
 * Call Subflow Plugin
 * 
 * Invokes a reusable subflow (defined elsewhere in the flow).
 * Handles parameter passing and return values.
 */

import type { FlowPlugin } from '../../types/plugin';
import { z } from 'zod';

/**
 * Subflow Parameter Definition
 */
const subflowParameterSchema = z.object({
  name: z.string().min(1, 'Parameter name is required'),
  value: z.string().describe('Value or expression (e.g., {{ variable }})'),
});

/**
 * Call Subflow Configuration Schema
 */
const callSubflowConfigSchema = z.object({
  subflowId: z.string().min(1, 'Subflow ID is required').describe('ID of the subflow to call'),
  subflowName: z.string().optional().describe('Display name of the subflow'),
  
  // Input parameters to pass to the subflow
  parameters: z.array(subflowParameterSchema).default([]).describe('Parameters to pass to the subflow'),
  
  // Output mapping
  returnVariable: z.string().optional().describe('Variable to store subflow return value'),
});

export type CallSubflowConfig = z.infer<typeof callSubflowConfigSchema>;
export type SubflowParameter = z.infer<typeof subflowParameterSchema>;

/**
 * Call Subflow Plugin Implementation
 */
export const callSubflowPlugin: FlowPlugin = {
  id: 'call-subflow',
  name: 'Call Subflow',
  version: '1.0.0',
  category: 'core',
  subCategory: 'subflow',
  nodeType: 'action',
  icon: '📞',
  description: 'Calls a reusable subflow with parameters',

  configSchema: callSubflowConfigSchema,

  outputSchema: z.object({
    subflowId: z.string(),
    returnValue: z.unknown().optional(),
    executionTime: z.number().optional(),
  }),

  nodeUIPattern: 'clickable',

  async execute(context, config) {
    const typedConfig = config as CallSubflowConfig;

    // The actual subflow execution is handled by the executor
    // This plugin validates configuration and prepares metadata
    
    return {
      subflowId: typedConfig.subflowId,
      parameterCount: typedConfig.parameters.length,
    };
  },

  validate(config) {
    try {
      callSubflowConfigSchema.parse(config);
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
