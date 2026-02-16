/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/**
 * Runtime schema verification - check if Zod schemas are correct at runtime
 */

import { userReadContract, userCreateContract } from './standard';

// Access runtime schemas
const userReadOrpc = (userReadContract as any)['~orpc'];
const userCreateOrpc = (userCreateContract as any)['~orpc'];

console.log('=== USER READ CONTRACT ===');
console.log('Path:', userReadOrpc.path);
console.log('Method:', userReadOrpc.method);
console.log('Input Schema:', userReadOrpc.inputSchema);
console.log('Input Shape Keys:', Object.keys(userReadOrpc.inputSchema.shape || {}));

if (userReadOrpc.inputSchema.shape) {
  const shape = userReadOrpc.inputSchema.shape;
  console.log('Params Schema:', shape.params);
  console.log('Params Shape:', shape.params?.shape);
  console.log('Query Schema:', shape.query);
  console.log('Body Schema:', shape.body);
}

console.log('\n=== USER CREATE CONTRACT ===');
console.log('Path:', userCreateOrpc.path);
console.log('Method:', userCreateOrpc.method);
console.log('Input Schema:', userCreateOrpc.inputSchema);
console.log('Input Shape Keys:', Object.keys(userCreateOrpc.inputSchema.shape || {}));

if (userCreateOrpc.inputSchema.shape) {
  const shape = userCreateOrpc.inputSchema.shape;
  console.log('Body Schema:', shape.body);
  console.log('Body Shape Keys:', shape.body?.shape ? Object.keys(shape.body.shape) : 'N/A');
}

console.log('\n=== RUNTIME VALIDATION TEST ===');

// Test if runtime validation works correctly
try {
  const validReadInput = {
    params: { id: '550e8400-e29b-41d4-a716-446655440000' },
    query: {},
    body: undefined,
    headers: {}
  };
  const parseResult = userReadOrpc.inputSchema.safeParse(validReadInput);
  console.log('Valid read input parse:', parseResult.success ? 'SUCCESS' : 'FAILED', parseResult);
} catch (e) {
  console.error('Read input parse error:', e);
}

try {
  const validCreateInput = {
    params: {},
    query: {},
    body: { id: '550e8400-e29b-41d4-a716-446655440000', name: 'John', email: 'john@example.com', role: 'user' as const, password: 'secret' },
    headers: {}
  };
  const parseResult = userCreateOrpc.inputSchema.safeParse(validCreateInput);
  console.log('Valid create input parse:', parseResult.success ? 'SUCCESS' : 'FAILED', parseResult);
} catch (e) {
  console.error('Create input parse error:', e);
}
