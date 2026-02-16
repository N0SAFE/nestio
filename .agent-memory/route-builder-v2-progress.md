# Route Builder V2 - Standard Schema Migration Progress

## Session Date
2025-01-XX (Current)

## Objective
Implement missing APIs in route-builder-v2 to match v1 API completely.

## Test File
`packages/utils/orpc/src/standard/v2/base/usage/standard.ts` - Contains all v1 API usage examples for testing v2.

## Completed Implementations

### 1. Two-Level Output API (Previous Session)
**Status:** ✅ Complete
- Level 1: `.output(b => ...)` where `b` is `OutputSchemaProxy` with `.detailed()`, `.streamed()`
- Level 2: `.output(b => b.detailed(d => ...))` where `d` is `DetailedOutputBuilder` with `.body()`, `.status()`, `.headers()`, `.union()`

### 2. `errors()` Callback Pattern
**Status:** ✅ Complete
**Files Modified:**
- [error-builder.ts](packages/utils/orpc/src/builder/route-builder-v2/error-builder.ts)
- [route-builder.ts](packages/utils/orpc/src/builder/route-builder-v2/route-builder.ts)

**Changes:**
- Added `code()` method to `ErrorDefinitionBuilder` for fluent chaining
- Added optional code parameter to constructor
- Updated `error()` factory to support zero-arg call: `error().code("...")` 
- Added callback overload to `RouteBuilder.errors()` method

**Usage Pattern Now Supported:**
```typescript
.errors((e) => [
    e().code("NOT_FOUND").data(schema).status(404),
    e().code("UNAUTHORIZED").data(schema).status(401),
])
```

### 3. `params()` Template Literal Support  
**Status:** ✅ Complete
**Files Modified:**
- [input-builder.ts](packages/utils/orpc/src/builder/route-builder-v2/input-builder.ts)

**Overloads Added:**
1. Template literal callback: `params(p => p\`/path/${p("id", schema)}\`)`
2. Object + template: `params({ id: schema }, p => p\`/path/${p.id}\`)`
3. Builder callback: `params(p => p.schema(...))`
4. Direct schema: `params(schema)`
5. Object-only: `params({ id: schema })` - add/override param types without path change

### 4. `headers()` Raw Shape Support
**Status:** ✅ Complete
**Files Modified:**
- [input-builder.ts](packages/utils/orpc/src/builder/route-builder-v2/input-builder.ts)

**Overload Added:**
```typescript
.headers({ "if-match": z.string() })  // Raw shape pattern
```

## Final Status

**✅ ALL IMPLEMENTATIONS COMPLETE** - Type-check passes with 0 errors!

The usage file at `packages/utils/orpc/src/standard/v2/base/usage/standard.ts` validates all v2 APIs match v1.

## File Summary

| File | Purpose | Status |
|------|---------|--------|
| error-builder.ts | Error definition builders | ✅ Complete |
| route-builder.ts | Main RouteBuilder class | ✅ Complete |
| input-builder.ts | DetailedInputBuilder | ✅ Complete |
| output-builder.ts | OutputSchemaProxy, DetailedOutputBuilder | ✅ Complete |
| standard-operations.ts | Standard CRUD operations | ✅ Complete |

## APIs Implemented

1. **Output API** - Two-level `.output(b => b.detailed(d => ...))`
2. **Errors API** - Callback pattern `.errors((e) => [...])`
3. **Params API** - Template literals `.params(p => p\`/path/${p("id", schema)}\`)`
4. **Headers API** - Raw shape `.headers({ "if-match": z.string() })`
5. **Standard Operations** - All CRUD operations with aggregate support
