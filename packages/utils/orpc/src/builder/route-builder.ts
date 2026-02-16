/**
 * Main RouteBuilder class for route-builder-v2
 * Provides fluent API for creating ORPC contracts with Standard Schema
 */

import { oc } from "@orpc/contract";
import type { HTTPPath, AnySchema, ContractProcedure } from "./types";
import type { 
    RouteMetadata, 
    HTTPMethod, 
    ErrorMap,
} from "./types";
import type { 
    SchemaShape, 
    ObjectSchema, 
    VoidSchema,
} from "./standard-schema-helpers";
import {
    voidSchema,
    objectSchema,
    optionalSchema,
    literalSchema,
    emptyObjectSchema,
} from "./standard-schema-helpers";
import { DetailedInputBuilder } from "./input-builder";
import {
    DetailedOutputBuilder,
    createDetailedOutputBuilder,
} from "./output-builder";
import type { DetailedOutputUnionResult } from "./output-builder";
import type { ExtractErrorsFromBuilders } from "./error-builder";
import { error, type ErrorDefinitionBuilder } from "./error-builder";

// ============================================================================
// DETAILED INPUT TYPE (for requests: params, query, body, headers)
// ============================================================================

/**
 * Brand symbol to identify DetailedInput types at compile time
 * Using Symbol.for() to ensure it matches the runtime symbol applied by builders
 */
export const DetailedInputBrand = Symbol.for('DetailedInputBrand');

/**
 * DetailedInput structure type - ensures input has proper REQUEST structure
 * This is the canonical shape for structured input with params, query, body, headers
 * 
 * Includes a brand for type-level detection - this brand is removed when building the final contract
 */
export type DetailedInput<
    TParams extends AnySchema = VoidSchema,
    TQuery extends AnySchema = VoidSchema,
    TBody extends AnySchema = VoidSchema,
    THeaders extends AnySchema = VoidSchema
> = ObjectSchema<{
    params: TParams;
    query: TQuery;
    body: TBody;
    headers: THeaders;
}> & {
    readonly [DetailedInputBrand]: true;
};

/**
 * Check if a type is DetailedInput (has the brand)
 */
export type IsDetailedInput<T> = T extends { readonly [DetailedInputBrand]: true } ? true : false;

/**
 * Remove the DetailedInput brand from a type (for building final contract)
 * This strips the brand but keeps the ObjectSchema structure
 * If T is not a DetailedInput, return it as-is
 */
export type RemoveDetailedInputBrand<T> = T extends DetailedInput<infer P, infer Q, infer B, infer H>
    ? ObjectSchema<{
        params: P;
        query: Q;
        body: B;
        headers: H;
    }>
    : T;

// ============================================================================
// DETAILED OUTPUT TYPE (for responses: status, headers, body)
// ============================================================================

/**
 * Brand symbol to identify DetailedOutput types at compile time
 * Using Symbol.for() to ensure it matches the runtime symbol applied by builders
 */
export const DetailedOutputBrand = Symbol.for('DetailedOutputBrand');

/**
 * DetailedOutput structure type - ensures output has proper RESPONSE structure
 * This is the canonical shape for structured output with status, headers, body
 * 
 * Note: TStatus is the numeric value, but the actual schema wraps it in literalSchema
 * 
 * Includes a brand for type-level detection - this brand is removed when building the final contract
 */
export type DetailedOutput<
    TStatus extends number = number,
    THeaders extends AnySchema = AnySchema,
    TBody extends AnySchema = AnySchema
> = ObjectSchema<{
    status: ReturnType<typeof literalSchema<TStatus>>;
    headers: THeaders;
    body: TBody;
}> & {
    readonly [DetailedOutputBrand]: true;
};

/**
 * Check if a type is DetailedOutput (has the brand)
 */
export type IsDetailedOutput<T> = T extends { readonly [DetailedOutputBrand]: true } ? true : false;

/**
 * Remove the DetailedOutput brand from a type (for building final contract)
 * This strips the brand but keeps the ObjectSchema structure
 */
export type RemoveDetailedOutputBrand<T> = T extends DetailedOutput<infer S, infer H, infer B>
    ? ObjectSchema<{
        status: ReturnType<typeof literalSchema<S>>;
        headers: H;
        body: B;
    }>
    : T;

/**
 * Detect if a schema has DetailedOutput structure (status, headers, body fields)
 * and convert it to DetailedOutput type if it does
 * 
 * Note: The status field should be a literalSchema<number>, headers and body should be AnySchema
 */
type DetectDetailedOutputStructure<T> = 
    T extends ObjectSchema<infer Shape>
        ? Shape extends { status: ReturnType<typeof literalSchema<infer S extends string | number | boolean>>, headers: infer H, body: infer B }
            ? S extends number
                ? H extends AnySchema
                    ? B extends AnySchema
                        ? DetailedOutput<S, H, B>
                        : T
                    : T
                : T
            : T
        : T;

/**
 * Convert a single DetailedOutputBuilder's generic parameters to a DetailedOutput type.
 * Used by the union output overload to compute a TypeScript-level union of DetailedOutput
 * types from the array of builders passed to union().
 */
type BuilderToDetailedOutput<T> = T extends DetailedOutputBuilder<
    AnySchema,
    infer TBody extends AnySchema,
    infer THeaders extends SchemaShape,
    infer TStatus extends number,
    string | undefined,
    string | undefined
>
    ? DetailedOutput<TStatus, ObjectSchema<THeaders>, TBody>
    : never;

// ============================================================================
// BACKWARD COMPATIBILITY - Keep old Detailed type as alias to DetailedInput
// ============================================================================

/**
 * @deprecated Use DetailedInputBrand instead - DetailedBrand is now an alias for backward compatibility
 */
export const DetailedBrand = DetailedInputBrand;

/**
 * @deprecated Use DetailedInput instead - Detailed now refers to input structure
 */
export type Detailed<
    TParams extends AnySchema = AnySchema,
    TQuery extends AnySchema = AnySchema,
    TBody extends AnySchema = AnySchema,
    THeaders extends AnySchema = AnySchema
> = DetailedInput<TParams, TQuery, TBody, THeaders>;

/**
 * @deprecated Use IsDetailedInput instead
 */
export type IsDetailed<T> = IsDetailedInput<T>;

/**
 * @deprecated Use RemoveDetailedInputBrand instead
 */
export type RemoveDetailedBrand<T> = RemoveDetailedInputBrand<T>;



// ============================================================================
// ROUTE BUILDER CLASS
// ============================================================================

/**
 * Route builder for creating ORPC contracts with Standard Schema
 * 
 * TInput/TOutput can be either:
 * - Simple AnySchema (when using direct schema or callback returning schema)
 * - Detailed structure (when using builder methods like .body(), .query(), etc.)
 * 
 * @example
 * ```typescript
 * // Simple schema
 * const contract = new RouteBuilder()
 *   .route({ method: "GET", path: "/users/{id}" })
 *   .input(userIdSchema)
 *   .output(userSchema)
 *   .build();
 * 
 * // Detailed via builder
 * const contract = new RouteBuilder()
 *   .input(b => b.body(userSchema).query(querySchema))
 *   .output(b => b.body(responseSchema).status(200))
 *   .build();
 * ```
 */
export class RouteBuilder<
    TInput extends AnySchema | DetailedInput = VoidSchema,
    TOutput extends AnySchema | DetailedOutput = VoidSchema,
    TMethod extends HTTPMethod = "GET",
    TEntitySchema extends AnySchema = VoidSchema,
    TErrors extends ErrorMap = Record<string, never>,
> {
    private _metadata: RouteMetadata;
    private _input: TInput;
    private _output: TOutput;
    private _method: TMethod;
    private _entitySchema?: TEntitySchema;
    private _errors: TErrors;

    constructor(
        metadata: RouteMetadata = {},
        defaults?: {
            input?: TInput;
            output?: TOutput;
            method?: TMethod;
            entitySchema?: TEntitySchema;
            errors?: TErrors;
        }
    ) {
        this._metadata = metadata;
        // Default to void schema (simple mode)
        this._input = defaults?.input ?? (voidSchema() as unknown as TInput);
        this._output = (defaults?.output ?? voidSchema() as unknown as TOutput);
        this._method = defaults?.method ?? ("GET" as TMethod);
        this._entitySchema = defaults?.entitySchema;
        this._errors = (defaults?.errors ?? {}) as TErrors;
    }

    // ============================================================================
    // METADATA SETTERS
    // ============================================================================

    /**
     * Set route metadata
     */
    route(metadata: RouteMetadata): RouteBuilder<TInput, TOutput, TMethod, TEntitySchema, TErrors> {
        return new RouteBuilder(
            { ...this._metadata, ...metadata },
            {
                input: this._input,
                output: this._output,
                method: this._method,
                entitySchema: this._entitySchema,
                errors: this._errors
            }
        );
    }

    /**
     * Update route metadata (alias for route)
     */
    updateRoute(metadata: Partial<RouteMetadata>): RouteBuilder<TInput, TOutput, TMethod, TEntitySchema, TErrors> {
        return this.route(metadata);
    }

    /**
     * Set HTTP method
     */
    method<TNewMethod extends HTTPMethod>(method: TNewMethod): RouteBuilder<TInput, TOutput, TNewMethod, TEntitySchema, TErrors> {
        return new RouteBuilder(
            { ...this._metadata, method },
            {
                input: this._input,
                output: this._output,
                method,
                entitySchema: this._entitySchema,
                errors: this._errors
            }
        );
    }

    /**
     * Set the route path (simple string path without params)
     */
    path(path: HTTPPath): RouteBuilder<TInput, TOutput, TMethod, TEntitySchema, TErrors> {
        return new RouteBuilder(
            { ...this._metadata, path },
            {
                input: this._input,
                output: this._output,
                method: this._method,
                entitySchema: this._entitySchema,
                errors: this._errors
            }
        );
    }

    /**
     * Set route summary (OpenAPI)
     */
    summary(summary: string): RouteBuilder<TInput, TOutput, TMethod, TEntitySchema, TErrors> {
        return new RouteBuilder(
            { ...this._metadata, summary },
            {
                input: this._input,
                output: this._output,
                method: this._method,
                entitySchema: this._entitySchema,
                errors: this._errors
            }
        );
    }

    /**
     * Set route description (OpenAPI)
     */
    description(description: string): RouteBuilder<TInput, TOutput, TMethod, TEntitySchema, TErrors> {
        return new RouteBuilder(
            { ...this._metadata, description },
            {
                input: this._input,
                output: this._output,
                method: this._method,
                entitySchema: this._entitySchema,
                errors: this._errors
            }
        );
    }

    /**
     * Add tags (OpenAPI)
     */
    tags(...tags: string[]): RouteBuilder<TInput, TOutput, TMethod, TEntitySchema, TErrors> {
        return new RouteBuilder(
            { ...this._metadata, tags: [...(this._metadata.tags ?? []), ...tags] },
            {
                input: this._input,
                output: this._output,
                method: this._method,
                entitySchema: this._entitySchema,
                errors: this._errors
            }
        );
    }

    /**
     * Mark route as deprecated
     */
    deprecated(deprecated = true): RouteBuilder<TInput, TOutput, TMethod, TEntitySchema, TErrors> {
        return new RouteBuilder(
            { ...this._metadata, deprecated },
            {
                input: this._input,
                output: this._output,
                method: this._method,
                entitySchema: this._entitySchema,
                errors: this._errors
            }
        );
    }

    // ============================================================================
    // SCHEMA GETTERS
    // ============================================================================

    /**
     * Get the input schema
     */
    getInputSchema(): TInput {
        return this._input;
    }

    /**
     * Get the output schema  
     */
    getOutputSchema(): TOutput {
        return this._output;
    }

    /**
     * Get the entity schema
     */
    getEntitySchema(): TEntitySchema | undefined {
        return this._entitySchema;
    }

    /**
     * Get route metadata (method, path, summary, etc.)
     */
    getRouteMetadata(): RouteMetadata {
        return this._metadata;
    }

    // ============================================================================
    // INPUT/OUTPUT API - BUILDER PATTERN
    // ============================================================================

    /**
     * Set input schema - supports direct schema or builder callback
     * 
     * Usage patterns:
     * - `.input(schema)` → Non-detailed: direct schema
     * - `.input(b => schema)` → Non-detailed: callback returns plain schema
     * - `.input(b => b.body(schema).query(querySchema))` → Detailed: callback returns builder
     * 
     * @example
     * ```typescript
     * // Non-detailed (direct schema)
     * .input(userSchema)
     * .input(b => userSchema)
     * 
     * // Detailed (builder methods)
     * .input(b => b.body(userSchema).query(querySchema))
     * .input(b => b.params(p => p`/users/${p('id', idSchema)}`).body(userSchema))
     * ```
     */
    input<TParams extends AnySchema, TQuery extends AnySchema, TBody extends AnySchema, THeaders extends AnySchema>(
        builder: (b: DetailedInputBuilder<
            TInput extends DetailedInput<infer P, infer _Q, infer _B, infer _H> ? P : ObjectSchema<Record<never, never>>,
            TInput extends DetailedInput<infer _P, infer Q, infer _B, infer _H> ? Q : ObjectSchema<Record<never, never>>,
            TInput extends DetailedInput<infer _P, infer _Q, infer B, infer _H> ? B : VoidSchema,
            TInput extends DetailedInput<infer _P, infer _Q, infer _B, infer H> ? H : ObjectSchema<Record<never, never>>,
            TEntitySchema
        >) => DetailedInputBuilder<TParams, TQuery, TBody, THeaders, TEntitySchema>
    ): RouteBuilder<DetailedInput<TParams, TQuery, TBody, THeaders>, TOutput, TMethod, TEntitySchema, TErrors>;
    input<TNewInput extends AnySchema>(
        builder: (b: DetailedInputBuilder<AnySchema, AnySchema, AnySchema, AnySchema, TEntitySchema>) => TNewInput
    ): RouteBuilder<TNewInput, TOutput, TMethod, TEntitySchema, TErrors>;
    input<TNewInput extends AnySchema>(
        schema: TNewInput
    ): RouteBuilder<TNewInput, TOutput, TMethod, TEntitySchema, TErrors>;
    input<TNewInput extends AnySchema>(
        schemaOrBuilder: TNewInput | ((b: DetailedInputBuilder<AnySchema, AnySchema, AnySchema, AnySchema, TEntitySchema>) => TNewInput | DetailedInputBuilder<AnySchema, AnySchema, AnySchema, AnySchema, TEntitySchema>)
    ): RouteBuilder<AnySchema | DetailedInput, TOutput, TMethod, TEntitySchema, TErrors> {
        // Callback mode
        if (typeof schemaOrBuilder === "function") {
            // Build the DetailedInputBuilder from existing input parts
            const detailedBuilder = this._createInputBuilder();
            const result = schemaOrBuilder(detailedBuilder);
            
            // Check if result is a DetailedInputBuilder (has _build method)
            if (typeof result === 'object' && '_build' in result && typeof result._build === 'function') {
                const builder = result;
                const inputSchema = builder._build();
                
                // Extract pending path if set by template literal params
                const pendingPath = builder._pendingPath;
                const metadata = pendingPath 
                    ? { ...this._metadata, path: pendingPath as HTTPPath }
                    : this._metadata;
                
                return new RouteBuilder(
                    metadata,
                    {
                        input: inputSchema as DetailedInput,
                        output: this._output,
                        method: this._method,
                        entitySchema: this._entitySchema,
                        errors: this._errors
                    }
                );
            }
            
            // Schema mode - callback returned a schema directly
            return new RouteBuilder(
                this._metadata,
                {
                    input: result as AnySchema,
                    output: this._output,
                    method: this._method,
                    entitySchema: this._entitySchema,
                    errors: this._errors
                }
            );
        }
        
        // Direct schema mode
        return new RouteBuilder(
            this._metadata,
            {
                input: schemaOrBuilder,
                output: this._output,
                method: this._method,
                entitySchema: this._entitySchema,
                errors: this._errors
            }
        );
    }

    /**
     * Set output schema - supports direct schema, builder callback, or union callback
     * 
     * Usage patterns:
     * - `.output(schema)` → Non-detailed: direct schema
     * - `.output(b => schema)` → Non-detailed: callback returns plain schema
     * - `.output(b => b.body(schema).status(201))` → Detailed: callback returns builder
     * - `.output(b => b.union([b.status(200).body(s1), b.status(404).body(s2)]))` → Union: multiple status variants
     * 
     * @example
     * ```typescript
     * // Non-detailed (direct schema)
     * .output(userSchema)
     * .output(b => userSchema)
     * 
     * // Detailed (builder methods)
     * .output(b => b.body(userSchema).status(200))
     * .output(b => b.union([b.body(schema1).status(200), b.body(schema2).status(201)]))
     * ```
     */
    output<
        const TBuilders extends readonly DetailedOutputBuilder<AnySchema, AnySchema, SchemaShape, number, string | undefined, string | undefined>[]
    >(
        builder: (b: DetailedOutputBuilder) => DetailedOutputUnionResult<TBuilders>
    ): RouteBuilder<TInput, BuilderToDetailedOutput<TBuilders[number]>, TMethod, TEntitySchema, TErrors>;
    output<TResultBody extends AnySchema, TResultHeaders extends SchemaShape, TResultStatus extends number, TDescription extends string | undefined, TBrand extends string | undefined>(
        builder: (b: DetailedOutputBuilder) => DetailedOutputBuilder<AnySchema, TResultBody, TResultHeaders, TResultStatus, TDescription, TBrand>
    ): RouteBuilder<TInput, DetailedOutput<TResultStatus, ObjectSchema<TResultHeaders>, TResultBody>, TMethod, TEntitySchema, TErrors>;
    output<TNewOutput extends AnySchema>(
        builder: (b: DetailedOutputBuilder) => TNewOutput
    ): RouteBuilder<TInput, DetectDetailedOutputStructure<TNewOutput>, TMethod, TEntitySchema, TErrors>;
    output<TNewOutput extends AnySchema>(
        schema: TNewOutput
    ): RouteBuilder<TInput, DetectDetailedOutputStructure<TNewOutput>, TMethod, TEntitySchema, TErrors>;
    output<TNewOutput extends AnySchema>(
        schemaOrBuilder: TNewOutput | ((b: DetailedOutputBuilder) => TNewOutput | DetailedOutputBuilder<AnySchema, AnySchema, SchemaShape, number, string | undefined, string | undefined>)
    ): RouteBuilder<TInput, AnySchema | DetailedOutput, TMethod, TEntitySchema, TErrors> {
        // Callback mode
        if (typeof schemaOrBuilder === "function") {
            const builder = createDetailedOutputBuilder(voidSchema(), this._entitySchema);
            const result = schemaOrBuilder(builder);
            
            // Check if result is a DetailedOutputBuilder (has _build method)
            if (typeof result === 'object' && '_build' in result && typeof result._build === 'function') {
                const outputSchema = result._build();
                return new RouteBuilder(
                    this._metadata,
                    {
                        input: this._input,
                        output: outputSchema,
                        method: this._method,
                        entitySchema: this._entitySchema,
                        errors: this._errors
                    }
                );
            }
            
            // Schema mode - callback returned a schema directly
            return new RouteBuilder(cd 
                this._metadata,
                {
                    input: this._input,
                    output: result as AnySchema,
                    method: this._method,
                    entitySchema: this._entitySchema,
                    errors: this._errors
                }
            );
        }
        
        // Direct schema mode
        return new RouteBuilder(
            this._metadata,
            {
                input: this._input,
                output: schemaOrBuilder,
                method: this._method,
                entitySchema: this._entitySchema,
                errors: this._errors
            }
        );
    }

    /**
     * @internal Create a DetailedInputBuilder from the existing _input state.
     * Extracts existing params/query/body/headers if _input is a DetailedInput.
     */
    private _createInputBuilder(): DetailedInputBuilder<AnySchema, AnySchema, AnySchema, AnySchema, TEntitySchema> {
        let existingParams: AnySchema = emptyObjectSchema();
        let existingQuery: AnySchema = emptyObjectSchema();
        let existingBody: AnySchema = voidSchema();
        let existingHeaders: AnySchema = emptyObjectSchema();
        
        if (typeof this._input === 'object' && '~standard' in this._input) {
            const inputShape = (this._input as unknown as Record<symbol, SchemaShape>)[Symbol.for("standard-schema:shape")];
            if (inputShape && typeof inputShape === 'object') {
                const paramsField = (inputShape as Record<string, AnySchema>).params;
                const queryField = (inputShape as Record<string, AnySchema>).query;
                const bodyField = (inputShape as Record<string, AnySchema>).body;
                const headersField = (inputShape as Record<string, AnySchema>).headers;
                
                // Helper to unwrap OptionalSchema and check if non-empty
                const unwrapAndExtract = (field: AnySchema | undefined): AnySchema | undefined => {
                    if (!field) return undefined;
                    
                    const isOptional = typeof field === 'object' && '_inner' in field;
                    
                    if (isOptional) {
                        const inner = (field as { _inner: AnySchema })._inner;
                        if (typeof inner === 'object' && '~standard' in inner) {
                            const shape = (inner as unknown as Record<symbol, unknown>)[Symbol.for("standard-schema:shape")];
                            if (shape && typeof shape === 'object') {
                                const keys = Object.keys(shape);
                                if (keys.length === 0) return undefined;
                            }
                        }
                        return inner;
                    }
                    
                    return field;
                };
                
                const extractedParams = unwrapAndExtract(paramsField);
                const extractedQuery = unwrapAndExtract(queryField);
                const extractedHeaders = unwrapAndExtract(headersField);
                
                if (extractedParams) existingParams = extractedParams;
                if (extractedQuery) existingQuery = extractedQuery;
                if (bodyField) existingBody = bodyField;
                if (extractedHeaders) existingHeaders = extractedHeaders;
            }
        }
        
        return new DetailedInputBuilder(
            existingParams,
            existingQuery,
            existingBody,
            existingHeaders,
            this._entitySchema
        );
    }

    // ============================================================================
    // ENTITY AND ERRORS
    // ============================================================================

    /**
     * Set entity schema for use in input/output builders
     */
    entity<TNewEntitySchema extends AnySchema>(schema: TNewEntitySchema): RouteBuilder<TInput, TOutput, TMethod, TNewEntitySchema, TErrors> {
        return new RouteBuilder(
            this._metadata,
            {
                input: this._input,
                output: this._output,
                method: this._method,
                entitySchema: schema,
                errors: this._errors
            }
        );
    }

    /**
     * Add error definitions
     * 
     * @example Rest parameters pattern
     * ```typescript
     * .errors(
     *     error().code("NOT_FOUND").data(notFoundSchema),
     *     error().code("UNAUTHORIZED").data(unauthorizedSchema)
     * )
     * ```
     * 
     * @example Callback pattern with factory
     * ```typescript
     * .errors((e) => [
     *     e().code("NOT_FOUND").data(notFoundSchema),
     *     e().code("UNAUTHORIZED").data(unauthorizedSchema)
     * ])
     * ```
     */
    errors<TNewErrors extends readonly ErrorDefinitionBuilder<string, string | undefined, AnySchema | undefined, number | undefined>[]>(
        errorsOrBuilder: TNewErrors[0] extends ErrorDefinitionBuilder<infer _A, infer _B, infer _C, infer _D>
            ? TNewErrors | ((factory: typeof error) => TNewErrors)
            : ((factory: typeof error) => TNewErrors)
    ): RouteBuilder<TInput, TOutput, TMethod, TEntitySchema, TErrors & ExtractErrorsFromBuilders<TNewErrors>>;
    errors<TNewErrors extends readonly ErrorDefinitionBuilder<string, string | undefined, AnySchema | undefined, number | undefined>[]>(
        ...errors: TNewErrors
    ): RouteBuilder<TInput, TOutput, TMethod, TEntitySchema, TErrors & ExtractErrorsFromBuilders<TNewErrors>>;
    errors<TNewErrors extends readonly ErrorDefinitionBuilder<string, string | undefined, AnySchema | undefined, number | undefined>[]>(
        ...errorsOrCallback: TNewErrors | [(factory: typeof error) => TNewErrors]
    ): RouteBuilder<TInput, TOutput, TMethod, TEntitySchema, TErrors & ExtractErrorsFromBuilders<TNewErrors>> {
        // Check if single argument is a callback function
        const firstArg = errorsOrCallback[0];
        const errors = typeof firstArg === "function" && errorsOrCallback.length === 1
            ? (firstArg as (factory: typeof error) => TNewErrors)(error)
            : errorsOrCallback as unknown as TNewErrors;

        const errorMap: Record<string, unknown> = { ...this._errors };
        
        for (const errorBuilder of errors) {
            const def = errorBuilder._getDefinition();
            errorMap[def.code] = {
                message: def.message,
                data: def.data,
                status: def.status,
            };
        }
        
        return new RouteBuilder(
            this._metadata,
            {
                input: this._input,
                output: this._output,
                method: this._method,
                entitySchema: this._entitySchema,
                errors: errorMap as TErrors & ExtractErrorsFromBuilders<TNewErrors>
            }
        );
    }

    // ============================================================================
    // BUILD
    // ============================================================================

    /**
     * Build the final ORPC contract
     * Removes the DetailedInput/DetailedOutput brands from input/output before creating the contract
     */
    build(): ContractProcedure<
        RemoveDetailedInputBrand<TInput>,
        RemoveDetailedOutputBrand<TOutput>,
        TErrors,
        RouteMetadata
    > {
        // Handle both simple AnySchema and Detailed modes
        // If TInput is DetailedInput (has brand), remove it before passing to ORPC
        // If TOutput is DetailedOutput (has brand), remove it before passing to ORPC
        // If TInput/TOutput is simple AnySchema, use as-is
        
        // Use type assertion to prevent TypeScript from inferring union types
        const cleanInput = (typeof this._input === 'object' && DetailedInputBrand in this._input)
            ? (this._input as unknown as RemoveDetailedInputBrand<TInput>)
            : (this._input as RemoveDetailedInputBrand<TInput>);
        
        const cleanOutput = (typeof this._output === 'object' && DetailedOutputBrand in this._output)
            ? (this._output as unknown as RemoveDetailedOutputBrand<TOutput>)
            : (this._output as RemoveDetailedOutputBrand<TOutput>);
        
        // Create the ORPC contract
        const contractWithOutput = oc.input(cleanInput).output(cleanOutput);

        // Add route metadata if present
        // Note: TErrors are added at implementation time via .errors() middleware, not during contract definition
        if (Object.keys(this._metadata).length > 0) {
            return contractWithOutput.route(this._metadata) as unknown as ContractProcedure<
                RemoveDetailedInputBrand<TInput>,
                RemoveDetailedOutputBrand<TOutput>,
                TErrors,
                RouteMetadata
            >;
        }

        return contractWithOutput as unknown as ContractProcedure<
            RemoveDetailedInputBrand<TInput>,
            RemoveDetailedOutputBrand<TOutput>,
            TErrors,
            RouteMetadata
        >;
    }

    // ============================================================================
    // STATIC FACTORY METHODS
    // ============================================================================

    /**
     * Create a health check endpoint
     * Returns status, timestamp, and optional details
     * 
     * @example
     * ```typescript
     * const healthContract = RouteBuilder.health().build();
     * // GET /health -> { status: 'healthy', timestamp: '...', details?: {...} }
     * ```
     */
    static health(options?: { path?: HTTPPath; includeDetails?: boolean }) {
        // Create simple health response schema
        const healthSchema = objectSchema({
            status: literalSchema('healthy'),
            timestamp: voidSchema(), // Replace with date schema when available
            details: optionalSchema(objectSchema({})),
        }) as ObjectSchema;

        return new RouteBuilder(
            {
                method: "GET",
                path: options?.path ?? "/health",
            },
            {
                output: healthSchema
            }
        );
    }

    /**
     * Create a readiness probe endpoint
     * Used by orchestrators (k8s) to check if service is ready
     * 
     * @example
     * ```typescript
     * const readyContract = RouteBuilder.ready().build();
     * // GET /ready -> { ready: true, checks?: {...} }
     * ```
     */
    static ready(options?: { path?: HTTPPath }) {
        const readySchema = objectSchema({
            ready: literalSchema(true),
            checks: optionalSchema(objectSchema({})),
        }) as ObjectSchema;

        return new RouteBuilder(
            {
                method: "GET",
                path: options?.path ?? "/ready",
            },
            {
                output: readySchema
            }
        );
    }

    /**
     * Create a liveness probe endpoint
     * Used by orchestrators (k8s) to check if service is alive
     * 
     * @example
     * ```typescript
     * const liveContract = RouteBuilder.live().build();
     * // GET /live -> { alive: true }
     * ```
     */
    static live(options?: { path?: HTTPPath }) {
        const liveSchema = objectSchema({
            alive: literalSchema(true),
        }) as ObjectSchema;

        return new RouteBuilder(
            {
                method: "GET",
                path: options?.path ?? "/live",
            },
            {
                output: liveSchema
            }
        );
    }
}

/**
 * Create a new route builder
 */
export function route(metadata?: RouteMetadata): RouteBuilder {
    return new RouteBuilder(metadata ?? {});
}
