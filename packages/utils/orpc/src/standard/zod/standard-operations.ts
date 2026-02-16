/**
 * Standard Operations for Zod v2
 *
 * Complete Zod-based implementation of StandardOperations abstract base.
 * Every method reimplemented using ONLY Zod types (z.*), no Standard Schema (s.*).
 * Uses Zod query utilities for list/search operations.
 */

import { z } from "zod/v4";
import type { HTTPPath } from "@orpc/contract";
import {
    StandardOperations as BaseStandardOperations,
    type EntityOperationOptions as BaseEntityOperationOptions,
    type ListOperationOptions as BaseListOperationOptions,
    type ListPlainOptions as BaseListPlainOptions,
} from "../base/standard-operations";
import type { SchemaWithConfig } from "../base/types";
import { hasConfig } from "../base/types";
import {
    createPaginationConfigSchema,
    createSortingConfigSchema,
    createFilteringConfigSchema,
    createSearchConfigSchema,
    createQueryBuilder,
    getConfig,
    type FieldFilterConfig,
    type ZodSchemaWithConfig,
    type PaginationConfig,
    type SortingConfig,
    type FilteringConfig,
    type SearchConfig,
} from "./utils";

/**
 * Zod entity schema type - requires ZodObject for schema manipulation
 */
export type ZodEntitySchema = z.ZodObject<z.ZodRawShape>;

/**
 * Infer the ID schema type from an entity's shape.
 * Falls back to z.ZodType if the field doesn't exist in the shape.
 */
type InferIdSchema<TEntity extends ZodEntitySchema, TIdField extends string> = TIdField extends keyof TEntity["shape"]
    ? TEntity["shape"][TIdField] extends z.ZodType
        ? TEntity["shape"][TIdField]
        : z.ZodType
    : z.ZodType;

/**
 * Zod-specific entity operation options
 */
export type ZodEntityOperationOptions<TEntitySchema extends ZodEntitySchema, TIdField extends string = "id", TIdSchema extends z.ZodType = z.ZodType> = BaseEntityOperationOptions<
    TEntitySchema,
    TIdField,
    TIdSchema
>;

/**
 * Zod Standard Operations class
 *
 * Complete standalone implementation of StandardOperations using ONLY Zod types.
 * Every method is reimplemented from scratch - no inheritance of method bodies from base.
 *
 * - read, create, update, patch, delete (CRUD)
 * - list with pagination/sorting/filtering/search
 * - Batch operations (create, delete, read, update, upsert)
 * - Utility operations (count, search, check, exists, upsert, validate)
 * - Soft delete operations (softDelete, batchSoftDelete, archive, restore)
 * - Advanced operations (clone, history, distinct, aggregate, export, import, healthCheck, metrics)
 * - Streaming operations (streamingRead, streamingList, streamingSearch, streamedInput, websocket, bidirectional, streamFile)
 *
 * @example
 * ```typescript
 * import { z } from "zod/v4";
 *
 * const userSchema = z.object({
 *   id: z.uuid(),
 *   name: z.string(),
 *   email: z.string().email(),
 *   createdAt: z.string().datetime(),
 * });
 *
 * const userOps = new ZodStandardOperations({
 *   entitySchema: userSchema,
 *   entityName: 'users',
 * });
 *
 * // All methods use Zod schemas throughout
 * const readContract = userOps.read().build();
 * const createContract = userOps.create({ omitFields: ['createdAt'] }).build();
 * const listContract = userOps.list({ pagination: { defaultLimit: 20 } }).build();
 * ```
 */
export class ZodStandardOperations<
    TEntity extends ZodEntitySchema = ZodEntitySchema,
    TIdField extends string = "id",
    TIdSchema extends z.ZodType = InferIdSchema<TEntity, TIdField>,
> extends BaseStandardOperations<TEntity, TIdField, TIdSchema> {
    protected getDefaultIdSchema(): TIdSchema {
        const shape = this.entitySchema.shape;
        return (shape[this.idField] ?? z.string()) as TIdSchema;
    }

    /**
     * Helper to check if a value is a schema (not a plain config object)
     */
    private isSchema(value: unknown): value is SchemaWithConfig<unknown> {
        return typeof value === "object" && value !== null && "~standard" in value;
    }

    /**
     * Helper to check if a schema has config
     */
    private isConfigSchema(value: unknown): value is SchemaWithConfig<unknown> {
        return this.isSchema(value) && hasConfig(value);
    }

    // ==================== Helper: Build Zod QueryBuilder ====================

    /**
     * Build a Zod QueryBuilder from list options
     */
    private buildZodQueryBuilder(options?: BaseListOperationOptions | BaseListPlainOptions) {
        if (!options) {
            return createQueryBuilder().withPagination(createPaginationConfigSchema({ defaultLimit: 10, maxLimit: 100 }));
        }

        const paginationConfig = (() => {
            if (options.pagination) {
                if (this.isConfigSchema(options.pagination)) {
                    // Type assertion: in Zod context, config schemas are always ZodSchemaWithConfig
                    const schema = options.pagination as unknown;
                    return schema as ZodSchemaWithConfig<Partial<PaginationConfig>>;
                }
                const plain = options.pagination as { defaultLimit?: number; maxLimit?: number };
                return createPaginationConfigSchema(plain);
            }
            return createPaginationConfigSchema({ defaultLimit: 10, maxLimit: 100 });
        })();

        let builder = createQueryBuilder().withPagination(paginationConfig);

        if (options.sorting) {
            if (this.isConfigSchema(options.sorting)) {
                // Type assertion: in Zod context, config schemas are always ZodSchemaWithConfig
                const schema = options.sorting as unknown;
                const sortingConfig = schema as ZodSchemaWithConfig<Partial<SortingConfig>>;
                builder = builder.withSorting(sortingConfig);
            } else {
                const plain = options.sorting as {
                    fields: readonly string[];
                    defaultField?: string;
                    defaultDirection?: "asc" | "desc";
                };
                builder = builder.withSorting(
                    createSortingConfigSchema(plain.fields, {
                        defaultField: plain.defaultField,
                        defaultDirection: plain.defaultDirection,
                    }),
                );
            }
        }

        if (options.filtering) {
            if (this.isConfigSchema(options.filtering)) {
                // Type assertion: in Zod context, config schemas are always ZodSchemaWithConfig
                const schema = options.filtering as unknown;
                const filteringConfig = schema as ZodSchemaWithConfig<Partial<FilteringConfig>>;
                builder = builder.withFiltering(filteringConfig);
            } else {
                const plain = options.filtering as {
                    fields: Record<string, FieldFilterConfig>;
                    allowLogicalOperators?: boolean;
                };
                builder = builder.withFiltering(
                    createFilteringConfigSchema(plain.fields, {
                        allowLogicalOperators: plain.allowLogicalOperators,
                    }),
                );
            }
        }

        if (options.search) {
            if (this.isConfigSchema(options.search)) {
                // Type assertion: in Zod context, config schemas are always ZodSchemaWithConfig
                const schema = options.search as unknown;
                const searchConfig = schema as ZodSchemaWithConfig<Partial<SearchConfig>>;
                builder = builder.withSearch(searchConfig);
            } else {
                const plain = options.search as {
                    fields?: readonly string[];
                    minQueryLength?: number;
                };
                if (plain.fields && plain.fields.length > 0) {
                    builder = builder.withSearch(
                        createSearchConfigSchema(plain.fields, {
                            minQueryLength: plain.minQueryLength,
                        }),
                    );
                }
            }
        }

        return builder;
    }

    // ==================== CRUD Operations ====================

        read<TIdFieldName extends string = TIdField, TIdSch extends z.ZodType = TIdSchema>(options?: { idSchema?: TIdSch; idFieldName?: TIdFieldName }) {
        const idFieldName = (options?.idFieldName ?? this.idField) as TIdFieldName;
        const idSchema = (options?.idSchema ?? this.idSchema) as TIdSch;

        return this.createBuilder({
            method: "GET",
            summary: `Get ${this.entityName} by ${idFieldName}`,
            description: `Retrieve a specific ${this.entityName} by their ${idFieldName}`,
        }).input((b) => {
            const e = b.params((p) => p`/{${p(idFieldName, idSchema)}}`);
            return e;
        }).output(this.entitySchema)
    }

    create(options?: { bodySchema?: z.ZodType; omitFields?: readonly (keyof z.infer<TEntity>)[] }) {
        const bodySchema = (() => {
            if (options?.bodySchema) return options.bodySchema;

            const omitKeys = new Set<string>([
                this.idField,
                ...(this.hasTimestamps ? ["createdAt", "updatedAt"] : []),
                ...(this.hasSoftDelete ? ["deletedAt"] : []),
                ...((options?.omitFields ?? []) as string[]),
            ]);

            const omitRecord = Object.fromEntries([...omitKeys].map((k) => [k, true])) as Record<string, true>;

            return this.entitySchema.omit(omitRecord);
        })();

        return this.createBuilder({
            method: "POST",
            summary: `Create a new ${this.entityName}`,
            description: `Create a new ${this.entityName} in the system`,
        })
            .path("/" as HTTPPath)
            .input((b) => b.body(bodySchema as TEntity))
            .output((b) => b.status(201).body(this.entitySchema));
    }

    update<TIdFieldName extends string = TIdField, TIdSch extends z.ZodType = TIdSchema>(options?: {
        idSchema?: TIdSch;
        idFieldName?: TIdFieldName;
        bodySchema?: z.ZodType;
        omitFields?: readonly (keyof z.infer<TEntity>)[];
    }) {
        const idFieldName = (options?.idFieldName ?? this.idField) as TIdFieldName;
        const idSchema = (options?.idSchema ?? this.idSchema) as TIdSch;

        let bodySchema: z.ZodType;

        if (options?.bodySchema) {
            bodySchema = options.bodySchema;
        } else if (!options?.omitFields || options.omitFields.length === 0) {
            bodySchema = this.entitySchema;
        } else {
            const omitKeys = new Set<string>([...(this.hasTimestamps ? ["createdAt", "updatedAt"] : []), ...(this.hasSoftDelete ? ["deletedAt"] : []), ...(options.omitFields as string[])]);

            const omitRecord = Object.fromEntries([...omitKeys].map((k) => [k, true])) as Record<string, true>;

            bodySchema = this.entitySchema.omit(omitRecord);
        }

        return this.createBuilder({
            method: "PUT",
            summary: `Update an existing ${this.entityName}`,
            description: `Update an existing ${this.entityName} in the system`,
        })
            .input((b) => b.params((p) => p`/{${p(idFieldName, idSchema)}}`).body(bodySchema))
            .output(this.entitySchema);
    }

    patch<TIdFieldName extends string = TIdField, TIdSch extends z.ZodType = TIdSchema>(options?: {
        idSchema?: TIdSch;
        idFieldName?: TIdFieldName;
        bodySchema?: z.ZodType;
        omitFields?: readonly (keyof z.infer<TEntity>)[];
    }) {
        const idFieldName = (options?.idFieldName ?? this.idField) as TIdFieldName;
        const idSchema = (options?.idSchema ?? this.idSchema) as TIdSch;

        let bodySchema: z.ZodType;

        if (options?.bodySchema) {
            bodySchema = options.bodySchema;
        } else {
            const omitKeys = new Set<string>([
                this.idField,
                ...(this.hasTimestamps ? ["createdAt", "updatedAt"] : []),
                ...(this.hasSoftDelete ? ["deletedAt"] : []),
                ...((options?.omitFields ?? []) as string[]),
            ]);

            const omitRecord = Object.fromEntries([...omitKeys].map((k) => [k, true])) as Record<string, true>;

            bodySchema = this.entitySchema.omit(omitRecord).partial();
        }

        return this.createBuilder({
            method: "PATCH",
            summary: `Partially update ${this.entityName}`,
            description: `Update specific fields of ${this.entityName}`,
        })
            .input((b) => b.params((p) => p`/{${p(idFieldName, idSchema)}}`).body(bodySchema))
            .output(this.entitySchema);
    }

    delete<TIdFieldName extends string = TIdField, TIdSch extends z.ZodType = TIdSchema>(options?: { idSchema?: TIdSch; idFieldName?: TIdFieldName }) {
        const idFieldName = (options?.idFieldName ?? this.idField) as TIdFieldName;
        const idSchema = (options?.idSchema ?? this.idSchema) as TIdSch;

        return this.createBuilder({
            method: "DELETE",
            summary: `Delete ${this.entityName}`,
            description: `Delete a ${this.entityName} by ${idFieldName}`,
        })
            .input((b) => b.params((p) => p`/{${p(idFieldName, idSchema)}}`))
            .output(
                z.object({
                    success: z.boolean(),
                    message: z.string().optional(),
                }),
            );
    }

    // ==================== List Operations ====================

    list<
        TPagination extends ZodSchemaWithConfig<Partial<PaginationConfig>> | undefined = undefined,
        TSorting extends ZodSchemaWithConfig<Partial<SortingConfig>> | undefined = undefined,
        TFiltering extends ZodSchemaWithConfig<Partial<FilteringConfig>> | undefined = undefined,
        TSearch extends ZodSchemaWithConfig<Partial<SearchConfig>> | undefined = undefined
    >(options?: {
        pagination?: TPagination;
        sorting?: TSorting;
        filtering?: TFiltering;
        search?: TSearch;
    } | BaseListPlainOptions) {
        const queryBuilder = this.buildZodQueryBuilder(options);
        const inputSchema = queryBuilder.buildInputSchema();

        // Build output schema - get pagination config for meta schema
        const config = queryBuilder.getConfig();
        const paginationConfig = getConfig<Partial<PaginationConfig>>(
            config.pagination as unknown as ZodSchemaWithConfig<Partial<PaginationConfig>>
        );
        
        if (!paginationConfig) {
            throw new Error("Invalid pagination config");
        }

        // Build output schema inline without Record typing to preserve exact types
        const outputSchema = z.object({
            data: z.array(this.entitySchema),
            meta: z.object({
                total: z.number().int().min(0),
                limit: z.number().int().min(1),
                hasMore: z.boolean(),
                ...(paginationConfig.includeOffset ? { offset: z.number().int().min(0) } : {}),
                ...(paginationConfig.includePage ? {
                    page: z.number().int().min(1),
                    totalPages: z.number().int().min(0)
                } : {}),
                ...(paginationConfig.includeCursor ? {
                    nextCursor: z.string().nullable().optional(),
                    prevCursor: z.string().nullable().optional()
                } : {})
            })
        });
        
        return this.createBuilder({
            method: "GET",
            summary: `List ${this.entityName}s`,
            description: `Retrieve a paginated list of ${this.entityName}s with optional filtering and sorting`,
        })
            .path("/" as HTTPPath)
            .input((b) => b.query(inputSchema))
            .output(outputSchema);
    }

    // ==================== Batch Operations ====================

    batchCreate(options?: { maxBatchSize?: number; itemSchema?: z.ZodType; omitFields?: readonly (keyof z.infer<TEntity>)[] }) {
        const maxSize = options?.maxBatchSize ?? 100;

        let itemSchema: z.ZodType;

        if (options?.itemSchema) {
            itemSchema = options.itemSchema;
        } else if (!options?.omitFields || options.omitFields.length === 0) {
            itemSchema = this.entitySchema;
        } else {
            const omitKeys = new Set<string>([
                this.idField,
                ...(this.hasTimestamps ? ["createdAt", "updatedAt"] : []),
                ...(this.hasSoftDelete ? ["deletedAt"] : []),
                ...(options.omitFields as string[]),
            ]);

            const omitRecord = Object.fromEntries([...omitKeys].map((k) => [k, true])) as Record<string, true>;

            itemSchema = this.entitySchema.omit(omitRecord);
        }

        return this.createBuilder({
            method: "POST",
            summary: `Batch create ${this.entityName}s`,
            description: `Create multiple ${this.entityName}s in a single request`,
        })
            .path("/batch" as HTTPPath)
            .input((b) =>
                b.body(
                    z.object({
                        items: z.array(itemSchema).min(1).max(maxSize),
                    }),
                ),
            )
            .output(
                z.object({
                    created: z.array(this.entitySchema),
                    failed: z.array(
                        z.object({
                            index: z.number().int().min(0),
                            error: z.string(),
                        }),
                    ),
                }),
            );
    }

    batchDelete<TIdSch extends z.ZodType = TIdSchema>(options?: { maxBatchSize?: number; idSchema?: TIdSch }) {
        const maxSize = options?.maxBatchSize ?? 100;
        const idSchema = (options?.idSchema ?? this.idSchema) as TIdSch;

        return this.createBuilder({
            method: "DELETE",
            summary: `Batch delete ${this.entityName}s`,
            description: `Delete multiple ${this.entityName}s by IDs`,
        })
            .path("/batch" as HTTPPath)
            .input((b) =>
                b.body(
                    z.object({
                        ids: z.array(idSchema).min(1).max(maxSize),
                    }),
                ),
            )
            .output(
                z.object({
                    deleted: z.number().int().min(0),
                    failed: z.array(z.string()).optional(),
                }),
            );
    }

    batchRead<TIdSch extends z.ZodType = TIdSchema>(options?: { maxBatchSize?: number; idSchema?: TIdSch }) {
        const maxSize = options?.maxBatchSize ?? 100;
        const idSchema = (options?.idSchema ?? this.idSchema) as TIdSch;

        return this.createBuilder({
            method: "POST",
            summary: `Batch read ${this.entityName}s`,
            description: `Get multiple ${this.entityName}s by their IDs in a single request`,
        })
            .path("/batch/read" as HTTPPath)
            .input((b) =>
                b.body(
                    z.object({
                        ids: z.array(idSchema).min(1).max(maxSize),
                    }),
                ),
            )
            .output(
                z.object({
                    items: z.array(this.entitySchema),
                    notFound: z.array(z.string()).optional(),
                }),
            );
    }

    batchUpdate(options?: { maxBatchSize?: number }) {
        const maxSize = options?.maxBatchSize ?? 100;

        return this.createBuilder({
            method: "PATCH",
            summary: `Batch update ${this.entityName}s`,
            description: `Update multiple ${this.entityName}s in a single request`,
        })
            .path("/batch" as HTTPPath)
            .input((b) =>
                b.body(
                    z.object({
                        items: z.array(this.entitySchema).min(1).max(maxSize),
                    }),
                ),
            )
            .output(
                z.object({
                    items: z.array(this.entitySchema),
                    errors: z
                        .array(
                            z.object({
                                id: z.string(),
                                error: z.string(),
                            }),
                        )
                        .optional(),
                }),
            );
    }

    batchUpsert(options?: { maxBatchSize?: number; uniqueField?: string }) {
        const maxSize = options?.maxBatchSize ?? 100;
        const uniqueField = options?.uniqueField ?? this.idField;

        return this.createBuilder({
            method: "PUT",
            summary: `Batch upsert ${this.entityName}s`,
            description: `Create or update multiple ${this.entityName}s by ${uniqueField}`,
        })
            .path("/batch/upsert")
            .input((b) =>
                b.body(
                    z.object({
                        items: z.array(this.entitySchema).min(1).max(maxSize),
                    }),
                ),
            )
            .output(
                z.object({
                    created: z.array(this.entitySchema),
                    updated: z.array(this.entitySchema),
                    errors: z
                        .array(
                            z.object({
                                index: z.number().int().min(0),
                                error: z.string(),
                            }),
                        )
                        .optional(),
                }),
            );
    }

    // ==================== Utility Operations ====================

    count(options?: { filtering?: SchemaWithConfig<unknown> }) {
        const inputSchema = options?.filtering ? z.object({ filter: z.any().optional() }) : z.object({});

        return this.createBuilder({
            method: "GET",
            summary: `Count ${this.entityName}s`,
            description: `Get the total count of ${this.entityName}s`,
        })
            .path("/count" as HTTPPath)
            .input(inputSchema)
            .output(
                z.object({
                    count: z.number().int().min(0),
                }),
            );
    }

    search(options?: { searchFields?: readonly string[]; pagination?: SchemaWithConfig<unknown> | { defaultLimit?: number; maxLimit?: number } }) {
        let queryBuilder = createQueryBuilder();

        if (options?.searchFields && options.searchFields.length > 0) {
            queryBuilder = queryBuilder.withSearch(
                createSearchConfigSchema(options.searchFields, {
                    minQueryLength: 1,
                    allowFieldSelection: true,
                }),
            );
        }

        if (options?.pagination) {
            if (this.isConfigSchema(options.pagination)) {
                // Type assertion: in Zod context, config schemas are always ZodSchemaWithConfig
                const schema = options.pagination as unknown;
                const paginationConfig = schema as ZodSchemaWithConfig<Partial<PaginationConfig>>;
                queryBuilder = queryBuilder.withPagination(paginationConfig);
            } else {
                queryBuilder = queryBuilder.withPagination(createPaginationConfigSchema(options.pagination as { defaultLimit?: number; maxLimit?: number }));
            }
        } else {
            queryBuilder = queryBuilder.withPagination(createPaginationConfigSchema({ defaultLimit: 20, maxLimit: 100 }));
        }

        const inputSchema = queryBuilder.buildInputSchema();
        const outputSchema = queryBuilder.buildOutputSchema(this.entitySchema);

        return this.createBuilder({
            method: "GET",
            summary: `Search ${this.entityName}s`,
            description: `Full-text search for ${this.entityName}s with pagination`,
        })
            .path("/search" as HTTPPath)
            .input(inputSchema)
            .output(outputSchema);
    }

    check(fieldName: string, fieldSchema?: z.ZodType) {
        const schema = fieldSchema ?? (this.entitySchema.shape[fieldName] as z.ZodType | undefined) ?? z.any();

        return this.createBuilder({
            method: "GET",
            summary: `Check ${this.entityName} ${fieldName}`,
            description: `Check if a ${this.entityName} exists with the given ${fieldName}`,
        })
            .path(`/check/${fieldName}` as HTTPPath)
            .input(z.object({ [fieldName]: schema }))
            .output(
                z.object({
                    exists: z.boolean(),
                }),
            );
    }

    exists<TIdFieldName extends string = TIdField, TIdSch extends z.ZodType = TIdSchema>(options?: { idSchema?: TIdSch; idFieldName?: TIdFieldName }) {
        const idFieldName = (options?.idFieldName ?? this.idField) as TIdFieldName;
        const idSchema = (options?.idSchema ?? this.idSchema) as TIdSch;

        return this.createBuilder({
            method: "GET",
            summary: `Check if ${this.entityName} exists`,
            description: `Check if a ${this.entityName} exists by ${idFieldName}`,
        })
            .input((b) => b.params((p) => p`/{${p(idFieldName, idSchema)}}/exists`))
            .output(
                z.object({
                    exists: z.boolean(),
                }),
            );
    }

    upsert(options?: { uniqueField?: string; path?: string }) {
        const uniqueField = options?.uniqueField ?? this.idField;
        const upsertPath = options?.path ?? "/upsert";

        return this.createBuilder({
            method: "PUT",
            summary: `Upsert ${this.entityName}`,
            description: `Create or update ${this.entityName} by ${uniqueField}`,
        })
            .path(upsertPath as HTTPPath)
            .input((b) => b.body(this.entitySchema))
            .output(
                z.object({
                    item: this.entitySchema,
                    created: z.boolean(),
                }),
            );
    }

    validate(options?: { bodySchema?: z.ZodType; omitFields?: readonly (keyof z.infer<TEntity>)[] }) {
        let bodySchema: z.ZodType;

        if (options?.bodySchema) {
            bodySchema = options.bodySchema;
        } else if (!options?.omitFields || options.omitFields.length === 0) {
            bodySchema = this.entitySchema;
        } else {
            const omitKeys = new Set<string>([
                this.idField,
                ...(this.hasTimestamps ? ["createdAt", "updatedAt"] : []),
                ...(this.hasSoftDelete ? ["deletedAt"] : []),
                ...(options.omitFields as string[]),
            ]);

            const omitRecord = Object.fromEntries([...omitKeys].map((k) => [k, true])) as Record<string, true>;

            bodySchema = this.entitySchema.omit(omitRecord);
        }

        return this.createBuilder({
            method: "POST",
            summary: `Validate ${this.entityName}`,
            description: `Validate ${this.entityName} data without persisting`,
        })
            .path("/validate" as HTTPPath)
            .input((b) => b.body(bodySchema))
            .output(
                z.object({
                    valid: z.boolean(),
                    errors: z
                        .array(
                            z.object({
                                field: z.string(),
                                message: z.string(),
                            }),
                        )
                        .optional(),
                }),
            );
    }

    // ==================== Soft Delete Operations ====================

    softDelete<TIdFieldName extends string = TIdField, TIdSch extends z.ZodType = TIdSchema>(options?: { pathSuffix?: string; idSchema?: TIdSch; idFieldName?: TIdFieldName }) {
        const pathSuffix = options?.pathSuffix ?? "/soft";
        const idFieldName = (options?.idFieldName ?? this.idField) as TIdFieldName;
        const idSchema = (options?.idSchema ?? this.idSchema) as TIdSch;

        return this.createBuilder({
            method: "DELETE",
            summary: `Soft delete ${this.entityName}`,
            description: `Mark ${this.entityName} as deleted without removing from database`,
        })
            .input((b) => b.params((p) => p`/{${p(idFieldName, idSchema)}}${pathSuffix}`))
            .output(
                z.object({
                    success: z.boolean(),
                    message: z.string().optional(),
                }),
            );
    }

    batchSoftDelete<TIdSch extends z.ZodType = TIdSchema>(options?: { pathSuffix?: string; maxBatchSize?: number; idSchema?: TIdSch }) {
        const pathSuffix = options?.pathSuffix ?? "/soft";
        const maxSize = options?.maxBatchSize ?? 100;
        const idSchema = (options?.idSchema ?? this.idSchema) as TIdSch;

        return this.createBuilder({
            method: "DELETE",
            summary: `Batch soft delete ${this.entityName}s`,
            description: `Mark multiple ${this.entityName}s as deleted`,
        })
            .path(`/batch${pathSuffix}` as HTTPPath)
            .input((b) =>
                b.body(
                    z.object({
                        ids: z.array(idSchema).min(1).max(maxSize),
                    }),
                ),
            )
            .output(
                z.object({
                    deleted: z.number().int().min(0),
                    failed: z.array(z.string()).optional(),
                }),
            );
    }

    archive<TIdFieldName extends string = TIdField, TIdSch extends z.ZodType = TIdSchema>(options?: { idSchema?: TIdSch; idFieldName?: TIdFieldName }) {
        if (!this.hasSoftDelete) {
            throw new Error("Soft delete is not enabled for this entity");
        }

        const idFieldName = (options?.idFieldName ?? this.idField) as TIdFieldName;
        const idSchema = (options?.idSchema ?? this.idSchema) as TIdSch;

        return this.createBuilder({
            method: "POST",
            summary: `Archive ${this.entityName}`,
            description: `Soft delete (archive) a ${this.entityName}`,
        })
            .input((b) => b.params((p) => p`/{${p(idFieldName, idSchema)}}/archive`))
            .output(
                z.object({
                    success: z.boolean(),
                    archivedAt: z.date(),
                }),
            );
    }

    restore<TIdFieldName extends string = TIdField, TIdSch extends z.ZodType = TIdSchema>(options?: { idSchema?: TIdSch; idFieldName?: TIdFieldName }) {
        if (!this.hasSoftDelete) {
            throw new Error("Soft delete is not enabled for this entity");
        }

        const idFieldName = (options?.idFieldName ?? this.idField) as TIdFieldName;
        const idSchema = (options?.idSchema ?? this.idSchema) as TIdSch;

        return this.createBuilder({
            method: "POST",
            summary: `Restore ${this.entityName}`,
            description: `Restore a soft-deleted ${this.entityName}`,
        })
            .input((b) => b.params((p) => p`/{${p(idFieldName, idSchema)}}/restore`))
            .output(this.entitySchema);
    }

    // ==================== Advanced Operations ====================

    clone<TIdFieldName extends string = TIdField, TIdSch extends z.ZodType = TIdSchema>(options?: { idSchema?: TIdSch; idFieldName?: TIdFieldName }) {
        const idFieldName = (options?.idFieldName ?? this.idField) as TIdFieldName;
        const idSchema = (options?.idSchema ?? this.idSchema) as TIdSch;

        return this.createBuilder({
            method: "POST",
            summary: `Clone ${this.entityName}`,
            description: `Create a duplicate of a ${this.entityName}`,
        })
            .input((b) =>
                b
                    .params((p) => p`/{${p(idFieldName, idSchema)}}/clone`)
                    .body(
                        z.object({
                            overrides: z.record(z.string(), z.any()).optional(),
                        }),
                    ),
            )
            .output(this.entitySchema);
    }

    history<TIdFieldName extends string = TIdField, TIdSch extends z.ZodType = TIdSchema>(options?: { idSchema?: TIdSch; idFieldName?: TIdFieldName }) {
        const idFieldName = (options?.idFieldName ?? this.idField) as TIdFieldName;
        const idSchema = (options?.idSchema ?? this.idSchema) as TIdSch;

        return this.createBuilder({
            method: "GET",
            summary: `Get ${this.entityName} history`,
            description: `Get change history for a ${this.entityName}`,
        })
            .input((b) =>
                b
                    .params((p) => p`/{${p(idFieldName, idSchema)}}/history`)
                    .query(
                        z.object({
                            limit: z.coerce.number().min(1).max(100).optional(),
                            cursor: z.string().optional(),
                        }),
                    ),
            )
            .output(
                z.object({
                    items: z.array(
                        z.object({
                            id: z.string(),
                            entityId: z.string(),
                            action: z.enum(["created", "updated", "deleted", "restored"]),
                            changes: z.record(
                                z.string(),
                                z.object({
                                    old: z.any(),
                                    new: z.any(),
                                }),
                            ),
                            userId: z.string().optional(),
                            timestamp: z.date(),
                        }),
                    ),
                    hasMore: z.boolean(),
                    nextCursor: z.string().optional(),
                }),
            );
    }

    distinct(fieldName: string) {
        return this.createBuilder({
            method: "GET",
            summary: `Get distinct ${fieldName} values`,
            description: `Get all unique values for ${fieldName} field`,
        })
            .path(`/distinct/${fieldName}` as HTTPPath)
            .input(
                z.object({
                    limit: z.coerce.number().min(1).max(1000).optional(),
                }),
            )
            .output(
                z.object({
                    values: z.array(z.any()),
                    total: z.number().int().min(0),
                }),
            );
    }

    aggregate(options?: { functions?: Record<string, { op: "sum" | "avg" | "min" | "max" | "count"; field: string }>; groupBy?: readonly string[]; path?: string }) {
        const aggregatePath = options?.path ?? "/aggregate";

        const inputSchema = z.object({
            filters: z.record(z.string(), z.any()).optional(),
        });

        const outputSchema = options?.groupBy
            ? z.object({
                  groups: z.array(z.record(z.string(), z.any())),
                  total: z.number().optional(),
              })
            : z.object(Object.fromEntries(Object.entries(options?.functions ?? { count: { op: "count", field: "id" } }).map(([key]) => [key, z.number()])));

        return this.createBuilder({
            method: "POST",
            summary: `Aggregate ${this.entityName}s`,
            description: `Perform aggregation operations (sum, avg, min, max, count) on ${this.entityName}s with optional grouping`,
        })
            .path(aggregatePath as HTTPPath)
            .input((b) => b.body(inputSchema))
            .output(outputSchema);
    }

    export(options?: { formats?: readonly string[]; path?: string }) {
        const formats = options?.formats ?? ["csv", "json", "xml"];
        const exportPath = options?.path ?? "/export";

        return this.createBuilder({
            method: "POST",
            summary: `Export ${this.entityName}s`,
            description: `Export ${this.entityName}s in various formats`,
        })
            .path(exportPath as HTTPPath)
            .input((b) =>
                b.body(
                    z.object({
                        format: z.enum(formats as [string, ...string[]]),
                        filters: z.record(z.string(), z.any()).optional(),
                        fields: z.array(z.string()).optional(),
                        limit: z.number().int().min(1).optional(),
                    }),
                ),
            )
            .output(
                z.object({
                    filename: z.string(),
                    contentType: z.string(),
                    size: z.number().int().min(0),
                }),
            );
    }

    import(options?: { formats?: readonly string[]; maxRecords?: number; path?: string }) {
        const formats = options?.formats ?? ["csv", "json", "xml"];
        const maxRecords = options?.maxRecords ?? 10000;
        const importPath = options?.path ?? "/import";

        return this.createBuilder({
            method: "POST",
            summary: `Import ${this.entityName}s`,
            description: `Bulk import ${this.entityName}s from file. Max ${String(maxRecords)} records.`,
        })
            .path(importPath as HTTPPath)
            .input((b) =>
                b.body(
                    z.object({
                        format: z.enum(formats as [string, ...string[]]),
                        data: z.string(),
                        options: z
                            .object({
                                skipHeader: z.boolean().optional(),
                                delimiter: z.string().optional(),
                                dryRun: z.boolean().optional(),
                            })
                            .optional(),
                    }),
                ),
            )
            .output(
                z.object({
                    success: z.boolean(),
                    imported: z.number().int().min(0),
                    failed: z.number().int().min(0),
                    errors: z
                        .array(
                            z.object({
                                row: z.number().int().min(0),
                                error: z.string(),
                                data: z.record(z.string(), z.any()).optional(),
                            }),
                        )
                        .optional(),
                    dryRun: z.boolean().optional(),
                }),
            );
    }

    healthCheck(options?: { includeDependencies?: boolean; path?: string }) {
        const healthPath = options?.path ?? "/health";

        return this.createBuilder({
            method: "GET",
            summary: "Health check",
            description: `Health check endpoint for ${this.entityName} service`,
        })
            .path(healthPath as HTTPPath)
            .input(z.object({}))
            .output(
                z.object({
                    status: z.enum(["healthy", "degraded", "unhealthy"]),
                    uptime: z.number().int().min(0),
                    timestamp: z.date(),
                    version: z.string().optional(),
                    dependencies: z
                        .record(
                            z.string(),
                            z.object({
                                status: z.enum(["healthy", "degraded", "unhealthy"]),
                                latency: z.number().optional(),
                                message: z.string().optional(),
                            }),
                        )
                        .optional(),
                }),
            );
    }

    metrics(options?: { format?: "json" | "prometheus"; path?: string }) {
        const metricsPath = options?.path ?? "/metrics";
        const format = options?.format ?? "json";

        const outputSchema =
            format === "json"
                ? z.object({
                      counters: z.record(z.string(), z.number()).optional(),
                      gauges: z.record(z.string(), z.number()).optional(),
                      histograms: z
                          .record(
                              z.string(),
                              z.object({
                                  count: z.number(),
                                  sum: z.number(),
                                  min: z.number(),
                                  max: z.number(),
                                  avg: z.number(),
                              }),
                          )
                          .optional(),
                  })
                : z.string();

        return this.createBuilder({
            method: "GET",
            summary: "Service metrics",
            description: `Expose service metrics for ${this.entityName} operations`,
        })
            .path(metricsPath as HTTPPath)
            .input(z.object({}))
            .output(outputSchema);
    }

    // ==================== Streaming Operations ====================

    streamingRead<TIdFieldName extends string = TIdField, TIdSch extends z.ZodType = TIdSchema>(options?: { idSchema?: TIdSch; idFieldName?: TIdFieldName }) {
        const idFieldName = (options?.idFieldName ?? this.idField) as TIdFieldName;
        const idSchema = (options?.idSchema ?? this.idSchema) as TIdSch;

        return this.createBuilder({
            method: "GET",
            summary: `Streaming ${this.entityName} by ID`,
            description: `Real-time streaming of a specific ${this.entityName} via EventIterator`,
        })
            .input((b) => b.params((p) => p`/{${p(idFieldName, idSchema)}}/streaming`))
            .output((b) => b.body.streamed(this.entitySchema));
    }

    streamingList<TOptions extends BaseListOperationOptions | (BaseListPlainOptions & { path?: string }) | undefined = undefined>(
        options?: TOptions
    ) {
        const queryBuilder = this.buildZodQueryBuilder(options);
        const inputSchema = queryBuilder.buildInputSchema();

        // Build output schema - get pagination config for meta schema
        const config = queryBuilder.getConfig();
        const paginationConfig = getConfig<Partial<PaginationConfig>>(
            config.pagination as unknown as ZodSchemaWithConfig<Partial<PaginationConfig>>
        );
        
        if (!paginationConfig) {
            throw new Error("Invalid pagination config");
        }

        // Build output schema inline without Record typing to preserve exact types
        const outputSchema = z.object({
            data: z.array(this.entitySchema),
            meta: z.object({
                total: z.number().int().min(0),
                limit: z.number().int().min(1),
                hasMore: z.boolean(),
                ...(paginationConfig.includeOffset ? { offset: z.number().int().min(0) } : {}),
                ...(paginationConfig.includePage ? {
                    page: z.number().int().min(1),
                    totalPages: z.number().int().min(0)
                } : {}),
                ...(paginationConfig.includeCursor ? {
                    nextCursor: z.string().nullable().optional(),
                    prevCursor: z.string().nullable().optional()
                } : {})
            })
        });
        
        const streamPath = (options as { path?: string } | undefined)?.path ?? "/streaming";

        return this.createBuilder({
            method: "GET",
            summary: `Streaming ${this.entityName}s list`,
            description: `Real-time streaming list of ${this.entityName}s via EventIterator`,
        })
            .path(streamPath as HTTPPath)
            .input((b) => b.query(inputSchema))
            .output((b) => b.body.streamed(outputSchema));
    }

    streamingSearch(options?: { searchFields?: readonly string[]; pagination?: SchemaWithConfig<unknown> | { defaultLimit?: number; maxLimit?: number } }) {
        let queryBuilder = createQueryBuilder();

        if (options?.searchFields && options.searchFields.length > 0) {
            queryBuilder = queryBuilder.withSearch(
                createSearchConfigSchema(options.searchFields, {
                    minQueryLength: 1,
                    allowFieldSelection: true,
                }),
            );
        }

        if (options?.pagination) {
            if (this.isConfigSchema(options.pagination)) {
                // Type assertion: in Zod context, config schemas are always ZodSchemaWithConfig
                const schema = options.pagination as unknown;
                const paginationConfig = schema as ZodSchemaWithConfig<Partial<PaginationConfig>>;
                queryBuilder = queryBuilder.withPagination(paginationConfig);
            } else {
                queryBuilder = queryBuilder.withPagination(createPaginationConfigSchema(options.pagination as { defaultLimit?: number; maxLimit?: number }));
            }
        } else {
            queryBuilder = queryBuilder.withPagination(createPaginationConfigSchema({ defaultLimit: 20, maxLimit: 100 }));
        }

        const inputSchema = queryBuilder.buildInputSchema();
        const outputSchema = queryBuilder.buildOutputSchema(this.entitySchema);

        return this.createBuilder({
            method: "GET",
            summary: `Streaming search ${this.entityName}s`,
            description: `Real-time streaming search for ${this.entityName}s`,
        })
            .path("/search/streaming" as HTTPPath)
            .input(inputSchema)
            .output((b) => b.body.streamed(outputSchema));
    }

    streamedInput<TChunkSchema extends z.ZodType = TEntity>(options?: { chunkSchema?: TChunkSchema; path?: string; outputSchema?: z.ZodType }) {
        const chunkSchema = (options?.chunkSchema ?? this.entitySchema) as TChunkSchema;
        const streamPath = (options?.path ?? "/stream-upload") as HTTPPath;

        const defaultOutputSchema = z.object({
            success: z.boolean(),
            processed: z.number().int().min(0),
            message: z.string().optional(),
        });

        const outputSchema = options?.outputSchema ?? defaultOutputSchema;

        return this.createBuilder({
            method: "POST",
            summary: `Stream upload ${this.entityName}s`,
            description: `Upload ${this.entityName}s via streaming input (EventIterator)`,
        })
            .path(streamPath)
            .input((i) => i.body.streamed(chunkSchema))
            .output(outputSchema);
    }

    websocket<TInputChunk extends z.ZodType = TEntity, TOutputChunk extends z.ZodType = TEntity>(options?: { inputChunkSchema?: TInputChunk; outputChunkSchema?: TOutputChunk; path?: string }) {
        const inputChunkSchema = (options?.inputChunkSchema ?? this.entitySchema) as TInputChunk;
        const outputChunkSchema = (options?.outputChunkSchema ?? this.entitySchema) as TOutputChunk;
        const wsPath = (options?.path ?? "/ws") as HTTPPath;

        return this.createBuilder({
            method: "GET",
            summary: `WebSocket ${this.entityName}s`,
            description: `Bidirectional streaming for ${this.entityName}s via EventIterator`,
        })
            .path(wsPath)
            .input((i) => i.body.streamed(inputChunkSchema))
            .output((b) => b.body.streamed(outputChunkSchema));
    }

    bidirectional<TInputChunk extends z.ZodType = TEntity, TOutputChunk extends z.ZodType = TEntity>(options?: { inputChunkSchema?: TInputChunk; outputChunkSchema?: TOutputChunk; path?: string }) {
        return this.websocket<TInputChunk, TOutputChunk>(options);
    }

    streamFile<TIdFieldName extends string = TIdField, TIdSch extends z.ZodType = TIdSchema>(options?: { idSchema?: TIdSch; idFieldName?: TIdFieldName; path?: string }) {
        const idFieldName = (options?.idFieldName ?? this.idField) as TIdFieldName;
        const idSchema = (options?.idSchema ?? this.idSchema) as TIdSch;
        const pathSuffix = options?.path ?? "/stream";

        return this.createBuilder({
            method: "GET",
            summary: `Stream ${this.entityName} file`,
            description: `Stream ${this.entityName} file with HTTP Range header support`,
        })
            .input((b) =>
                b
                    .params((p) => p`/{${p(idFieldName, idSchema)}}${pathSuffix}`)
                    .query(
                        z.object({
                            range: z.string().optional(),
                            "if-range": z.string().optional(),
                        }),
                    ),
            )
            .output(
                z.object({
                    content: z.string(),
                    contentType: z.string(),
                    contentLength: z.number().int().min(0),
                    acceptRanges: z.literal("bytes").optional(),
                    contentRange: z.string().optional(),
                    etag: z.string().optional(),
                    lastModified: z.string().optional(),
                }),
            );
    }

    // ==================== Zod-Specific Methods ====================

    /**
     * Create a CLONE operation with Zod-specific override fields
     *
     * Adds `overrideFields` support on top of the base `clone()` method,
     * allowing callers to specify which entity fields can be customized
     * when cloning (Zod-specific feature).
     *
     * @param options.overrideFields - Entity fields that can be customized in the clone
     */
    cloneWithOverrides<TIdFieldName extends string = TIdField, TIdSch extends z.ZodType = TIdSchema>(options: {
        idSchema?: TIdSch;
        idFieldName?: TIdFieldName;
        overrideFields: readonly (keyof z.infer<TEntity>)[];
    }) {
        const idFieldName = (options.idFieldName ?? this.idField) as TIdFieldName;
        const idSchema = (options.idSchema ?? this.idSchema) as TIdSch;

        // Build overrides object from entity shape
        const overrideShape: Record<string, z.ZodType> = {};
        const shape = this.entitySchema.shape;

        for (const key of options.overrideFields) {
            const fieldSchema = shape[key as string];
            if (fieldSchema) {
                overrideShape[key as string] = (fieldSchema as z.ZodType).optional();
            }
        }

        const bodySchema = Object.keys(overrideShape).length > 0 ? z.object({ overrides: z.object(overrideShape).optional() }) : z.object({});

        return this.createBuilder({
            method: "POST",
            summary: `Clone ${this.entityName}`,
            description: `Create a duplicate of a ${this.entityName}`,
        })
            .input((b) => b.params((p) => p`/{${p(idFieldName, idSchema)}}/clone`).body(bodySchema))
            .output(this.entitySchema);
    }
}

/**
 * Factory function to create ZodStandardOperations
 */
export function createZodStandardOperations<TEntity extends ZodEntitySchema, TIdField extends string = "id", TIdSchema extends z.ZodType = InferIdSchema<TEntity, TIdField>>(
    options: ZodEntityOperationOptions<TEntity, TIdField, TIdSchema>,
): ZodStandardOperations<TEntity, TIdField, TIdSchema> {
    return new ZodStandardOperations(options);
}

/**
 * Shorthand factory for ZodStandardOperations
 */
export function zodStandard<TEntity extends ZodEntitySchema, TIdField extends string = "id", TIdSchema extends z.ZodType = InferIdSchema<TEntity, TIdField>>(
    entitySchema: TEntity,
    entityName: string,
    options?: Omit<ZodEntityOperationOptions<TEntity, TIdField, TIdSchema>, "entitySchema" | "entityName">,
): ZodStandardOperations<TEntity, TIdField, TIdSchema> {
    return new ZodStandardOperations({ entitySchema, entityName, ...options });
}

/**
 * Helper to create quick list options (Zod variant)
 *
 * Uses Zod-specific config schema factories.
 */
export function createZodListOptions<TSortFields extends readonly string[], TFilterFields extends Record<string, FieldFilterConfig>>(options: {
    sortableFields?: TSortFields;
    defaultSortField?: TSortFields[number];
    filterableFields?: TFilterFields;
    searchableFields?: readonly string[];
    defaultLimit?: number;
    maxLimit?: number;
}): BaseListOperationOptions {
    const result: BaseListOperationOptions = {};

    if (options.sortableFields && options.sortableFields.length > 0) {
        result.pagination = createPaginationConfigSchema({
            defaultLimit: options.defaultLimit ?? 20,
            maxLimit: options.maxLimit ?? 100,
            includeOffset: true,
            includePage: true,
        });

        result.sorting = createSortingConfigSchema(options.sortableFields, {
            defaultField: options.defaultSortField,
        });
    }

    if (options.filterableFields) {
        result.filtering = createFilteringConfigSchema(options.filterableFields);
    }

    if (options.searchableFields && options.searchableFields.length > 0) {
        result.search = createSearchConfigSchema(options.searchableFields);
    }

    return result;
}
