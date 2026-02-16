/**
 * Tests for the property access API patterns
 * 
 * Tests all patterns specified by user:
 * - input(z.object({})) - direct detailed schema
 * - input(builder => builder.body(z.object({}))) - builder callback
 * - input(builder => builder.body(b => z.object({}))) - nested builder callback
 * - input.body(z.object({})) - property access with direct schema
 * - input.body(b => z.object({})) - property access with builder callback
 * 
 * Same patterns apply to output
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { RouteBuilder } from '../route-builder';

describe('Property Access API - Input', () => {
  const userSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    password: z.string(),
  });

  describe('Pattern 1: input(schema) with detailed structure', () => {
    it('should accept detailed schema with params, query, body, headers', () => {
      const route = new RouteBuilder({ method: 'POST', path: '/users' })
        .input(z.object({
          params: z.object({ orgId: z.string() }),
          query: z.object({ limit: z.number() }),
          body: userSchema,
          headers: z.object({ 'x-api-key': z.string() }),
        }))
        .build();

      expect(route).toBeDefined();
      expect(typeof route).toBe('object');
    });

    it('should accept schema with optional fields', () => {
      const route = new RouteBuilder({ method: 'GET', path: '/users' })
        .input(z.object({
          query: z.object({ search: z.string().optional() }),
        }))
        .build();

      expect(route).toBeDefined();
    });
  });

  describe('Pattern 2: input(builder => builder.body(schema))', () => {
    it('should accept builder callback with body', () => {
      const route = new RouteBuilder({ method: 'POST', path: '/users' })
        .input(builder => builder.body(userSchema))
        .build();

      expect(route).toBeDefined();
    });

    it('should accept builder callback with multiple fields', () => {
      const route = new RouteBuilder({ method: 'POST', path: '/users' })
        .input(builder => builder
          .body(userSchema)
          .query(q => q.schema(() => z.object({ limit: z.number() })))
        )
        .build();

      expect(route).toBeDefined();
    });
  });

  describe('Pattern 3: input(builder => builder.body(b => schema))', () => {
    it('should accept nested builder callback', () => {
      const route = new RouteBuilder({ method: 'POST', path: '/users' })
        .input(userSchema)  // Set initial schema
        .input(builder => builder.body(b => b.schema(s => s.omit({ password: true }))))
        .build();

      expect(route).toBeDefined();
    });

    it('should allow chaining nested builder callbacks', () => {
      const route = new RouteBuilder({ method: 'POST', path: '/users' })
        .input(userSchema)
        .input(builder => builder.body(b => b.schema(s => s.omit({ password: true }))))
        .input(builder => builder.query(q => q.schema(() => z.object({ limit: z.number() }))))
        .build();

      expect(route).toBeDefined();
    });
  });

  describe('Pattern 4: input.body(schema)', () => {
    it('should support property access with direct schema', () => {
      const route = new RouteBuilder({ method: 'POST', path: '/users' })
        .input.body(userSchema)
        .build();

      expect(route).toBeDefined();
    });

    it('should support chaining multiple property accesses', () => {
      const route = new RouteBuilder({ method: 'POST', path: '/users' })
        .input.body(userSchema)
        .input.query(z.object({ limit: z.number() }))
        .build();

      expect(route).toBeDefined();
    });
  });

  describe('Pattern 5: input.body(b => schema)', () => {
    it('should support property access with builder callback', () => {
      const route = new RouteBuilder({ method: 'POST', path: '/users' })
        .input(userSchema)  // Set initial
        .input.body(b => b.schema((s: typeof userSchema) => s.omit({ password: true })))
        .build();

      expect(route).toBeDefined();
    });

    it('should allow complex transformations', () => {
      const route = new RouteBuilder({ method: 'POST', path: '/users' })
        .input(userSchema)
        .input.body(b => b.schema((s: typeof userSchema) => s.omit({ password: true }).extend({ age: z.number() })))
        .build();

      expect(route).toBeDefined();
    });
  });

  describe('Mixed patterns', () => {
    it('should allow mixing all patterns', () => {
      const route = new RouteBuilder({ method: 'POST', path: '/users' })
        .input(userSchema)  // Pattern 1
        .input(builder => builder.query(q => q.schema(() => z.object({ limit: z.number() }))))  // Pattern 2
        .input.body(b => b.schema(s => (s).omit({ password: true })))  // Pattern 5
        .build();

      expect(route).toBeDefined();
    });
  });
});

describe('Property Access API - Output', () => {
  const userSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    password: z.string(),
    createdAt: z.string(),
  });

  describe('Pattern 1: output(schema)', () => {
    it('should accept direct schema', () => {
      const route = new RouteBuilder({ method: 'GET', path: '/users' })
        .output(userSchema)
        .build();

      expect(route).toBeDefined();
    });
  });

  describe('Pattern 2: output(builder => builder.detailed(...))', () => {
    it('should accept builder callback for detailed response', () => {
      const route = new RouteBuilder({ method: 'POST', path: '/users' })
        .output(builder => builder.detailed(d => d
          .status(201)
          .body(userSchema)
          .headers({ 'location': z.string() })
        ))
        .build();

      expect(route).toBeDefined();
    });
  });

  describe('Pattern 3: output(builder => builder.omit([...]))', () => {
    it('should accept builder callback for schema modifications', () => {
      const route = new RouteBuilder({ method: 'GET', path: '/users' })
        .output(userSchema)
        .output(builder => builder.omit(['password', 'createdAt']))
        .build();

      expect(route).toBeDefined();
    });
  });

  describe('Pattern 4: output.omit([...])', () => {
    it('should support property access for modifications', () => {
      const route = new RouteBuilder({ method: 'GET', path: '/users' })
        .output(userSchema)
        .output.omit(['password', 'createdAt'])
        .build();

      expect(route).toBeDefined();
    });

    it('should support chaining property modifications', () => {
      const route = new RouteBuilder({ method: 'GET', path: '/users' })
        .output(userSchema)
        .output.omit(['password'])
        .output.pick(['id', 'name', 'email'])
        .build();

      expect(route).toBeDefined();
    });
  });

  describe('Pattern 5: output.detailed(d => ...)', () => {
    it('should support property access for detailed responses', () => {
      const route = new RouteBuilder({ method: 'POST', path: '/users' })
        .output.detailed(d => d
          .status(201)
          .body(userSchema)
          .headers({ 'etag': z.string() })
        )
        .build();

      expect(route).toBeDefined();
    });
  });

  describe('Mixed patterns', () => {
    it('should allow mixing all patterns', () => {
      const route = new RouteBuilder({ method: 'POST', path: '/users' })
        .output(userSchema)  // Pattern 1
        .output(builder => builder.omit(['password']))  // Pattern 3
        .output.pick(['id', 'name', 'email'])  // Pattern 4
        .build();

      expect(route).toBeDefined();
    });
  });
});

describe('Real-world usage scenarios', () => {
  const userSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    password: z.string(),
    role: z.enum(['admin', 'user']),
    createdAt: z.string(),
  });

  it('should support complex CRUD create endpoint', () => {
    const route = new RouteBuilder({ method: 'POST', path: '/users' })
      // Input: body only, omit id and createdAt
      .input.body(userSchema.omit({ id: true, createdAt: true }))
      // Output: detailed with 201 status, full user, location header
      .output.detailed((d) => d
        .status(201)
        .body(userSchema.omit({ password: true }))
        .headers({ 'location': z.string() })
      )
      .build();

    expect(route).toBeDefined();
    expect(typeof route).toBe('object');
  });

  it('should support complex list endpoint with filters', () => {
    const route = new RouteBuilder({ method: 'GET', path: '/users' })
      // Input: query parameters for filtering
      .input.query(z.object({
        page: z.number().default(1),
        limit: z.number().default(10),
        search: z.string().optional(),
        role: z.enum(['admin', 'user']).optional(),
      }))
      // Output: paginated response
      .output(z.object({
        users: z.array(userSchema.omit({ password: true })),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
      }))
      .build();

    expect(route).toBeDefined();
  });

  it('should support update endpoint with path params', () => {
    const route = new RouteBuilder({ method: 'PATCH', path: '/{id}' })
      .pathWithParams(p => p`/users/${p('id', z.string())}`)
      // Input: partial body for updates
      .input.body(userSchema.omit({ id: true, createdAt: true }).partial())
      // Output: updated user without password
      .output(userSchema.omit({ password: true }))
      .build();

    expect(route).toBeDefined();
  });

  it('should support login endpoint with custom response', () => {
    const route = new RouteBuilder({ method: 'POST', path: '/auth/login' })
      // Input: credentials only
      .input.body(z.object({
        email: z.string(),
        password: z.string(),
      }))
      // Output: token and user info
      .output(z.object({
        token: z.string(),
        refreshToken: z.string(),
        user: userSchema.omit({ password: true }),
      }))
      .build();

    expect(route).toBeDefined();
  });
});
