# Builder API Simplification - Implementation Plan

## Overview
Simplify the route builder API by removing boilerplate `.schema()` and `.custom()` wrappers, and improving detailed output handling. Use native Zod methods for schema composition instead of custom builder methods.

## Core Philosophy
**No custom builder methods** - Builders exist ONLY to provide structure. All schema composition uses native Zod methods:
- Input builders: Accept direct schema OR callback receiving raw Zod schema
- Output builders: Accept direct schema OR builder for structured responses OR direct detailed output schema
- NO methods like `.extend()`, `.pick()`, `.omit()` on builders - use Zod's native methods instead

## Quick Reference: Input & Output Patterns

### Input: Three Patterns Available

| Pattern | Syntax | When to Use |
|---------|--------|-------------|
| **1. Direct** | `.input(z.object({ query?, body?, headers? }))` | Static schemas, simple cases |
| **2. Zod-First** | `.input(b => z.object({ query?, body?, headers? }))` | Complex Zod composition, conditionals |
| **3. Builder** | `.input(b => b.query().body().params(...))` | Incremental building, per-field updates |

**Critical**: `params` is NEVER included in the input schema object. Always use `.params()` function separately!

### Output: Two Patterns for Simple, Two for Detailed

| Type | Pattern | Syntax | When to Use |
|------|---------|--------|-------------|
| **Simple** | Direct | `.output(schema)` | Static response schema |
| **Simple** | Callback | `.output(b => schema)` | Dynamic response schema |
| **Detailed** | Zod-First | `.output(b => b.detailed(z.object({ status?, body?, headers? })))` | Complex composition, Zod features |
| **Detailed** | Builder | `.output(b => b.detailed(d => d.body().headers()))` | Multiple status codes, structured API |

**Key Rule**: Input patterns ALL go through `.input()` - NO top-level `.query()`, `.body()`, `.headers()`!

### Real-World Example: All Patterns Together

```ts
// User list endpoint - showing different patterns for input and output

// INPUT PATTERN 1: Direct schema (simple pagination)
export const listUsersV1 = userOps.list()
  .input(z.object({
    query: z.object({
      limit: z.number().optional(),
      offset: z.number().optional()
    })
  }))
  .output(z.object({ users: z.array(userSchema), total: z.number() }))
  .build();

// INPUT PATTERN 2: Zod-first (reuse and compose)
export const listUsersV2 = userOps.list()
  .input(b => z.object({
    query: paginationSchema.extend({
      role: z.enum(['admin', 'user']).optional()
    })
  }))
  .output(b => z.object({ users: z.array(userSchema), total: z.number() }))
  .build();

// INPUT PATTERN 3: Builder methods (incremental)
export const listUsersV3 = userOps.list()
  .input(b => 
    b.query(paginationSchema)
     .headers(z.object({ 'x-api-key': z.string() }))
  )
  .output(b => z.object({ users: z.array(userSchema), total: z.number() }))
  .build();

// OUTPUT PATTERN: Detailed with multiple status codes
export const getUserById = userOps.get()
  .params(p => p`/users/${p('id', z.string())}`)
  .input(z.object({}))  // No input needed
  // Output Pattern 1: Zod-first detailed
  .output(b => b.detailed(z.union([
    z.object({ status: z.literal(200), body: userSchema }),
    z.object({ status: z.literal(404), body: errorSchema })
  ])))
  .build();

// OR Output Pattern 2: Builder methods
export const getUserByIdAlt = userOps.get()
  .params(p => p`/users/${p('id', z.string())}`)
  .input(z.object({}))
  .output(b => b.detailed(d => [
    d.body(userSchema).headers({ 'x-cache': z.string() }),  // 200 (inferred)
    d.body(errorSchema).status(404)
  ]))
  .build();
```

## Detailed Output: Two Patterns

The `.detailed()` method supports **TWO distinct patterns** that achieve the same result:

### Pattern 1: Zod-First (Direct Schema)
Work directly with Zod schemas - maximum flexibility using Zod's full API.

**Usage**:
```ts
// Direct schema - status optional (defaults to 200)
.output(b => b.detailed(z.object({
  body: successSchema,
  headers: z.object({ 'x-custom': z.string() })
})))

// Direct schema - explicit status
.output(b => b.detailed(z.object({
  status: z.literal(201),
  body: createdSchema
})))

// Union - status optional in each variant (first defaults to 200)
.output(b => b.detailed(z.union([
  z.object({ body: successSchema }),  // defaults to 200
  z.object({ status: z.literal(404), body: errorSchema })
])))

// Callback returning schema - same constraints
.output(b => b.detailed(d => z.object({ body: schema })))  // status defaults to 200
.output(b => b.detailed(d => z.union([...])))  // status optional, first defaults to 200
```

**Rules**:
- Schema shape: `{ status?, body?, headers? }` (all optional)
- `status`: Optional (defaults to 200) in single schema
- `status`: Optional (first variant defaults to 200, others should specify via `z.literal()`) in union variants
- Full access to Zod's native methods: `.extend()`, `.merge()`, `.pick()`, `.omit()`, etc.

### Pattern 2: Builder Methods
Use structured builder API - clearer intent for multiple status codes.

**Usage**:
```ts
// Single response - implicit 200 status
.output(b => b.detailed(d => d.body(schema).headers(headers)))

// Multiple responses - array of builders with status codes
.output(b => b.detailed(d => [
  d.body(successSchema),                        // Inferred as 200
  d.body(errorSchema).status(404),
  d.body(serverError).status(500)
]))

// Access previously defined responses via get()
.output(b => b.detailed(d => [
  d.get(200),                                   // Get existing 200 response
  d.body(createdSchema).status(201)
  d.get(404)
]))
```

**Rules**:
- Single builder: Status automatically set to 200
- Object of builders: Status from object keys (must be numbers)
- Builder methods: `.body(schema)`, `.headers(headers)`
- Response registry: `.get(statusCode)`, `.getAll()`

### Pattern Comparison

| Aspect | Pattern 1: Zod-First | Pattern 2: Builder Methods |
|--------|---------------------|---------------------------|
| **Syntax** | Direct schema or callback returning schema | Callback using builder API |
| **Status** | Optional (default 200) OR required in unions | Defaults to 200 unless `.status(code)` called |
| **Use Case** | Maximum flexibility, use Zod's full API | Clear structure, multiple status codes |
| **Flexibility** | Full Zod API available | Limited to `.body()` and `.headers()` |
| **Type Safety** | Zod schema validation | Builder type checking |
| **Multiple Responses** | Union of schemas | Array of builders (status via `.status()` or defaults to 200) |
| **Result** | Both produce **identical** runtime output | Both produce **identical** runtime output |

**Choose Pattern 1 when**:
- You need Zod's advanced features (`.refine()`, `.transform()`, `.superRefine()`)
- Working with existing Zod schemas
- Prefer functional composition

**Choose Pattern 2 when**:
- Defining multiple status code responses
- Want clear, structured API
- Prefer method chaining

## Input API: Three Patterns

The `.input()` method supports **THREE distinct patterns**:

### Pattern 1: Direct Schema (Full Input Object)
Provide a complete input schema with all optional fields.

**Usage**:
```ts
// Complete input object - query, body, headers (NO params!)
.input(z.object({
  query: z.object({ limit: z.number() }),
  body: z.object({ name: z.string() }),
  headers: z.object({ 'x-api-key': z.string() })
}))

// Params must be defined separately via .params()
.params(p => p`/users/${p('id', z.string())}`)

// Only body (most common)
.input(z.object({
  body: z.object({ name: z.string() })
}))

// Query and body
.input(z.object({
  query: z.object({ filter: z.string() }),
  body: userCreateSchema
}))
```

**Rules**:
- Schema shape: `{ query?, body?, headers? }` (all optional) - **NEVER include `params`**
- **Params**: Use `.params()` function at top-level OR inside `.input(b => b.params())`
- Must be a complete input definition in one object
- No partial updates - defines entire input structure
- Best for: Simple, static input schemas

### Pattern 2: Callback Returning Schema (Zod-First)
Use a callback that returns a complete Zod input schema - access to full Zod API.

**Usage**:
```ts
// Callback returning complete schema
.input(b => z.object({
  query: z.object({ limit: z.number() }),
  body: userSchema
}))

// With Zod composition methods
.input(b => z.object({
  body: baseUserSchema.extend({ verified: z.boolean() })
}))

// Conditional schemas
.input(b => z.union([
  z.object({ body: createSchema }),
  z.object({ body: updateSchema })
]))
```

**Rules**:
- Callback receives builder `b` (can ignore it)
- Must return Zod schema with shape `{ query?, body?, headers? }` - **NEVER include `params`**
- **Params**: Use `.params()` function at top-level OR inside `.input(b => b.params())`
- Full access to Zod's API: `.extend()`, `.merge()`, `.union()`, etc.
- Best for: Dynamic schemas, composition, Zod-heavy logic

### Pattern 3: Builder Methods (Structured API)
Use builder methods to configure input parts incrementally.

**Usage**:
```ts
// Single part
.input(b => b.body(userSchema))

// Multiple parts
.input(b => 
  b.query(z.object({ limit: z.number() }))
   .body(userSchema)
   .headers(z.object({ 'x-api-key': z.string() }))
)

// With params (path parameters)
.input(b => 
  b.params(p => p`/${p('id', z.string())}`)
   .body(updateSchema)
)

// With composition using callbacks on each part
.input(b => 
  b.query(currentQuery => currentQuery.extend({ limit: z.number() }))
   .body(currentBody => currentBody.omit({ password: true }))
)
```

**Rules**:
- Use `.query()`, `.body()`, `.headers()`, `.params()` methods
- **Params**: Can ONLY be set via `.params()` method (NOT in schema object)
- Each method accepts: direct schema OR callback with current schema
- Callbacks receive raw Zod schemas - use native Zod methods
- Best for: Incremental configuration, modifying existing schemas

### Pattern Comparison

| Aspect | Pattern 1: Direct | Pattern 2: Callback Zod | Pattern 3: Builder Methods |
|--------|------------------|------------------------|---------------------------|
| **Syntax** | `.input(z.object({}))` | `.input(b => z.object({}))` | `.input(b => b.query().body())` |
| **Scope** | Complete input object | Complete input object | Partial (per-field) |
| **Zod API** | Full access | Full access | Via callbacks per field |
| **Composition** | Direct in schema | In returned schema | Per-method callbacks |
| **Use Case** | Static, simple schemas | Dynamic, Zod-heavy | Incremental, modular |
| **Type Safety** | Zod validation | Zod validation | Builder + Zod validation |
| **Best For** | Single definition | Complex composition | Step-by-step building |

**Choose Pattern 1 when**:
- Static input schema defined upfront
- No need for incremental configuration
- Simple, straightforward schemas

**Choose Pattern 2 when**:
- Need Zod's advanced features throughout
- Dynamic or conditional schemas
- Heavy schema composition

**Choose Pattern 3 when**:
- Building input incrementally
- Modifying existing schemas per field
- Clear separation of concerns (query vs body vs headers)

### Input Patterns Side-by-Side Comparison

Here's a complete example showing the same input configuration using all three patterns:

```ts
// GOAL: Define input with query params (limit, offset) and body (user data)

// ============= PATTERN 1: Direct Schema =============
.input(z.object({
  query: z.object({
    limit: z.number().min(1).max(100).optional(),
    offset: z.number().min(0).optional()
  }),
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    age: z.number().min(18)
  })
}))

// ============= PATTERN 2: Callback Returning Zod =============
.input(b => z.object({
  query: z.object({
    limit: z.number().min(1).max(100).optional(),
    offset: z.number().min(0).optional()
  }),
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    age: z.number().min(18)
  })
}))

// With composition
.input(b => z.object({
  query: paginationSchema,  // Reuse existing schema
  body: userBaseSchema.extend({
    age: z.number().min(18)
  })
}))

// ============= PATTERN 3: Builder Methods =============
.input(b => 
  b.query(z.object({
      limit: z.number().min(1).max(100).optional(),
      offset: z.number().min(0).optional()
    })
   .body(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().min(18)
    }))
)

// With composition callbacks
.input(b => 
  b.query(paginationSchema)  // Direct schema
   .body(currentBody => 
     currentBody.extend({ age: z.number().min(18) })  // Zod method
   )
)
```

**All three patterns produce the exact same runtime schema!**

**Note on Path Parameters**: If your route has path parameters (like `/users/:id`), define them using `.params()` separately:
```ts
// BEFORE any input configuration
.params(p => p`/users/${p('id', z.string())}`)
.input(z.object({ body: userUpdateSchema }))

// OR inside Pattern 3 builder
.input(b => 
  b.params(p => p`/users/${p('id', z.string())}`)
   .body(userUpdateSchema)
)
```

**Never include `params` in the input schema object!**

### Critical Rules for Input Configuration

#### Rule 1: No Top-Level Input Methods (Except Params)

❌ **WRONG** - These methods do NOT exist on RouteBuilder:
```ts
.query(z.object({ limit: z.number() }))        // ❌ Does not exist!
.body(userSchema)                               // ❌ Does not exist!
.headers(z.object({}))                          // ❌ Does not exist!
```

✅ **CORRECT** - ALL input configuration goes through `.input()`:
```ts
// Pattern 1: Direct
.input(z.object({ query: z.object({ limit: z.number() }) }))

// Pattern 2: Callback returning schema
.input(b => z.object({ body: userSchema }))

// Pattern 3: Builder methods
.input(b => b.query(z.object({ limit: z.number() })))
.input(b => b.body(userSchema))
```

#### Rule 2: Params are NEVER in Input Schema

❌ **WRONG** - Do NOT include `params` in input schema:
```ts
.input(z.object({
  params: z.object({ id: z.string() }),  // ❌ WRONG!
  body: userSchema
}))

.input(b => z.object({
  params: z.object({ id: z.string() }),  // ❌ WRONG!
  body: userSchema
}))
```

✅ **CORRECT** - Use `.params()` function separately:
```ts
// Option 1: Top-level .params() (recommended)
.params(p => p`/users/${p('id', z.string())}`)
.input(z.object({ body: userSchema }))

// Option 2: .params() object syntax (top-level)
.params({ id: z.string().uuid() })
.input(z.object({ body: userSchema }))

// Option 3: Inside input builder (Pattern 3 only)
.input(b => 
  b.params(p => p`/users/${p('id', z.string())}`)
   .body(userSchema)
)
```

**Why?** Path parameters have special syntax (template literals) and validation rules that differ from query/body/headers. They must be configured via the dedicated `.params()` method.

## API Patterns Summary

**Critical Rules**:

### Output API  
✅ **Simple output** - Direct on RouteBuilder:
```ts
.output(successSchema)                          // ✅ Direct schema
.output(b => successSchema)                     // ✅ Builder callback returning schema
```

✅ **Detailed output** - Via builder's `.detailed()` with TWO patterns:
```ts
// PATTERN 1: Zod-first (direct schema or callback returning schema)
.output(b => b.detailed(z.object({              // ✅ Direct Zod schema (status optional)
  body: successSchema,
  headers: z.object({})
})))  // status defaults to 200

.output(b => b.detailed(z.union([               // ✅ Zod union (status optional, first defaults to 200)
  z.object({ body: successSchema }),             // defaults to 200
  z.object({ status: z.literal(404), body: errorSchema })
])))

.output(b => b.detailed(d => z.object({         // ✅ Callback returning Zod schema
  body: successSchema
})))  // status defaults to 200

// PATTERN 2: Builder methods (callback using builder API)
.output(b => b.detailed(d => d.body(schema)))   // ✅ Single builder (no .status() → defaults to 200)
.output(b => b.detailed(d => d.body(schema).status(404)))   // ✅ Single builder with explicit status
.output(b => b.detailed(d => [                 // ✅ Array of builders
  d.body(successSchema),                        // No .status() → defaults to 200
  d.body(errorSchema).status(404)               // Explicit .status(404)
]))
```

## Current vs Proposed API

### 1. Input/Output Direct Schema Support

#### Current (Verbose)
```ts
.input(b => b.body(b => b.schema(() => z.object({ name: z.string() }))))
.output(b => b.custom(() => z.object({ id: z.string() })))
```

#### Proposed (Clean)
```ts
// Input - direct schema (query/body/headers only - NO params)
.input(z.object({
  query: z.object({ limit: z.number() }),
  body: z.object({ name: z.string() }),
  headers: z.object({})
}))

// Params - MUST use .params() separately (NOT in input schema)
.params(p => p`/${p('id', z.string())}`)
.params({ id: z.string().uuid() })

// Input - builder (NO top-level .query()/.body()! Always use .input(b => ...))
.input(b => b.body(z.object({ name: z.string() })))
.input(b => b.query(currentQuery => currentQuery.extend({ limit: z.number() })))  // Native Zod!

// Input - builder with params (Pattern 3 only)
.input(b => 
  b.params(p => p`/${p('id', z.string())}`)
   .body(z.object({ name: z.string() }))
)

// Output - simple
.output(z.object({ id: z.string() }))
.output(b => z.object({ id: z.string() }))  // Builder callback returning schema
```

**Implementation**: Overload all builder methods to accept EITHER:
- **Direct schema**: `z.ZodType`
- **Callback with current schema**: `(currentSchema: z.ZodType) => z.ZodType`
  - Callback receives the **actual Zod schema object** (not a builder)
  - Use **native Zod methods**: `.extend()`, `.omit()`, `.pick()`, `.partial()`, `.merge()`, `.and()`, `.or()`, `.refine()`, `.transform()`, etc.
  - **Builder has NO composition methods** - all composition happens via Zod

---

### 2. Detailed Output Simplification

#### Current (Nested Callbacks)
```ts
.output(b => b.detailed(d =>
  d.union(v => [
    v().status(200).body(schema1),
    v().status(404).body(schema2),
  ])
))
```

#### Proposed (Flexible Output Options)
```ts
// Simple output - direct schema
.output(successSchema)

// Simple output - builder callback returning schema
.output(b => successSchema)

// ===== PATTERN 1: Detailed output - Zod-first (no builder) =====

// Direct Zod schema with optional status (defaults to 200)
.output(b => b.detailed(z.object({
  body: successSchema,
  headers: z.object({ 'x-total': z.number() })
})))  // status defaults to 200

// Direct Zod schema with explicit status
.output(b => b.detailed(z.object({
  status: z.literal(201),
  body: createdSchema
})))  // headers optional

// Union of Zod schemas - status optional in each variant (first defaults to 200)
.output(b => b.detailed(z.union([
  z.object({ body: successSchema }),             // defaults to 200
  z.object({ status: z.literal(404), body: errorSchema })
])))

// Callback returning Zod schema (same constraints as direct)
.output(b => b.detailed(d => z.object({ 
  body: successSchema,
  headers: z.object({ 'x-custom': z.string() })
})))  // status defaults to 200

// Callback returning Zod union - status optional in each variant (first defaults to 200)
.output(b => b.detailed(d => z.union([
  z.object({ body: successSchema }),             // defaults to 200
  z.object({ status: z.literal(404), body: errorSchema })
])))

// ===== PATTERN 2: Detailed output - Builder methods =====

// Builder callback - single response (implicit 200 status)
.output(b => b.detailed(d => d.body(schema).headers(headers)))

// Builder callback - array of responses
.output(b => b.detailed(d => [
  d.body(successSchema).headers(successHeaders),  // No .status() → defaults to 200
  d.body(notFoundSchema).status(404),             // Explicit .status(404)
  d.body(errorSchema).status(500)                 // Explicit .status(500)
]))

// Builder callback - access previously defined responses
.output(b => b.detailed(d => {
  const success200 = d.get(200);  // Get ZodUnion of all 200 variants
  const allStatuses = d.getAll();  // Get all: { 200: ZodUnion, 404: ZodUnion, ... }
  return [
    d.body(successSchema),  // No .status() → defaults to 200
    d.body(createdSchema).status(201)
  ];
}))
```

**Implementation**:

**For simple outputs** (no detailed response structure):
- `.output(schema)` - Direct Zod schema
- `.output(b => schema)` - Builder callback returning schema

**For detailed outputs** (with status, body, headers) - ONLY via `.output(b => b.detailed(...))`:

**`.detailed()` supports TWO patterns that achieve the same result:**

**PATTERN 1: Zod-first** (no builder - work directly with Zod schemas):
  1. **Direct Zod schema** with shape `{ status?, body?, headers? }`:
     - `status` is **optional** - defaults to 200 if omitted
     - `body?` and `headers?` are **optional**
     - Example: `b.detailed(z.object({ body: schema }))` → status defaults to 200
     - Example: `b.detailed(z.object({ status: z.literal(201), body: schema }))`
  
  2. **Union of Zod schemas** - each variant MUST have `status` as **required**:
     - `status` is **required** in unions to distinguish variants
     - Example: `b.detailed(z.union([z.object({ status: z.literal(200), body }), z.object({ status: z.literal(404), body })]))`
  
  3. **Callback returning Zod schema** - same constraints as direct schema:
     - Return single schema: status optional (defaults to 200)
     - Return union: status required in each variant
     - Example: `b.detailed(d => z.object({ body: schema }))` → status defaults to 200
     - Example: `b.detailed(d => z.union([...]))` → status required in each variant

**PATTERN 2: Builder methods** (use builder API for structured responses):
  4. **Builder callback returning single builder** - implicit 200:
     - Use `.body()` and `.headers()` methods
     - Example: `b.detailed(d => d.body(schema).headers(headers))`
     - Status automatically set to 200
  
  5. **Builder callback returning array of builders**:
     - Array of DetailedOutputBuilder instances
     - Builders without `.status()` default to 200, others use explicit `.status(code)`
     - Multiple builders can share the same status (creates union variants)
     - Example: `b.detailed(d => [d.body(success), d.body(error).status(404)])`
  
  6. **Access previously defined responses**:
     - Use `d.get(statusCode)` to retrieve ZodUnion of all variants for that status
     - Access via `d.getAll()` returns all status → ZodUnion mappings
     - Build new responses based on retrieved schemas
     - Example: `d.get(200)` returns ZodUnion of all 200 response variants

**Key Differences**:
- **Pattern 1 (Zod-first)**: Work with raw Zod schemas directly - more flexible, use Zod's full API
- **Pattern 2 (Builder methods)**: Use structured builder API - clearer intent, better for multiple status codes
- **Both patterns produce identical runtime output** - choose based on preference and use case

**For input**:
- **NO top-level `.query()`, `.body()`, `.headers()`** - always use `.input(b => b.query())`
- **NO `params` in input schema** - use `.params()` function (top-level or in builder)
- `.input(schema)` - Direct input schema: `z.object({ query?: ..., body?: ..., headers?: ... })`
  - All fields (`query?`, `body?`, `headers?`) are optional
  - **NEVER include `params`** - use `.params()` separately
- `.input(b => b.query().body())` - Builder callback for partial input configuration

**For params**:
- **MUST use `.params()` function** - NEVER include in input schema object
- **Top-level `.params()`** - available directly on RouteBuilder (recommended)
- **Inside builder**: `.input(b => b.params())` - only in Pattern 3
- `.params(p => p\`/\${p('id', z.string())}\`)` - Template literal
- `.params({ id: z.string() })` - Type overrides

---

## Implementation Steps

### Step 1: Update Type Signatures

**Key Principle**: Accept EITHER direct schema OR callback that receives the **current raw Zod schema**.

```ts
// route-builder.ts

class RouteBuilder {
  // Input: THREE patterns supported
  
  // PATTERN 1: Direct schema (query/body/headers only - NO params)
  input(schema: z.ZodObject<{ query?: z.ZodType, body?: z.ZodType, headers?: z.ZodType }>): RouteBuilder
  
  // PATTERN 2: Callback returning Zod schema (Zod-first, NO params in returned schema)
  input(callback: (builder: DetailedInputBuilder) => z.ZodType<{ query?: z.ZodType, body?: z.ZodType, headers?: z.ZodType }>): RouteBuilder
  
  // PATTERN 3: Builder methods (callback returning builder)
  input(callback: (builder: DetailedInputBuilder) => DetailedInputBuilder): RouteBuilder
  
  // Params: MUST use these methods (NEVER in input schema)
  // Can be used at top-level OR inside .input(b => b.params())
  params(templateFn: (p: PathParamBuilder) => PathResult): RouteBuilder
  params(overrides: Record<string, z.ZodType>): RouteBuilder
  
  // Output: simple schema OR builder callback
  output(schema: z.ZodType): RouteBuilder  // Simple schema
  output(callback: (builder: OutputBuilder) => z.ZodType | OutputBuilder): RouteBuilder  // Can return schema or use .detailed()
}

class OutputBuilder {
  // .detailed() supports TWO patterns that achieve the same result:
  
  // PATTERN 1: Zod-first (no builder) - accepts schema directly or callback returning schema
  // Direct schema with optional status (defaults to 200)
  detailed(schema: z.ZodObject<{ status?: z.ZodType, body?: z.ZodType, headers?: z.ZodType }>): OutputBuilder
  // Union of schemas - status REQUIRED in each variant to distinguish responses
  detailed(schema: z.ZodUnion<[z.ZodObject<{ status: z.ZodType, body?: z.ZodType, headers?: z.ZodType }>, ...z.ZodObject<{ status: z.ZodType }>]>): OutputBuilder
  // Callback returning Zod schema (same constraints: status optional OR union with required status)
  detailed(callback: (d: undefined) => z.ZodObject<{ status?: z.ZodType, body?: z.ZodType, headers?: z.ZodType }> | z.ZodUnion): OutputBuilder
  
  // PATTERN 2: Builder methods - callback using builder API
  // Single response using builder methods (defaults to 200 if no .status())
  detailed(callback: (d: DetailedOutputBuilder) => DetailedOutputBuilder): OutputBuilder
  // Multiple responses as array (each defaults to 200 unless .status() is called)
  detailed(callback: (d: DetailedOutputBuilder) => DetailedOutputBuilder[]): OutputBuilder
}

class DetailedInputBuilder<TParams, TQuery, TBody, THeaders> {
  // Params: same implementation as RouteBuilder.params() (shared)
  params(templateFn: (p: PathParamBuilder) => PathResult): DetailedInputBuilder
  params(overrides: Record<string, z.ZodType>): DetailedInputBuilder
  
  // Query/Body/Headers: direct schema OR callback with current Zod schema
  // NO top-level .query()/.body()/.headers() - always use .input(b => b.query())
  query<TNewQuery extends z.ZodType>(schema: TNewQuery): DetailedInputBuilder<TParams, TNewQuery, TBody, THeaders>
  query<TNewQuery extends z.ZodType>(callback: (currentZodSchema: TQuery) => TNewQuery): DetailedInputBuilder<TParams, TNewQuery, TBody, THeaders>
  
  body<TNewBody extends z.ZodType>(schema: TNewBody): DetailedInputBuilder<TParams, TQuery, TNewBody, THeaders>
  body<TNewBody extends z.ZodType>(callback: (currentZodSchema: TBody) => TNewBody): DetailedInputBuilder<TParams, TQuery, TNewBody, THeaders>
  
  headers<TNewHeaders extends z.ZodType>(schema: TNewHeaders): DetailedInputBuilder<TParams, TQuery, TBody, TNewHeaders>
  headers<TNewHeaders extends z.ZodType>(callback: (currentZodSchema: THeaders) => TNewHeaders): DetailedInputBuilder<TParams, TQuery, TBody, TNewHeaders>
  
  // NO .extend(), .pick(), .omit(), .partial() etc. methods on builder!
  // Use callbacks with Zod's native methods instead:
  // .input(b => b.body(currentBody => currentBody.omit({ password: true })))
}

class DetailedOutputBuilder<TInitialBody, TResultBody, TResultHeaders> {
  // Direct schema OR callback with current Zod schema (NO builder methods!)
  body<TNewBody extends z.ZodType>(schema: TNewBody): DetailedOutputBuilder<TInitialBody, TNewBody, TResultHeaders>
  body<TNewBody extends z.ZodType>(callback: (currentZodSchema: TInitialBody | TResultBody) => TNewBody): DetailedOutputBuilder<TInitialBody, TNewBody, TResultHeaders>
  
  headers<TNewHeaders extends z.ZodRawShape>(headers: TNewHeaders): DetailedOutputBuilder<TInitialBody, TResultBody, TNewHeaders>
  headers<TNewHeaders extends z.ZodRawShape>(callback: (currentZodSchema: z.ZodObject<TResultHeaders>) => z.ZodObject<TNewHeaders>): DetailedOutputBuilder<TInitialBody, TResultBody, TNewHeaders>
  
  // Access previously defined responses from detailed builder context
  // Returns ZodUnion of all registered variants for the given status code
  get(statusCode: number): z.ZodUnion<z.ZodType[]> | undefined
  // Returns record mapping status codes to their ZodUnion of variants
  getAll(): Record<number, z.ZodUnion<z.ZodType[]>>
  
  // NO .extend(), .pick(), .omit() etc. methods on builder!
  // Use callbacks with Zod's native methods instead:
  // .body(currentBody => currentBody.omit({ internal: true }))
  // .headers(currentHeaders => currentHeaders.extend({ 'x-custom': z.string() }))
}
```

**Critical**: 
- Callbacks receive the **actual Zod schema object**, not a builder
- `get(statusCode)` returns the **ZodUnion of all variants** for that status, not a builder
- Multiple response variants can share the same status code

---

### Step 1.5: Implement RouteBuilder.input() Pattern Detection

The `.input()` method must support THREE distinct patterns:

```ts
class RouteBuilder {
  // Overload 1: Direct schema (Pattern 1) - NO params in schema
  input(schema: z.ZodObject<{ query?: z.ZodType, body?: z.ZodType, headers?: z.ZodType }>): this;
  
  // Overload 2: Callback returning Zod schema (Pattern 2 - Zod-first) - NO params in returned schema
  input(callback: (builder: DetailedInputBuilder) => z.ZodType): this;
  
  // Overload 3: Callback returning builder (Pattern 3 - Builder methods)
  input(callback: (builder: DetailedInputBuilder) => DetailedInputBuilder): this;
  
  // Implementation
  input(
    schemaOrCallback: 
      | z.ZodType
      | ((builder: DetailedInputBuilder) => z.ZodType | DetailedInputBuilder)
  ): this {
    // PATTERN 1: Direct schema (must NOT contain params)
    if (typeof schemaOrCallback !== 'function') {
      // Direct Zod schema - validate it has input shape (query/body/headers only)
      this._inputSchema = schemaOrCallback;
      return this;
    }
    
    // It's a callback - create builder and call
    const callback = schemaOrCallback;
    const builder = new DetailedInputBuilder(
      this._params,
      this._query,
      this._body,
      this._headers
    );
    
    const result = callback(builder);
    
    // Determine which pattern by checking result type
    if (result instanceof DetailedInputBuilder) {
      // PATTERN 3: Builder methods - returned builder instance
      // Build final schema from builder state
      this._inputSchema = result._buildInputSchema();
      return this;
    }
    
    // PATTERN 2: Zod-first - returned Zod schema
    // Check if result is a Zod schema (has _def property)
    if (result && typeof result === 'object' && '_def' in result) {
      this._inputSchema = result;
      return this;
    }
    
    throw new Error('Input callback must return either a Zod schema or DetailedInputBuilder');
  }
}
```

**Pattern Detection Logic**:
1. If `schemaOrCallback` is not a function → **Pattern 1** (direct schema)
2. Call callback with builder and check result:
   - If result is `DetailedInputBuilder` instance → **Pattern 3** (builder methods)
   - If result has `_def` property (Zod schema) → **Pattern 2** (Zod-first)
   - Otherwise → Error

**Type Safety**:
- TypeScript overloads ensure correct return type inference
- Pattern 1: Schema validated at compile-time
- Pattern 2: Return type checked against input shape constraint
- Pattern 3: Builder methods enforce valid schema construction

**Implementation Notes**:
- **Builder State**: DetailedInputBuilder tracks params/query/body/headers separately
- **Schema Building**: Pattern 3 calls `_buildInputSchema()` to construct final schema
- **Duck Typing**: Zod schemas identified by `_def` property
- **Performance**: Pattern 1 (direct) is fastest (no callback/builder overhead)

---

### Step 2: Update DetailedInputBuilder Overloads

```ts
class DetailedInputBuilder {
  // Query overloads
  query<TNewQuery extends z.ZodType>(schema: TNewQuery): DetailedInputBuilder<TParams, TNewQuery, TBody, THeaders>;
  query<TNewQuery extends z.ZodType>(
    callback: (currentQuery: TQuery) => TNewQuery
  ): DetailedInputBuilder<TParams, TNewQuery, TBody, THeaders>;
  query<TNewQuery extends z.ZodType>(
    schemaOrCallback: TNewQuery | ((current: TQuery) => TNewQuery)
  ): DetailedInputBuilder<TParams, TNewQuery, TBody, THeaders> {
    if (typeof schemaOrCallback === 'function') {
      // Pass current schema to callback
      const newSchema = schemaOrCallback(this.$query);
      return new DetailedInputBuilder(this.$params, newSchema, this.$body, this.$headers, this.$entitySchema, this._pendingPath);
    }
    // Direct schema
    return new DetailedInputBuilder(this.$params, schemaOrCallback, this.$body, this.$headers, this.$entitySchema, this._pendingPath);
  }
  
  // Body overloads
  body<TNewBody extends z.ZodType>(schema: TNewBody): DetailedInputBuilder<TParams, TQuery, TNewBody, THeaders>;
  body<TNewBody extends z.ZodType>(
    callback: (currentBody: TBody) => TNewBody
  ): DetailedInputBuilder<TParams, TQuery, TNewBody, THeaders>;
  body<TNewBody extends z.ZodType>(
    schemaOrCallback: TNewBody | ((current: TBody) => TNewBody)
  ): DetailedInputBuilder<TParams, TQuery, TNewBody, THeaders> {
    if (typeof schemaOrCallback === 'function') {
      const newSchema = schemaOrCallback(this.$body);
      return new DetailedInputBuilder(this.$params, this.$query, newSchema, this.$headers, this.$entitySchema, this._pendingPath);
    }
    return new DetailedInputBuilder(this.$params, this.$query, schemaOrCallback, this.$headers, this.$entitySchema, this._pendingPath);
  }
  
  // Headers - same pattern
  headers<TNewHeaders extends z.ZodType>(schema: TNewHeaders): DetailedInputBuilder<TParams, TQuery, TBody, TNewHeaders>;
  headers<TNewHeaders extends z.ZodType>(
    callback: (currentHeaders: THeaders) => TNewHeaders
  ): DetailedInputBuilder<TParams, TQuery, TBody, TNewHeaders>;
  headers<TNewHeaders extends z.ZodType>(
    schemaOrCallback: TNewHeaders | ((current: THeaders) => TNewHeaders)
  ): DetailedInputBuilder<TParams, TQuery, TBody, TNewHeaders> {
    if (typeof schemaOrCallback === 'function') {
      const newSchema = schemaOrCallback(this.$headers);
      return new DetailedInputBuilder(this.$params, this.$query, this.$body, newSchema, this.$entitySchema, this._pendingPath);
    }
    return new DetailedInputBuilder(this.$params, this.$query, this.$body, schemaOrCallback, this.$entitySchema, this._pendingPath);
  }
}
```

---

### Step 3: Update OutputBuilder.detailed() to Support Both Patterns

The `.detailed()` method must support TWO distinct patterns that achieve the same result:
- **Pattern 1**: Zod-first (direct schema or callback returning schema)
- **Pattern 2**: Builder methods (callback using builder API)

```ts
class DetailedOutputBuilder {
  // Internal registry: status code → array of builder variants for that status
  // Multiple builders can have the same status (union variants)
  private _statusBuilders: Map<number, DetailedOutputBuilder[]> = new Map();
  private _body?: z.ZodType;
  private _headers?: z.ZodRawShape;
  
  // Body overloads: direct schema OR callback with current body
  body<TNewBody extends z.ZodType>(schema: TNewBody): this;
  body<TNewBody extends z.ZodType>(callback: (currentBody: z.ZodType) => TNewBody): this;
  body<TNewBody extends z.ZodType>(
    schemaOrCallback: TNewBody | ((current: z.ZodType) => TNewBody)
  ): this {
    if (typeof schemaOrCallback === 'function') {
      const currentBody = this._body ?? this._initialBody;
      this._body = schemaOrCallback(currentBody);
    } else {
      this._body = schemaOrCallback;
    }
    return this;
  }
  
  // Headers overloads: direct schema OR callback with current headers
  headers<TNewHeaders extends z.ZodRawShape>(headers: TNewHeaders): this;
  headers<TNewHeaders extends z.ZodRawShape>(
    callback: (currentHeaders: z.ZodObject<z.ZodRawShape>) => z.ZodObject<TNewHeaders>
  ): this;
  headers<TNewHeaders extends z.ZodRawShape>(
    headersOrCallback: TNewHeaders | ((current: z.ZodObject<z.ZodRawShape>) => z.ZodObject<TNewHeaders>)
  ): this {
    if (typeof headersOrCallback === 'function') {
      const currentHeaders = this._headers ? z.object(this._headers) : z.object({});
      const result = headersOrCallback(currentHeaders);
      this._headers = result.shape as TNewHeaders;
    } else {
      this._headers = headersOrCallback;
    }
    return this;
  }
  
  // Get a previously defined response by status code
  // Returns ZodUnion of all builders registered for that status
  get(statusCode: number): z.ZodUnion<z.ZodType[]> | undefined {
    const builders = this._statusBuilders.get(statusCode);
    if (!builders) return undefined;
    // Return union of all variants for this status
    return z.union(builders.map(b => b._buildWithStatus(statusCode)));
  }
  
  // Get all previously defined responses
  // Returns record mapping status codes to ZodUnion of their variants
  getAll(): Record<number, z.ZodUnion<z.ZodType[]>> {
    const result: Record<number, z.ZodUnion<z.ZodType[]>> = {};
    for (const [status, builders] of this._statusBuilders.entries()) {
      result[status] = z.union(builders.map(b => b._buildWithStatus(status)));
    }
    return result;
  }
  
  // Internal: Register a builder with its status code
  // Multiple builders can share the same status (creating union variants)
  _register(statusCode: number, builder: DetailedOutputBuilder): void {
    if (!this._statusBuilders.has(statusCode)) {
      this._statusBuilders.set(statusCode, []);
    }
    this._statusBuilders.get(statusCode)!.push(builder);
  }
}

class OutputBuilder {
  // PATTERN 1: Zod-first overloads (direct schema or callback returning schema)
  
  // Overload 1a: Direct Zod schema with detailed output shape { status?, body?, headers? }
  detailed(schema: z.ZodObject<{ status?: z.ZodType, body?: z.ZodType, headers?: z.ZodType }>): this;
  
  // Overload 1b: Zod union with required status in each variant
  detailed(schema: z.ZodUnion<[z.ZodObject<{ status: z.ZodType }>, ...z.ZodObject<{ status: z.ZodType }>[]]>): this;
  
  // Overload 1c: Callback returning Zod schema (same constraints as 1a/1b)
  detailed(callback: (d: undefined) => z.ZodObject | z.ZodUnion): this;
  
  // PATTERN 2: Builder methods overloads (callback using builder API)
  
  // Overload 2a: Callback returning single DetailedOutputBuilder (implicit 200)
  detailed(callback: (d: DetailedOutputBuilder) => DetailedOutputBuilder): this;
  
  // Overload 2b: Callback returning array of DetailedOutputBuilder instances
  detailed(callback: (d: DetailedOutputBuilder) => DetailedOutputBuilder[]): this;
  
  // Implementation
  detailed(
    schemaOrCallback: 
      | z.ZodType 
      | ((d: undefined) => z.ZodType)
      | ((d: DetailedOutputBuilder) => DetailedOutputBuilder | DetailedOutputBuilder[])
  ): this {
    // PATTERN 1: Direct Zod schema
    if (typeof schemaOrCallback !== 'function') {
      // Direct Zod schema - validate and store
      this._outputSchema = schemaOrCallback;
      return this;
    }
    
    // It's a callback - determine which pattern
    const callback = schemaOrCallback;
    
    // Try calling with undefined first to detect Pattern 1 (Zod-first)
    try {
      const testResult = callback(undefined as any);
      
      // If result is a Zod schema, it's Pattern 1
      if (testResult && typeof testResult === 'object' && '_def' in testResult) {
        this._outputSchema = testResult;
        return this;
      }
    } catch {
      // Not Pattern 1, proceed to Pattern 2
    }
    
    // PATTERN 2: Builder methods
    const builder = new DetailedOutputBuilder(this._initialBody);
    const result = callback(builder);
    
    // Check if result is an array of builders
    if (Array.isArray(result)) {
      // Array of DetailedOutputBuilder instances
      if (result.length === 0) {
        throw new Error('Detailed output array cannot be empty');
      }
      
      // Register each builder with its status code, then build schemas
      const schemas = result.map((builderInstance, index) => {
        // Get status from builder, defaults to 200 if .status() was not called
        const statusCode = builderInstance._getStatus() ?? 200;
        
        // Register this builder for later access via get/getAll
        builder._register(statusCode, builderInstance);
        
        // Build schema with status code as literal
        return builderInstance._buildWithStatus(statusCode);
      });
      
      this._outputSchema = schemas.length === 1
        ? schemas[0]
        : z.union(schemas as [z.ZodType, z.ZodType, ...z.ZodType[]]);
    } else {
      // Single DetailedOutputBuilder - implicit 200 status
      this._outputSchema = result._buildWithStatus(200);
    }
    
    return this;
  }
}
```

**Internal Storage Architecture**:

The system stores all detailed responses as a **`ZodUnion` of response variants**. This enables multiple response shapes for the same status code:

```ts
// Multiple variants can coexist with the same status
const response1 = d.body(z.object({ id: z.string() }));           // 200 variant 1
const response2 = d.body(z.object({ id: z.string(), meta: z.object({}) })); // 200 variant 2
const errorResp = d.body(errorSchema).status(404);                // 404

// Final union structure:
z.union([
  { status: 200, body: variant1Body, headers: variant1Headers },
  { status: 200, body: variant2Body, headers: variant2Headers },  // Same status!
  { status: 404, body: errorBody, headers: errorHeaders }
])

// get(200) returns: z.union([ variant1, variant2 ]) - all 200 variants
// get(404) returns: z.union([ errorVariant ]) - all 404 variants
// getAll() returns: { 200: z.union([...]), 404: z.union([...]) }
```

**Key Design Points**:
1. **Status is not unique**: Multiple response shapes can share the same status code
2. **Storage format**: Always `z.union([response1, response2, ..., responseN])`
3. **get(statusCode) returns**: `ZodUnion` of all registered variants for that status
4. **getAll() returns**: Record mapping each status → its `ZodUnion` of variants
5. **Registry tracking**: Internal `_statusBuilders: Map<number, DetailedOutputBuilder>` maintains status→variant mappings

**Example with Multiple 200 Variants**:
```ts
.output(b => b.detailed(d => {
  return [
    d.body(z.object({ id: z.string() })),              // 200: basic response
    d.body(z.object({ id: z.string(), cached: z.boolean() })),  // 200: cached variant
    d.body(z.object({ id: z.string(), meta: z.object({}) }))   // 200: with metadata
      .headers({ 'x-version': z.string() }),
    d.body(errorSchema).status(404),                   // 404
    d.body(serverErrorSchema).status(500)              // 500
  ];
}))

// Internal union: z.union([ basic200, cached200, meta200, error404, serverError500 ])
// get(200) retrieves: z.union([ basic200, cached200, meta200 ])
// get(404) retrieves: z.union([ error404 ])
```

**Type Guard Logic**:
1. If `schemaOrCallback` is not a function → Pattern 1 (direct schema)
2. If callback, try calling with `undefined`:
   - If result has `_def` property → Pattern 1 (callback returning Zod schema)
   - Otherwise → Pattern 2 (builder methods)
3. Pattern 2: Check result type:
   - Is array → Array of builders (each defaults to 200 unless `.status()` called)
   - Has `build` method → Single builder (defaults to 200 unless `.status()` called)
   - Otherwise → Error

**Implementation Notes**:
- **Pattern Detection**: Uses duck typing - Zod schemas have `_def` property, arrays use `Array.isArray()`
- **Type Safety**: TypeScript overloads ensure correct typing for each pattern
- **Runtime Behavior**: Both patterns produce identical Zod schemas
- **Status Inference**: Builders without `.status()` default to 200, explicit `.status(code)` overrides
- **Error Handling**: Missing `.status()` on non-first array elements throws descriptive error
- **Performance**: Pattern 1 (direct schema) is slightly faster (no builder instantiation)

---

### Step 4: Remove Deprecated Methods

**REMOVE these deprecated methods**:
- `.schema()` method on QueryBuilder
- `.schema()` method on BodyBuilder
- `.schema()` method on HeadersBuilder
- `.custom()` method on OutputBuilder
- `.union()` method on DetailedOutputBuilder

**KEEP these classes** (updated with new overloads):
- `DetailedInputBuilder` (with direct schema and callback overloads)
- `DetailedOutputBuilder` (with direct schema and callback overloads)
- `OutputBuilder` (with `.detailed()` supporting object-based status codes)
- `PathParamBuilder` (template literal support unchanged)

---

### Step 5: Update Documentation and Tests

Add comprehensive examples and tests for:
- Direct schema pattern: `.body(z.object({...}))`
- Callback with Zod composition: `.body(current => current.omit({...}))`  
- Single detailed response: `b.detailed(d => d.body(...))`
- Multiple responses with array: `b.detailed(d => [d.body(), d.body().status(404)])`

---

## Migration Path

### Phase 1: Add New API (Backward Compatible)
- Implement new overloads
- Keep old `.schema()` / `.custom()` working
- Add SchemaBuilder with composition methods

### Phase 2: Migrate Contracts
- Update all storage contracts to use new API
- Remove `.schema()` / `.custom()` wrappers
- Simplify detailed outputs

### Phase 3: Remove Old API
- Delete deprecated methods
- Update documentation
- Complete migration

---

## Example Migrations

### Example 0: Input Patterns - All Three Approaches

**Note**: These examples focus on `query`, `body`, and `headers`. Path parameters (`params`) are handled separately via the `.params()` function and should **NEVER** be included in the input schema object.

#### Before (Verbose)
```ts
.input(b =>
  b.query(q => q.schema(() => z.object({ limit: z.number() })))
   .body(b => b.schema(() => userCreateSchema))
)
```

#### After - Pattern 1: Direct Schema
```ts
// Complete input object - all fields optional
.input(z.object({
  query: z.object({ 
    limit: z.number().optional(),
    offset: z.number().optional()
  }),
  body: userCreateSchema
}))

// Only body (most common)
.input(z.object({
  body: userCreateSchema
}))

// With params (defined elsewhere but included for completeness)
.params(p => p`/users/${p('id', z.string())}`)
.input(z.object({
  body: userUpdateSchema
}))
```

#### After - Pattern 2: Callback Returning Zod Schema
```ts
// Callback returning complete schema
.input(b => z.object({
  query: z.object({ 
    limit: z.number().optional(),
    offset: z.number().optional()
  }),
  body: userCreateSchema
}))

// With Zod composition
.input(b => z.object({
  body: baseUserSchema.extend({ 
    verified: z.boolean(),
    role: z.enum(['user', 'admin'])
  })
}))

// Conditional input schemas
.input(b => z.union([
  z.object({ 
    query: z.object({ mode: z.literal('create') }),
    body: createSchema 
  }),
  z.object({ 
    query: z.object({ mode: z.literal('update') }),
    body: updateSchema 
  })
]))

// Complex Zod composition
.input(b => z.object({
  query: querySchema.partial(),  // All fields optional
  body: baseSchema
    .omit({ createdAt: true, updatedAt: true })
    .extend({ tags: z.array(z.string()) })
}))
```

#### After - Pattern 3: Builder Methods
```ts
// Single field
.input(b => b.body(userCreateSchema))

// Multiple fields
.input(b => 
  b.query(z.object({ 
      limit: z.number().optional(),
      offset: z.number().optional()
    })
   .body(userCreateSchema)
   .headers(z.object({ 'x-api-key': z.string() }))
)

// With params (template literal or object)
.input(b => 
  b.params(p => p`/users/${p('id', z.string())}`)
   .body(userUpdateSchema)
)

// With schema composition using callbacks
.input(b => 
  b.query(currentQuery => 
    currentQuery.extend({ 
      limit: z.number().optional(),
      offset: z.number().optional()
    })
  )
  .body(currentBody => 
    currentBody.omit({ password: true, resetToken: true })
  )
)

// Access and modify existing schemas
.input(b => 
  b.query(q => q.partial())  // Make all query params optional
   .body(b => b.pick({ name: true, email: true }))  // Only these fields
)
```

**Pattern Selection Guide**:
- **Use Pattern 1** when: Static schema, no composition needed, direct definition
- **Use Pattern 2** when: Complex Zod composition, conditional schemas, heavy use of Zod API
- **Use Pattern 3** when: Incremental building, modifying existing schemas per field, clear separation

**Important: Path Parameters**:
- ❌ **NEVER** include `params` in the input schema object (Patterns 1 & 2)
- ✅ **Top-level** (recommended): `.params(...)` before or after `.input(...)`
- ✅ **Pattern 3 only**: `.input(b => b.params(...).query()...)` - shown in example above

---

### Example 1: Simple Output Schema

#### Before
```ts
export const objectUploadContract = objectOps
  .create()
  .input(b =>
    b.params(p => p`/${p("bucket", z.string())}/objects/upload`)
     .body(b => b.schema(() => z.object({
       objectName: z.string(),
       file: z.file(),
     })))
  )
  .output(b => b.custom(() => z.object({
    etag: z.string(),
    size: z.number(),
  })))
  .build();
```

#### After
```ts
export const objectUploadContract = objectOps
  .create()
  .input(b =>
    b.params(p => p`/${p("bucket", z.string())}/objects/upload`)
     .body(z.object({
       objectName: z.string(),
       file: z.file(),
     }))
  )
  // Option 1: Direct schema
  .output(z.object({
    etag: z.string(),
    size: z.number(),
  }))
  .build();

// OR Option 2: Builder callback returning schema
export const objectUploadContractAlt = objectOps
  .create()
  .input(b =>
    b.params(p => p`/${p("bucket", z.string())}/objects/upload`)
     .body(z.object({
       objectName: z.string(),
       file: z.file(),
     }))
  )
  .output(b => z.object({
    etag: z.string(),
    size: z.number(),
  }))
  .build();
```

---

### Example 2: Schema Composition with Native Zod Methods

#### Before
```ts
.input(b =>
  b.query(q => q.schema(() => z.object({
    prefix: z.string().optional(),
    maxKeys: z.number().optional(),
  })))
)
```

#### After - Using Native Zod Methods
```ts
// MUST use .input(b => b.query(...)) pattern

// Option 1: Direct schema (simple case)
.input(b =>
  b.query(z.object({
    prefix: z.string().optional(),
    maxKeys: z.number().optional(),
  }))
)

// Option 2: Extend current schema using Zod's .extend()
.input(b =>
  b.query(currentQuery =>  // Receives raw Zod schema!
    currentQuery.extend({
      prefix: z.string().optional(),
      maxKeys: z.number().optional(),
    })
  )
)

// Option 3: Pick specific fields using Zod's .pick()
.input(b =>
  b.query(currentQuery => 
    currentQuery.pick({ prefix: true, maxKeys: true })
  )
)

// Option 4: Omit fields using Zod's .omit()
.input(b =>
  b.body(currentBody =>  // Receives raw Zod schema!
    currentBody.omit({ password: true, internal: true })
  )
)

// Option 5: Chain multiple Zod methods
.input(b =>
  b.body(currentBody => 
    currentBody
      .omit({ id: true, createdAt: true })
      .extend({ extra: z.string() })
      .partial()
  )
)
```

**Key Point**: Callbacks receive the **actual Zod schema object**, so you can use ALL native Zod methods:
- `.extend()` - Add fields
- `.pick()` - Select fields
- `.omit()` - Remove fields
- `.partial()` - Make optional
- `.required()` - Make required
- `.merge()` - Merge schemas
- `.and()` - Intersection
- `.or()` - Union
- `.refine()` - Custom validation
- `.transform()` - Transform values

---

### Example 3: Detailed Output (Single Response)

#### Before
```ts
.output(b => b.detailed(d => 
  d.status(200)
   .body(b => b.custom(() => userSchema))
))
```

#### After - Pattern 1: Zod-First (Direct Schema)
```ts
// Option 1a: Direct Zod schema - status optional (defaults to 200)
.output(b => b.detailed(z.object({
  body: userSchema,
  headers: z.object({ 'x-total': z.number() })
})))

// Option 1b: Direct Zod schema - explicit status
.output(b => b.detailed(z.object({
  status: z.literal(200),
  body: userSchema,
  headers: z.object({ 'x-total': z.number() })
})))

// Option 1c: Callback returning Zod schema
.output(b => b.detailed(d => z.object({
  body: userSchema,
  headers: z.object({ 'x-total': z.number() })
})))
```

#### After - Pattern 2: Builder Methods
```ts
// Option 2a: Builder callback (implicit 200 status)
.output(b => b.detailed(d => 
  d.body(userSchema).headers({ 'x-total': z.number() })
))

// Option 2b: Builder with composition using callback
.output(b => b.detailed(d => 
  d.body(currentBody => 
    currentBody.pick({ id: true, name: true, email: true })
  ).headers({ 'x-total': z.number() })
))
```

---

### Example 4: Detailed Output (Multiple Responses)

#### Before
```ts
.output(b => b.detailed(d =>
  d.union(v => [
    v().status(200).body(successSchema),
    v().status(404).body(notFoundSchema),
    v().status(500).body(errorSchema),
  ])
))
```

#### After - Pattern 1: Zod-First (Union of Schemas)
```ts
// Option 1a: Direct Zod union - status REQUIRED in each variant
.output(b => b.detailed(z.union([
  z.object({ status: z.literal(200), body: successSchema }),
  z.object({ status: z.literal(404), body: notFoundSchema }),
  z.object({ status: z.literal(500), body: errorSchema })
])))

// Option 1b: With headers per status
.output(b => b.detailed(z.union([
  z.object({ status: z.literal(200), body: successSchema, headers: z.object({ 'x-total': z.number() }) }),
  z.object({ status: z.literal(404), body: notFoundSchema }),
  z.object({ status: z.literal(500), body: errorSchema })
])))

// Option 1c: Callback returning Zod union
.output(b => b.detailed(d => z.union([
  z.object({ status: z.literal(200), body: successSchema }),
  z.object({ status: z.literal(404), body: notFoundSchema }),
  z.object({ status: z.literal(500), body: errorSchema })
])))
```

#### After - Pattern 2: Builder Methods (Array with Status Inference)
```ts
// Option 2a: Builder with array pattern
.output(b => b.detailed(d => [
  d.body(successSchema),           // No .status() → defaults to 200
  d.body(notFoundSchema).status(404),
  d.body(errorSchema).status(500)
]))

// Option 2b: With headers for each status
.output(b => b.detailed(d => [
  d.body(successSchema).headers({ 'x-total': z.number() }),  // No .status() → defaults to 200
  d.body(notFoundSchema).status(404),
  d.body(errorSchema).status(500)
]))

// Option 2c: With body composition using callbacks
.output(b => b.detailed(d => [
  d.body(successSchema),           // No .status() → defaults to 200
  d.body(currentBody => currentBody.omit({ password: true })).status(404),
  d.body(errorSchema).status(500)
]))
```

**How it works (Pattern 2)**: 
- Return an array of `DetailedOutputBuilder` instances
- Builders without `.status()` default to 200
- Call `.status(code)` to set explicit status codes
- Multiple builders can have the same status (creates union variants)
- Route builder creates `z.union()` from array elements

---

### Example 5: Accessing Previously Defined Responses

#### New Feature: get() and getAll()

**Key Concept**: A single status code can have multiple response shapes (different body/headers combinations). The system stores all responses as `ZodUnion<{status: number, body: z.ZodType, headers: z.ZodType}[]>` internally.

- `get(statusCode)` returns a **`ZodUnion` of all possible response shapes** for that status code
- `getAll()` returns **all registered status-handler pairs** as a record

```ts
// Access and get unions of previously defined responses
.output(b => b.detailed(d => {
  // Define multiple response shapes for status 200
  const success1 = d.body(z.object({ id: z.string() }));  // First 200 variant
  const success2 = d.body(z.object({ id: z.string(), meta: z.object({}) }));  // Another 200 variant
  
  // Later, get() returns a ZodUnion of ALL variants for that status
  const all200Variants = d.get(200);  // Returns ZodUnion of both success1 and success2
  
  // getAll() returns all status codes and their union schemas
  const allResponses = d.getAll();  // Returns { 200: ZodUnion[...], 404: ZodUnion[...], ... }
  
  // Build array with multiple variants per status
  return [
    success1,  // No .status() → defaults to 200 (first variant)
    d.body(z.object({ id: z.string(), meta: z.object({}) })),  // No .status() → also 200 (second variant)
    d.body(notFoundSchema).status(404)  // Explicit .status(404)
  ];
}))

// Practical use case: Compose responses
.output(b => b.detailed(d => {
  // Define base response structure
  const baseResponse = d.body(userSchema).headers({ 'x-version': z.string() });
  const extendedResponse = baseResponse.body(currentBody => currentBody.extend({ isNew: z.boolean() }));
  
  // Both variants coexist under status 200 in the ZodUnion
  return [
    baseResponse,  // No .status() → defaults to 200 (variant 1)
    extendedResponse,  // No .status() → defaults to 200 (variant 2)
    d.body(errorSchema).status(404)  // Explicit .status(404)
  ];
}))
```

**How it works**:
1. All responses are collected into a single `ZodUnion` internally: `z.union([response1, response2, ..., responseN])`
2. When multiple builders have the same status code → they become **union variants** of that status
3. `get(200)` returns the `ZodUnion` of all status 200 variants
4. This enables composition: different response shapes for the same status code can coexist

**Benefits**:
- Multiple response variants per status (e.g., 200 with/without metadata)
- Use union variants for conditional responses
- Leverage `get(statusCode)` to retrieve and extend existing response shapes
- Maintain type safety with Zod unions

---

### Example 6: Complete Output Options Summary

```ts
// ============================================================
// SIMPLE OUTPUTS (no status/headers structure)
// ============================================================

// 1. Direct schema
.output(userSchema)

// 2. Builder callback returning schema
.output(b => userSchema)

// 3. Builder callback with composition
.output(b => userSchema.omit({ password: true }))


// ============================================================
// DETAILED OUTPUTS (with status, body, headers structure)
// ============================================================

// 4. Direct Zod schema with detailed shape (single response)
.output(b => b.detailed(z.object({
  status: z.literal(200),
  body: userSchema,
  headers: z.object({ 'x-total': z.number() })
})))

// 5. Direct Zod union of detailed schemas (multiple responses)
.output(b => b.detailed(z.union([
  z.object({ body: userSchema, headers: z.object({}) }),  // defaults to 200
  z.object({ status: z.literal(404), body: errorSchema, headers: z.object({}) })
])))

// 6. Builder callback - single response (implicit 200)
.output(b => b.detailed(d => 
  d.body(userSchema).headers({ 'x-total': z.number() })
))

// 7. Builder callback - array with status defaults/explicit
.output(b => b.detailed(d => [
  d.body(userSchema),  // No .status() → defaults to 200
  d.body(errorSchema).status(404)
]))

// 8. Builder callback - with composition
.output(b => b.detailed(d => [
  d.body(currentBody => currentBody.omit({ password: true }))
           .headers({ 'x-total': z.number() }),  // 200 (inferred)
  d.body(errorSchema).status(404)
]))
```

**Key Takeaways**:
- Simple outputs: Use `.output(schema)` or `.output(b => schema)`
- Detailed outputs: Always use `.output(b => b.detailed(...))`
- `.detailed()` accepts direct Zod schema OR builder callback
- Detailed schema shape: `{ status: z.ZodType, body: z.ZodType, headers: z.ZodType }`

---

### Example 7: Complex Real-World Migration

#### Before
```ts
export const objectListContract = objectOps
  .list()
  .input(b => 
    b.params(p => p`/${p('bucket', z.string().min(3).max(63))}`)
     .query(q => q.schema(() => z.object({
       prefix: z.string().optional(),
       recursive: z.boolean().optional().default(true),
       maxKeys: z.number().int().min(1).max(10000).optional().default(1000),
       continuationToken: z.string().optional(),
     })))
  )
  .output(objectListSchema)
  .build();
```

#### After
```ts
export const objectListContract = objectOps
  .list()
  .input(b => 
    b.params(p => p`/${p('bucket', z.string().min(3).max(63))}`)
     .query(z.object({
       prefix: z.string().optional(),
       recursive: z.boolean().optional().default(true),
       maxKeys: z.number().int().min(1).max(10000).optional().default(1000),
       continuationToken: z.string().optional(),
     }))
  )
  .output(objectListSchema)
  .build();
```

---

## Rollout Plan

### Phase 1: Add New Overloads (Backward Compatible)
1. Add overloads to `DetailedInputBuilder` methods:
   - `.query()` - accept direct schema or callback
   - `.body()` - accept direct schema or callback
   - `.headers()` - accept direct schema or callback
2. Add overloads to `DetailedOutputBuilder` methods:
   - `.body()` - accept direct schema or callback
   - `.headers()` - accept direct schema or callback
3. Update `OutputBuilder.detailed()` to detect array returns: `[d.body(), d.body().status(404)]`
4. Keep old `.schema()` and `.custom()` methods working (deprecated)

**Result**: Both old and new API work side-by-side

### Phase 2: Migrate Contracts
1. Update all storage object contracts (list, stat, delete, head, copy, upload, etc.)
2. Remove all `.schema(() => ...)` wrappers
3. Remove all `.custom(() => ...)` wrappers
4. Remove all explicit `.status()` calls (use object keys or implicit 200)
5. Replace `.union(v => [...])` with array pattern: `[d.body(), d.body().status(404)]`
6. Keep `.detailed()` method for structured responses
7. Use direct schemas for simple cases
8. Use callbacks with native Zod methods for composition in body/headers

**Result**: All contracts use new clean API

### Phase 3: Remove Deprecated Methods (Breaking Change)
1. Remove `.schema()` method from QueryBuilder, BodyBuilder, HeadersBuilder
2. Remove `.custom()` method from OutputBuilder
3. Remove `.union()` method from DetailedOutputBuilder
4. Remove `.status()` method from DetailedOutputBuilder (status from object key or implicit 200)
5. Update all documentation to show only new patterns
6. Add migration guide for users of old API

**Result**: Clean, simplified codebase with no deprecated code

---

## Benefits Summary

### Before (Verbose)
```ts
.query(q => q.schema(() => z.object({ limit: z.number() })))
.body(b => b.schema(() => userSchema.omit(['id'])))
.output(b => b.detailed(d => d.union(v => [
  v().status(200).body(successSchema),
  v().status(404).body(errorSchema)
])))
```

### After (Clean)
```ts
// Simple output
.output(userListSchema)

// Detailed output with direct Zod schema
.output(b => b.detailed(z.object({
  status: z.literal(200),
  body: userListSchema,
  headers: z.object({ 'x-total': z.number() })
})))

// OR detailed output with builder callback
.query(z.object({ limit: z.number() }))
.body(currentBody => currentBody.omit({ id: true }))
.output(b => b.detailed(d => [
  d.body(successSchema),        // No .status() → defaults to 200
  d.body(errorSchema).status(404)
]))
```

**Improvements**:
- ✅ **60% less boilerplate** - No `.schema()`, `.custom()`, `.union()`, or explicit `.status()` wrappers
- ✅ **Native Zod power** - Use all Zod methods directly via callbacks for body/headers
- ✅ **Simpler types** - Fewer intermediate builder classes, no status tracking
- ✅ **Better DX** - More intuitive, less nesting
- ✅ **Array-based status codes** - `[d.body(), d.body().status(404)]` automatically creates unions, status defaults to 200
- ✅ **Defaults to 200** - No `.status()` call → defaults to 200 status
- ✅ **Keep `.detailed()`** - Explicit method for structured responses
- ✅ **Response registry** - Access defined responses with `d.get(200)` and `d.getAll()`
- ✅ **Flexible** - Direct schema OR composition callback for body and headers

---

## Testing Strategy

1. **Type Tests**: Ensure TypeScript inference works correctly for both direct and callback patterns
2. **Unit Tests**: Test each overload (direct schema and callback)
3. **Integration Tests**: Test complete contract building with various patterns
4. **Migration Tests**: Run old API alongside new API to ensure compatibility
5. **Real Contract Tests**: Migrate actual storage contracts and verify they work

---

## Implementation Checklist

- [ ] Add overloads to `DetailedInputBuilder.query()` (accept direct schema or callback)
- [ ] Add overloads to `DetailedInputBuilder.body()` (accept direct schema or callback)
- [ ] Add overloads to `DetailedInputBuilder.headers()` (accept direct schema or callback)
- [ ] Add overloads to `DetailedOutputBuilder.body()` (accept direct schema or callback)
- [ ] Add overloads to `DetailedOutputBuilder.headers()` (accept direct schema or callback)
- [ ] Add overloads to `OutputBuilder.detailed()` (accept direct Zod schema OR builder callback)
- [ ] Add `DetailedOutputBuilder.get(statusCode)` method (get previously defined response)
- [ ] Add `DetailedOutputBuilder.getAll()` method (get all defined responses)
- [ ] Remove `DetailedOutputBuilder.status()` method (status from object key or implicit 200)
- [ ] Update `OutputBuilder.detailed()` to handle direct schemas and array pattern `[d.body(), d.body().status(404)]`
- [ ] Implement internal status registry in DetailedOutputBuilder for get/getAll
- [ ] Write unit tests for new overloads (direct schema and callback)
- [ ] Write tests for object-based status codes
- [ ] Write tests for get() and getAll() methods
- [ ] Write tests for implicit 200 status on single return
- [ ] Write tests for body/headers callbacks with Zod composition
- [ ] Migrate storage object contracts
- [ ] Migrate storage bucket contracts
- [ ] Run full test suite
- [ ] Update documentation with new patterns
- [ ] Remove deprecated `.schema()`, `.custom()`, `.union()`, `.status()` methods
- [ ] Final type-check and test

---

## Notes

**Why callbacks receive raw Zod schemas**:
- Zod already has powerful composition methods
- No need to reinvent the wheel with custom builders
- Users already know Zod API
- Simpler implementation, fewer classes
- Better type inference

**Output patterns**:
- **Simple output**: `.output(schema)` or `.output(b => schema)` - no status/headers structure
- **Detailed output**: `.output(b => b.detailed(...))` - with status, body, headers structure
- `.detailed()` accepts EITHER:
  - Direct Zod schema: `b.detailed(z.object({ status: z.literal(200), body: schema, headers: z.object({}) }))`
  - Builder callback: `b.detailed(d => d.body().headers())` or `b.detailed(d => [d.body(), d.body().status(404)])`

**Why array-based pattern for multiple responses**:
- Natural list representation of response variants
- Status defaults to 200 when `.status()` not called - reduces boilerplate
- Explicit `.status()` calls for non-200 responses make intent clear
- Consistent with union semantics - array of alternatives
- No `.status()` call → defaults to 200 (works for single or multiple builders)
- Automatic union creation from array elements
- Keep `.detailed()` for explicit structured responses
- Response registry via `get()` and `getAll()` for reusability
- Supports multiple variants per status code (union of shapes for same status)

**Why callbacks for body/headers receive raw Zod schemas**:
- Zod already has powerful composition methods
- No need to reinvent the wheel with custom builders
- Users already know Zod API (`.omit()`, `.pick()`, `.extend()`, etc.)
- Simpler implementation, fewer classes
- Better type inference
- Same pattern as input builders for consistency

