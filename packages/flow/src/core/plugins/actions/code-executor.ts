/**
 * Code Executor Plugin
 * 
 * Executes custom TypeScript/JavaScript code within the flow.
 * Provides access to context variables and can return results.
 * 
 * SECURITY: Code is executed in the same runtime - use with caution!
 */

import type { FlowPlugin } from '../../types/plugin';
import { z } from 'zod';

/**
 * Code Executor Configuration Schema
 */
const codeExecutorConfigSchema = z.object({
  code: z.string().min(1, 'Code is required').describe('JavaScript/TypeScript code to execute'),
  
  // Input variables to pass to code
  inputs: z.array(z.object({
    name: z.string(),
    variable: z.string(), // Variable name from context
  })).default([]).describe('Variables to pass as inputs'),
  
  // Output variable to store result
  outputVariable: z.string().optional().describe('Variable to store the code result'),
  
  // Timeout
  timeout: z.number().positive().default(5000).describe('Execution timeout in milliseconds'),
  
  // Async support
  isAsync: z.boolean().default(false).describe('Whether code is async'),
});

export type CodeExecutorConfig = z.infer<typeof codeExecutorConfigSchema>;

/**
 * Execute function with timeout
 */
async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeout: number
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Code execution timeout')), timeout)
    ),
  ]);
}

/**
 * Code Executor Plugin Implementation
 */
export const codeExecutorPlugin: FlowPlugin = {
  id: 'code-executor',
  name: 'Code Executor',
  version: '1.0.0',
  category: 'core',
  subCategory: 'action',
  nodeType: 'action',
  icon: '💻',
  description: 'Executes custom JavaScript/TypeScript code',

  configSchema: codeExecutorConfigSchema,

  outputSchema: z.object({
    result: z.unknown().optional(),
    executionTime: z.number(),
    error: z.string().optional(),
  }),

  nodeUIPattern: 'clickable',

  async execute(context, config) {
    const typedConfig = config as CodeExecutorConfig;
    const startTime = Date.now();

    try {
      // Prepare input variables
      const inputs: Record<string, unknown> = {};
      for (const input of typedConfig.inputs) {
        // Would get from context: inputs[input.name] = context.variables.get(input.variable)
        inputs[input.name] = null; // Placeholder
      }

      // Create function from code
      const functionArgs = [...typedConfig.inputs.map(i => i.name), 'context'];
      const functionBody = typedConfig.code;
      
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const fn = new Function(...functionArgs, functionBody);

      // Execute with timeout
      const result = await executeWithTimeout(
        () => {
          if (typedConfig.isAsync) {
            return fn(...Object.values(inputs), context);
          } else {
            return Promise.resolve(fn(...Object.values(inputs), context));
          }
        },
        typedConfig.timeout
      );

      // Store result if output variable specified
      if (typedConfig.outputVariable && result !== undefined) {
        // Would set: context.variables.set(typedConfig.outputVariable, result)
      }

      const executionTime = Date.now() - startTime;

      return {
        result,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Code execution failed';

      return {
        executionTime,
        error: errorMsg,
      };
    }
  },

  validate(config) {
    try {
      codeExecutorConfigSchema.parse(config);
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
