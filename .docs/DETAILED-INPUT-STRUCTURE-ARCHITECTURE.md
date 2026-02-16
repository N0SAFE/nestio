# Detailed Input Structure Architecture

## Overview

This document describes the architecture for type-safe, detailed input/output structures in ORPC contracts, where all operations use detailed structure by default with granular, type-safe transformations.

## Core Principles

### 1. Always Detailed Structure

**All inputs use detailed structure by default** with separate sections:
- `params` - Path parameters from URL (e.g., `/{id}`, `/:bucket/objects/*objectName`)
- `query` - Query string parameters (e.g., `?limit=10&offset=0`)
- `body` - Request body (POST/PUT/PATCH payloads)
- `headers` - Request headers (authorization, content-type, etc.)

**Outputs can also use detailed structure**:
- `status` - HTTP status code (200, 404, etc.)
- `headers` - Response headers
- `body` - Response body

### 2. Granular Type-Safe Transformations

Each section (params/query/body/headers) has its own builder with type-safe transformations:

```typescript
.inputBuilder(b => b
  .params.omit(['id'])                    // Transform params only
  .query.extend({ search: z.string() })   // Transform query only
  .body.pick(['name', 'email'])           // Transform body only
  .headers.extend({ 'x-api-key': z.string() }) // Transform headers only
)
```

All transformations are:
- **Type-safe**: TypeScript knows the exact shape at each step
- **Chainable**: Multiple transformations can be applied in sequence
- **Isolated**: Changes to params don't affect query/body/headers

### 3. Standard Operations Provide Defaults

Standard CRUD operations (`read()`, `create()`, `update()`, `delete()`, etc.) provide sensible defaults:

```typescript
// read() provides default params with id field
userOps.read()
  // Default: params: { id: z.uuid() }
  .inputBuilder(b => b.params.extend({ organizationId: z.uuid() }))
  // Result: params: { id: z.uuid(), organizationId: z.uuid() }
  .build();

// create() provides default body with entity schema
userOps.create()
  // Default: body: userSchema
  .inputBuilder(b => b.body.omit(['id', 'createdAt', 'updatedAt']))
  // Result: body: userSchema without generated fields
  .build();

// list() provides default query with pagination
userOps.list()
  // Default: query: { limit, offset, sortBy?, sortDir?, ...filters }
  .inputBuilder(b => b.query.extend({ organizationId: z.uuid() }))
  // Result: query includes pagination + organizationId
  .build();
```

### 4. Custom Contracts Extend From Base

When creating custom operations, start from a configured base:

```typescript
// Start from read() base and customize
const getUserWithTeam = userOps.read()
  .path('/users/{id}/with-team')
  .inputBuilder(b => b
    .params.extend({ includeArchived: z.boolean().optional() })
    .query.extend({ teamId: z.uuid().optional() })
  )
  .outputBuilder(b => b.extend({ 
    team: teamSchema.optional() 
  }))
  .build();

// Start from create() base and customize
const createUserWithInvite = userOps.create()
  .path('/users/invite')
  .inputBuilder(b => b
    .body.omit(['id', 'createdAt'])
         .extend({ inviteCode: z.string() })
  )
  .build();
```

## Architecture Details

### Input Builder Structure

```typescript
// Top-level input builder
inputBuilder(b => {
  // b is DetailedInputBuilder with nested section builders
  b.params  // ParamsSectionBuilder
  b.query   // QuerySectionBuilder
  b.body    // BodySectionBuilder
  b.headers // HeadersSectionBuilder
})

// Each section builder has transformation methods
class ParamsSectionBuilder {
  pick<K extends keyof Params>(keys: K[])
  omit<K extends keyof Params>(keys: K[])
  extend<TExtension>(extension: TExtension)
  partial(keys?: K[])
  required(keys?: K[])
  custom<T>(transform: (schema) => T)
}
```

### Type Safety Flow

```typescript
// 1. Standard operation provides typed defaults
const baseContract = userOps.read()
// Type: { params: { id: UUID } } => UserSchema

// 2. Transform params section
.inputBuilder(b => b.params.extend({ orgId: z.uuid() }))
// Type: { params: { id: UUID, orgId: UUID } } => UserSchema

// 3. Transform output
.outputBuilder(b => b.omit(['password']))
// Type: { params: { id: UUID, orgId: UUID } } => Omit<UserSchema, 'password'>

// 4. Build contract
.build()
// Final typed contract ready to use
```

### Standard Operations Default State Creation

Standard operations automatically create appropriate detailed defaults for both input and output:

### How Default Creation Works

1. **Minimal Initialization**:
   - `createBuilder({ method, ...metadata })` starts with only HTTP method
   - No path, no schemas at this stage

2. **Builder Composition in Standard Methods**:
   - Standard methods use `.pathWithParams()` to define path AND params together
   - Then `.outputBuilder()` sets default output structure
   - Optional: `.inputBuilder()` adds query/body/headers

3. **User Customization**:
   - Users chain `.pathWithParams()` to replace path and params together
   - Chain `.inputBuilder()` to add query/body/headers
   - Chain `.outputBuilder()` to customize response

4. **Final Build**:
   - `.build()` creates immutable contract
   - Auto-detection analyzes the final schema shape
   - Metadata (inputStructure, outputStructure) is set automatically

### createBuilder Signature

```typescript
// ONLY accepts method - no path, no schemas
createBuilder(config: {
  method: HTTPMethod;
  summary?: string;
  description?: string;
  tags?: string[];
}): RouteBuilder
```

### pathWithParams Method Signature

```typescript
// Define path AND params in single call
pathWithParams<TParams>(
  builder: (p: PathParamBuilder) => string
): RouteBuilder<TParams, ...>

// PathParamBuilder collects params while building path
interface PathParamBuilder {
  // Regular param: returns ':name', registers schema
  <T extends z.ZodType>(name: string, schema: T): `:${string}`;
  
  // Wildcard param: returns '*name', registers schema
  wildcard<T extends z.ZodType>(name: string, schema: T): `*${string}`;
}

// Example:
.pathWithParams(p => `/${p('bucket', z.string())}/objects/${p.wildcard('key', z.string())}`)
// Path: '/:bucket/objects/*key'
// Params: { bucket: string, key: string }
```

**Why This Design?**
- **Type safety at compile time**: Can't use undefined params in path
- **Bidirectional validation**: All params must be used in path
- **Clear dependency order**: params → path → output
- **Explicit and predictable**: No magic extraction from path strings

### Standard Methods Default Configuration

**Important Principle**: `createBuilder()` is only for simple state initialization. All standard methods use builders for composition, not pre-built schemas.

#### read()

```typescript
read() {
  // Use builder pattern for default state composition
  return this.createBuilder({ method: 'GET' })
    .pathWithParams(p => `/${p(this.idFieldName, this.idSchema)}`)
    // Path: '/:id', Params: { id: UUID }
    .outputBuilder(b => b.detailed(d => d
      .status(200)
      .body(this.entitySchema)
    ));
  // Returns builder for further customization
}
```

**Example with composite key**:
```typescript
objectOps.read()
  .pathWithParams(p => 
    `/${p('bucket', z.string())}/objects/${p.wildcard('objectName', z.string())}/stat`
  )
// Path: '/:bucket/objects/*objectName/stat'
// Params: { bucket: string, objectName: string }
// Output: { status: 200, body: objectSchema }
```

#### create()

```typescript
create() {
  // Use builder pattern for default state composition
  return this.createBuilder({ method: 'POST' })
    .pathWithParams(() => '/')  // Static path, no params
    .inputBuilder(b => b
      .body(this.createSchema || this.entitySchema)
    )
    .outputBuilder(b => b.detailed(d => d
      .status(201)
      .body(this.entitySchema)
    ));
}
```

**Example with parent params**:
```typescript
objectOps.create()
  .pathWithParams(p => `/${p('bucket', z.string())}/objects`)
  .inputBuilder(b => b
    .body(objectCreateSchema)
  )
// Path: '/:bucket/objects'
// Params: { bucket: string }
// Body: objectCreateSchema
// Output: { status: 201, body: objectSchema }
```

#### update()

```typescript
update(options?: { supportNotModified?: boolean }) {
  const { supportNotModified = false } = options ?? {};
  
  // Use builder pattern with pathWithParams
  const builder = this.createBuilder({ method: 'PUT' })
    .pathWithParams(p => `/${p(this.idFieldName, this.idSchema)}`)
    .inputBuilder(b => b
      .body(this.updateSchema || this.entitySchema.partial())
    );
  
  // Compose output with union if supporting 304
  if (supportNotModified) {
    return builder.outputBuilder(b => b.detailed(d => d.union([
      d.variant()
        .status(200)
        .description('Entity updated')
        .body(this.entitySchema),
      d.variant()
        .status(304)
        .description('Not modified')
        .body(z.void())
    ])));
  }
  
  return builder.outputBuilder(b => b.detailed(d => d
    .status(200)
    .body(this.entitySchema)
  ));
}
```

**Example with composite key and ETag support**:
```typescript
objectOps.update({ supportNotModified: true })
  .pathWithParams(p => 
    `/${p('bucket', z.string())}/objects/${p.wildcard('objectName', z.string())}`
  )
// Path: '/:bucket/objects/*objectName'
// Params: { bucket, objectName }
// Body: objectUpdateSchema
// Output: Union<{ status: 200 }, { status: 304 }>
```

#### delete()

```typescript
delete() {
  // Use builder pattern with pathWithParams
  return this.createBuilder({ method: 'DELETE' })
    .pathWithParams(p => `/${p(this.idFieldName, this.idSchema)}`)
    .outputBuilder(b => b.detailed(d => d
      .status(204)
      .body(z.void())
    ));
}
```

**Example with composite key**:
```typescript
objectOps.delete()
  .pathWithParams(p => 
    `/${p('bucket', z.string())}/objects/${p.wildcard('objectName', z.string())}`
  )
// Path: '/:bucket/objects/*objectName'
// Params: { bucket, objectName }
// Output: { status: 204, body: void }
```

#### list()

```typescript
list() {
  // Use builder pattern with pathWithParams
  return this.createBuilder({ method: 'GET' })
    .pathWithParams(() => '/')  // Static path, no params
    .inputBuilder(b => b
      .query(this.paginationSchema)
    )
    .outputBuilder(b => b.detailed(d => d
      .status(200)
      .body(z.object({
        items: z.array(this.entitySchema),
        total: z.number(),
        page: z.number(),
        limit: z.number()
      }))
    ));
}
```

**Example with parent params**:
```typescript
objectOps.list()
  .pathWithParams(p => `/${p('bucket', z.string())}/objects`)
  .inputBuilder(b => b
    .query(z.object({
      prefix: z.string().optional(),
      delimiter: z.string().optional(),
      maxKeys: z.number().optional(),
      marker: z.string().optional()
    }))
  )
// Path: '/:bucket/objects'
// Params: { bucket }
// Query: { prefix?, delimiter?, maxKeys?, marker? }
// Output: { status: 200, body: { items, total, page, limit } }
```

### Customization Flow

Standard methods use builders to create defaults, then return the builder for further customization:

```typescript
// 1. Standard method creates defaults using pathWithParams
objectOps.read()
// Internally creates:
// .pathWithParams(p => `/${p('id', z.uuid())}`)
// .outputBuilder(b => b.detailed(d => d.status(200).body(objectSchema)))

// 2. User replaces path AND params with composite key (single call)
.pathWithParams(p => 
  `/${p('bucket', z.string().min(3).max(63).regex(/^[a-z0-9-]+$/))}/objects/${p.wildcard('objectName', z.string().min(1).max(1024))}/stat`
)
// Path: '/:bucket/objects/*objectName/stat'
// Params: { bucket, objectName } - automatically derived

// 3. Optionally add query/headers via inputBuilder
.inputBuilder(b => b
  .headers(z.object({ 'if-none-match': z.string().optional() }))
)

// 4. Customize output
.outputBuilder(b => b.detailed(d => d
  .status(200)
  .headers({ 'etag': z.string(), 'content-type': z.string() })
  .body(objectSchema.extend({ url: z.string() }))
))

// 5. Build final contract
.build()
// Auto-detects: inputStructure = 'detailed', outputStructure = 'detailed'
```

**Key Points:**
- `createBuilder({ method })` initializes with ONLY method
- `.pathWithParams(p => ...)` defines path AND params together (single source of truth)
- `.inputBuilder()` adds query/body/headers (optional, for non-param input)
- `.outputBuilder()` defines response structure
- Each builder call replaces the previous configuration for that section
- Final `.build()` creates the immutable contract

### Union Support for Error Responses

```typescript
objectOps.create()
  .pathWithParams(p => `/${p('bucket', z.string())}/objects`)
  .inputBuilder(b => b.body(objectCreateSchema))
  .outputBuilder(b => b.detailed(d => d.union([
    d.variant()
      .status(201)
      .description('Object created')
      .headers({ 'etag': z.string() })
      .body(objectSchema),
    d.variant()
      .status(409)
      .description('Object already exists')
      .body(z.object({ error: z.string() })),
    d.variant()
      .status(507)
      .description('Insufficient storage')
      .body(z.object({ error: z.string() }))
  ])))
// Output: Union<
//   { status: 201, headers: {...}, body: objectSchema },
//   { status: 409, body: { error: string } },
//   { status: 507, body: { error: string } }
// >
```

This generates complete OpenAPI specs with all possible response codes.

## Complete Flow Example: read() Standard Method

### Step 1: Standard Method Invocation

```typescript
// User calls the standard read method
const objectStatContract = objectOps.read();
// Returns builder with default path/params, ready for customization
```

### Step 2: Internal Builder Composition (in standard method)

```typescript
// Inside the read() method implementation
read() {
  // 2.1: Create minimal builder with only method
  const builder = this.createBuilder({
    method: 'GET',
    summary: `Get ${this.entityName} by id`,
    description: `Retrieve a specific ${this.entityName}`
  });
  
  // 2.2: Define path AND params together (single source of truth)
  const withPathParams = builder.pathWithParams(p => 
    `/${p(this.idFieldName, this.idSchema)}`
  );
  // Path: '/:id'
  // Params: { id: UUID } - automatically derived from pathWithParams
  
  // 2.3: Compose output defaults using builder
  const withOutput = withPathParams.outputBuilder(b => 
    b.detailed(d => d
      .status(200)
      .body(this.entitySchema)
    )
  );
  
  // 2.4: Return builder for further customization
  return withOutput;
}
```

At this point, the contract has:
- **Path**: `/:id`
- **Input**: `{ params: { id: UUID } }` (derived from pathWithParams)
- **Output**: `{ status: 200, body: EntitySchema }`

### Type-Safe Path + Params Definition (Combined)

**Problem with separate definition:**
- Path and params defined separately can get out of sync
- User can forget params or use wrong names
- Two sources of truth

**Solution: Define path AND params together using a builder function:**

```typescript
// Single source of truth: path template with inline param schemas
.pathWithParams(p => 
  `/${p('bucket', z.string().min(3).max(63))}/objects/${p.wildcard('objectName', z.string())}/stat`
)
// Result:
// - path: '/:bucket/objects/*objectName/stat'
// - params: z.object({ bucket: z.string().min(3).max(63), objectName: z.string() })
```

**PathParamBuilder signature:**

```typescript
type PathParamBuilder = {
  // Regular param - produces ':paramName'
  <T extends z.ZodType>(name: string, schema: T): `:${string}`;
  
  // Wildcard param - produces '*paramName' (catch-all for paths with slashes)
  wildcard<T extends z.ZodType>(name: string, schema: T): `*${string}`;
  
  // Access collected params schema after building
  _params: Record<string, z.ZodType>;
}
```

**How it works:**

```typescript
.pathWithParams(p => {
  // Each call to p() or p.wildcard() registers the param schema
  // and returns the placeholder string
  
  const bucket = p('bucket', z.string().min(3));     // Returns ':bucket', registers schema
  const obj = p.wildcard('objectName', z.string());   // Returns '*objectName', registers schema
  
  return `/${bucket}/objects/${obj}/stat`;
  // Final: '/:bucket/objects/*objectName/stat'
})
// Params schema automatically built: z.object({ bucket: ..., objectName: ... })
```

**Full example with type inference:**

```typescript
const objectStatContract = objectOps.read()
  .pathWithParams(p => 
    `/${p('bucket', z.string().min(3).max(63).regex(/^[a-z0-9-]+$/))}/objects/${p.wildcard('objectName', z.string().min(1).max(1024))}/stat`
  )
  // Type of input.params is now: { bucket: string, objectName: string }
  // Path is: '/:bucket/objects/*objectName/stat'
  
  // Can still add query/body/headers via inputBuilder
  .inputBuilder(b => b
    .query(z.object({ versionId: z.string().optional() }))
    .headers(z.object({ 'if-none-match': z.string().optional() }))
  )
  
  .outputBuilder(b => b.detailed(d => d
    .status(200)
    .body(objectSchema)
  ))
  .build();
```

**Benefits:**
1. **Single source of truth**: Path and params defined together
2. **Type safety**: Can't have mismatched params
3. **Inline validation**: Schema validation right where param is used
4. **Clear intent**: Reading the path shows exactly what params exist and their types
5. **No duplication**: Don't repeat param names in two places

### Step 3: User Customization

```typescript
const objectStatContract = objectOps.read()
  // 3.1: Replace path AND params with composite key (single call)
  .pathWithParams(p => 
    `/${p('bucket', z.string().min(3).max(63).regex(/^[a-z0-9-]+$/).describe('S3 bucket name'))}/objects/${p.wildcard('objectName', z.string().min(1).max(1024).describe('Object key path'))}/stat`
  )
  // Path: '/:bucket/objects/*objectName/stat'
  // Params: { bucket, objectName } - derived automatically
  
  // 3.2: Add headers (optional, for non-param input)
  .inputBuilder(b => b
    .headers(z.object({
      'if-none-match': z.string().optional().describe('ETag for conditional request')
    }))
  )
  
  // 3.3: Customize output with union for multiple status codes
  .outputBuilder(b => b.detailed(d => d.union([
    d.variant()
      .status(200)
      .description('Object metadata retrieved')
      .headers({
        'etag': z.string(),
        'content-type': z.string(),
        'content-length': z.string(),
        'last-modified': z.string()
      })
      .body(objectSchema.extend({
        url: z.string().url().describe('Presigned download URL')
      })),
    d.variant()
      .status(304)
      .description('Not modified (ETag match)')
      .headers({
        'etag': z.string()
      })
      .body(z.void()),
    d.variant()
      .status(404)
      .description('Object not found')
      .body(z.object({
        error: z.string(),
        code: z.literal('NoSuchKey')
      }))
  ])));
```

### Step 4: Final Build

```typescript
const finalContract = objectStatContract.build();

// Final contract has:
// Input: {
//   params: {
//     bucket: string (min:3, max:63, regex),
//     objectName: string (min:1, max:1024)
//   },
//   headers: {
//     'if-none-match'?: string
//   }
// }
//
// Output: Union<
//   {
//     status: 200,
//     headers: { etag, content-type, content-length, last-modified },
//     body: ObjectSchema & { url: string }
//   },
//   {
//     status: 304,
//     headers: { etag },
//     body: void
//   },
//   {
//     status: 404,
//     body: { error: string, code: 'NoSuchKey' }
//   }
// >
```

### Step 5: Auto-Detection During Build

```typescript
// When .build() is called, RouteBuilder analyzes the schema:

build() {
  const finalInput = this.getInputSchema();
  const finalOutput = this.getOutputSchema();
  
  // Auto-detect input structure
  if (finalInput.shape.params || finalInput.shape.query) {
    this.routeMetadata.inputStructure = 'detailed';
  }
  
  // Auto-detect output structure
  if (finalOutput._def.typeName === 'ZodUnion') {
    // Check first variant
    const firstVariant = finalOutput.options[0];
    if (firstVariant.shape.status) {
      this.routeMetadata.outputStructure = 'detailed';
    }
  }
  
  return oc.route({
    method: this.method,
    path: this.path,
    inputStructure: 'detailed',
    outputStructure: 'detailed',
    ...this.routeMetadata
  })
    .input(finalInput)
    .output(finalOutput);
}
```

### Complete Flow Diagram

```
User Call
   ↓
objectOps.read()
   ↓
Standard Method (read)
   ├─ createBuilder({ method: 'GET' })  ← Only method
   │    └─ Minimal state
   │
   ├─ .pathWithParams(p => `/${p('id', z.uuid())}`)
   │    └─ Defines path AND params together
   │    └─ Path: '/:id', Params: { id: UUID }
   │
   └─ .outputBuilder(b => b.detailed(d => d
          .status(200)
          .body(entitySchema)
      ))
       └─ Composes default output
   ↓
Returns RouteBuilder (with defaults)
   ↓
User Customization
   ├─ .pathWithParams(p => ...)  ← REPLACES path + params together
   ├─ .inputBuilder(b => ...)    ← Adds query/headers (optional)
   └─ .outputBuilder(b => ...)   ← REPLACES output
   ↓
.build()
   ├─ Auto-detect structures
   └─ Generate ORPC contract
   ↓
Final Immutable Contract
```

### Key Takeaways

1. **Single source of truth**: `pathWithParams()` defines path AND params together
2. **Type-safe path**: Param schemas defined inline in path template
3. **Wildcard support**: Use `p.wildcard('name', schema)` for catch-all params
4. **No synchronization issues**: Can't define fewer params than used in path
5. **inputBuilder for extras**: Use for query/body/headers (non-param input)
6. **User customizations replace defaults**: No merging, explicit behavior
7. **Auto-detection at build**: Detects structures from schema shape

| Operation | Default Params | Default Query | Default Body | Default Output |
|-----------|---------------|---------------|--------------|----------------|
| `read()` | `{ id: uuid }` | - | - | `entitySchema` |
| `create()` | - | - | `entitySchema` | `entitySchema` |
| `update()` | `{ id: uuid }` | - | `entitySchema` | `entitySchema` |
| `patch()` | `{ id: uuid }` | - | `partial(entitySchema)` | `entitySchema` |
| `delete()` | `{ id: uuid }` | - | - | `{ success, message? }` |
| `list()` | - | `{ pagination, sorting, filtering }` | - | `{ data: [], meta }` |
| `exists()` | `{ id: uuid }` | - | - | `{ exists: boolean }` |
| `count()` | - | `{ filtering }` | - | `{ count: number }` |

### Composite Key Support

For resources with composite keys (e.g., S3 objects with bucket + objectName):

```typescript
// Object operations use composite params
const objectOps = standard(objectSchema, 'object');

objectOps.read({ 
  path: '/:bucket/objects/*objectName/stat' 
})
// Default params: { bucket, objectName } detected from path
.inputBuilder(b => b
  .params.extend({ version: z.string().optional() })
  // Result: { bucket, objectName, version? }
)
.build();
```

### Output Structure Configuration

Output structure can be compact (default) or detailed:

```typescript
// Compact output (default)
.outputBuilder(b => b.omit(['password']))
// Returns: Omit<UserSchema, 'password'>

// Detailed output with single status
.outputBuilder(b => b.detailed(d => d
  .status(200)
  .headers({ 'x-rate-limit': z.string() })
  .body(userSchema.omit(['password']))
))
// Returns: { status: 200, headers: {...}, body: Omit<UserSchema, 'password'> }

// Detailed output with union (multiple response variants)
.outputBuilder(b => b.detailed(d => d.union([
  d.variant()
    .status(201)
    .description('Record created')
    .body(z.string()),
  d.variant()
    .status(200)
    .description('Record updated')
    .body(z.string()),
])))
// Returns: Union<
//   { status: 201, body: string },
//   { status: 200, body: string }
// >
```

This generates proper OpenAPI specs with multiple response codes.

## Utility Types

### Contract Type Inference

```typescript
import type { InferInput, InferOutput, InferParams, InferQuery, InferBody, InferHeaders } from '@repo/orpc-utils';

// Infer full input/output types
type Input = InferInput<typeof objectStatContract>;
// { params: { bucket: string, objectName: string }, headers?: { 'if-none-match'?: string } }

type Output = InferOutput<typeof objectStatContract>;
// Union<{ status: 200, body: ObjectSchema }, { status: 304, body: void }, { status: 404, body: { error: string } }>
```

### Section Type Inference

```typescript
// Infer individual sections from input
type Params = InferParams<typeof objectStatContract>;
// { bucket: string, objectName: string }

type Query = InferQuery<typeof objectStatContract>;
// {} (empty if not defined)

type Body = InferBody<typeof objectStatContract>;
// void (no body for GET)

type Headers = InferHeaders<typeof objectStatContract>;
// { 'if-none-match'?: string }
```

### Output Section Inference

```typescript
// Infer from detailed output
type OutputBody = InferOutputBody<typeof objectStatContract>;
// ObjectSchema | void | { error: string } (union of all body types)

type OutputHeaders = InferOutputHeaders<typeof objectStatContract>;
// { etag: string, 'content-type': string, ... } | { etag: string } | {} (union)

type OutputStatus = InferOutputStatus<typeof objectStatContract>;
// 200 | 304 | 404 (literal union of all status codes)
```

### Structure Detection Types

```typescript
// Check if contract uses detailed structure
type HasDetailedInput<T> = T extends { params: any } | { query: any } | { body: any } | { headers: any } 
  ? true 
  : false;

type HasDetailedOutput<T> = T extends { status: any; body: any } 
  ? true 
  : false;

type IsUnionOutput<T> = T extends z.ZodUnion<any> 
  ? true 
  : false;

// Usage
type IsDetailed = HasDetailedInput<InferInput<typeof objectStatContract>>;
// true

type IsOutputUnion = IsUnionOutput<InferOutput<typeof objectStatContract>>;
// true
```

### Status Code Extraction

```typescript
// Extract all status codes from union output
type ExtractStatusCodes<T> = T extends { status: infer S } 
  ? S 
  : never;

type StatusCodes = ExtractStatusCodes<InferOutput<typeof objectStatContract>>;
// 200 | 304 | 404

// Extract body for specific status code
type ExtractBodyForStatus<T, S extends number> = T extends { status: S; body: infer B } 
  ? B 
  : never;

type SuccessBody = ExtractBodyForStatus<InferOutput<typeof objectStatContract>, 200>;
// ObjectSchema & { url: string }

type NotFoundBody = ExtractBodyForStatus<InferOutput<typeof objectStatContract>, 404>;
// { error: string, code: 'NoSuchKey' }
```

### Path and Method Inference

```typescript
// Infer route metadata
type InferPath<T> = T extends { path: infer P } ? P : never;
type InferMethod<T> = T extends { method: infer M } ? M : never;

type Path = InferPath<typeof objectStatContract>;
// '/:bucket/objects/*objectName/stat'

type Method = InferMethod<typeof objectStatContract>;
// 'GET'
```

### Param Keys Extraction

```typescript
// Extract param names from contract
type ParamKeys<T> = keyof InferParams<T>;

type Keys = ParamKeys<typeof objectStatContract>;
// 'bucket' | 'objectName'

// Check if a specific param exists
type HasParam<T, K extends string> = K extends ParamKeys<T> ? true : false;

type HasBucket = HasParam<typeof objectStatContract, 'bucket'>;
// true

type HasId = HasParam<typeof objectStatContract, 'id'>;
// false
```

### Full Contract Metadata Type

```typescript
// Comprehensive contract metadata type
type ContractMetadata<T> = {
  // Route info
  path: InferPath<T>;
  method: InferMethod<T>;
  
  // Input structure
  hasDetailedInput: HasDetailedInput<InferInput<T>>;
  params: InferParams<T>;
  query: InferQuery<T>;
  body: InferBody<T>;
  headers: InferHeaders<T>;
  
  // Output structure
  hasDetailedOutput: HasDetailedOutput<InferOutput<T>>;
  isUnionOutput: IsUnionOutput<InferOutput<T>>;
  statusCodes: ExtractStatusCodes<InferOutput<T>>;
  outputBody: InferOutputBody<T>;
  outputHeaders: InferOutputHeaders<T>;
};

// Usage
type Metadata = ContractMetadata<typeof objectStatContract>;
// {
//   path: '/:bucket/objects/*objectName/stat',
//   method: 'GET',
//   hasDetailedInput: true,
//   params: { bucket: string, objectName: string },
//   query: {},
//   body: void,
//   headers: { 'if-none-match'?: string },
//   hasDetailedOutput: true,
//   isUnionOutput: true,
//   statusCodes: 200 | 304 | 404,
//   outputBody: ObjectSchema | void | { error: string },
//   outputHeaders: { etag: string, ... } | { etag: string } | {}
// }
```

### Utility Type Implementations

```typescript
// packages/utils/orpc/src/types/inference.ts

import type { z } from 'zod/v4';

// Input inference
export type InferInput<T> = T extends { input: infer I } 
  ? I extends z.ZodType ? z.infer<I> : never 
  : never;

export type InferOutput<T> = T extends { output: infer O } 
  ? O extends z.ZodType ? z.infer<O> : never 
  : never;

// Section inference (from detailed input)
export type InferParams<T> = InferInput<T> extends { params: infer P } ? P : {};
export type InferQuery<T> = InferInput<T> extends { query: infer Q } ? Q : {};
export type InferBody<T> = InferInput<T> extends { body: infer B } ? B : void;
export type InferHeaders<T> = InferInput<T> extends { headers: infer H } ? H : {};

// Output section inference
export type InferOutputBody<T> = InferOutput<T> extends { body: infer B } 
  ? B 
  : InferOutput<T>;

export type InferOutputHeaders<T> = InferOutput<T> extends { headers: infer H } 
  ? H 
  : {};

export type InferOutputStatus<T> = InferOutput<T> extends { status: infer S } 
  ? S 
  : never;

// Structure detection
export type HasDetailedInput<T> = InferInput<T> extends 
  | { params: any } 
  | { query: any } 
  | { body: any } 
  | { headers: any }
  ? true
  : false;

export type HasDetailedOutput<T> = InferOutput<T> extends { status: any; body: any }
  ? true
  : false;

export type IsUnionOutput<T> = T extends { output: z.ZodUnion<any> }
  ? true
  : false;

// Status code utilities
export type ExtractStatusCodes<T> = InferOutput<T> extends { status: infer S }
  ? S
  : never;

export type ExtractBodyForStatus<T, S extends number> = 
  InferOutput<T> extends { status: S; body: infer B }
    ? B
    : never;

export type ExtractHeadersForStatus<T, S extends number> = 
  InferOutput<T> extends { status: S; headers: infer H }
    ? H
    : {};

// Path utilities
export type InferPath<T> = T extends { path: infer P } ? P : never;
export type InferMethod<T> = T extends { method: infer M } ? M : never;

// Param utilities
export type ParamKeys<T> = keyof InferParams<T>;
export type HasParam<T, K extends string> = K extends ParamKeys<T> ? true : false;
```

## Implementation Strategy

### Phase 1: Core Builder Architecture ✅
- [x] DetailedInputBuilder class
- [x] Auto-detection of detailed vs compact structure
- [x] Basic params/query/body/headers methods

### Phase 2: Section Builders (NEXT)
- [ ] ParamsSectionBuilder with transformations
- [ ] QuerySectionBuilder with transformations
- [ ] BodySectionBuilder with transformations
- [ ] HeadersSectionBuilder with transformations
- [ ] Type-safe chaining between sections

### Phase 3: Standard Operations Defaults
- [ ] Update read() with default params config
- [ ] Update create() with default body config
- [ ] Update update()/patch() with defaults
- [ ] Update list() with default query config
- [ ] Add composite key detection from path

### Phase 4: Output Structure Support
- [ ] DetailedOutputBuilder for status/headers/body
- [ ] OutputSectionBuilder transformations
- [ ] Auto-detection for output structure

## Usage Examples

### Example 1: Simple Read with Extended Params

```typescript
const getUserInOrg = userOps.read()
  .inputBuilder(b => b.params.extend({ 
    organizationId: z.uuid() 
  }))
  .build();

// Type: { params: { id: UUID, organizationId: UUID } } => UserSchema
// Path: GET /{id}?organizationId=...
```

### Example 2: Create with Body Transformations

```typescript
const createUser = userOps.create()
  .inputBuilder(b => b.body
    .omit(['id', 'createdAt', 'updatedAt'])
    .extend({ inviteCode: z.string().optional() })
  )
  .build();

// Type: { body: Omit<UserSchema, 'id'|'createdAt'|'updatedAt'> & { inviteCode?: string } } => UserSchema
```

### Example 3: List with Query Filters

```typescript
const listUsersInOrg = userOps.list()
  .inputBuilder(b => b
    .params.extend({ organizationId: z.uuid() })
    .query.extend({ role: z.enum(['admin', 'user', 'guest']) })
  )
  .build();

// Type: { 
//   params: { organizationId: UUID },
//   query: { limit, offset, sortBy?, sortDir?, role }
// } => { data: UserSchema[], meta: {...} }
```

### Example 4: Composite Key Operations

```typescript
const objectOps = standard(objectSchema, 'object');

const getObjectMetadata = objectOps.read({ 
  path: '/:bucket/objects/*objectName/stat' 
})
  .inputBuilder(b => b
    .params.extend({ version: z.string().optional() })
    .query.extend({ includeMetadata: z.boolean().default(true) })
  )
  .build();

// Type: { 
//   params: { bucket: string, objectName: string, version?: string },
//   query: { includeMetadata: boolean }
// } => ObjectSchema
```

### Example 5: Detailed Output Structure

```typescript
const headObject = objectOps.read({ path: '/:bucket/objects/*objectName' })
  .method('HEAD')
  .outputBuilder(b => b.detailed(d => d
    .status(200)
    .headers({
      'content-length': z.string(),
      'content-type': z.string(),
      'etag': z.string(),
      'last-modified': z.string(),
    })
    .body(z.null())
  ))
  .build();

// Type: { params: { bucket, objectName } } => { 
//   status: 200, 
//   headers: { ... }, 
//   body: null 
// }
```

## Benefits

1. **Type Safety**: Every transformation is type-checked at compile time
2. **Discoverability**: IDE autocomplete shows available fields and methods
3. **Reusability**: Standard operations provide consistent defaults
4. **Flexibility**: Full customization while maintaining type safety
5. **Clarity**: Clear separation between params/query/body/headers
6. **Composability**: Build complex contracts from simple base operations
7. **OpenAPI Integration**: Union outputs generate complete spec with all response codes

## Key Architectural Decisions

1. **Always Detailed by Default**: Input structure is ALWAYS detailed for standard operations
2. **Single Source of Truth**: `pathWithParams()` defines path AND params together - no synchronization issues
3. **Type-Safe Path Builder**: `p('name', schema)` returns placeholder and registers schema
4. **createBuilder Simplicity**: `createBuilder()` only accepts `{ method, ...metadata }` - no path, no schemas
5. **inputBuilder for Extras**: Used for query/body/headers (not params, which come from pathWithParams)
6. **Granular Transformations**: Type-safe transformations on query/body/headers individually
7. **Auto-Detection**: RouteBuilder automatically detects structure mode from schema shape
8. **Union Support**: Output can define multiple status variants for OpenAPI spec generation
9. **Replacement, Not Merge**: Each builder call replaces previous config for that section

### Path/Params Type Safety

```typescript
// PathParamBuilder collects params while building path
interface PathParamBuilder {
  // Regular param: returns ':name', registers schema
  <T extends z.ZodType>(name: string, schema: T): `:${string}`;
  
  // Wildcard param: returns '*name', registers schema
  wildcard<T extends z.ZodType>(name: string, schema: T): `*${string}`;
}

// Example usage - path and params in single call
.pathWithParams(p => 
  `/${p('bucket', z.string().min(3))}/objects/${p.wildcard('key', z.string())}`
)
// Result:
// - Path: '/:bucket/objects/*key'
// - Params: z.object({ bucket: z.string().min(3), key: z.string() })
// - Type of params: { bucket: string, key: string }
```

**No synchronization issues:**
```typescript
// ✅ Impossible to define fewer params than used
// The path IS the params definition

// ✅ Impossible to use undefined params
// Params only exist if p() is called in the path

// ✅ Schema validation inline
// `p('bucket', z.string().min(3))` - validation right where used
```

### Type Safety Guarantees

- Full type inference through all transformations
- Compile-time param type derivation from pathWithParams
- Type-safe union discrimination by status code
- OpenAPI spec accurately reflects runtime types
- No runtime schema merging - explicit replacement keeps behavior predictable

## Migration Path

Existing contracts can migrate gradually:

```typescript
// Before (manual detailed structure)
const contract = oc.route({ ... })
  .input(z.object({
    params: z.object({ id: z.uuid() }),
    query: z.object({ includeArchived: z.boolean() })
  }))
  .output(userSchema);

// After (standard operation with transformations)
const contract = userOps.read()
  .inputBuilder(b => b.query.extend({ 
    includeArchived: z.boolean() 
  }))
  .build();
```

## Questions to Confirm

1. **Section builders**: Should each section (params/query/body/headers) have ALL Zod transformation methods (pick, omit, extend, partial, required, etc.)?

2. **Default detection**: Should params be auto-detected from path parameters (e.g., `/:bucket/objects/*objectName` → `{ bucket: string, objectName: string }`)?

3. **Nested structures**: Should we support nested transformations like `b.params.nested('address').omit(['zipCode'])`?

4. **Output transformations**: Should output sections (status/headers/body) have the same transformation methods as input?

5. **Validation**: Should section builders validate that params match path parameters at build time?
