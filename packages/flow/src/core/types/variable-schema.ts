/**
 * Variable Schema System
 * 
 * Defines type-safe schemas for variables with full type information
 * to enable autocomplete and validation throughout the flow.
 */

/**
 * Primitive variable types
 */
export type PrimitiveType = 'string' | 'number' | 'boolean' | 'null' | 'undefined';

/**
 * Base schema interface
 */
export interface BaseSchema {
  /** Human-readable description */
  description?: string;
  /** Whether the variable is optional */
  optional?: boolean;
  /** Default value */
  defaultValue?: unknown;
  /** Example values for documentation */
  examples?: unknown[];
}

/**
 * String schema
 */
export interface StringSchema extends BaseSchema {
  type: 'string';
  /** Minimum length */
  minLength?: number;
  /** Maximum length */
  maxLength?: number;
  /** Regex pattern */
  pattern?: string;
  /** Enum values */
  enum?: string[];
  /** Format hint (e.g., 'email', 'url', 'date') */
  format?: 'email' | 'url' | 'date' | 'datetime' | 'uuid' | 'json' | string;
}

/**
 * Number schema
 */
export interface NumberSchema extends BaseSchema {
  type: 'number';
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Must be integer */
  integer?: boolean;
}

/**
 * Boolean schema
 */
export interface BooleanSchema extends BaseSchema {
  type: 'boolean';
}

/**
 * Null schema
 */
export interface NullSchema extends BaseSchema {
  type: 'null';
}

/**
 * Array schema
 */
export interface ArraySchema extends BaseSchema {
  type: 'array';
  /** Schema for array items */
  items: VariableSchema;
  /** Minimum items */
  minItems?: number;
  /** Maximum items */
  maxItems?: number;
}

/**
 * Object schema with known properties
 */
export interface ObjectSchema extends BaseSchema {
  type: 'object';
  /** Property schemas */
  properties: Record<string, VariableSchema>;
  /** Required property names */
  required?: string[];
  /** Allow additional properties */
  additionalProperties?: boolean | VariableSchema;
}

/**
 * Record schema (object with dynamic keys)
 */
export interface RecordSchema extends BaseSchema {
  type: 'record';
  /** Key type (always string) */
  keyType: 'string';
  /** Value schema */
  valueType: VariableSchema;
}

/**
 * Union schema (one of multiple types)
 */
export interface UnionSchema extends BaseSchema {
  type: 'union';
  /** Possible schemas */
  oneOf: VariableSchema[];
}

/**
 * Any schema (unknown type)
 */
export interface AnySchema extends BaseSchema {
  type: 'any';
}

/**
 * File schema (for file uploads)
 */
export interface FileSchema extends BaseSchema {
  type: 'file';
  /** Accepted MIME types */
  accept?: string[];
  /** Max file size in bytes */
  maxSize?: number;
}

/**
 * Date schema
 */
export interface DateSchema extends BaseSchema {
  type: 'date';
}

/**
 * Union of all variable schemas
 */
export type VariableSchema =
  | StringSchema
  | NumberSchema
  | BooleanSchema
  | NullSchema
  | ArraySchema
  | ObjectSchema
  | RecordSchema
  | UnionSchema
  | AnySchema
  | FileSchema
  | DateSchema;

/**
 * Variable definition with schema
 */
export interface VariableDefinition {
  /** Variable name */
  name: string;
  /** Variable schema */
  schema: VariableSchema;
  /** Source of the variable (node ID or 'input' or 'global') */
  source: string;
  /** Source node label for display */
  sourceLabel?: string;
  /** Path within source output (e.g., 'data.items[0].name') */
  path?: string;
}

/**
 * Context at a specific point in the flow
 */
export interface FlowContext {
  /** Available variables at this point */
  variables: Map<string, VariableDefinition>;
  /** Current scope level */
  scopeLevel: number;
  /** Parent context (for nested scopes) */
  parent?: FlowContext;
}

/**
 * Autocomplete suggestion
 */
export interface VariableSuggestion {
  /** Variable name or path */
  name: string;
  /** Display label */
  label: string;
  /** Full path for insertion */
  insertText: string;
  /** Type description */
  type: string;
  /** Human-readable description */
  description?: string;
  /** Source node/scope */
  source: string;
  /** Nested properties (for objects) */
  children?: VariableSuggestion[];
  /** Schema for validation */
  schema: VariableSchema;
}

/**
 * Helper functions for schema manipulation
 */
export const SchemaHelpers = {
  /**
   * Create a string schema
   */
  string(options?: Omit<StringSchema, 'type'>): StringSchema {
    return { type: 'string', ...options };
  },

  /**
   * Create a number schema
   */
  number(options?: Omit<NumberSchema, 'type'>): NumberSchema {
    return { type: 'number', ...options };
  },

  /**
   * Create a boolean schema
   */
  boolean(options?: Omit<BooleanSchema, 'type'>): BooleanSchema {
    return { type: 'boolean', ...options };
  },

  /**
   * Create an array schema
   */
  array(items: VariableSchema, options?: Omit<ArraySchema, 'type' | 'items'>): ArraySchema {
    return { type: 'array', items, ...options };
  },

  /**
   * Create an object schema
   */
  object(
    properties: Record<string, VariableSchema>,
    options?: Omit<ObjectSchema, 'type' | 'properties'>
  ): ObjectSchema {
    return { type: 'object', properties, ...options };
  },

  /**
   * Create a record schema
   */
  record(valueType: VariableSchema, options?: Omit<RecordSchema, 'type' | 'keyType' | 'valueType'>): RecordSchema {
    return { type: 'record', keyType: 'string', valueType, ...options };
  },

  /**
   * Create a union schema
   */
  union(oneOf: VariableSchema[], options?: Omit<UnionSchema, 'type' | 'oneOf'>): UnionSchema {
    return { type: 'union', oneOf, ...options };
  },

  /**
   * Create an any schema
   */
  any(options?: Omit<AnySchema, 'type'>): AnySchema {
    return { type: 'any', ...options };
  },

  /**
   * Create a file schema
   */
  file(options?: Omit<FileSchema, 'type'>): FileSchema {
    return { type: 'file', ...options };
  },

  /**
   * Create a date schema
   */
  date(options?: Omit<DateSchema, 'type'>): DateSchema {
    return { type: 'date', ...options };
  },

  /**
   * Create an optional version of a schema
   */
  optional<T extends VariableSchema>(schema: T): T {
    return { ...schema, optional: true };
  },

  /**
   * Get human-readable type string
   */
  getTypeString(schema: VariableSchema): string {
    switch (schema.type) {
      case 'string':
        if (schema.enum) return schema.enum.map(v => `"${v}"`).join(' | ');
        if (schema.format) return `string (${schema.format})`;
        return 'string';
      case 'number':
        return schema.integer ? 'integer' : 'number';
      case 'boolean':
        return 'boolean';
      case 'null':
        return 'null';
      case 'array':
        return `${this.getTypeString(schema.items)}[]`;
      case 'object':
        return 'object';
      case 'record':
        return `Record<string, ${this.getTypeString(schema.valueType)}>`;
      case 'union':
        return schema.oneOf.map(s => this.getTypeString(s)).join(' | ');
      case 'any':
        return 'any';
      case 'file':
        return 'File';
      case 'date':
        return 'Date';
      default:
        return 'unknown';
    }
  },

  /**
   * Check if schema represents a primitive type
   */
  isPrimitive(schema: VariableSchema): boolean {
    return ['string', 'number', 'boolean', 'null'].includes(schema.type);
  },

  /**
   * Check if schema has nested properties
   */
  hasChildren(schema: VariableSchema): boolean {
    return schema.type === 'object' || schema.type === 'array' || schema.type === 'record';
  },

  /**
   * Get child schema for a path segment
   */
  getChildSchema(schema: VariableSchema, key: string): VariableSchema | undefined {
    if (schema.type === 'object') {
      return schema.properties[key];
    }
    if (schema.type === 'array') {
      // Array index access returns item schema
      if (/^\d+$/.test(key)) {
        return schema.items;
      }
    }
    if (schema.type === 'record') {
      return schema.valueType;
    }
    return undefined;
  },

  /**
   * Resolve a dot-notation path to a schema
   */
  resolvePathSchema(schema: VariableSchema, path: string): VariableSchema | undefined {
    if (!path) return schema;

    const parts = path.split('.');
    let current: VariableSchema | undefined = schema;

    for (const part of parts) {
      if (!current) return undefined;
      
      // Handle array access: items[0]
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const propName = arrayMatch[1]!;
        current = this.getChildSchema(current, propName);
        if (current?.type === 'array') {
          current = current.items;
        }
      } else {
        current = this.getChildSchema(current, part);
      }
    }

    return current;
  },
};

/**
 * Plugin output schema definition
 */
export interface PluginOutputSchema {
  /** Main output schema */
  output: VariableSchema;
  /** Named outputs (for multiple outputs) */
  namedOutputs?: Record<string, VariableSchema>;
  /** Variables set by this plugin */
  setsVariables?: Array<{
    name: string;
    schema: VariableSchema;
    description?: string;
  }>;
}
