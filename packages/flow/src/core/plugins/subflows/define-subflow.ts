/**
 * Define Subflow Plugin
 * 
 * Defines a reusable subflow that can be called from other flows.
 * Acts as a container node with input/output parameters.
 */

import type { FlowPlugin } from '../../types/plugin';
import { z } from 'zod';

/**
 * Subflow Parameter Definition Schema
 */
const parameterDefinitionSchema = z.object({
  name: z.string().min(1, 'Parameter name is required'),
  type: z.enum(['string', 'number', 'boolean', 'object', 'array']).default('string'),
  required: z.boolean().default(true),
  defaultValue: z.unknown().optional(),
  description: z.string().optional(),
});

/**
 * Define Subflow Configuration Schema
 */
const defineSubflowConfigSchema = z.object({
  subflowId: z.string().min(1, 'Subflow ID is required').describe('Unique identifier for the subflow'),
  subflowName: z.string().min(1, 'Subflow name is required').describe('Display name'),
  description: z.string().optional().describe('Subflow description'),
  
  // Input parameters definition
  inputParameters: z.array(parameterDefinitionSchema).default([]).describe('Input parameters'),
  
  // Output parameters definition
  outputParameters: z.array(parameterDefinitionSchema).default([]).describe('Output parameters'),
  
  // Entry and exit handles
  entryHandle: z.string().default('entry').describe('Input handle for subflow entry'),
  exitHandle: z.string().default('exit').describe('Output handle for subflow exit'),
});

export type DefineSubflowConfig = z.infer<typeof defineSubflowConfigSchema>;
export type ParameterDefinition = z.infer<typeof parameterDefinitionSchema>;

/**
 * Define Subflow Plugin Implementation
 */
export const defineSubflowPlugin: FlowPlugin = {
  id: 'define-subflow',
  name: 'Define Subflow',
  version: '1.0.0',
  category: 'core',
  subCategory: 'subflow',
  nodeType: 'action',
  icon: '📦',
  description: 'Defines a reusable subflow with parameters',

  configSchema: defineSubflowConfigSchema,

  outputSchema: z.object({
    subflowId: z.string(),
    inputCount: z.number(),
    outputCount: z.number(),
  }),

  nodeUIPattern: 'clickable',

  async execute(context, config) {
    const typedConfig = config as DefineSubflowConfig;

    // Subflow definition doesn't execute - it's a container
    // The executor handles subflow registration and execution
    
    return {
      subflowId: typedConfig.subflowId,
      inputCount: typedConfig.inputParameters.length,
      outputCount: typedConfig.outputParameters.length,
    };
  },

  validate(config) {
    try {
      const parsed = defineSubflowConfigSchema.parse(config);
      
      // Additional validation: check for duplicate parameter names
      const inputNames = new Set<string>();
      const errors = [];
      
      for (const param of parsed.inputParameters) {
        if (inputNames.has(param.name)) {
          errors.push({
            path: 'inputParameters',
            message: `Duplicate input parameter name: ${param.name}`,
          });
        }
        inputNames.add(param.name);
      }

      const outputNames = new Set<string>();
      for (const param of parsed.outputParameters) {
        if (outputNames.has(param.name)) {
          errors.push({
            path: 'outputParameters',
            message: `Duplicate output parameter name: ${param.name}`,
          });
        }
        outputNames.add(param.name);
      }

      return {
        valid: errors.length === 0,
        errors,
      };
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
