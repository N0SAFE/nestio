/**
 * Example: Using Fluent Error Builder with Standard Operations
 * 
 * This example demonstrates how to add type-safe error definitions
 * to standard CRUD operations using the new fluent error builder syntax.
 */

import { z } from 'zod/v4';
import { standard } from '../src/standard/standard-operations';

// Define your entity schema
const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  age: z.number().int().min(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Create standard operations builder
const userOps = standard.zod(userSchema, 'user');

/**
 * Example 1: Simple error definitions
 */
export const userRead = userOps
  .read()
  .errors(e => [
    e().code('NOT_FOUND').message('User not found').status(404),
    e().code('UNAUTHORIZED').status(401),
  ])
  .build();

/**
 * Example 2: Errors with data schemas
 */
export const userCreate = userOps
  .create()
  .errors(e => [
    e().code('VALIDATION_FAILED')
      .message('User validation failed')
      .data(z.object({ 
        fields: z.array(z.string()),
        errors: z.record(z.string(), z.string())
      }))
      .status(422),
    e().code('CONFLICT')
      .message('Email already exists')
      .status(409),
  ])
  .build();

/**
 * Example 3: Standard ORPC error codes
 */
export const userUpdate = userOps
  .update()
  .errors(e => [
    e().code('BAD_REQUEST').message('Invalid input').status(400),
    e().code('UNAUTHORIZED').message('Not authenticated').status(401),
    e().code('FORBIDDEN').message('No permission to update').status(403),
    e().code('NOT_FOUND').message('User not found').status(404),
    e().code('UNPROCESSABLE_CONTENT').message('Validation failed').status(422),
  ])
  .build();

/**
 * Example 4: Rate limiting with retry data
 */
export const userList = userOps
  .list()
  .errors(e => [
    e().code('TOO_MANY_REQUESTS')
      .message('Rate limit exceeded')
      .data(z.object({ 
        retryAfter: z.number().int().min(1),
        limit: z.number().int(),
        remaining: z.number().int()
      }))
      .status(429),
  ])
  .build();

/**
 * Example 5: Backward compatible object syntax (still supported)
 */
export const userDelete = userOps
  .delete()
  .errors({
    NOT_FOUND: { message: 'User not found', status: 404 },
    FORBIDDEN: { message: 'Cannot delete user', status: 403 },
    CONFLICT: { 
      message: 'User has dependencies',
      data: z.object({ dependencies: z.array(z.string()) }),
      status: 409 
    },
  })
  .build();

/**
 * Example 6: Combining with union outputs
 */
export const userCheck = userOps
  .check('email')
  .output(b => b.detailed(d => 
    d.union(v => [
      v().status(200).body(z.object({ exists: z.boolean() })),
      v().status(404).body(z.object({ error: z.string(), code: z.literal('NOT_FOUND') }))
    ])
  ))
  .errors(e => [
    e().code('BAD_REQUEST').message('Invalid email format').status(400),
    e().code('RATE_LIMITED')
      .data(z.object({ retryAfter: z.number() }))
      .status(429),
  ])
  .build();

/**
 * Example 7: Custom error codes with custom status
 */
export const userBulkImport = userOps
  .create()
  .path('/users/bulk')
  .method('POST')
  .input(z.object({ body: z.array(userSchema.omit({ id: true, createdAt: true, updatedAt: true })) }))
  .errors(e => [
    e().code('PARTIAL_SUCCESS')
      .message('Some users failed to import')
      .data(z.object({
        succeeded: z.number(),
        failed: z.number(),
        errors: z.array(z.object({
          index: z.number(),
          error: z.string()
        }))
      }))
      .status(207), // Multi-Status
    e().code('PAYLOAD_TOO_LARGE')
      .message('Too many users in bulk import')
      .data(z.object({ maxAllowed: z.number() }))
      .status(413),
  ])
  .build();

/**
 * Best Practices:
 * 
 * 1. Use standard ORPC error codes when possible:
 *    - BAD_REQUEST (400)
 *    - UNAUTHORIZED (401)
 *    - FORBIDDEN (403)
 *    - NOT_FOUND (404)
 *    - CONFLICT (409)
 *    - UNPROCESSABLE_CONTENT (422)
 *    - TOO_MANY_REQUESTS (429)
 *    - INTERNAL_SERVER_ERROR (500)
 * 
 * 2. Never include sensitive data in error.data:
 *    ❌ e().data(z.object({ password: z.string() }))
 *    ✅ e().data(z.object({ reason: z.enum(['invalid', 'expired']) }))
 * 
 * 3. Provide clear, actionable error messages:
 *    ❌ 'Error'
 *    ✅ 'User not found. Please check the ID and try again.'
 * 
 * 4. Use data schemas for structured error details:
 *    ✅ e().data(z.object({ fields: z.array(z.string()) }))
 * 
 * 5. Set appropriate HTTP status codes:
 *    - If not set, ORPC uses defaults (e.g., NOT_FOUND → 404)
 *    - Override when needed: e().status(503)
 * 
 * 6. Chain methods in any order for better readability:
 *    ✅ e().code('ERROR').message('...').data(schema).status(400)
 *    ✅ e().status(400).message('...').code('ERROR').data(schema)
 */

// Export router
export const userRouter = {
  read: userRead,
  create: userCreate,
  update: userUpdate,
  list: userList,
  delete: userDelete,
  check: userCheck,
  bulkImport: userBulkImport,
};

export type UserRouter = typeof userRouter;
