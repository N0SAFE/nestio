/**
 * Parallel Execution Plugins
 * 
 * Split: Creates multiple parallel branches from a single input
 * Join: Waits for all parallel branches to complete before continuing
 */

import type { FlowPlugin } from '../../types/plugin';
import { z } from 'zod';
import {
  configSchema,
  section,
  textField,
  numberField,
  selectField,
  checkboxField,
  arrayField,
} from '../../../ui/components/config/schema';

/**
 * Split Configuration Schema
 */
const splitConfigSchema = z.object({
  branches: z.array(z.object({
    id: z.string(),
    name: z.string().optional(),
    handle: z.string(),
  })).min(2, 'At least 2 branches required').describe('Parallel branches to create'),
  
  cloneVariables: z.boolean().default(true).describe('Whether to clone variables for each branch'),
});

export type SplitConfig = z.infer<typeof splitConfigSchema>;

/**
 * Join Configuration Schema
 */
const joinConfigSchema = z.object({
  mergeStrategy: z.enum(['first', 'last', 'all', 'custom']).default('all').describe('How to merge results from branches'),
  
  resultVariable: z.string().optional().describe('Variable to store merged results'),
  
  timeout: z.number().positive().optional().describe('Max time to wait for all branches (ms)'),
});

export type JoinConfig = z.infer<typeof joinConfigSchema>;

/**
 * Split Plugin - Creates parallel execution branches
 */
export const splitPlugin: FlowPlugin = {
  id: 'split',
  name: 'Split (Parallel)',
  version: '1.0.0',
  category: 'core',
  subCategory: 'action',
  nodeType: 'action',
  icon: '🔀',
  description: 'Splits flow into parallel execution branches',

  configSchema: splitConfigSchema,

  outputSchema: z.object({
    branchCount: z.number(),
    branches: z.array(z.string()),
  }),

  // Input port
  inputs: {
    static: [
      { id: 'input', label: 'In', type: 'flow', required: true },
    ],
  },

  // Dynamic output ports based on branches
  outputs: {
    dynamic: (config) => {
      const typedConfig = config as SplitConfig;
      if (!typedConfig.branches || typedConfig.branches.length === 0) {
        return [
          { id: 'output-1', label: 'Branch 1', type: 'flow' },
          { id: 'output-2', label: 'Branch 2', type: 'flow' },
        ];
      }
      return typedConfig.branches.map((branch) => ({
        id: branch.handle || branch.id,
        label: branch.name || branch.id,
        type: 'flow' as const,
        description: `Parallel branch: ${branch.name || branch.id}`,
      }));
    },
  },

  nodeUIPattern: 'clickable',

  // Dynamic config schema for auto-generated UI
  dynamicConfigSchema: configSchema([
    section('branches', 'Parallel Branches', [
      arrayField('branches', 'Branches', [
        textField('name', 'Branch Name', { placeholder: 'e.g., Process A' }),
      ], {
        description: 'Configure the parallel execution branches',
        minItems: 2,
        addLabel: '+ Add Branch',
      }),
    ], { description: 'Configure the number and names of parallel execution branches' }),
    section('options', 'Options', [
      checkboxField('cloneVariables', 'Clone variables for each branch', {
        description: 'When enabled, each branch receives a copy of the variables',
        defaultValue: true,
      }),
    ]),
  ]),

  async execute(context, config) {
    const typedConfig = config as SplitConfig;

    // The actual parallel execution is handled by the executor
    // This plugin validates configuration and returns metadata
    
    return {
      branchCount: typedConfig.branches.length,
      branches: typedConfig.branches.map(b => b.id),
    };
  },

  validate(config) {
    try {
      splitConfigSchema.parse(config);
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

/**
 * Join Plugin - Waits for parallel branches to complete
 */
export const joinPlugin: FlowPlugin = {
  id: 'join',
  name: 'Join (Parallel)',
  version: '1.0.0',
  category: 'core',
  subCategory: 'action',
  nodeType: 'action',
  icon: '🔗',
  description: 'Waits for all parallel branches to complete',

  configSchema: joinConfigSchema,

  outputSchema: z.object({
    branchesCompleted: z.number(),
    timedOut: z.boolean(),
    results: z.unknown().optional(),
  }),

  // Multiple inputs for parallel branches
  inputs: {
    static: [
      { id: 'input-1', label: 'Branch 1', type: 'flow' },
      { id: 'input-2', label: 'Branch 2', type: 'flow' },
    ],
  },

  // Single output after join
  outputs: {
    static: [
      { id: 'output', label: 'Continue', type: 'flow' },
      { id: 'timeout', label: 'Timeout', type: 'error' },
    ],
  },

  nodeUIPattern: 'clickable',

  // Dynamic config schema for auto-generated UI
  dynamicConfigSchema: configSchema([
    section('mergeStrategy', 'Merge Strategy', [
      selectField('mergeStrategy', 'Strategy', [
        { label: 'All Results', value: 'all' },
        { label: 'First Result', value: 'first' },
        { label: 'Last Result', value: 'last' },
        { label: 'Custom', value: 'custom' },
      ], { description: 'How to combine results from parallel branches', defaultValue: 'all' }),
      textField('resultVariable', 'Result Variable', {
        description: 'Variable name to store the merged results',
        placeholder: 'results',
      }),
    ], { description: 'How to combine results from parallel branches' }),
    section('timeout', 'Timeout', [
      numberField('timeout', 'Timeout (ms)', {
        description: 'Maximum time to wait for all branches to complete. Leave at 0 for no timeout.',
        min: 0,
        step: 1000,
        defaultValue: 0,
      }),
    ], { description: 'Maximum time to wait for all branches to complete' }),
  ]),

  async execute(context, config) {
    const typedConfig = config as JoinConfig;

    // The actual join logic is handled by the executor
    // This plugin validates configuration and returns metadata
    
    return {
      branchesCompleted: 0,
      timedOut: false,
      mergeStrategy: typedConfig.mergeStrategy,
    };
  },

  validate(config) {
    try {
      joinConfigSchema.parse(config);
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
