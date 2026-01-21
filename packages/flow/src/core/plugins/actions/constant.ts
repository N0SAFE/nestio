/**
 * Constant Variable Plugin
 *
 * Defines constant values that can be referenced by downstream nodes.
 * Useful for configuration values, API keys, default values, etc.
 */

import type { FlowPlugin } from '../../types/plugin';
import { z } from 'zod';
import { ConstantConfig as ConstantConfigComponent } from '../../../ui/components/plugins/constant-config';

/**
 * Supported constant value types
 */
export const constantValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.unknown()),
  z.record(z.string(), z.unknown()),
]);

/**
 * Single constant definition
 */
export const constantDefinitionSchema = z.object({
  key: z.string().min(1, 'Key is required').describe('Variable name'),
  value: constantValueSchema.describe('Constant value'),
  type: z
    .enum(['string', 'number', 'boolean', 'null', 'array', 'object'])
    .describe('Value type'),
  description: z.string().optional().describe('Optional description'),
});

/**
 * Constant Configuration Schema
 */
const constantConfigSchema = z.object({
  constants: z
    .array(constantDefinitionSchema)
    .min(1, 'At least one constant is required')
    .describe('List of constant definitions'),
  namespace: z
    .string()
    .optional()
    .describe('Optional namespace to group constants'),
});

export type ConstantConfig = z.infer<typeof constantConfigSchema>;
export type ConstantDefinition = z.infer<typeof constantDefinitionSchema>;

/**
 * Constant Variable Plugin Implementation
 */
export const constantPlugin: FlowPlugin = {
  id: 'constant',
  name: 'Constant Variables',
  version: '1.0.0',
  category: 'core',
  subCategory: 'action',
  nodeType: 'action',
  icon: '📌',
  description: 'Defines constant values for use in downstream nodes',

  configSchema: constantConfigSchema,

  // Custom configuration UI component
  ConfigComponent: ConstantConfigComponent,

  // Dynamic output schema based on defined constants
  getOutputSchema(config) {
    const typedConfig = config as ConstantConfig;
    
    if (typedConfig.constants.length === 0) {
      return z.object({});
    }

    const schemaFields: Record<string, z.ZodType> = {};

    for (const constant of typedConfig.constants) {
      const key = typedConfig.namespace
        ? `${typedConfig.namespace}.${constant.key}`
        : constant.key;

      // Map constant type to Zod schema
      let fieldSchema: z.ZodType;
      switch (constant.type) {
        case 'string':
          fieldSchema = z.string();
          break;
        case 'number':
          fieldSchema = z.number();
          break;
        case 'boolean':
          fieldSchema = z.boolean();
          break;
        case 'null':
          fieldSchema = z.null();
          break;
        case 'array':
          fieldSchema = z.array(z.unknown());
          break;
        case 'object':
          fieldSchema = z.record(z.string(), z.unknown());
          break;
        default:
          fieldSchema = z.unknown();
      }

      if (constant.description) {
        fieldSchema = fieldSchema.describe(constant.description);
      }

      schemaFields[key] = fieldSchema;
    }

    return z.object(schemaFields);
  },

  getVariableOutputSchema(config) {
    const typedConfig = config as ConstantConfig;
    
    if (typedConfig.constants.length === 0) {
      return {};
    }

    const variables: Record<string, z.ZodType> = {};

    for (const constant of typedConfig.constants) {
      const key = typedConfig.namespace
        ? `${typedConfig.namespace}.${constant.key}`
        : constant.key;

      // Map constant type to Zod schema
      let fieldSchema: z.ZodType;
      switch (constant.type) {
        case 'string':
          fieldSchema = z.string();
          break;
        case 'number':
          fieldSchema = z.number();
          break;
        case 'boolean':
          fieldSchema = z.boolean();
          break;
        case 'null':
          fieldSchema = z.null();
          break;
        case 'array':
          fieldSchema = z.array(z.unknown());
          break;
        case 'object':
          fieldSchema = z.record(z.string(), z.unknown());
          break;
        default:
          fieldSchema = z.unknown();
      }

      if (constant.description) {
        fieldSchema = fieldSchema.describe(constant.description);
      }

      variables[key] = fieldSchema;
    }

    return variables;
  },

  nodeUIPattern: 'clickable',

  async execute(_context, config) {
    const typedConfig = config as ConstantConfig;

    // Build output object from constant definitions
    const output: Record<string, unknown> = {};

    for (const constant of typedConfig.constants) {
      const key = typedConfig.namespace
        ? `${typedConfig.namespace}.${constant.key}`
        : constant.key;

      output[key] = constant.value;
    }

    return Promise.resolve(output);
  },

  validate(config) {
    try {
      const parsed = constantConfigSchema.parse(config);

      // Additional validation: check for duplicate keys
      const keys = new Set<string>();
      const errors: { path: string; message: string }[] = [];

      for (const [index, constant] of parsed.constants.entries()) {
        const fullKey = parsed.namespace
          ? `${parsed.namespace}.${constant.key}`
          : constant.key;

        if (keys.has(fullKey)) {
          errors.push({
            path: `constants.${String(index)}.key`,
            message: `Duplicate key: ${fullKey}`,
          });
        }
        keys.add(fullKey);
      }

      if (errors.length > 0) {
        return { valid: false, errors };
      }

      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.issues.map((err) => ({
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
 * Helper to create a constant plugin with typed values
 *
 * @example
 * ```ts
 * const myConstants = createConstant({
 *   apiKey: 'secret-key',
 *   maxRetries: 3,
 *   enableLogging: true,
 *   endpoints: ['api.example.com', 'backup.example.com'],
 * });
 * ```
 */
export function createConstant<T extends Record<string, unknown>>(
  constants: T,
  options?: {
    namespace?: string;
    descriptions?: Partial<Record<keyof T, string>>;
  }
): ConstantConfig {
  const definitions: ConstantDefinition[] = Object.entries(constants).map(
    ([key, value]) => {
      // Infer type from value
      let type: ConstantDefinition['type'];
      if (value === null) {
        type = 'null';
      } else if (Array.isArray(value)) {
        type = 'array';
      } else {
        type = typeof value as ConstantDefinition['type'];
      }

      return {
        key,
        value: value as string | number | boolean | Record<string, unknown> | unknown[] | null,
        type,
        description: options?.descriptions?.[key],
      };
    }
  );

  return {
    constants: definitions,
    namespace: options?.namespace,
  };
}

/**
 * Helper to create environment-based constants
 *
 * @example
 * ```ts
 * const envConstants = createEnvConstants({
 *   apiUrl: process.env.API_URL ?? 'http://localhost:3000',
 *   environment: process.env.NODE_ENV ?? 'development',
 *   debug: process.env.DEBUG === 'true',
 * });
 * ```
 */
export function createEnvConstants(
  mapping: Record<string, string | number | boolean | null>,
  options?: {
    namespace?: string;
    descriptions?: Record<string, string>;
  }
): ConstantConfig {
  return createConstant(mapping, options);
}
