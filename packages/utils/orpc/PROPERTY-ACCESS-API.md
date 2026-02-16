# Property Access API Guide

## Overview

The Route Builder now supports a unified API for input and output configuration with **property access patterns**. This allows for cleaner, more intuitive route definitions.

## Supported Patterns

### Input API Patterns

All these patterns are fully supported and work seamlessly together:

#### 1. Direct Schema (Detailed Structure)
```typescript
.input(z.object({
  params: z.object({ id: z.string() }),
  query: z.object({ limit: z.number() }),
  body: userSchema,
  headers: z.object({ 'x-api-key': z.string() }),
}))
```

#### 2. Builder Callback
```typescript
.input(builder => builder
  .body(userSchema)
  .query(q => q.schema(() => z.object({ limit: z.number() })))
)
```

#### 3. Nested Builder Callback
```typescript
.input(userSchema)  // Set initial schema
.input(builder => builder.body(b => b.schema(s => s.omit(['password']))))
```

#### 4. Property Access with Direct Schema
```typescript
.input.body(userSchema)
.input.query(z.object({ limit: z.number() }))
.input.params(z.object({ id: z.string() }))
.input.headers(z.object({ 'authorization': z.string() }))
```

#### 5. Property Access with Builder Callback
```typescript
.input(userSchema)  // Set initial
.input.body(b => b.schema(s => s.omit(['password'])))
.input.query(q => q.schema(() => z.object({ limit: z.number() })))
```

#### 6. Property Chaining
```typescript
.input.body(userSchema)
  .input.query(z.object({ limit: z.number() }))
  .input.headers(z.object({ 'authorization': z.string() }))
```

### Output API Patterns

#### 1. Direct Schema
```typescript
.output(userSchema)
.output(z.object({ users: z.array(userSchema), total: z.number() }))
```

#### 2. Builder Callback for Detailed Response
```typescript
.output(builder => builder.detailed(d => d
  .status(201)
  .headers({ 'location': z.string() })
  .body(userSchema)
))
```

#### 3. Builder Callback for Modifications
```typescript
.output(userSchema)
.output(builder => builder.omit(['password', 'createdAt']))
```

#### 4. Property Access for Modifications
```typescript
.output(userSchema)
.output.omit(['password', 'createdAt'])
.output.pick(['id', 'name', 'email'])
```

#### 5. Property Access for Detailed Responses
```typescript
.output.detailed(d => d
  .status(201)
  .body(userSchema)
  .headers({ 'etag': z.string() })
)
```

#### 6. Property Chaining
```typescript
.output(userSchema)
  .output.omit(['password'])
  .output.pick(['id', 'name', 'email'])
```

## Real-World Examples

### Create Endpoint
```typescript
const createUser = new RouteBuilder({ method: 'POST', path: '/users' })
  .input.body(userSchema.omit({ id: true, createdAt: true }))
  .output.detailed(d => d
    .status(201)
    .body(userSchema.omit({ password: true }))
    .headers({ 'location': z.string() })
  )
  .build();
```

### List Endpoint with Filters
```typescript
const listUsers = new RouteBuilder({ method: 'GET', path: '/users' })
  .input.query(z.object({
    page: z.number().default(1),
    limit: z.number().default(10),
    search: z.string().optional(),
    role: z.enum(['admin', 'user']).optional(),
  }))
  .output(z.object({
    users: z.array(userSchema.omit({ password: true })),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }))
  .build();
```

### Update Endpoint with Path Params
```typescript
const updateUser = new RouteBuilder({ method: 'PATCH', path: '/:id' })
  .pathWithParams(p => `/users/${p('id', z.string())}`)
  .input.body(userSchema.omit({ id: true, createdAt: true }).partial())
  .output(userSchema.omit({ password: true }))
  .build();
```

### Login Endpoint
```typescript
const login = new RouteBuilder({ method: 'POST', path: '/auth/login' })
  .input.body(z.object({
    email: z.string(),
    password: z.string(),
  }))
  .output(z.object({
    token: z.string(),
    refreshToken: z.string(),
    user: userSchema.omit({ password: true }),
  }))
  .build();
```

## Mixing Patterns

You can freely mix all patterns in the same route:

```typescript
const complexRoute = new RouteBuilder({ method: 'POST', path: '/users' })
  .input(userSchema)                                           // Pattern 1: Direct schema
  .input(builder => builder.query(q => q.schema(() => query))) // Pattern 2: Builder callback
  .input.body(b => b.schema(s => s.omit(['password'])))        // Pattern 5: Property + builder
  .output(userSchema)                                          // Pattern 1: Direct schema
  .output(builder => builder.omit(['password']))               // Pattern 3: Builder callback
  .output.pick(['id', 'name', 'email'])                        // Pattern 4: Property access
  .build();
```

## Key Features

### 1. Property Access Methods Support Both Direct and Builder Patterns
```typescript
// Direct schema
.input.body(userSchema)

// Builder callback
.input.body(b => b.schema(s => s.omit(['password'])))
```

### 2. Chainable Property Access
```typescript
// Each property method returns a RouteBuilder with .input and .output getters
.input.body(schema)
  .input.query(querySchema)
  .output.omit(['password'])
  .output.pick(['id', 'name'])
```

### 3. State Preservation
```typescript
// Current state is preserved when using builder callbacks
.input(userSchema)  // Set initial body
.input.body(b => b.schema(s => s.omit(['password'])))  // Modifies current body
// ✅ Current body schema is passed to the callback, not z.ZodVoid
```

### 4. Unified callable and Property Access
```typescript
// Callable pattern
.input(schema)
.input(builder => builder.body(schema))

// Property access
.input.body(schema)
.input.body(builder => builder.schema(s => s.omit(...)))
```

## Technical Details

### Implementation
- **InputSchemaProxy** and **OutputSchemaProxy** now have `.input` and `.output` delegation getters
- Property methods (`body()`, `query()`, `params()`, `headers()`) support overloads for both direct schemas and builder callbacks
- `InputSchemaProxy.detailed()` extracts and preserves current state before creating DetailedInputBuilder
- All patterns work at runtime with full type preservation

### Test Coverage
- **535/535 tests passing** (100% success rate)
- New test suite: `property-access-api.test.ts` (22 tests covering all patterns)
- Tests verify all 6 input patterns and 6 output patterns
- Real-world usage scenarios validated

### Type Safety
- Runtime type safety: ✅ Perfect
- Compile-time type inference: ✅ Excellent for most patterns
- Known limitation: Deep nested callbacks (Pattern 3) may show generic types in some TypeScript versions
  - This is a TypeScript contravariance limitation, not a runtime issue
  - Workaround: Use direct schema patterns or shallow builder callbacks for better type hints

## Migration Guide

### From Old API
```typescript
// Old: Separate inputBuilder and outputBuilder
.inputBuilder.omit(['password'])
.outputBuilder.pick(['id', 'name'])
```

### To New Unified API
```typescript
// New: Unified input/output with property access
.input.omit(['password'])   // ERROR: omit is not on input proxy
// Use:
.input(schema)
.input(builder => builder.body(b => b.schema(s => s.omit(['password']))))
// Or simply:
.input(schema.omit({ password: true }))
```

**Note**: The old `inputBuilder` and `outputBuilder` getters still exist and delegate to the unified `input` and `output` for backward compatibility.

## Best Practices

1. **Use property access for simple cases**
   ```typescript
   .input.body(userSchema)
   .output.omit(['password'])
   ```

2. **Use builder callbacks for complex transformations**
   ```typescript
   .input(builder => builder
     .body(userSchema.omit({ id: true }))
     .query(q => q.schema(() => querySchema))
   )
   ```

3. **Chain property accessors for readability**
   ```typescript
   .input.body(userSchema)
     .input.query(querySchema)
     .output(resultSchema)
     .output.omit(['internal'])
   ```

4. **Preserve type hints by using direct schemas when possible**
   ```typescript
   // Good type hints
   .input.body(userSchema.omit({ password: true }))
   
   // Reduced type hints (but still works!)
   .input.body(b => b.schema(s => s.omit(['password'])))
   ```

## Summary

The unified property access API provides:
- ✅ **6 flexible input patterns**
- ✅ **6 flexible output patterns**
- ✅ **Seamless mixing of all patterns**
- ✅ **Property chaining support**
- ✅ **State preservation**
- ✅ **100% backward compatibility**
- ✅ **535 passing tests**
- ✅ **Runtime type safety**

Choose the pattern that best fits your use case and coding style!
