/**
 * ORPC-Native Contract Factory for Custom Endpoints
 *
 * Uses ORPC's native createProcedureUtils to ensure perfect alignment with ORPC behavior.
 * This helper wraps custom handlers (like Better Auth SDK calls) to expose the same
 * TanStack Query integration as native ORPC contracts.
 *
 * Key Benefits:
 * - Uses ORPC's internal implementation (createProcedureUtils)
 * - Always stays in sync with ORPC behavior
 * - Supports Zod validation for type safety
 * - Full TypeScript type inference
 * - Automatic Better Auth error handling with typed errors
 *
 * Usage:
 * ```typescript
 * // With Zod schema (recommended for validation)
 * const login = custom({
 *   input: z.object({ email: z.string(), password: z.string() }),
 *   keys: ['auth', 'login'],
 *   handler: async (data) => handleBetterAuthResult(authClient.signIn.email(data)),
 * })
 *
 * // Without schema (automatic type inference from handler)
 * const session = custom({
 *   keys: ['auth', 'session'],
 *   handler: async () => handleBetterAuthResult(authClient.getSession()),
 * })
 *
 * // Usage (identical to ORPC contracts)
 * const { data } = useQuery(login.queryOptions({ input: { email: '...', password: '...' } }))
 * const result = await login.call({ email: '...', password: '...' })
 * ```
 */

import { createProcedureUtils } from "@orpc/tanstack-query";
import type { Client } from "@orpc/client";
import type { useQueryClient } from "@tanstack/react-query";
import type { MutationOptions, QueryKey, DataTag } from "@tanstack/react-query";
import type { z } from "zod";
import type { BetterFetchResponse } from "@better-fetch/fetch";
import { enhanceSingleEndpoint, type EndpointWithCache } from "./cache-operations";
type MaybeOptionalOptions<TOptions> = Record<never, never> extends TOptions ? [options?: TOptions] : [options: TOptions];

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Thrower class - wraps an error without throwing immediately
 * Allows returning errors from handlers, which custom() will catch and throw properly.
 * This enables proper error type inference in TanStack Query's error generics.
 *
 * The __brand property is a unique symbol that discriminates Thrower at the type level,
 * allowing TypeScript to properly track the TError generic through the entire chain:
 * Thrower<TError> → MapFunction<TOutput, TError> → custom() → queryOptions
 *
 * @example
 * ```typescript
 * // Instead of throwing:
 * if (response.error) throw new Error(response.error.message)
 *
 * // Return Thrower:
 * if (response.error) return new Thrower(response.error)
 * ```
 */
export class Thrower<TError = unknown> extends Error {
  /**
   * Unique brand property for type-level discrimination
   * Enables TypeScript to properly infer TError through the entire chain.
   * Using a branded property that TypeScript can track through the generic TError.
   */
  readonly __brand: "Thrower" = "Thrower" as const;

  constructor(public readonly error: TError) {
    // Create error message from the wrapped error
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null
          ? ((error as Record<string, unknown>).message as string)
          : String(error);

    super(message);
    this.name = "Thrower";
  }

  /**
   * Type guard to check if a value is a Thrower instance
   * Checks both instanceof and the brand symbol
   */
  static is<TError = unknown>(value: unknown): value is Thrower<TError> {
    return value instanceof Thrower && "__brand" in value;
  }
}

/**
 * Better Auth Error
 * Extends Error with Better Auth specific error information
 */
export class BetterAuthError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly statusText?: string,
  ) {
    super(message);
    this.name = "BetterAuthError";
  }
}

/**
 * Type guard to check if Better Fetch response is an error
 * Better Auth uses BetterFetchResponse<T, E, false> which is Data<T> | Error$1<E>
 * - Data<T> has { data: T, error: null }
 * - Error$1<E> has { data: null, error: { status, statusText, message?, ... } }
 */
export function isBetterAuthError(
  result: unknown,
): result is { data: null; error: { status: number; statusText: string } } {
  return (
    result !== null &&
    typeof result === "object" &&
    "data" in result &&
    (result as Record<string, unknown>).data === null &&
    "error" in result &&
    (result as Record<string, unknown>).error !== null
  );
}

/**
 * Handle Better Auth SDK result and throw typed error if present
 * This ensures TanStack Query/Mutation gets properly typed errors
 *
 * Supports both Promise and non-Promise inputs with proper type inference:
 * - Promise input → Promise output
 * - Direct value input → Direct value output
 *
 * Uses Better Auth's actual BetterFetchResponse<T, E, Throw> type which is:
 * - When Throw=true: { data: T, error: null }
 * - When Throw=false: { data: T | null, error: null | { status, statusText, message?, code?, ... } }
 *
 * @example
 * // Async usage
 * const session = custom({
 *   keys: ['auth', 'session'],
 *   handler: async () => handleBetterAuthResult(authClient.getSession()),
 * })
 *
 * // Sync usage
 * const result = handleBetterAuthResult(syncBetterAuthCall())
 */
export function handleBetterAuthResult<T, E = unknown>(
  result: Promise<BetterFetchResponse<T, E, boolean>>,
): Promise<T>;
export function handleBetterAuthResult<T, E = unknown>(
  result: BetterFetchResponse<T, E, boolean>,
): T;
export function handleBetterAuthResult<T, E = unknown>(
  result:
    | Promise<BetterFetchResponse<T, E, boolean>>
    | BetterFetchResponse<T, E, boolean>,
): Promise<T> | T {
  // Handle Promise case
  if (result instanceof Promise) {
    return result.then((resolved) => {
      if (isBetterAuthError(resolved)) {
        const err = resolved.error as {
          status: number;
          statusText: string;
          message?: string;
          code?: string;
        };
        throw new BetterAuthError(
          err.message ?? err.statusText,
          err.status,
          err.code,
          err.statusText,
        );
      }
      return (resolved as { data: T; error: null }).data;
    });
  }

  // Handle sync case
  if (isBetterAuthError(result)) {
    const err = result.error as {
      status: number;
      statusText: string;
      message?: string;
      code?: string;
    };
    throw new BetterAuthError(
      err.message ?? err.statusText,
      err.status,
      err.code,
      err.statusText,
    );
  }

  return (result as { data: T; error: null }).data;
}

/**
 * Create a MapFunction that handles Better Auth responses
 * Supports chaining with other map transformations
 *
 * Works with Better Auth SDK return types (BetterFetchResponse<T, E, false>)
 * which always returns a union of Data<T> | Error$1<E>
 *
 * Returns:
 * - Data if response is successful
 * - Thrower<E> if response has error (which custom() will catch and throw)
 *
 * This allows proper error type inference throughout the chain:
 * mapBetterAuth() → Thrower<E> → custom() extracts E → queryOptions error typing
 *
 * @example
 * ```typescript
 * // Simple usage
 * const login = custom({
 *   input: loginSchema,
 *   keys: ['auth', 'login'],
 *   handler: async (input) => authClient.signIn.email(input),
 *   map: mapBetterAuth(),
 * })
 *
 * // Chaining with other transformations
 * const createUser = custom({
 *   input: createUserSchema,
 *   keys: ['admin', 'createUser'],
 *   handler: async (input) => authClient.admin.createUser(input),
 *   map: mapBetterAuth(() => {
 *     // Other setup code can run here
 *   }),
 * })
 *
 * // Error is now properly typed in useQuery/useMutation
 * const { data, error } = useQuery(
 *   login.queryOptions({ input: { email: '...', password: '...' } })
 * )
 * // error is properly typed as the Better Auth error type
 * ```
 */
/**
 * Better Auth response mapper with automatic type inference and optional transformation
 * 
 * This is a higher-order function that returns a map function.
 * Allows chaining additional transformations on the extracted data.
 *
 * Removes null from both success and error types:
 * - Success: data is guaranteed non-null (no error occurred)
 * - Error: error is guaranteed non-null (thrown in onError callback)
 *
 * @example
 * ```typescript
 * // Simple extraction
 * const login = custom({
 *   handler: authClient.signIn.email,
 *   map: mapBetterAuth(), // Types inferred automatically!
 * })
 *
 * // With transformation
 * const createUser = custom({
 *   handler: authClient.admin.createUser,
 *   map: mapBetterAuth((user) => ({
 *     ...user,
 *     displayName: `${user.name} (${user.email})`
 *   }))
 * })
 * ```
 */
export function mapBetterAuth<TTransformed = never>(
  transform?: (extracted: never) => TTransformed | Promise<TTransformed>
) {
  return <THandlerOutput>(
    output: THandlerOutput,
  ): THandlerOutput extends { data: infer D; error: infer E | null }
    ? [TTransformed] extends [never] 
      ? NonNullable<D> | Thrower<NonNullable<E>>
      : TTransformed | Thrower<NonNullable<E>>
    : [TTransformed] extends [never]
      ? NonNullable<THandlerOutput> | Thrower<BetterAuthError>
      : TTransformed | Thrower<BetterAuthError> => {
    // Check if the Better Auth response has an error
    if (isBetterAuthError(output)) {
      type ErrorType = THandlerOutput extends { error: infer E | null }
        ? NonNullable<E>
        : BetterAuthError;
      return new Thrower(output.error as ErrorType) as never;
    }

    // Extract the data (non-null in success case)
    type DataType = THandlerOutput extends { data: infer D } 
      ? NonNullable<D> 
      : NonNullable<THandlerOutput>;
    const data = (output as { data: DataType; error: null }).data;

    // Apply transformation if provided
    if (transform) {
      const result = transform(data as never);
      // Handle async transformations
      if (result instanceof Promise) {
        return result as never;
      }
      return result as never;
    }

    return data as never;
  };
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Function that maps/transforms handler output
 * Used to discriminate between success and error cases
 * Can return Thrower<TError> to trigger error throwing in custom()
 *
 * @example
 * ```typescript
 * // Map Better Auth response to data or Thrower
 * map: (output) => {
 *   if (output.error) return new Thrower(output.error)
 *   return output.data
 * }
 *
 * // Transform and validate
 * map: (output) => {
 *   const validated = validate(output)
 *   if (validated.error) return new Thrower(validated.error)
 *   return validated.data
 * }
 * ```
 */
type MapFunction<THandlerOutput, TMappedOutput, TError = unknown> = (
  output: THandlerOutput,
) =>
  | TMappedOutput
  | Thrower<TError>
  | Promise<TMappedOutput | Thrower<TError>>;

/**
 * Infer input type from handler function
 * Returns undefined for parameterless functions to avoid 'never' issues
 */
export type InferInput<T> = T extends () => unknown
  ? undefined
  : T extends (input: infer I) => unknown
    ? I
    : never;

/**
 * Infer output type from handler function (handles both sync and async)
 */
export type InferOutput<T> = T extends (input: unknown) => infer R
  ? R extends Promise<infer O>
    ? O
    : R
  : never;

/**
 * Handler function type that makes input optional when TInput is undefined
 */
type HandlerFunction<TInput, TOutput> = TInput extends undefined
  ? () => Promise<TOutput> | TOutput
  : (input: TInput) => Promise<TOutput> | TOutput;

/**
 * Configuration for creating a custom contract with Zod schema
 */
interface CustomContractConfigWithSchema<
  TInputSchema extends z.ZodType,
  THandlerOutput,
  TMappedOutput,
  TError = Error,
> {
  /** Zod schema for input validation and type inference */
  input: TInputSchema;

  /** Optional Zod schema for output validation (useful for Better Auth responses) */
  validation?: TInputSchema;

  /** Cache keys - can be static array or dynamic function */
  keys:
    | QueryKey
    | ((input: z.infer<TInputSchema>) => QueryKey);

  /** Handler function that executes the operation (can be sync or async) */
  handler: HandlerFunction<z.infer<TInputSchema>, THandlerOutput>;

  /** Optional map function to transform handler output and discriminate success/error */
  map?: MapFunction<THandlerOutput, TMappedOutput, TError>;

  // TanStack Query defaults (applied via ORPC's experimental_defaults)
  staleTime?: number;
  gcTime?: number;
  retry?: number | false | ((failureCount: number, error: TError) => boolean);
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
  refetchOnReconnect?: boolean;
}

/**
 * Configuration for creating a custom contract without schema (manual types)
 */
interface CustomContractConfigWithoutSchema<TInput, THandlerOutput, TMappedOutput, TError = Error> {
  /** Optional Zod schema for input validation (not used for type inference) */
  input?: never;

  /** Optional Zod schema for validation (can be used even without input schema) */
  validation?: z.ZodType;

  /** Cache keys - can be static array or dynamic function */
  keys: QueryKey | ((input: TInput) => QueryKey);

  /** Handler function that executes the operation (can be sync or async) */
  handler: HandlerFunction<TInput, THandlerOutput>;

  /** Optional map function to transform handler output and discriminate success/error */
  map?: MapFunction<THandlerOutput, TMappedOutput, TError>;

  // TanStack Query defaults (applied via ORPC's experimental_defaults)
  staleTime?: number;
  gcTime?: number;
  retry?: number | false | ((failureCount: number, error: TError) => boolean);
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
  refetchOnReconnect?: boolean;
}

// ============================================================================
// CUSTOM CONTRACT FACTORY (Uses ORPC Native Implementation)
// ============================================================================

/**
 * Create an ORPC-native contract for custom endpoints with Zod schema
 *
 * @example
 * const login = custom({
 *   input: z.object({ email: z.string(), password: z.string() }),
 *   keys: ['auth', 'login'],
 *   handler: async (data) => authClient.login(data), // data is typed!
 *   map: mapBetterAuth(), // Transforms BetterAuth response
 * })
 */
export function custom<
  TInputSchema extends z.ZodType,
  THandlerOutput,
  TMappedOutput = THandlerOutput,
  TError = Error,
>(
  config: CustomContractConfigWithSchema<
    TInputSchema,
    THandlerOutput,
    TMappedOutput,
    TError
  >,
): EndpointWithCache<
  ReturnType<
    typeof createProcedureUtils<
      object,
      z.infer<TInputSchema>,
      TMappedOutput,
      TError
    >
  >
>;

/**
 * Create an ORPC-native contract with automatic type inference from handler
 *
 * @example
 * const session = custom({
 *   keys: ['auth', 'session'],
 *   handler: async () => authClient.getSession(), // Types inferred automatically!
 * })
 *
 * @example
 * const check = custom({
 *   keys: ['auth', 'check'],
 *   handler: () => true, // Sync handlers work too!
 * })
 */
export function custom<THandler extends (input: unknown) => unknown>(config: {
  input?: never;
  keys:
    | QueryKey
    | ((input: InferInput<THandler>) => QueryKey);
  handler: THandler;
  staleTime?: number;
  gcTime?: number;
  retry?: number | false | ((failureCount: number, error: Error) => boolean);
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
  refetchOnReconnect?: boolean;
}): EndpointWithCache<
  ReturnType<
    typeof createProcedureUtils<
      object,
      InferInput<THandler>,
      InferOutput<THandler>,
      Error
    >
  >
>;

/**
 * Create an ORPC-native contract for custom endpoints with explicit generics
 *
 * @example
 * const session = custom<never, BetterAuthResponse, Session>({
 *   keys: ['auth', 'session'],
 *   handler: async () => authClient.getSession(),
 *   map: mapBetterAuth(), // Maps to Session type
 * })
 */
export function custom<
  TInput = never,
  THandlerOutput = unknown,
  TMappedOutput = THandlerOutput,
  TError = Error,
>(
  config: CustomContractConfigWithoutSchema<
    TInput,
    THandlerOutput,
    TMappedOutput,
    TError
  >,
): EndpointWithCache<
  ReturnType<
    typeof createProcedureUtils<object, TInput, TMappedOutput, TError>
  >
>;

/**
 * Implementation - Uses ORPC's native createProcedureUtils
 */
export function custom<
  TInput,
  THandlerOutput,
  TMappedOutput = THandlerOutput,
  TError = Error,
>(
  config:
    | CustomContractConfigWithoutSchema<
        TInput,
        THandlerOutput,
        TMappedOutput,
        TError
      >
    | CustomContractConfigWithSchema<
        z.ZodType,
        THandlerOutput,
        TMappedOutput,
        TError
      >,
): ReturnType<
  typeof createProcedureUtils<object, TInput, TMappedOutput, TError>
> {
  // Type guard to check if config has Zod schema
  const hasSchema = (
    cfg: typeof config,
  ): cfg is CustomContractConfigWithSchema<
    z.ZodType,
    THandlerOutput,
    TMappedOutput,
    TError
  > => {
    return "input" in cfg && cfg.input !== undefined;
  };

  // Determine the base path for ORPC
  // If keys is a function, we use an empty array as the base path
  // The actual keys will be computed at call time
  const basePath = (typeof config.keys === "function" ? [] : config.keys).map((v) => JSON.stringify(v));

  // Create ORPC Client-compatible function with optional Zod validation and map function
  // Client signature: (...rest: ClientRest<TContext, TInput>) => Promise<TOutput>
  // For Record<never, never> context, this is: (input?: TInput, options?) => Promise<TOutput>
  // When map is provided, TOutput becomes TMappedOutput
  const client: Client<Record<never, never>, TInput, TMappedOutput, TError> = (
    (
      ...args: unknown[]
    ) => {
      const input = args[0] as TInput;

      // Validate with Zod if schema provided
      if (hasSchema(config)) {
        const result = config.input.safeParse(input);
        if (!result.success) {
          throw new Error(`Input validation failed: ${result.error.message}`);
        }
        // Use validated data - wrap in Promise.resolve to handle sync handlers
        const handlerResult = config.handler(result.data as TInput);
        return Promise.resolve(handlerResult).then(async (output) => {
          // If map function provided, use it to transform output
          if (config.map) {
            const mapped = await config.map(output);
            // If map returns Thrower, throw it so TanStack Query types the error
            if (Thrower.is(mapped)) {
              // eslint-disable-next-line @typescript-eslint/only-throw-error
              throw mapped.error;
            }
            return mapped;
          }
          return output as unknown as TMappedOutput;
        });
      }

      // No validation - execute directly and wrap in Promise.resolve to handle sync handlers
      const handlerResult = config.handler(input);
      return Promise.resolve(handlerResult).then(async (output) => {
        // If map function provided, use it to transform output
        if (config.map) {
          const mapped = await config.map(output);
          // If map returns Thrower, throw it so TanStack Query types the error
          if (Thrower.is(mapped)) {
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw mapped.error;
          }
          return mapped;
        }
        return output as unknown as TMappedOutput;
      });
    }
  ) as Client<Record<never, never>, TInput, TMappedOutput, TError>;

  // Use ORPC's native createProcedureUtils - this ensures perfect alignment!
  const hasAnyOptions =
    config.staleTime !== undefined ||
    config.gcTime !== undefined ||
    config.retry !== undefined ||
    config.enabled !== undefined ||
    config.refetchOnWindowFocus !== undefined ||
    config.refetchOnMount !== undefined ||
    config.refetchOnReconnect !== undefined;

  if (hasAnyOptions) {
    // Build options object - cast entire options object to satisfy ORPC's complex type
    const options = {
      path: basePath,
      experimental_defaults: {
        queryOptions: {
          ...(config.staleTime !== undefined && {
            staleTime: config.staleTime,
          }),
          ...(config.gcTime !== undefined && { gcTime: config.gcTime }),
          ...(config.retry !== undefined && { retry: config.retry }),
          ...(config.enabled !== undefined && { enabled: config.enabled }),
          ...(config.refetchOnWindowFocus !== undefined && {
            refetchOnWindowFocus: config.refetchOnWindowFocus,
          }),
          ...(config.refetchOnMount !== undefined && {
            refetchOnMount: config.refetchOnMount,
          }),
          ...(config.refetchOnReconnect !== undefined && {
            refetchOnReconnect: config.refetchOnReconnect,
          }),
        },
      },
    };

    // If keys is a function, we need to wrap the utils to compute keys at call time
    const utils = createProcedureUtils(
      client,
      options as unknown as Parameters<
        typeof createProcedureUtils<
          Record<never, never>,
          TInput,
          TMappedOutput,
          TError
        >
      >[1],
    );

    // If keys is dynamic, wrap the queryKey method
    if (typeof config.keys === "function") {
      utils.queryKey = ((...args: unknown[]) => {
        const options = args[0] as { input?: TInput } | undefined;
        const input = options?.input;
        const dynamicKeys = (
          config.keys as (input: TInput) => QueryKey
        )(input as TInput);
        return dynamicKeys as unknown as ReturnType<typeof utils.queryKey>;
      }) as typeof utils.queryKey;
    }

    return utils;
  }

  const utils = createProcedureUtils(client, {
    path: basePath,
  });

  // If keys is dynamic, wrap the queryKey method
  if (typeof config.keys === "function") {
    utils.queryKey = ((...args: unknown[]) => {
      const options = args[0] as { input?: TInput } | undefined;
      const input = options?.input;
      const dynamicKeys = (config.keys as (input: TInput) => readonly string[])(
        input as TInput,
      );
      return dynamicKeys as unknown as ReturnType<typeof utils.queryKey>;
    }) as typeof utils.queryKey;
  }

  return enhanceSingleEndpoint(utils);
}

// ============================================================================
// TYPE INFERENCE HELPERS (for better DX)
// ============================================================================

/**
 * Helper to create typed custom contract with automatic inference
 *
 * @example
 * // Async handler
 * const session = customTyped({
 *   keys: ['auth', 'session'],
 *   handler: async () => authClient.getSession(), // Types inferred automatically
 * })
 *
 * // Sync handler
 * const check = customTyped({
 *   keys: ['test', 'check'],
 *   handler: () => true, // Also works!
 * })
 */
export function customTyped<
  THandler extends (input: unknown) => unknown,
>(config: {
  input?: never;
  keys:
    | QueryKey
    | ((input: InferInput<THandler>) => QueryKey);
  handler: THandler;
  staleTime?: number;
  gcTime?: number;
  retry?: number | false | ((failureCount: number, error: Error) => boolean);
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
  refetchOnReconnect?: boolean;
}): ReturnType<
  typeof createProcedureUtils<
    object,
    InferInput<THandler>,
    InferOutput<THandler>,
    Error
  >
> {
  // Directly call custom - overload 2 will match since we have THandler and input?: never
  return custom(config);
}

// ============================================================================
// CACHE INVALIDATION UTILITIES
// ============================================================================

/**
 * Type for detailed input structure (used by inputStructure: 'detailed')
 */
interface DetailedInput { params?: unknown; query?: unknown; body?: unknown };

/**
 * Detect if a value represents a detailed input structure
 * Detailed input has { params?, query?, body? } structure
 */
function isDetailedInput(value: unknown): value is DetailedInput {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const keys = Object.keys(value);
  // Check if it has at least one of params/query/body and ONLY those keys
  const hasDetailedKeys = keys.some(k => k === 'params' || k === 'query' || k === 'body');
  const onlyDetailedKeys = keys.every(k => k === 'params' || k === 'query' || k === 'body');
  return hasDetailedKeys && onlyDetailedKeys;
}

/**
 * Check if two objects match based on the matcher's structure
 * For detailed inputs, only compares the parts specified in the matcher
 */
function matchesInput(target: unknown, matcher: unknown): boolean {
  // If matcher is not an object, do exact match
  if (typeof matcher !== 'object' || matcher === null) {
    return target === matcher;
  }
  
  // If target is not an object, can't match
  if (typeof target !== 'object' || target === null) {
    return false;
  }
  
  const targetObj = target as Record<string, unknown>;
  const matcherObj = matcher as Record<string, unknown>;
  
  // Check if matcher is detailed input structure
  if (isDetailedInput(matcherObj)) {
    // Target should also be detailed input
    if (!isDetailedInput(targetObj)) {
      return false;
    }
    
    // Match each specified part (params, query, body)
    for (const key of ['params', 'query', 'body'] as const) {
      if (matcherObj[key] !== undefined) {
        // If matcher specifies this part, target must match it
        if (!deepMatch(targetObj[key], matcherObj[key])) {
          return false;
        }
      }
    }
    return true;
  }
  
  // For non-detailed inputs, do deep match
  return deepMatch(target, matcher);
}

/**
 * Deep match two values recursively
 */
function deepMatch(target: unknown, matcher: unknown): boolean {
  // Primitive match
  if (typeof matcher !== 'object' || matcher === null) {
    return target === matcher;
  }
  
  if (typeof target !== 'object' || target === null) {
    return false;
  }
  
  // Array match
  if (Array.isArray(matcher)) {
    if (!Array.isArray(target)) return false;
    if (target.length !== matcher.length) return false;
    return matcher.every((item, i) => deepMatch(target[i], item));
  }
  
  // Object match - matcher properties must exist and match in target
  const targetObj = target as Record<string, unknown>;
  const matcherObj = matcher as Record<string, unknown>;
  
  for (const key in matcherObj) {
    if (!(key in targetObj)) return false;
    if (!deepMatch(targetObj[key], matcherObj[key])) return false;
  }
  
  return true;
}

/**
 * Extract keys retrieval functions from an ORPC-compatible record
 *
 * Transforms each endpoint into a function that returns its query key.
 * This allows type-safe access to query keys for cache invalidation.
 * Uses MaybeOptionalOptions to match ORPC's queryKey signature exactly.
 *
 * Each key function has:
 * - `.key()` method to get the base query key (without input)
 * - `.predicate` property with methods that return InvalidationEntry objects
 *
 * @example
 * ```typescript
 * const authKeys = useKeysRetrieval(authEndpoints)
 * // authKeys = {
 * //   session: () => ['auth', 'session'],           // No input required
 * //   signIn: ({ input: ... }) => ['auth', 'signIn', input],  // Input optional
 * //   signIn.key: () => ['auth', 'signIn'],        // Base key without input
 * //   signIn.predicate: { by, byParams, all, ... } // Returns InvalidationEntry
 * // }
 *
 * // Usage patterns:
 * keys.signIn({ input })          // Full query key with input (exact match)
 * keys.signIn.key()               // Base key for custom predicate
 * keys.signIn.predicate.by({ id }) // InvalidationEntry with partial match
 * keys.signIn.predicate.all()     // InvalidationEntry to invalidate all
 * ```
 */

/**
 * Context provided to predicate functions for matching cached queries
 * Uses discriminated union so TypeScript narrows inputPart type based on isDetailed
 */
export type PredicateContext<TInput = unknown> = 
  | {
      /** The input part as detailed structure ({ params, query, body }) */
      inputPart: DetailedInput;
      /** The full cached query key */
      cachedKey: readonly unknown[];
      /** Discriminant: input is detailed structure */
      isDetailed: true;
    }
  | {
      /** The input part (flat structure or unknown) */
      inputPart: TInput;
      /** The full cached query key */
      cachedKey: readonly unknown[];
      /** Discriminant: input is NOT detailed structure */
      isDetailed: false;
    };

/**
 * Predicate builder attached to key functions - returns InvalidationEntry objects
 * 
 * Can be called directly with a context-aware predicate function:
 * - predicate(({ inputPart }) => inputPart?.id === value) 
 * 
 * Or use the helper methods for common patterns:
 * 
 * For detailed inputs (with { params, query, body, headers }):
 * - predicate.byParams({ id }) - match on params only
 * - predicate.byQuery({ expand }) - match on query only  
 * - predicate.byBody({ data }) - match on body only
 * - predicate.byHeaders({ authorization }) - match on headers only
 * - predicate.byParamsAndQuery({ id }, { expand }) - match on params AND query
 * 
 * For flat inputs (e.g., { id, name }):
 * - predicate.by({ id }) - match on any subset of the input
 * 
 * For all queries:
 * - predicate.all() - match all queries for this endpoint
 */
export interface KeyPredicateBuilder<TInput> {
  /**
   * Direct call with context-aware predicate function (shorthand for predicate.custom)
   * Provides direct access to inputPart, cachedKey, and isDetailed
   * @example keys.findById.predicate(({ inputPart }) => inputPart?.params?.id === '123')
   */
  (fn: (ctx: PredicateContext<TInput>) => boolean): InvalidationEntry;
  
  /**
   * Whether the input type is a detailed structure ({ params, query, body, headers })
   * Use this to conditionally apply the right matching method
   */
  readonly isDetailed: TInput extends { params: unknown } ? true : false;
  
  /**
   * Match on any subset of the input (works for both flat and detailed inputs)
   * For flat inputs: by({ id }) matches queries where input.id matches
   * For detailed inputs: by({ params: { id } }) matches queries where input.params.id matches
   */
  by: (partialInput: Partial<TInput>) => InvalidationEntry;
  
  /**
   * Match on params only (for detailed inputs with { params, query, body, headers })
   */
  byParams: (params: TInput extends { params: infer P } ? Partial<P> : never) => InvalidationEntry;
  
  /**
   * Match on query only (for detailed inputs)
   */
  byQuery: (query: TInput extends { query: infer Q } ? Partial<Q> : never) => InvalidationEntry;
  
  /**
   * Match on body only (for detailed inputs)
   */
  byBody: (body: TInput extends { body: infer B } ? Partial<B> : never) => InvalidationEntry;
  
  /**
   * Match on headers only (for detailed inputs)
   */
  byHeaders: (headers: TInput extends { headers: infer H } ? Partial<H> : never) => InvalidationEntry;
  
  /**
   * Match on params AND query together (for detailed inputs)
   * Useful when you need to match on both params and specific query values
   */
  byParamsAndQuery: (
    params: TInput extends { params: infer P } ? Partial<P> : never,
    query: TInput extends { query: infer Q } ? Partial<Q> : never
  ) => InvalidationEntry;
  
  /**
   * Custom predicate function with full context access (same as direct call)
   */
  custom: (fn: (ctx: PredicateContext<TInput>) => boolean) => InvalidationEntry;
  
  /**
   * Match all queries for this endpoint (ignores input entirely)
   */
  all: () => InvalidationEntry;
}

/**
 * Key function with additional .key() and .predicate methods
 */
type KeyFunctionWithBase<TInput, TOutput, TError> = 
  ((...args: MaybeOptionalOptions<{ input?: TInput; queryKey?: QueryKey }>) => DataTag<QueryKey, TOutput, TError>) & {
    key: () => QueryKey;
    predicate: KeyPredicateBuilder<TInput>;
  };

export type ExtractKeys<TRecord extends Record<string, unknown>> = {
  [K in keyof TRecord]: TRecord[K] extends {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    call: Client<any, infer TInput, infer TOutput, infer TError>;
  }
    ? KeyFunctionWithBase<TInput, TOutput, TError>
    : never;
};

/**
 * Helper to extract keys from an ORPC-compatible record
 *
 * @param record - Record of ORPC-compatible endpoints
 * @returns Object with same keys but functions that return QueryKey (with .key() and .predicate methods)
 */
export function getKeysRetrieval<TRecord extends Record<string, unknown>>(
  record: TRecord,
): ExtractKeys<TRecord> {
  const keys = {} as ExtractKeys<TRecord>;

  for (const key in record) {
    const endpoint = record[key];
    if (endpoint && typeof endpoint === "object" && "queryKey" in endpoint) {
      const queryKeyFn = (
        endpoint as { queryKey: (...args: unknown[]) => QueryKey }
      ).queryKey;
      
      const baseKey = () => queryKeyFn();
      
      // Base predicate creator - all methods use this to provide unified context API
      // Uses conditional construction so TypeScript properly narrows the discriminated union
      const createPredicate = (
        fn: (ctx: PredicateContext) => boolean
      ): InvalidationEntry => ({
        queryKey: baseKey(),
        predicate: (cachedKey: readonly unknown[]) => {
          const inputPart = cachedKey[cachedKey.length - 1];
          // Construct context conditionally for proper type narrowing
          const ctx: PredicateContext = isDetailedInput(inputPart)
            ? { inputPart, cachedKey, isDetailed: true }
            : { inputPart, cachedKey, isDetailed: false };
          return fn(ctx);
        },
      });
      
      // Create predicate builder as a callable function with methods
      // predicate(fn) is shorthand for predicate.custom(fn)
      // All methods use createPredicate() to provide unified context API
      const predicateBuilder = Object.assign(
        createPredicate,
        {
          isDetailed: false as never, // Will be determined by type system
          
          by: (partialInput: unknown) => 
            createPredicate((ctx) => deepMatch(ctx.inputPart, partialInput)),
          
          byParams: (params: unknown) => 
            createPredicate((ctx) => 
              ctx.isDetailed && deepMatch(ctx.inputPart.params, params)),
          
          byQuery: (query: unknown) => 
            createPredicate((ctx) => 
              ctx.isDetailed && deepMatch(ctx.inputPart.query, query)),
          
          byBody: (body: unknown) => 
            createPredicate((ctx) => 
              ctx.isDetailed && deepMatch(ctx.inputPart.body, body)),
          
          byHeaders: (headers: unknown) => 
            createPredicate((ctx) => 
              ctx.isDetailed && deepMatch((ctx.inputPart as { headers?: unknown }).headers, headers)),
          
          byParamsAndQuery: (params: unknown, query: unknown) => 
            createPredicate((ctx) => 
              ctx.isDetailed && 
              deepMatch(ctx.inputPart.params, params) && 
              deepMatch(ctx.inputPart.query, query)),
          
          custom: createPredicate,
          
          all: () => createPredicate(() => true),
        }
      ) as KeyPredicateBuilder<unknown>;
      
      // Create wrapper function with .key() and .predicate methods
      const keyFnWithBase = Object.assign(
        (...args: unknown[]) => queryKeyFn(...args),
        {
          key: baseKey,
          predicate: predicateBuilder,
        }
      );
      
      keys[key] = keyFnWithBase as ExtractKeys<TRecord>[typeof key];
    }
  }

  return keys;
}

/**
 * Extract the input type from an ORPC endpoint's call/queryOptions function
 *
 * ORPC endpoints can have:
 * - call(input: InputType): Promise<Output>
 * - queryOptions(options: { input: InputType }): QueryOptions
 * - mutationOptions(): MutationOptions (input is separate in useMutation)
 *
 * We extract from the `call` signature which always has the input as first param
 */
export type ExtractMutationInput<TEndpoint> = TEndpoint extends {
  call: (input: infer I) => unknown;
}
  ? I
  : never;

/**
 * Match strategy for cache invalidation with detailed input structures
 */
export type InvalidationMatchStrategy = 
  | 'exact'    // Exact match on all input parts (params, query, body)
  | 'partial'  // Match on specified parts only (default for detailed inputs)
  | 'all';     // Invalidate all queries for this endpoint regardless of input

/**
 * Invalidation scope - determines how broadly to invalidate
 */
export type InvalidationScope = 
  | 'exact'    // Only this specific query key
  | 'all';     // All queries matching the base key

/**
 * Single invalidation entry - can be a query key or a config object
 */
export type InvalidationEntry = 
  | QueryKey
  | {
      queryKey: QueryKey;
      match?: InvalidationMatchStrategy;
      scope?: InvalidationScope;
      predicate?: (cachedKey: readonly unknown[]) => boolean;
    };

/**
 * Configuration for cache invalidation - definition format
 *
 * Maps each mutation endpoint to a function that returns the query keys to invalidate.
 * The function receives a context object with input, keys, and predicate properties.
 */
export type InvalidationConfig<TRecord extends Record<string, unknown>> = {
  [K in keyof TRecord]?: (context: {
    input: ExtractMutationInput<TRecord[K]>;
    keys: ExtractKeys<TRecord>;
    predicate: InvalidationPredicate<ExtractMutationInput<TRecord[K]>>;
  }) => InvalidationEntry[];
};

/**
 * Callable invalidation config - usage format
 *
 * After wrapping with defineInvalidations, each function only needs the input parameter.
 * The keys and predicate are automatically bound. Only includes the keys that were actually defined.
 */
export type CallableInvalidationConfig<
  TRecord extends Record<string, unknown>,
  TConfig extends InvalidationConfig<TRecord>,
> = {
  [K in keyof TConfig as TConfig[K] extends undefined ? never : K]: TConfig[K] extends (context: {
    input: infer I;
    keys: infer Keys;
    predicate: infer Pred;
  }) => InvalidationEntry[]
    ? (input: I) => InvalidationEntry[]
    : never;
};

/**
 * Predicate builder for custom invalidation logic
 */
export interface InvalidationPredicate<TInput = unknown> {
  /**
   * Match on any subset of the input (works for both flat and detailed inputs)
   * @example
   * // Flat input: { id: string, name?: string }
   * predicate.by({ id: input.id }) // matches any query with this id
   * 
   * // Detailed input: { params: { id }, query: { expand } }
   * predicate.by({ params: { id: input.params.id } }) // matches any query with this params.id
   */
  by: (partialInput: Partial<TInput>) => (cachedKey: readonly unknown[]) => boolean;
  
  /**
   * Match on params only (for detailed inputs)
   */
  byParams: (params: TInput extends { params: infer P } ? Partial<P> : never) => (cachedKey: readonly unknown[]) => boolean;
  
  /**
   * Match on query only (for detailed inputs)
   */
  byQuery: (query: TInput extends { query: infer Q } ? Partial<Q> : never) => (cachedKey: readonly unknown[]) => boolean;
  
  /**
   * Match on body only (for detailed inputs)
   */
  byBody: (body: TInput extends { body: infer B } ? Partial<B> : never) => (cachedKey: readonly unknown[]) => boolean;
  
  /**
   * Custom predicate function
   */
  custom: (fn: (cachedKey: readonly unknown[]) => boolean) => (cachedKey: readonly unknown[]) => boolean;
  
  /**
   * Match all queries for this endpoint
   */
  all: () => (cachedKey: readonly unknown[]) => boolean;
}

/**
 * Create a predicate builder for type-safe invalidation predicates
 * 
 * @example
 * ```typescript
 * const userInvalidations = defineInvalidations(userEndpoints, {
 *   update: ({ input, keys, predicate }) => [
 *     {
 *       queryKey: keys.findById.key(),
 *       predicate: predicate.byParams({ id: input.params.id })
 *     },
 *     // Or use all() to invalidate all findById queries
 *     {
 *       queryKey: keys.list.key(),
 *       predicate: predicate.all()
 *     }
 *   ]
 * })
 * ```
 */
export function createInvalidationPredicate<TInput>(): InvalidationPredicate<TInput> {
  return {
    by: (partialInput) => (cachedKey) => {
      const inputPart = cachedKey[cachedKey.length - 1];
      // Works for both flat and detailed inputs
      return deepMatch(inputPart, partialInput);
    },
    
    byParams: (params) => (cachedKey) => {
      const inputPart = cachedKey[cachedKey.length - 1];
      if (!isDetailedInput(inputPart)) return false;
      return deepMatch(inputPart.params, params);
    },
    
    byQuery: (query) => (cachedKey) => {
      const inputPart = cachedKey[cachedKey.length - 1];
      if (!isDetailedInput(inputPart)) return false;
      return deepMatch(inputPart.query, query);
    },
    
    byBody: (body) => (cachedKey) => {
      const inputPart = cachedKey[cachedKey.length - 1];
      if (!isDetailedInput(inputPart)) return false;
      return deepMatch(inputPart.body, body);
    },
    
    custom: (fn) => fn,
    
    all: () => () => true,
  };
}

/**
 * Define cache invalidation configuration for ORPC-compatible endpoints
 *
 * Creates a callable invalidation config where each mutation is mapped to the query keys
 * it should invalidate. The returned config can be used with wrapWithInvalidations or
 * called directly for cross-domain invalidations.
 *
 * @param record - Record of ORPC-compatible endpoints
 * @param config - Invalidation configuration mapping mutations to query keys
 * @returns A callable config where each function only needs the input parameter
 *
 * **Detailed Input Structure Support:**
 *
 * When using `inputStructure: "detailed"` in oRPC contracts, inputs are structured as:
 * `{ params?: {...}, query?: {...}, body?: {...} }`
 *
 * Query keys preserve this structure: `['user', 'find', 'by', 'id', { params: { id: '123' }, query: { expand: true } }]`
 *
 * The invalidation system uses **predicate-based matching** for detailed inputs:
 * - Specify only the parts you care about (e.g., just `params.id`)
 * - Matches ALL queries with those params, regardless of query/body values
 * - Works with any router nesting depth (e.g., `user.find.by.id`)
 *
 * Example:
 * ```typescript
 * // This invalidation spec:
 * keys.getObject({ input: { params: { objectId: '123' } } })
 * 
 * // Will match and invalidate ALL of these cached queries:
 * ['storage', 'getObject', { params: { objectId: '123' }, query: { includeMetadata: true } }] ✅
 * ['storage', 'getObject', { params: { objectId: '123' }, query: { includeMetadata: false } }] ✅
 * ['storage', 'getObject', { params: { objectId: '123' } }] ✅
 * 
 * // But NOT these:
 * ['storage', 'getObject', { params: { objectId: '456' } }] ❌
 * ['storage', 'listObjects', { params: { objectId: '123' } }] ❌ (different endpoint)
 * ```
 *
 * **Invalidation Patterns:**
 *
 * 1. **Same-domain invalidation** - Use keys from the same endpoint record:
 * ```typescript
 * const authInvalidations = defineInvalidations(authEndpoints, {
 *   signIn: ({ input, keys }) => [keys.session()],
 *   signOut: ({ input, keys }) => [keys.session()],
 * })
 * ```
 *
 * **Advanced: Using InvalidationEntry with Match Strategies:**
 *
 * For detailed input structures, you can use InvalidationEntry objects to specify
 * how matching should be performed:
 *
 * ```typescript
 * const storageInvalidations = defineInvalidations(storageEndpoints, {
 *   updateObject: ({ input, keys, predicate }) => [
 *     // Default: Returns QueryKey for exact match
 *     keys.getObject({ input }),
 *     
 *     // Match by params only (ignores query/body)
 *     {
 *       queryKey: keys.getObject.key(),
 *       predicate: predicate.byParams({ objectId: input.params.objectId })
 *     },
 *     
 *     // Match by query only
 *     {
 *       queryKey: keys.listObjects.key(),
 *       predicate: predicate.byQuery({ prefix: input.query?.prefix })
 *     },
 *     
 *     // Invalidate ALL queries for an endpoint
 *     {
 *       queryKey: keys.list.key(),
 *       predicate: predicate.all()
 *     },
 *     
 *     // Custom predicate for complex logic
 *     {
 *       queryKey: keys.search.key(),
 *       predicate: predicate.custom((cachedKey) => {
 *         const cachedInput = cachedKey[cachedKey.length - 1];
 *         return cachedInput?.params?.bucket === input.params.bucket;
 *       })
 *     }
 *   ],
 * })
 * ```
 *
 * 2. **Cross-domain invalidation** - Import and call other domain's invalidation configs:
 * ```typescript
 * import { authInvalidations } from '@/domains/auth/invalidations'
 * import { userInvalidations } from '@/domains/user/invalidations'
import MaybeOptionalOptions from '@tanstack/react-query';
import type { MaybeOptionalOptions from '@orpc/tanstack-query';
 *
 * const organizationInvalidations = defineInvalidations(organizationEndpoints, {
 *   // When creating an org, invalidate user's organization list from auth domain
 *   create: ({ input, keys }) => [
 *     keys.list(),  // Same domain - use keys
 *     authInvalidations.session({}), // Cross-domain - call directly with input (no spread)
 *   ],
 *
 *   // When removing a member, invalidate both org and user domains
 *   removeMember: ({ input, keys }) => [
 *     keys.listMembers({ input: { organizationId: input.organizationId } }),
 *     userInvalidations.findById({ id: input.memberId }), // Cross-domain - direct call
 *   ],
 * })
 * ```
 *
 * 3. **Manual query key invalidation** - Use raw query keys when needed:
 * ```typescript
 * const invitationInvalidations = defineInvalidations(invitationEndpoints, {
 *   accept: ({ input, keys }) => [
 *     keys.accept(),
 *     ['organization'], // Invalidate all organization queries
 *     ['user', input.userId], // Invalidate specific user
 *   ],
 * })
 * ```
 *
 * **Usage in hooks:**
 * ```typescript
 * const enhancedAuth = wrapWithInvalidations(authEndpoints, authInvalidations)
 *
 * export function useSignIn() {
 *   return useMutation(
 *     authEndpoints.signIn.mutationOptions({
 *       onSuccess: enhancedAuth.signIn.withInvalidationOnSuccess((data) => {
 *         toast.success('Signed in!')
 *       })
 *     })
 *   )
 * }
 * ```
 *
 * **Direct usage (for cross-domain invalidations):**
 * ```typescript
 * // Get keys to invalidate
 * const keysToInvalidate = authInvalidations.signIn(inputData)
 *
 * const allKeys = [keys.local(), authInvalidations.session({})]
 * ```
 */
export function defineInvalidations<
  TRecord extends Record<string, unknown>,
  TConfig extends InvalidationConfig<TRecord>,
>(
  record: TRecord,
  config: TConfig,
): CallableInvalidationConfig<TRecord, TConfig> {
  const keys = getKeysRetrieval(record);
  const callableConfig: Record<string, unknown> = {};

  for (const key in config) {
    const invalidationFn = config[key];
    if (invalidationFn) {
      // Bind keys and predicate to the invalidation function so it only needs input
      callableConfig[key] = (input: unknown) => {
        const predicate = createInvalidationPredicate<typeof input>();
        return invalidationFn({ input: input as never, keys, predicate: predicate as never });
      };
    }
  }

  return callableConfig as CallableInvalidationConfig<TRecord, TConfig>;
}

/**
 * Enhanced endpoint with invalidation methods
 */
type EnhancedEndpoint<TEndpoint, TCallableInvalidationFn> = TEndpoint & {
  applyInvalidation: TCallableInvalidationFn extends (input: infer I) => QueryKey[]
    ? (
        queryClient: ReturnType<typeof useQueryClient>,
        input: I,
      ) => Promise<void>
    : never;
  withInvalidationOnSuccess: TEndpoint extends {
    mutationOptions: (...args: never[]) => infer TMutationOptions;
  }
    ? TMutationOptions extends { onSuccess?: infer TOnSuccess }
      ? TOnSuccess extends (...args: never[]) => unknown
        ? (callback?: TOnSuccess) => TOnSuccess
        : never
      : never
    : never;
};

/**
 * Enhanced endpoints record with invalidation methods
 */
type EnhancedEndpoints<
  TRecord extends Record<string, unknown>,
  TCallableInvalidations,
> = {
  [K in keyof TRecord]: K extends keyof TCallableInvalidations
    ? NonNullable<TCallableInvalidations[K]> extends (...args: never[]) => unknown
      ? EnhancedEndpoint<TRecord[K], NonNullable<TCallableInvalidations[K]>>
      : TRecord[K]
    : TRecord[K];
};

/**
 * Wrap endpoints with automatic invalidation methods
 *
 * Enhances each endpoint with:
 * - `applyInvalidation(queryClient, input)`: Manual invalidation call
 * - `withInvalidationOnSuccess(callback?)`: Returns an onSuccess handler with automatic invalidation
 *
 * @param endpoints - Record of ORPC-compatible endpoints
 * @param invalidations - Invalidation configuration
 * @returns Enhanced endpoints with invalidation methods
 *
 * @example
 * ```typescript
 * // Define invalidations
 * const authInvalidations = defineInvalidations(authEndpoints, {
 *   signIn: ({ keys }) => [keys.session()],
 *   signOut: ({ keys }) => [keys.session()],
 * })
 *
 * // Wrap endpoints
 * const enhancedAuth = wrapWithInvalidations(authEndpoints, authInvalidations)
 *
 * // Use with automatic invalidation
 * export function useSignIn() {
 *   return useMutation(
 *     authEndpoints.signIn.mutationOptions({
 *       onSuccess: enhancedAuth.signIn.withInvalidationOnSuccess()
 *     })
 *   )
 * }
 *
 * // Use with custom callback
 * export function useSignIn() {
 *   return useMutation(
 *     authEndpoints.signIn.mutationOptions({
 *       onSuccess: enhancedAuth.signIn.withInvalidationOnSuccess((data, variables) => {
 *         console.log('Sign in successful:', data)
 *       })
 *     })
 *   )
 * }
 *
 * // Manual invalidation (advanced use case)
 * export function useSignIn() {
 *   const queryClient = useQueryClient()
 *   return useMutation(
 *     authEndpoints.signIn.mutationOptions({
 *       onSuccess: (data, input) => {
 *         enhancedAuth.signIn.applyInvalidation(queryClient, input)
 *       }
 *     })
 *   )
 * }
 * ```
 */
export function wrapWithInvalidations<
  TRecord extends Record<string, unknown>,
  TConfig extends InvalidationConfig<TRecord>,
>(
  endpoints: TRecord,
  invalidations: TConfig | CallableInvalidationConfig<TRecord, TConfig>,
): EnhancedEndpoints<TRecord, CallableInvalidationConfig<TRecord, TConfig>> {
  const keys = getKeysRetrieval(endpoints);
  const enhanced: Record<string, unknown> = {};

  for (const endpointName in endpoints) {
    const endpoint = endpoints[endpointName];
    const rawInvalidationFn = (invalidations as Record<string, unknown>)[endpointName];

    if (rawInvalidationFn && typeof rawInvalidationFn === 'function') {
      // Check if this is already a callable (1 param) or raw config (expects { input, keys, predicate })
      // We check the function's toString to see if it destructures the first parameter
      const fnString = rawInvalidationFn.toString();
      const isRawConfig = fnString.includes('input') && (fnString.includes('keys') || fnString.includes('predicate')) && (/\{\s*(input|keys|predicate)/.exec(fnString));
      
      // Create unified invalidation function that takes just input
      const invalidationFn = isRawConfig
        ? (input: unknown) => {
            const predicate = createInvalidationPredicate();
            return (rawInvalidationFn as (context: { input: unknown; keys: ExtractKeys<TRecord>; predicate: InvalidationPredicate }) => InvalidationEntry[])({ input, keys, predicate });
          }
        : (rawInvalidationFn as (input: unknown) => InvalidationEntry[]);

      // Extract input type
      type InputType = Parameters<typeof invalidationFn>[0];

      // Add both invalidation methods
      enhanced[endpointName] = {
        ...(endpoint as object),
        applyInvalidation: async (
          queryClient: ReturnType<typeof useQueryClient>,
          input: unknown,
        ) => {
          const entriesToInvalidate = invalidationFn(input);

          for (const entry of entriesToInvalidate) {
            // Normalize entry to get queryKey and options
            const isConfigObject = typeof entry === 'object' && !Array.isArray(entry) && 'queryKey' in entry;
            const queryKey = (isConfigObject ? (entry as { queryKey: QueryKey }).queryKey : entry) as readonly unknown[];
            const matchStrategy = isConfigObject ? (entry as { match?: InvalidationMatchStrategy }).match : undefined;
            const customPredicate = isConfigObject ? (entry as { predicate?: (key: readonly unknown[]) => boolean }).predicate : undefined;
            const scope = isConfigObject ? (entry as { scope?: InvalidationScope }).scope : undefined;
            
            // If custom predicate is provided, use it directly
            if (customPredicate) {
              await queryClient.invalidateQueries({
                predicate: (query) => customPredicate(query.queryKey)
              });
              continue;
            }
            
            // If scope is 'all', invalidate all queries matching base key (without input)
            if (scope === 'all') {
              const baseKey = queryKey.slice(0, -1);
              await queryClient.invalidateQueries({
                predicate: (query) => {
                  return deepMatch(query.queryKey.slice(0, -1), baseKey);
                }
              });
              continue;
            }
            
            // Input is always the LAST element of the query key
            const inputPart = queryKey[queryKey.length - 1];
            
            // Determine if we should use predicate matching
            const usePredicateMatching = matchStrategy === 'partial' || 
              (matchStrategy !== 'exact' && inputPart && typeof inputPart === 'object' && !Array.isArray(inputPart));
            
            if (usePredicateMatching && inputPart && typeof inputPart === 'object') {
              const baseKey = queryKey.slice(0, -1);
              
              await queryClient.invalidateQueries({
                predicate: (query) => {
                  const cachedKey = query.queryKey;
                  
                  // Check if keys have same depth
                  if (cachedKey.length !== queryKey.length) return false;
                  
                  // Check if base key matches (all elements except last)
                  if (!deepMatch(cachedKey.slice(0, -1), baseKey)) return false;
                  
                  // Match the input part (last element)
                  return matchesInput(cachedKey[cachedKey.length - 1], inputPart);
                }
              });
            } else {
              // For exact match or simple queries, use exact match
              await queryClient.invalidateQueries({ queryKey: queryKey });
            }
          }
        },
        withInvalidationOnSuccess: <
          TData = unknown,
          TError = unknown,
          TOnMutateResult = unknown,
        >(
          callback?: NonNullable<
            MutationOptions<
              TData,
              TError,
              InputType,
              TOnMutateResult
            >["onSuccess"]
          >,
        ): NonNullable<
          MutationOptions<
            TData,
            TError,
            InputType,
            TOnMutateResult
          >["onSuccess"]
        > => {
          return async (data, variables, onMutateResult, context) => {
            // Apply invalidations using queryClient from context
            const entriesToInvalidate = invalidationFn(variables);

            for (const entry of entriesToInvalidate) {
              // Normalize entry to get queryKey and options
              const isConfigObject = typeof entry === 'object' && !Array.isArray(entry) && 'queryKey' in entry;
              const queryKey = (isConfigObject ? (entry as { queryKey: QueryKey }).queryKey : entry) as readonly unknown[];
              const matchStrategy = isConfigObject ? (entry as { match?: InvalidationMatchStrategy }).match : undefined;
              const customPredicate = isConfigObject ? (entry as { predicate?: (key: readonly unknown[]) => boolean }).predicate : undefined;
              const scope = isConfigObject ? (entry as { scope?: InvalidationScope }).scope : undefined;
              
              // If custom predicate is provided, use it directly
              if (customPredicate) {
                await context.client.invalidateQueries({
                  predicate: (query) => customPredicate(query.queryKey)
                });
                continue;
              }
              
              // If scope is 'all', invalidate all queries matching base key (without input)
              if (scope === 'all') {
                const baseKey = queryKey.slice(0, -1);
                await context.client.invalidateQueries({
                  predicate: (query) => {
                    return deepMatch(query.queryKey.slice(0, -1), baseKey);
                  }
                });
                continue;
              }
              
              // Input is always the LAST element of the query key
              const inputPart = queryKey[queryKey.length - 1];
              
              // Determine if we should use predicate matching
              const usePredicateMatching = matchStrategy === 'partial' || 
                (matchStrategy !== 'exact' && inputPart && typeof inputPart === 'object' && !Array.isArray(inputPart));
              
              if (usePredicateMatching && inputPart && typeof inputPart === 'object') {
                const baseKey = queryKey.slice(0, -1);
                
                await context.client.invalidateQueries({
                  predicate: (query) => {
                    const cachedKey = query.queryKey;
                    
                    // Check if keys have same depth
                    if (cachedKey.length !== queryKey.length) return false;
                    
                    // Check if base key matches (all elements except last)
                    if (!deepMatch(cachedKey.slice(0, -1), baseKey)) return false;
                    
                    // Match the input part (last element)
                    return matchesInput(cachedKey[cachedKey.length - 1], inputPart);
                  }
                });
              } else {
                // For exact match or simple queries, use exact match
                await context.client.invalidateQueries({
                  queryKey: queryKey as never,
                });
              }
            }

            // Call user's callback if provided
            if (callback) {
              await callback(data, variables, onMutateResult, context);
            }
          };
        },
      };
    } else {
      // No invalidation configured, pass through as-is
      enhanced[endpointName] = endpoint;
    }
  }

  return enhanced as EnhancedEndpoints<TRecord, CallableInvalidationConfig<TRecord, TConfig>>;
}
