/**
 * CORRECTED Example: Errors Work WITHIN Output Structures
 * 
 * This example demonstrates the CORRECT relationship between outputs and errors:
 * 
 * 1. Output union defines ALL possible HTTP statuses (success AND errors)
 * 2. Errors define error codes that map to those output statuses
 * 3. ORPC automatically maps error codes to statuses (NOT_FOUND → 404)
 * 4. When you throw an error, ORPC returns the matching output variant
 * 
 * KEY INSIGHT: Error statuses DON'T create new responses - they use existing output variants!
 */

import { RouteBuilder } from '../src/builder/route-builder';
import { z } from 'zod/v4';

// Common error response schema for consistency across all routes
const errorResponse = z.object({
  code: z.string(),
  message: z.string(),
  data: z.unknown().optional()
});

const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string(),
  createdAt: z.string().datetime(),
});

/**
 * Example 1: Simple GET with success and error cases
 * 
 * Output defines: 200 (success), 404 (not found), 401 (unauthorized)
 * Errors define: NOT_FOUND and UNAUTHORIZED codes
 * ORPC maps: NOT_FOUND → 404, UNAUTHORIZED → 401
 */
export const getUserById = new RouteBuilder()
  .path('/users/:id')
  .method('GET')
  .input(z.object({ params: z.object({ id: z.string() }) }))
  // Step 1: Define ALL possible response statuses
  .output(b => b.detailed(d => 
    d.union(v => [
      v().status(200).body(userSchema),              // ← Success response
      v().status(404).body(errorResponse),           // ← Not found response
      v().status(401).body(errorResponse),           // ← Unauthorized response
    ])
  ))
  // Step 2: Define error codes that use those statuses
  .errors(e => [
    e().code('NOT_FOUND').message('User not found'),       // Uses 404 from output
    e().code('UNAUTHORIZED'),                              // Uses 401 from output
  ])
  .build();

/**
 * Example 2: POST with validation errors
 * 
 * Output defines: 201 (created), 422 (validation), 409 (conflict)
 * Errors define: VALIDATION_FAILED and CONFLICT codes
 */
export const createUser = new RouteBuilder()
  .path('/users')
  .method('POST')
  .input(z.object({ 
    body: userSchema.omit({ id: true, createdAt: true }) 
  }))
  // Define all possible responses
  .output(b => b.detailed(d => 
    d.union(v => [
      v().status(201).body(userSchema),              // Created successfully
      v().status(422).body(errorResponse),           // Validation failed
      v().status(409).body(errorResponse),           // Email conflict
    ])
  ))
  // Define error codes
  .errors(e => [
    e().code('VALIDATION_FAILED')
      .message('Validation failed')
      .data(z.object({ 
        fields: z.array(z.string()) 
      })),
    e().code('CONFLICT')
      .message('Email already exists'),
  ])
  .build();

/**
 * Example 3: PUT with comprehensive error handling
 * 
 * Shows how multiple error codes can map to the same status
 */
export const updateUser = new RouteBuilder()
  .path('/users/:id')
  .method('PUT')
  .input(z.object({ 
    params: z.object({ id: z.string() }),
    body: userSchema.partial()
  }))
  .output(b => b.detailed(d => 
    d.union(v => [
      v().status(200).body(userSchema),              // Updated
      v().status(400).body(errorResponse),           // Bad request
      v().status(401).body(errorResponse),           // Unauthorized
      v().status(403).body(errorResponse),           // Forbidden
      v().status(404).body(errorResponse),           // Not found
    ])
  ))
  .errors(e => [
    // Multiple codes can share the same status
    e().code('INVALID_EMAIL'),                       // → 400 (Bad Request)
    e().code('INVALID_AGE'),                         // → 400 (Bad Request)
    e().code('MISSING_REQUIRED_FIELD'),              // → 400 (Bad Request)
    
    e().code('UNAUTHORIZED'),                        // → 401
    e().code('FORBIDDEN'),                           // → 403
    e().code('NOT_FOUND').message('User not found'), // → 404
  ])
  .build();

/**
 * Example 4: DELETE with dependencies check
 */
export const deleteUser = new RouteBuilder()
  .path('/users/:id')
  .method('DELETE')
  .input(z.object({ params: z.object({ id: z.string() }) }))
  .output(b => b.detailed(d => 
    d.union(v => [
      v().status(204).body(z.void()),                // Deleted (no content)
      v().status(404).body(errorResponse),           // Not found
      v().status(409).body(errorResponse),           // Has dependencies
    ])
  ))
  .errors(e => [
    e().code('NOT_FOUND').message('User not found'),
    e().code('CONFLICT')
      .message('Cannot delete user with active posts')
      .data(z.object({ 
        postCount: z.number() 
      })),
  ])
  .build();

/**
 * Example 5: Rate limiting
 * 
 * Shows how error data is structured within the output variant
 */
export const rateLimitedEndpoint = new RouteBuilder()
  .path('/api/limited')
  .method('POST')
  .input(z.object({ body: z.object({ data: z.string() }) }))
  .output(b => b.detailed(d => 
    d.union(v => [
      v().status(200).body(z.object({ result: z.string() })),
      v().status(429).body(z.object({              // Rate limit response
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
        retryAfter: z.number(),
        limit: z.number(),
        remaining: z.number()
      })),
  ])
  .build();

/**
 * Example 6: Custom status override
 * 
 * Rarely needed - only when you want non-standard mappings
 */
export const customStatusExample = new RouteBuilder()
  .path('/resources/:id')
  .method('GET')
  .input(z.object({ params: z.object({ id: z.string() }) }))
  .output(b => b.detailed(d => 
    d.union(v => [
      v().status(200).body(z.object({ id: z.string() })),
      v().status(410).body(errorResponse),           // Using 410 (Gone) instead of 404
    ])
  ))
  .errors(e => [
    // Override: Map NOT_FOUND to 410 instead of default 404
    e().code('NOT_FOUND')
      .message('Resource permanently removed')
      .status(410),                                  // Override ORPC's default
  ])
  .build();

/**
 * Handler Examples
 */

// Example handler showing how errors trigger output variants
async function getUserByIdHandler({ input, errors }: {
  input: { params: { id: string } };
  errors: { NOT_FOUND: () => Error; UNAUTHORIZED: () => Error };
}) {
  const user = await findUserInDb(input.params.id);
  
  if (!user) {
    // Throws NOT_FOUND error → ORPC maps to 404 → Returns 404 output variant
    throw errors.NOT_FOUND();
  }
  
  // Success path → Returns 200 output variant
  return {
    status: 200,
    body: user
  };
}

async function createUserHandler({ input, errors }: {
  input: { body: { email: string; name: string } };
  errors: { CONFLICT: () => Error; VALIDATION_FAILED: (opts: { data: { fields: string[] } }) => Error };
}) {
  const existing = await findUserByEmail(input.body.email);
  
  if (existing) {
    // Throws CONFLICT → Returns 409 output variant
    throw errors.CONFLICT();
  }
  
  const validationErrors = validateUser(input.body);
  if (validationErrors.length > 0) {
    // Throws VALIDATION_FAILED → Returns 422 output variant with data
    throw errors.VALIDATION_FAILED({
      data: { fields: validationErrors }
    });
  }
  
  const user = await createUserInDb(input.body);
  
  // Success → Returns 201 output variant
  return {
    status: 201,
    body: user
  };
}

// Dummy functions for examples
type User = z.infer<typeof userSchema>;
declare function findUserInDb(id: string): Promise<User | null>;
declare function findUserByEmail(email: string): Promise<User | null>;
declare function validateUser(data: { email: string; name: string }): string[];
declare function createUserInDb(data: { email: string; name: string }): Promise<User>;

/**
 * KEY TAKEAWAYS:
 * 
 * 1. ✅ Output union defines ALL HTTP statuses (success + errors)
 * 2. ✅ Errors define codes that map to those statuses
 * 3. ✅ ORPC handles the mapping automatically
 * 4. ✅ When error thrown, ORPC returns matching output variant
 * 
 * 5. ❌ Errors DON'T create separate HTTP responses
 * 6. ❌ .status() on errors is rarely needed (only for overrides)
 * 7. ❌ Don't define error statuses without corresponding output variants
 */
