/**
 * Filtering Utilities for Zod
 *
 * Zod-based filtering configuration and schema builders.
 * EXTENDS from base filtering types to ensure type compatibility.
 *
 * Type Hierarchy:
 * - FilterOperator = BaseFilterOperator (identical)
 * - FieldFilterConfig extends BaseFieldFilterConfig
 * - FilteringConfig = BaseFilteringConfig (identical)
 */

import { z } from "zod/v4";
import {
    type FilterOperator as BaseFilterOperator,
    type FieldFilterConfig as BaseFieldFilterConfig,
    type FilteringConfig as BaseFilteringConfig,
    ALL_FILTER_OPERATORS as BASE_ALL_FILTER_OPERATORS,
    COMPARISON_OPERATORS as BASE_COMPARISON_OPERATORS,
    STRING_OPERATORS as BASE_STRING_OPERATORS,
    NUMERIC_OPERATORS as BASE_NUMERIC_OPERATORS,
    ARRAY_OPERATORS as BASE_ARRAY_OPERATORS,
    NULL_OPERATORS as BASE_NULL_OPERATORS,
} from "../../base/utils/filtering";
import {
    CONFIG_SYMBOL,
    withConfig,
    getConfig,
    type ZodSchemaWithConfig,
} from "./pagination";

// Re-export base types for external use
export type { BaseFilterOperator, BaseFieldFilterConfig, BaseFilteringConfig };

// Re-export operator presets from base
export const ALL_FILTER_OPERATORS = BASE_ALL_FILTER_OPERATORS;
export const COMPARISON_OPERATORS = BASE_COMPARISON_OPERATORS;
export const STRING_OPERATORS = BASE_STRING_OPERATORS;
export const NUMERIC_OPERATORS = BASE_NUMERIC_OPERATORS;
export const ARRAY_OPERATORS = BASE_ARRAY_OPERATORS;
export const NULL_OPERATORS = BASE_NULL_OPERATORS;

/**
 * Filter operator types - EXTENDS base type
 */
export type FilterOperator = BaseFilterOperator;

/**
 * Field filter configuration - uses base type with Zod-specific adaptations
 */
export type FieldFilterConfig = {
    type: "string" | "number" | "boolean" | "date" | "enum" | "array";
    operators?: FilterOperator[];
    enumValues?: readonly string[];
    nullable?: boolean;
};

/**
 * Filtering configuration type - EXTENDS base type
 */
export type FilteringConfig<TFields extends Record<string, FieldFilterConfig> = Record<string, FieldFilterConfig>> = {
    fields: TFields;
    allowLogicalOperators: boolean;
};

/**
 * Filtering schema output type
 */
export type FilteringSchemaOutput = Record<string, unknown>;

/**
 * Create a filtering configuration schema
 *
 * @param fields Field filter configurations
 * @param options Additional filtering options
 * @returns ZodSchema with embedded configuration
 *
 * @example
 * ```typescript
 * const filteringConfig = createFilteringConfigSchema({
 *   name: { type: 'string', operators: ['eq', 'like', 'ilike'] },
 *   age: { type: 'number', operators: ['eq', 'gt', 'lt', 'between'] },
 *   status: { type: 'enum', enumValues: ['active', 'inactive'] },
 *   createdAt: { type: 'date', operators: ['gt', 'lt', 'between'] },
 * });
 * ```
 */
export function createFilteringConfigSchema<TFields extends Record<string, FieldFilterConfig>>(
    fields: TFields,
    options?: {
        allowLogicalOperators?: boolean;
    }
): ZodSchemaWithConfig<FilteringConfig<TFields>> {
    const config: FilteringConfig<TFields> = {
        fields,
        allowLogicalOperators: options?.allowLogicalOperators ?? true,
    };

    // Build a flexible filter schema
    const filterSchema = z.record(z.string(), z.unknown()).optional();

    return withConfig(filterSchema, config);
}

/**
 * Create a filtering schema from a configuration
 *
 * @param config Filtering configuration
 * @returns Zod schema for filtering input
 */
export function createFilteringSchema<TConfig extends Partial<FilteringConfig>>(
    config: ZodSchemaWithConfig<TConfig>
): z.ZodType<FilteringSchemaOutput> {
    const filteringConfig = getConfig<TConfig>(config);
    if (!filteringConfig) {
        throw new Error("Invalid filtering config schema");
    }

    const fields = filteringConfig.fields ?? {};
    const shape: Record<string, z.ZodType> = {};

    for (const [fieldName, fieldConfig] of Object.entries(fields)) {
        shape[fieldName] = createFieldFilterSchema(fieldConfig);
    }

    // Add logical operators if allowed
    if (filteringConfig.allowLogicalOperators) {
        const recursiveFilterSchema: z.ZodType = z.lazy(() => z.object({
            AND: z.array(recursiveFilterSchema).optional(),
            OR: z.array(recursiveFilterSchema).optional(),
            NOT: recursiveFilterSchema.optional(),
            ...shape,
        }).partial());
        return recursiveFilterSchema as z.ZodType<FilteringSchemaOutput>;
    }

    return z.object(shape).partial() as unknown as z.ZodType<FilteringSchemaOutput>;
}

/**
 * Create a schema for a single field's filter options
 *
 * @param config Field filter configuration
 * @returns Zod schema for the field's filter
 */
export function createFieldFilterSchema(config: FieldFilterConfig): z.ZodType {
    const operators = config.operators ?? getDefaultOperators(config.type);
    const operatorSchemas: Record<string, z.ZodType> = {};

    for (const op of operators) {
        operatorSchemas[op] = createOperatorValueSchema(op, config);
    }

    return z.object(operatorSchemas).partial().optional();
}

/**
 * Get default operators for a field type
 */
function getDefaultOperators(type: FieldFilterConfig["type"]): FilterOperator[] {
    switch (type) {
        case "string":
            return ["eq", "ne", "like", "ilike", "in", "notIn", "contains", "startsWith", "endsWith"];
        case "number":
            return ["eq", "ne", "gt", "gte", "lt", "lte", "in", "notIn", "between"];
        case "boolean":
            return ["eq", "ne"];
        case "date":
            return ["eq", "ne", "gt", "gte", "lt", "lte", "between"];
        case "enum":
            return ["eq", "ne", "in", "notIn"];
        case "array":
            return ["contains", "in"];
        default:
            return ["eq", "ne"];
    }
}

/**
 * Create a schema for an operator's value
 */
function createOperatorValueSchema(
    operator: FilterOperator,
    config: FieldFilterConfig
): z.ZodType {
    const baseSchema = getBaseTypeSchema(config);

    switch (operator) {
        case "in":
        case "notIn":
            return z.array(baseSchema);
        case "between":
            return z.tuple([baseSchema, baseSchema]);
        case "isNull":
        case "isNotNull":
            return z.boolean();
        default:
            return baseSchema;
    }
}

/**
 * Get the base Zod schema for a field type
 */
function getBaseTypeSchema(config: FieldFilterConfig): z.ZodType {
    switch (config.type) {
        case "string":
            return z.string();
        case "number":
            return z.number();
        case "boolean":
            return z.boolean();
        case "date":
            return z.coerce.date();
        case "enum":
            if (config.enumValues && config.enumValues.length > 0) {
                return z.enum(config.enumValues as [string, ...string[]]);
            }
            return z.string();
        case "array":
            return z.array(z.unknown());
        default:
            return z.unknown();
    }
}

// ==================== Helper Factory Functions ====================

/**
 * Create a string field filter config
 */
export function stringField(options?: {
    operators?: FilterOperator[];
    nullable?: boolean;
}): FieldFilterConfig {
    return {
        type: "string",
        operators: options?.operators ?? ["eq", "ne", "like", "ilike", "contains", "startsWith", "endsWith"],
        nullable: options?.nullable,
    };
}

/**
 * Create a numeric field filter config
 */
export function numericField(options?: {
    operators?: FilterOperator[];
    nullable?: boolean;
}): FieldFilterConfig {
    return {
        type: "number",
        operators: options?.operators ?? ["eq", "ne", "gt", "gte", "lt", "lte", "between"],
        nullable: options?.nullable,
    };
}

/**
 * Create a comparison field filter config (gt, lt, gte, lte)
 */
export function comparisonField(options?: {
    nullable?: boolean;
}): FieldFilterConfig {
    return {
        type: "number",
        operators: ["gt", "gte", "lt", "lte", "between"],
        nullable: options?.nullable,
    };
}

/**
 * Create a boolean field filter config
 */
export function booleanField(options?: {
    nullable?: boolean;
}): FieldFilterConfig {
    return {
        type: "boolean",
        operators: ["eq", "ne"],
        nullable: options?.nullable,
    };
}

/**
 * Create a date field filter config
 */
export function dateField(options?: {
    operators?: FilterOperator[];
    nullable?: boolean;
}): FieldFilterConfig {
    return {
        type: "date",
        operators: options?.operators ?? ["eq", "ne", "gt", "gte", "lt", "lte", "between"],
        nullable: options?.nullable,
    };
}

/**
 * Create an enum field filter config
 */
export function enumField<TValues extends readonly string[]>(
    values: TValues,
    options?: {
        operators?: FilterOperator[];
        nullable?: boolean;
    }
): FieldFilterConfig {
    return {
        type: "enum",
        enumValues: values,
        operators: options?.operators ?? ["eq", "ne", "in", "notIn"],
        nullable: options?.nullable,
    };
}

/**
 * Create an array field filter config
 */
export function arrayField(options?: {
    operators?: FilterOperator[];
    nullable?: boolean;
}): FieldFilterConfig {
    return {
        type: "array",
        operators: options?.operators ?? ["contains", "in"],
        nullable: options?.nullable,
    };
}

// Re-export shared types
export { CONFIG_SYMBOL, withConfig, getConfig, type ZodSchemaWithConfig };
