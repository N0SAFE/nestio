/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Test to understand TypeScript's any propagation behavior
 */

// Helper: Returns Y if T is any, N otherwise (doesn't propagate any)
type IfAny<T, Y, N> = 0 extends (1 & T) ? Y : N;

// Helper: Returns Y if T is never, N otherwise
type IfNever<T, Y, N> = [T] extends [never] ? Y : N;

// Main utility
type IsAnyOrNever<T> = IfNever<T, 'never', IfAny<T, 'any', false>>;

// ============================================================================
// TEST 1: Direct any type
// ============================================================================

type DirectAnyCheck = IsAnyOrNever<any>;
export const test1: DirectAnyCheck = 'any'; // Should compile ✅

// ============================================================================
// TEST 2: Type alias that resolves to any
// ============================================================================

type MyAnyType = any;
type AliasedAnyCheck = IsAnyOrNever<MyAnyType>;
// This will be 'any' (propagated), not the string literal 'any'
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
export const test2: AliasedAnyCheck = 'WRONG' as any; // Compiles because AliasedAnyCheck is any

// ============================================================================
// TEST 3: The extends pattern (what we use in standard.ts)
// ============================================================================

type AliasedAnyWithExtends = IsAnyOrNever<MyAnyType> extends 'any' | 'never' ? 'detected' : 'not-detected';
// Key insight: 'any extends X' is always true, so this should return 'detected'
export const test3: AliasedAnyWithExtends = 'detected'; // Should compile ✅

// ============================================================================
// TEST 4: Real-world scenario (what happens with InferContractRouterInputs<never>)
// ============================================================================

// Simulate what happens when contract is never and InferContractRouterInputs returns any
type SimulatedNeverContract = never;
type SimulatedInferResult = SimulatedNeverContract extends never ? any : string;
type SimulatedCheck = IsAnyOrNever<SimulatedInferResult> extends 'any' | 'never' ? 'caught' : 'missed';

export const test4: SimulatedCheck = 'caught'; // Should compile ✅

// ============================================================================
// CONCLUSION
// ============================================================================

/**
 * TypeScript behavior with any propagation:
 * 
 * 1. IsAnyOrNever<any> directly → 'any' string literal ✅
 * 2. IsAnyOrNever<TypeAliasThatIsAny> → any type (propagated) ⚠️
 * 3. IsAnyOrNever<TypeAliasThatIsAny> extends 'any' | 'never' → true → 'detected' ✅
 * 
 * So our pattern in standard.ts DOES work because:
 * - Even though intermediate type might be 'any',
 * - The 'extends' check catches it: any extends 'any' | 'never' = true
 * - Therefore returns 'any' string, which fails the const assertion ✅
 */

export type { DirectAnyCheck, AliasedAnyCheck, AliasedAnyWithExtends, SimulatedCheck };
