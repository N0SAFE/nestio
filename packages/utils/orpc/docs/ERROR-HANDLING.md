# Error Handling - Fluent Builder API

## Overview

The RouteBuilder now supports **fluent error definitions** using the same builder pattern as union outputs. This provides type-safe, readable error definitions that integrate seamlessly with ORPC's error handling system.

## Features

✅ **Fluent builder syntax** - Define errors like `.errors(e => [e().code('NOT_FOUND')...])`  
✅ **Type-safe** - Full TypeScript inference for error structures  
✅ **Backward compatible** - Object syntax still supported  
✅ **ORPC integration** - Automatically applies ORPC default status codes  
✅ **Chainable** - Methods can be called in any order  
✅ **Flexible** - Supports optional message, data schema, and status overrides  

---

## Basic Usage

### Fluent Builder Syntax (Recommended)

```typescript
const userRead = new RouteBuilder()
  .path('/users/:id')
  .method('GET')
  .input(z.object({ params: z.object({ id: z.string() }) }))
  .output(userSchema)
  .errors(e => [
    e().code('NOT_FOUND').message('User not found').status(404),
    e().code('UNAUTHORIZED').status(401),
  ])
  .build();
```

### Object Syntax (Backward Compatible)

```typescript
const userRead = new RouteBuilder()
  .path('/users/:id')
  .method('GET')
  .input(z.object({ params: z.object({ id: z.string() }) }))
  .output(userSchema)
  .errors({
    NOT_FOUND: { message: 'User not found', status: 404 },
    UNAUTHORIZED: { status: 401 },
  })
  .build();
```

---

## Understanding Error Status vs Output Status

### Two Different Concepts

**Error `.status()`** and **Output `.status()`** serve different purposes:

| Aspect | Output `.status()` | Error `.status()` |
|--------|-------------------|------------------|
| **Purpose** | Define HTTP status for *success* responses | Define HTTP status for *error* responses |
| **Used in** | `.output(b => b.detailed(d => d.status(200)))` | `.errors(e => [e().code('NOT_FOUND').status(404)])` |
| **When sent** | When request succeeds | When an error is thrown |
| **Required?** | Yes (for detailed output) | No (ORPC has defaults) |

### How They Work Together

```typescript
const userRead = new RouteBuilder()
  .path('/users/:id')
  .method('GET')
  .input(z.object({ params: z.object({ id: z.string() }) }))
  // SUCCESS RESPONSES (Output status)
  .output(b => b.detailed(d => 
    d.union(v => [
      v().status(200).body(userSchema),           // ← Success case
      v().status(304).body(z.void())              // ← Not Modified (cache hit)
    ])
  ))
  // ERROR RESPONSES (Error status)
  .errors(e => [
    e().code('NOT_FOUND').status(404),            // ← Error case
    e().code('UNAUTHORIZED').status(401),         // ← Error case
  ])
  .build();
```

**Flow:**
1. **Request succeeds** → Returns one of the output variants (200 or 304)
2. **Error thrown in handler** → Returns error status (404 or 401)

### Error Status is OPTIONAL

ORPC automatically maps error codes to default HTTP status codes. You only need `.status()` to **override** defaults:

```typescript
// WITHOUT .status() - Uses ORPC defaults
.errors(e => [
  e().code('NOT_FOUND'),              // → Automatically 404
  e().code('UNAUTHORIZED'),           // → Automatically 401
  e().code('VALIDATION_FAILED'),      // → Automatically 422 (UNPROCESSABLE_CONTENT)
])

// WITH .status() - Custom overrides
.errors(e => [
  e().code('CUSTOM_ERROR').status(503),        // Custom code needs explicit status
  e().code('NOT_FOUND').status(410),           // Override default 404 → 410 (Gone)
])
```

---

## Understanding Errors vs Outputs

### The Relationship

**Errors work WITHIN your output structure.** They don't create separate HTTP responses - they define what error objects look like when using existing output status codes.

```typescript
const userRead = new RouteBuilder()
  .path('/users/:id')
  .method('GET')
  .input(z.object({ params: z.object({ id: z.string() }) }))
  // Define ALL possible statuses in output (success AND errors)
  .output(b => b.detailed(d => 
    d.union(v => [
      v().status(200).body(userSchema),              // Success case
      v().status(404).body(errorResponseSchema),     // Error case (404)
      v().status(401).body(errorResponseSchema),     // Error case (401)
    ])
  ))
  // Define ERROR CODES that use those statuses
  .errors(e => [
    e().code('NOT_FOUND'),      // When thrown, returns 404 variant from output
    e().code('UNAUTHORIZED'),   // When thrown, returns 401 variant from output
  ])
  .build();
```

**Key Points:**
1. **Output defines HTTP statuses** (200, 404, 401) and their body schemas
2. **Errors define error codes** (NOT_FOUND, UNAUTHORIZED) 
3. **ORPC maps error codes to statuses** (NOT_FOUND → 404, UNAUTHORIZED → 401)
4. When you `throw errors.NOT_FOUND()`, ORPC returns the 404 output variant with the error structure

### Why `.status()` on Errors Can Be Misleading

The `.status()` method on errors is for **overriding ORPC's default mapping**, not for creating new HTTP responses:

```typescript
// ORPC Default: NOT_FOUND → 404
.errors(e => [
  e().code('NOT_FOUND')  // Uses default 404
])

// Override: NOT_FOUND → 410 (Gone)
.errors(e => [
  e().code('NOT_FOUND').status(410)  // Override to 410
])
```

**But you still need the output variant:**
```typescript
.output(b => b.detailed(d => 
  d.union(v => [
    v().status(200).body(userSchema),
    v().status(410).body(errorSchema),  // Need this for 410 override
  ])
))
.errors(e => [
  e().code('NOT_FOUND').status(410)  // Maps to 410 output variant
])
```

### Correct Pattern

**Define statuses in output, error codes in errors:**

```typescript
// ✅ CORRECT: Output has all statuses, errors define codes
.output(b => b.detailed(d => 
  d.union(v => [
    v().status(200).body(userSchema),
    v().status(404).body(z.object({ 
      code: z.string(), 
      message: z.string() 
    })),
  ])
))
.errors(e => [
  e().code('NOT_FOUND').message('User not found')  // No .status() needed
])

// ❌ WRONG: Errors don't create their own statuses
.output(b => b.detailed(d => d.status(200).body(userSchema)))
.errors(e => [
  e().code('NOT_FOUND').status(404)  // This doesn't add 404 to outputs!
])
```

---

## API Reference

### ErrorDefinitionBuilder Methods

#### `.code(code: string)` _(required)_

Set the error code. ORPC automatically maps standard codes to HTTP statuses.

```typescript
e().code('NOT_FOUND')      // Maps to 404 (if 404 exists in output)
e().code('UNAUTHORIZED')   // Maps to 401 (if 401 exists in output)
```

#### `.message(message: string)` _(optional)_

Set the default error message returned when this error is thrown.

```typescript
e().code('NOT_FOUND').message('Resource not found')
```

#### `.data(schema: z.ZodType)` _(optional)_

Define additional error data schema. **⚠️ Never include sensitive information!**

```typescript
e().code('VALIDATION_FAILED')
  .data(z.object({ 
    fields: z.array(z.string()),
    errors: z.record(z.string())
  }))
```

#### `.status(code: number)` _(optional, rarely needed)_

Override ORPC's default status code mapping. **Use sparingly** - only when you need non-standard mappings.

```typescript
// Override NOT_FOUND to use 410 instead of 404
e().code('NOT_FOUND').status(410)

// Your output must include this status:
.output(b => b.detailed(d => d.union(v => [
  v().status(410).body(errorSchema)  // Required!
])))
```

**⚠️ Note:** Most of the time you should omit `.status()` and let ORPC use its defaults.

---

## Standard ORPC Error Codes

ORPC provides default HTTP status mappings for common errors:

| Error Code | Default Status | Use Case |
|------------|---------------|----------|
| `BAD_REQUEST` | 400 | Invalid input |
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | No permission |
| `NOT_FOUND` | 404 | Resource not found |
| `METHOD_NOT_SUPPORTED` | 405 | HTTP method not allowed |
| `NOT_ACCEPTABLE` | 406 | Cannot produce requested format |
| `TIMEOUT` | 408 | Request timeout |
| `CONFLICT` | 409 | Resource conflict |
| `PRECONDITION_FAILED` | 412 | Precondition not met |
| `PAYLOAD_TOO_LARGE` | 413 | Request too large |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Unsupported content type |
| `UNPROCESSABLE_CONTENT` | 422 | Validation failed |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |
| `CLIENT_CLOSED_REQUEST` | 499 | Client closed connection |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |
| `NOT_IMPLEMENTED` | 501 | Not implemented |
| `BAD_GATEWAY` | 502 | Bad gateway |
| `SERVICE_UNAVAILABLE` | 503 | Service unavailable |
| `GATEWAY_TIMEOUT` | 504 | Gateway timeout |

---

## Common Patterns

### 1. CRUD Operations with Output + Error Definitions

The key is to define ALL statuses in output first, then error codes separately:

```typescript
const userOps = standard.zod(userSchema, 'user');

// Read - Success or Not Found
export const userRead = userOps
  .read()
  .output(b => b.detailed(d => 
    d.union(v => [
      v().status(200).body(userSchema),                    // Success
      v().status(404).body(z.object({                      // Error
        code: z.string(),
        message: z.string()
      })),
    ])
  ))
  .errors(e => [
    e().code('NOT_FOUND').message('User not found'),       // Uses 404 from output
    e().code('UNAUTHORIZED'),                              // Needs 401 in output!
  ])
  .build();

// Create - Success, Validation Error, or Conflict
export const userCreate = userOps
  .create()
  .output(b => b.detailed(d => 
    d.union(v => [
      v().status(201).body(userSchema),                    // Success
      v().status(422).body(z.object({                      // Validation error
        code: z.string(),
        message: z.string(),
        data: z.object({ 
          fields: z.array(z.string()) 
        }).optional()
      })),
      v().status(409).body(z.object({                      // Conflict
        code: z.string(),
        message: z.string()
      })),
    ])
  ))
  .errors(e => [
    e().code('VALIDATION_FAILED')
      .message('Validation error')
      .data(z.object({ fields: z.array(z.string()) })),
    e().code('CONFLICT')
      .message('Email already exists'),
  ])
  .build();

// Update - Success, Not Found, or Validation Error
export const userUpdate = userOps
  .update()
  .output(b => b.detailed(d => 
    d.union(v => [
      v().status(200).body(userSchema),                    // Success
      v().status(404).body(z.object({                      // Not found
        code: z.string(),
        message: z.string()
      })),
      v().status(422).body(z.object({                      // Validation error
        code: z.string(),
        message: z.string(),
        data: z.any().optional()
      })),
    ])
  ))
  .errors(e => [
    e().code('NOT_FOUND').message('User not found'),
    e().code('UNPROCESSABLE_CONTENT').message('Validation failed'),
  ])
  .build();

// Delete - Success, Not Found, or Conflict
export const userDelete = userOps
  .delete()
  .output(b => b.detailed(d => 
    d.union(v => [
      v().status(204).body(z.void()),                      // Success (no content)
      v().status(404).body(z.object({                      // Not found
        code: z.string(),
        message: z.string()
      })),
      v().status(409).body(z.object({                      // Conflict
        code: z.string(),
        message: z.string(),
        data: z.object({ 
          dependencies: z.array(z.string()) 
        }).optional()
      })),
    ])
  ))
  .errors(e => [
    e().code('NOT_FOUND').message('User not found'),
    e().code('CONFLICT')
      .message('User has dependencies')
      .data(z.object({ dependencies: z.array(z.string()) })),
  ])
  .build();
```

### 2. Simple Success/Error Pattern

For simple APIs, define success (200) and generic error (400/500) statuses:

```typescript
const simpleRoute = new RouteBuilder()
  .path('/simple')
  .method('POST')
  .input(z.object({ data: z.string() }))
  .output(b => b.detailed(d => 
    d.union(v => [
      v().status(200).body(z.object({ result: z.string() })),
      v().status(400).body(z.object({ 
        code: z.string(), 
        message: z.string() 
      })),
      v().status(500).body(z.object({ 
        code: z.string(), 
        message: z.string() 
      })),
    ])
  ))
  .errors(e => [
    e().code('BAD_REQUEST').message('Invalid input'),
    e().code('INTERNAL_SERVER_ERROR').message('Server error'),
  ])
  .build();
```

### 2. Simple Success/Error Pattern

For simple APIs, define success (200) and generic error (400/500) statuses:

```typescript
const simpleRoute = new RouteBuilder()
  .path('/simple')
  .method('POST')
  .input(z.object({ data: z.string() }))
  .output(b => b.detailed(d => 
    d.union(v => [
      v().status(200).body(z.object({ result: z.string() })),
      v().status(400).body(z.object({ 
        code: z.string(), 
        message: z.string() 
      })),
      v().status(500).body(z.object({ 
        code: z.string(), 
        message: z.string() 
      })),
    ])
  ))
  .errors(e => [
    e().code('BAD_REQUEST').message('Invalid input'),
    e().code('INTERNAL_SERVER_ERROR').message('Server error'),
  ])
  .build();
```

### 3. Rate Limiting with Retry Data

Include rate limit status in output, then define error code:

```typescript
const ratedRoute = new RouteBuilder()
  .path('/api-call')
  .method('POST')
  .input(z.object({ data: z.string() }))
  .output(b => b.detailed(d => 
    d.union(v => [
      v().status(200).body(z.object({ result: z.string() })),
      v().status(429).body(z.object({                      // Rate limit status
        code: z.string(),
        message: z.string(),
        data: z.object({
          retryAfter: z.number(),
          limit: z.number(),
          remaining: z.number()
        })
      })),
    ])
  ))
  .errors(e => [
    e().code('TOO_MANY_REQUESTS')
      .message('Rate limit exceeded')
      .data(z.object({ 
        retryAfter: z.number().int().min(1),
        limit: z.number().int(),
        remaining: z.number().int()
      })),
  ])
  .build();
```

### 4. Validation Errors with Field Details

```typescript
const validatedRoute = new RouteBuilder()
  .path('/validate')
  .method('POST')
  .input(z.object({ email: z.string(), age: z.number() }))
  .output(b => b.detailed(d => 
    d.union(v => [
      v().status(200).body(z.object({ valid: z.boolean() })),
      v().status(422).body(z.object({                      // Validation error status
        code: z.string(),
        message: z.string(),
        data: z.object({
          fields: z.array(z.string()),
          errors: z.record(z.array(z.string()))
        })
      })),
    ])
  ))
  .errors(e => [
    e().code('VALIDATION_FAILED')
      .message('Input validation failed')
      .data(z.object({
        fields: z.array(z.string()),
        errors: z.record(z.array(z.string()))
      })),
  ])
  .build();
```

### 5. Reusable Error Response Schema

Define a common error schema for consistency:

```typescript
// Common error response structure
const errorResponse = z.object({
  code: z.string(),
  message: z.string(),
  data: z.any().optional()
});

const userRead = new RouteBuilder()
  .path('/users/:id')
  .method('GET')
  .input(z.object({ params: z.object({ id: z.string() }) }))
  .output(b => b.detailed(d => 
    d.union(v => [
      v().status(200).body(userSchema),
      v().status(401).body(errorResponse),    // Reuse schema
      v().status(404).body(errorResponse),    // Reuse schema
    ])
  ))
  .errors(e => [
    e().code('UNAUTHORIZED'),
    e().code('NOT_FOUND').message('User not found'),
  ])
  .build();
```

```typescript
.errors(e => [
  e().code('NOT_FOUND').message('Not found'),
])
.errors(e => [
  e().code('UNAUTHORIZED').message('Not authenticated'),
])
// Both error definitions are merged
```

---

## Common Questions

### Q: Do I need to specify `.status()` for errors?

**A: Usually no!** ORPC maps error codes to default statuses:
- `NOT_FOUND` → 404
- `UNAUTHORIZED` → 401
- `VALIDATION_FAILED` / `UNPROCESSABLE_CONTENT` → 422
- etc.

**However, you still need that status in your output union:**

```typescript
// ✅ Correct: 404 in output, error uses it
.output(b => b.detailed(d => 
  d.union(v => [
    v().status(200).body(userSchema),
    v().status(404).body(errorSchema),    // Must include 404!
  ])
))
.errors(e => [
  e().code('NOT_FOUND')  // Maps to 404 from output
])

// ❌ Wrong: 404 not in output
.output(b => b.detailed(d => 
  d.status(200).body(userSchema)  // Only 200!
))
.errors(e => [
  e().code('NOT_FOUND')  // Where's the 404 output variant?
])
```

Only use `.status()` on errors to override ORPC's default mapping:

```typescript
.output(b => b.detailed(d => 
  d.union(v => [
    v().status(200).body(userSchema),
    v().status(410).body(errorSchema),    // Using 410 instead of 404
  ])
))
.errors(e => [
  e().code('NOT_FOUND').status(410)  // Override: NOT_FOUND → 410
])
```

### Q: What's the difference between error code and output status?

**A: They work together:**

- **Output status** = HTTP status code (200, 404, 500) defined in `.output()`
- **Error code** = ORPC error identifier (NOT_FOUND, UNAUTHORIZED) defined in `.errors()`
- **ORPC maps error codes to statuses** automatically

```typescript
// Output: Define what responses look like
.output(b => b.detailed(d => 
  d.union(v => [
    v().status(200).body(userSchema),        // ← HTTP 200 response structure
    v().status(404).body(errorSchema),       // ← HTTP 404 response structure
  ])
))

// Errors: Define error codes that use those statuses
.errors(e => [
  e().code('NOT_FOUND')  // ← Error code, ORPC maps to 404
])

// In handler:
throw errors.NOT_FOUND()
// ↓ ORPC handles this:
// 1. Looks up NOT_FOUND → 404 mapping
// 2. Finds 404 variant in output union
// 3. Returns 404 response with error structure
```

### Q: Can I have multiple error codes for the same status?

**A: Yes! Multiple error codes can map to the same HTTP status:**

```typescript
.output(b => b.detailed(d => 
  d.union(v => [
    v().status(200).body(userSchema),
    v().status(400).body(errorSchema),       // One status
  ])
))
.errors(e => [
  e().code('INVALID_EMAIL'),                 // → 400
  e().code('INVALID_AGE'),                   // → 400
  e().code('MISSING_FIELD'),                 // → 400
])
```

All three error codes return the 400 variant, but with different error codes in the response body.

### Q: Should I put error statuses in output union?

**A: YES! Always include error statuses in your output union:**

```typescript
// ✅ CORRECT: All statuses in output
.output(b => b.detailed(d => 
  d.union(v => [
    v().status(200).body(successSchema),
    v().status(400).body(errorSchema),
    v().status(404).body(errorSchema),
    v().status(500).body(errorSchema),
  ])
))
.errors(e => [
  e().code('BAD_REQUEST'),        // Uses 400 from output
  e().code('NOT_FOUND'),          // Uses 404 from output
  e().code('INTERNAL_SERVER_ERROR'), // Uses 500 from output
])

// ❌ WRONG: Error statuses missing from output  
.output(b => b.detailed(d => 
  d.status(200).body(successSchema)  // Only success!
))
.errors(e => [
  e().code('NOT_FOUND').status(404),  // Won't work, no 404 in output!
])
```

The output union must include ALL possible HTTP statuses your route can return.

### Q: When do I use `.status()` on errors?

**A: Only for non-standard mappings:**

```typescript
// Standard mapping (no .status() needed)
.errors(e => [
  e().code('NOT_FOUND')  // Automatically uses 404
])

// Custom mapping (needs .status())
.errors(e => [
  e().code('CUSTOM_ERROR').status(503),
  e().code('NOT_FOUND').status(410),  // Override: 410 instead of 404
])

// Make sure output has those statuses:
.output(b => b.detailed(d => 
  d.union(v => [
    v().status(503).body(errorSchema),
    v().status(410).body(errorSchema),
  ])
))
```

---

## Security Best Practices

### ⚠️ Never Include Sensitive Data

Error data is sent to the client. **Never include passwords, tokens, API keys, or PII.**

```typescript
// ❌ NEVER DO THIS
e().code('AUTH_FAILED')
  .data(z.object({ 
    password: z.string(),
    apiKey: z.string()
  }))

// ✅ DO THIS
e().code('AUTH_FAILED')
  .data(z.object({ 
    reason: z.enum(['invalid_credentials', 'expired_token'])
  }))
```

### Provide Safe Error Context

```typescript
// ✅ Good: Generic message with safe context
e().code('VALIDATION_FAILED')
  .message('Input validation failed')
  .data(z.object({ 
    fields: z.array(z.string()) // Field names only
  }))

// ❌ Bad: Exposes internal details
e().code('DB_ERROR')
  .message('Query failed: SELECT * FROM users WHERE password=...')
  .data(z.object({ 
    query: z.string(),
    stack: z.string()
  }))
```

---

## Client-Side Error Handling

### With `safe()` Helper

```typescript
import { safe, isDefinedError } from '@orpc/client';

const [error, data, isDefined] = await safe(
  client.users.read({ params: { id: '123' } })
);

if (isDefinedError(error)) {
  // Handle type-safe defined errors
  if (error.code === 'NOT_FOUND') {
    toast.error('User not found');
  } else if (error.code === 'UNAUTHORIZED') {
    redirect('/login');
  }
} else if (error) {
  // Handle unexpected errors
  toast.error('An unexpected error occurred');
} else {
  // Handle success
  console.log(data);
}
```

### With `try/catch`

```typescript
try {
  const user = await client.users.read({ params: { id: '123' } });
  console.log(user);
} catch (error) {
  if (error.code === 'NOT_FOUND') {
    toast.error('User not found');
  } else if (error.code === 'UNAUTHORIZED') {
    redirect('/login');
  } else {
    toast.error('An unexpected error occurred');
  }
}
```

### With `createSafeClient`

```typescript
import { createSafeClient } from '@orpc/client';

const safeClient = createSafeClient(client);

const [error, data] = await safeClient.users.read({ params: { id: '123' } });

if (error) {
  // Handle error with full type inference
  console.log(error.code, error.message, error.data);
}
```

---

## Type Inference

The error builder provides full TypeScript inference for error structures:

```typescript
const contract = new RouteBuilder()
  .errors(e => [
    e().code('RATE_LIMITED')
      .data(z.object({ retryAfter: z.number() }))
  ])
  .build();

// Client-side usage with type inference
const [error, data] = await safe(client.call());

if (isDefinedError(error) && error.code === 'RATE_LIMITED') {
  // error.data.retryAfter is typed as number ✅
  console.log(`Retry after ${error.data.retryAfter} seconds`);
}
```

---

## Comparison: Before vs After

### Before (No Errors)

```typescript
const userRead = new RouteBuilder()
  .path('/users/:id')
  .method('GET')
  .input(z.object({ params: z.object({ id: z.string() }) }))
  .output(userSchema)
  .build();

// All errors were unknown/untyped on the client
```

### After (With Fluent Errors)

```typescript
const userRead = new RouteBuilder()
  .path('/users/:id')
  .method('GET')
  .input(z.object({ params: z.object({ id: z.string() }) }))
  .output(userSchema)
  .errors(e => [
    e().code('NOT_FOUND').message('User not found').status(404),
    e().code('UNAUTHORIZED').status(401),
    e().code('FORBIDDEN').status(403),
  ])
  .build();

// Clients can now handle errors in a type-safe way
const [error, data] = await safe(client.users.read(...));
if (error?.code === 'NOT_FOUND') { /* Handle 404 */ }
```

---

## Migration Guide

If you're using the old object syntax, no changes are required! Both syntaxes work side-by-side.

### Migrate Gradually

```typescript
// Old code (still works)
.errors({
  NOT_FOUND: { message: 'Not found', status: 404 }
})

// New code (more fluent)
.errors(e => [
  e().code('NOT_FOUND').message('Not found').status(404)
])

// Mix and match if needed
.errors({ NOT_FOUND: { status: 404 } })
.errors(e => [
  e().code('UNAUTHORIZED').status(401)
])
```

---

## Testing

The error builder includes comprehensive tests covering:

✅ Fluent builder syntax  
✅ Backward compatible object syntax  
✅ Data schemas  
✅ Status overrides  
✅ Standard ORPC codes  
✅ Chain order flexibility  
✅ Error validation (missing code)  
✅ Multiple `.errors()` calls (merging)  

Run tests:
```bash
bun test error-builder
```

---

## Summary

The fluent error builder provides a **clean, type-safe way** to define errors that:

1. **Matches the union output pattern** - Same builder syntax for consistency
2. **Integrates with ORPC** - Uses standard error codes and conventions
3. **Maintains backward compatibility** - Object syntax still works
4. **Provides full type safety** - Client-side error handling is fully typed
5. **Follows best practices** - Encourages safe error data patterns

**Next steps**: Use the error builder in your standard operations, combine with union outputs, and leverage type-safe error handling on the client side! 🎉
