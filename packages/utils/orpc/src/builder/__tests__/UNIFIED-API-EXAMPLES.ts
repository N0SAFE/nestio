/**
 * UNIFIED INPUT/OUTPUT API - Quick Reference
 * 
 * The input() and output() methods now support BOTH direct schemas and builder callbacks!
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { z } from 'zod';
import { RouteBuilder } from '../route-builder';

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  password: z.string(),
});

// ============================================
// INPUT() - THREE WAYS TO USE IT
// ============================================

// 1️⃣ DIRECT SCHEMA
const route1 = new RouteBuilder({ method: 'POST', path: '/users' })
  .input(z.object({ name: z.string(), email: z.string() }))
  .build();

// 2️⃣ BUILDER CALLBACK - Detailed structure
const route2 = new RouteBuilder({ method: 'POST', path: '/users' })
  .input(builder => builder
    .body(userSchema.omit({id: true}))
    .query(q => q.schema(() => z.object({ limit: z.number() })))
  )
  .build();

// 3️⃣ PROPERTY CHAINING (legacy, still works)
const route3 = new RouteBuilder({ method: 'POST', path: '/users' })
  .input(userSchema)
  .input(builder => builder.omit(["password"]))  // Property access
  .build();

// ============================================
// OUTPUT() - THREE WAYS TO USE IT
// ============================================

// 1️⃣ DIRECT SCHEMA
const route4 = new RouteBuilder({ method: 'GET', path: '/users' })
  .output(z.array(userSchema.omit({password: true})))
  .build();

// 2️⃣ BUILDER CALLBACK - Detailed response structure
const route5 = new RouteBuilder({ method: 'GET', path: '/users/:id' })
  .output(builder => builder.detailed(d => d
    .status(200)
    .body(userSchema.omit(['password']))
    .headers({ 'etag': z.string() })
  ))
  .build();

// 3️⃣ PROPERTY CHAINING (legacy, still works)
const route6 = new RouteBuilder({ method: 'GET', path: '/users' })
  .output(userSchema)
  .output(builder => builder.omit(['password']))  // Property access
  .build();

// ============================================
// MIXING PATTERNS - All work together!
// ============================================

const mixedRoute = new RouteBuilder({ method: 'PATCH', path: '/users/:id' })
  // Start with direct schema
  .input(userSchema)
  // Then use builder to modify
  .input(builder => builder.body(b => b.schema(s => s.omit({id: true}).partial())))
  // Output direct
  .output(userSchema.omit({password: true}))
  .build();

// ============================================
// REAL-WORLD EXAMPLE - Complete CRUD
// ============================================

// CREATE
const createUser = new RouteBuilder({ method: 'POST', path: '/users' })
  .input(builder => builder.body(userSchema.omit({id: true})))
  .output(builder => builder.detailed(d => d
    .status(201)
    .body(userSchema)
    .headers({ 'location': z.string() })
  ))
  .build();

// READ
const getUser = new RouteBuilder({ method: 'GET', path: '/users/:id' })
  .pathWithParams(p => p`/users/${p('id', z.string())}`)
  .output(userSchema.omit({password: true}))
  .build();

// UPDATE
const updateUser = new RouteBuilder({ method: 'PATCH', path: '/users/:id' })
  .pathWithParams(p => p`/users/${p('id', z.string())}`)
  .input(builder => builder.body(userSchema.omit({id: true}).partial()))
  .output(userSchema.omit({password: true}))
  .build();

// LIST with query params
const listUsers = new RouteBuilder({ method: 'GET', path: '/users' })
  .input(builder => builder.query(q => q.schema(() => z.object({
    page: z.number().default(1),
    limit: z.number().default(10),
    search: z.string().optional(),
  }))))
  .output(z.object({
    users: z.array(userSchema.omit({password: true})),
    total: z.number(),
  }))
  .build();

// ============================================
// KEY BENEFITS
// ============================================
// ✅ More intuitive API - use input()/output() for everything
// ✅ Less method names to remember
// ✅ Both direct and builder patterns in one place
// ✅ Backward compatible - inputBuilder/outputBuilder still work
// ✅ Perfect type inference throughout
