/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Test file to verify IsAny utility and diagnose batch delete types
 */

import { InferContractRouterInputs, InferContractRouterOutputs } from '@orpc/contract';
import { standard } from '../../../index';
import { userSchema } from '../entity';

// ============================================================================
// IsAny Utility (copy from standard.ts)
// ============================================================================

type IsAny<T> = [T] extends [never] 
  ? 'never' 
  : 0 extends (1 & T) 
    ? 'any' 
    : false;

// ============================================================================
// Test IsAny utility
// ============================================================================

type TestAny = IsAny<any>; // Should be 'any'
type TestNever = IsAny<never>; // Should be 'never'
type TestString = IsAny<string>; // Should be false
type TestUnknown = IsAny<unknown>; // Should be false
type TestNumber = IsAny<number>; // Should be false

// Force type errors to see the results
// These assignments verify the IsAny utility works correctly at compile time
export const _testAny: TestAny = 'any';
export const _testNever: TestNever = 'never';
export const _testString: TestString = false;
export const _testUnknown: TestUnknown = false;
export const _testNumber: TestNumber = false;

// ============================================================================
// Test with actual contract
// ============================================================================

const userOps = standard.zod(userSchema, 'user');

// This returns never
export const userBatchDeleteContract = userOps.batchDelete({ maxBatchSize: 100 }).build();

// What is the contract type?
type ContractType = typeof userBatchDeleteContract;

// What does InferContractRouterInputs return for never?
type InputFromNever = InferContractRouterInputs<never>;
type OutputFromNever = InferContractRouterOutputs<never>;

// What does it return for the actual contract?
type ActualInput = InferContractRouterInputs<typeof userBatchDeleteContract>;
type ActualOutput = InferContractRouterOutputs<typeof userBatchDeleteContract>;

// Is it any or never?
type InputIsAny = IsAny<ActualInput>;
type OutputIsAny = IsAny<ActualOutput>;

// Force errors to see values - these test type inference behavior
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
export const _contractType: ContractType = null as any;
// @ts-expect-error - Intentional: Testing type inference with never
export const _inputFromNever: InputFromNever = null as any;
// @ts-expect-error - Intentional: Testing type inference with never
export const _outputFromNever: OutputFromNever = null as any;
export const _actualInput: ActualInput = null as any;
export const _actualOutput: ActualOutput = null as any;
export const _inputIsAny: InputIsAny = null as any;
export const _outputIsAny: OutputIsAny = null as any;
/* eslint-enable @typescript-eslint/no-unsafe-assignment */
