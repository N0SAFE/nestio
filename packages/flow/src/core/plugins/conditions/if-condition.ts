/**
 * If/Else-If/Else Condition Plugin
 * 
 * Provides conditional branching with:
 * - Initial if condition
 * - Multiple optional else-if branches (can be added dynamically in UI)
 * - Final else branch
 * 
 * Each branch creates its own output handle for visual routing.
 */

import type { FlowPlugin } from '../../types/plugin';
import { z } from 'zod';
import {
  configSchema,
  section,
  codeField,
  textField,
  arrayField,
} from '../../../ui/components/config/schema';

/**
 * Else-If Branch Definition
 */
const elseIfBranchSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  condition: z.string().min(1, 'Condition is required'),
  handle: z.string(), // Output handle ID (e.g., 'elseif-1', 'elseif-2')
});

/**
 * If Condition Configuration Schema
 */
const ifConditionConfigSchema = z.object({
  // Initial if condition
  ifCondition: z.string().min(1, 'If condition is required').describe('Boolean expression for if branch'),
  ifHandle: z.string().default('if').describe('Output handle ID for if branch'),
  
  // Optional else-if branches (can be added/removed dynamically)
  elseIfBranches: z.array(elseIfBranchSchema).default([]).describe('Optional else-if branches'),
  
  // Final else branch (always present)
  elseHandle: z.string().default('else').describe('Output handle ID for else branch'),
});

export type IfConditionConfig = z.infer<typeof ifConditionConfigSchema>;
export type ElseIfBranch = z.infer<typeof elseIfBranchSchema>;

/**
 * If/Else-If/Else Condition Plugin Implementation
 */
export const ifConditionPlugin: FlowPlugin = {
  id: 'if-condition',
  name: 'If Condition',
  version: '1.0.0',
  category: 'core',
  subCategory: 'condition',
  nodeType: 'condition',
  icon: '🔀',
  description: 'Branches flow based on if/else-if/else conditions with multiple optional branches',

  configSchema: ifConditionConfigSchema,

  outputSchema: z.object({
    branch: z.string(), // 'if', 'elseif-{id}', or 'else'
    branchId: z.string().optional(),
    conditionResult: z.boolean(),
    evaluatedCondition: z.string(),
  }),

  nodeUIPattern: 'clickable',

  // Dynamic config schema for auto-generated UI
  dynamicConfigSchema: configSchema([
    section('ifCondition', 'If Condition', [
      codeField('ifCondition', 'Condition', {
        description: 'JavaScript expression that evaluates to true or false',
        placeholder: "e.g., data.status === 'active' && data.count > 0",
        rows: 2,
        required: true,
      }),
    ], { description: 'The primary condition to evaluate' }),
    section('elseIfBranches', 'Else-If Branches', [
      arrayField('elseIfBranches', 'Branches', [
        textField('name', 'Branch Name', { placeholder: 'e.g., Check Pending' }),
        codeField('condition', 'Condition', {
          description: 'Evaluated if previous conditions are false',
          placeholder: "e.g., data.status === 'pending'",
          rows: 2,
          required: true,
        }),
      ], {
        description: 'Optional additional conditions checked in order',
        minItems: 0,
        addLabel: '+ Add Else-If Branch',
      }),
    ], { description: 'Optional additional conditions checked in order' }),
  ]),

  // Single input
  inputs: {
    static: [
      { id: 'input', label: 'In', type: 'flow', required: true },
    ],
  },

  // Dynamic outputs for if/else-if/else branches
  outputs: {
    static: [
      { id: 'if', label: 'True', type: 'flow', description: 'If condition is true' },
      { id: 'else', label: 'False', type: 'flow', description: 'All conditions are false' },
    ],
    dynamic: (config) => {
      const typedConfig = config as IfConditionConfig;
      return (typedConfig.elseIfBranches || []).map((branch, index) => ({
        id: branch.handle || `elseif-${index}`,
        label: branch.name || `Else If ${index + 1}`,
        type: 'flow' as const,
        description: `Else-if: ${branch.condition}`,
      }));
    },
  },

  async execute(context, config) {
    // The condition evaluation and branch selection is handled by the executor
    // This plugin defines the structure and validates configuration
    const typedConfig = config as IfConditionConfig;

    return {
      branch: 'if',
      conditionResult: true,
      evaluatedCondition: typedConfig.ifCondition,
      totalBranches: 2 + typedConfig.elseIfBranches.length, // if + else-ifs + else
    };
  },

  validate(config) {
    try {
      ifConditionConfigSchema.parse(config);
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
