// Re-export all builder functionality
export * from "./builder";
export * from "./query";

// Re-export standard operations (unified entry point)
export {
    standard,
    ZodStandardOperations,
    zodStandard,
    createZodStandardOperations,
    BaseStandardOperations,
    type ZodEntitySchema,
    type ZodEntityOperationOptions,
    type EntityOperationOptions,
    type ListOperationOptions,
    type ListPlainOptions,
} from "./standard";

// Convenience re-exports for most common use cases
export { RouteBuilder, route } from "./builder/route-builder";
export { SchemaBuilder, schema } from "./builder/schema-builder";
export { QueryBuilder, createQueryBuilder, createListQuery, createSearchQuery, createAdvancedQuery } from "./query/query-builder";
