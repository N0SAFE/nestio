/**
 * Transform Plugin
 * 
 * Transforms data using expressions or mapping rules.
 * Supports object mapping, array operations, and value transformations.
 */

import type { FlowPlugin } from '../../types/plugin';
import { SchemaHelpers } from '../../types/variable-schema';
import { z } from 'zod';

/**
 * Transform Operation Types
 */
export type TransformOperation = 'map' | 'filter' | 'reduce' | 'set' | 'delete';

/**
 * Transform Rule Schema
 */
const transformRuleSchema = z.object({
  operation: z.enum(['map', 'filter', 'reduce', 'set', 'delete']).describe('Transform operation type'),
  
  // For 'set' operation
  targetVariable: z.string().optional().describe('Variable to set/update'),
  targetPath: z.string().optional().describe('Path within variable (e.g., "user.name")'),
  
  // Value/expression
  value: z.string().optional().describe('Value or expression (e.g., {{ input.value * 2 }})'),
  
  // For array operations
  sourceArray: z.string().optional().describe('Source array variable'),
  mapExpression: z.string().optional().describe('Map expression for each item'),
  filterCondition: z.string().optional().describe('Filter condition'),
  reduceExpression: z.string().optional().describe('Reduce expression'),
  initialValue: z.unknown().optional().describe('Initial value for reduce'),
});

/**
 * Transform Configuration Schema
 */
const transformConfigSchema = z.object({
  name: z.string().optional().describe('Transform name/description'),
  rules: z.array(transformRuleSchema).min(1, 'At least one transform rule is required').describe('Transform rules to apply'),
  continueOnError: z.boolean().default(false).describe('Continue if a rule fails'),
});

export type TransformConfig = z.infer<typeof transformConfigSchema>;
export type TransformRule = z.infer<typeof transformRuleSchema>;

/**
 * Execute a single transform rule
 */
async function executeTransformRule(rule: TransformRule, context: unknown): Promise<void> {
  // This is a placeholder - actual implementation would use the expression evaluator
  // and variable manager from the context
  
  switch (rule.operation) {
    case 'set':
      // Set variable value
      if (!rule.targetVariable) {
        throw new Error('Set operation requires targetVariable');
      }
      // Would use: context.variables.set(rule.targetVariable, evaluatedValue)
      break;
      
    case 'delete':
      // Delete variable
      if (!rule.targetVariable) {
        throw new Error('Delete operation requires targetVariable');
      }
      // Would use: context.variables.delete(rule.targetVariable)
      break;
      
    case 'map':
      // Map array
      if (!rule.sourceArray || !rule.mapExpression) {
        throw new Error('Map operation requires sourceArray and mapExpression');
      }
      // Would use expression evaluator to map array
      break;
      
    case 'filter':
      // Filter array
      if (!rule.sourceArray || !rule.filterCondition) {
        throw new Error('Filter operation requires sourceArray and filterCondition');
      }
      // Would use expression evaluator to filter array
      break;
      
    case 'reduce':
      // Reduce array
      if (!rule.sourceArray || !rule.reduceExpression) {
        throw new Error('Reduce operation requires sourceArray and reduceExpression');
      }
      // Would use expression evaluator to reduce array
      break;
  }
}

/**
 * Transform Plugin Implementation
 */
export const transformPlugin: FlowPlugin = {
  id: 'transform',
  name: 'Transform',
  version: '1.0.0',
  category: 'core',
  subCategory: 'transform',
  nodeType: 'action',
  icon: '🔄',
  description: 'Transforms data using mapping rules and expressions',

  configSchema: transformConfigSchema,

  outputSchema: z.object({
    rulesApplied: z.number(),
    errors: z.array(z.string()).optional(),
  }),

  /**
   * Typed variable output schema for autocomplete
   */
  variableOutputSchema: {
    output: SchemaHelpers.object({
      rulesApplied: SchemaHelpers.number({ description: 'Number of transform rules successfully applied' }),
      errors: SchemaHelpers.array(SchemaHelpers.string(), {
        optional: true,
        description: 'List of error messages if any rules failed',
      }),
    }, { description: 'Transform result' }),
  },

  nodeUIPattern: 'clickable',

  async execute(context, config) {
    const typedConfig = config as TransformConfig;
    const errors: string[] = [];
    let rulesApplied = 0;

    for (const rule of typedConfig.rules) {
      try {
        await executeTransformRule(rule, context);
        rulesApplied++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Rule ${rulesApplied + 1}: ${errorMsg}`);
        
        if (!typedConfig.continueOnError) {
          throw new Error(`Transform failed: ${errorMsg}`);
        }
      }
    }

    return {
      rulesApplied,
      errors: errors.length > 0 ? errors : undefined,
    };
  },

  validate(config) {
    try {
      const parsed = transformConfigSchema.parse(config);
      
      // Additional validation for each rule
      const errors = [];
      for (let i = 0; i < parsed.rules.length; i++) {
        const rule = parsed.rules[i];
        
        if (!rule) continue;
        
        if (rule.operation === 'set' && !rule.targetVariable) {
          errors.push({
            path: `rules.${i}.targetVariable`,
            message: 'Set operation requires targetVariable',
          });
        }
        
        if (rule.operation === 'map' && (!rule.sourceArray || !rule.mapExpression)) {
          errors.push({
            path: `rules.${i}`,
            message: 'Map operation requires sourceArray and mapExpression',
          });
        }
        
        if (rule.operation === 'filter' && (!rule.sourceArray || !rule.filterCondition)) {
          errors.push({
            path: `rules.${i}`,
            message: 'Filter operation requires sourceArray and filterCondition',
          });
        }
        
        if (rule.operation === 'reduce' && (!rule.sourceArray || !rule.reduceExpression)) {
          errors.push({
            path: `rules.${i}`,
            message: 'Reduce operation requires sourceArray and reduceExpression',
          });
        }
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
