/**
 * Force TypeScript to expand and show actual inferred types
 * Use: hover over the test variables in VS Code to see resolved types
 */

import type { InferContractRouterInputs, InferContractRouterOutputs } from '@orpc/contract';
import {
  userReadContract,
  userCreateContract,
  userUpdateContract,
  userDeleteContract,
  userCountContract,
  userExistsContract,
  userBatchCreateContract,
  userBatchDeleteContract,
  userBatchUpdateContract,
  userStreamingReadContract,
  userCreateMinimalContract,
} from './standard';

// Force type expansion by using them in functions
// Hover over the parameter types in VS Code to see the actual structures

export function testUserReadInput(input: InferContractRouterInputs<typeof userReadContract>) {
  return input;
}

export function testUserReadOutput(output: InferContractRouterOutputs<typeof userReadContract>) {
  return output;
}

export function testUserCreateInput(input: InferContractRouterInputs<typeof userCreateContract>) {
  return input;
}

export function testUserCreateOutput(output: InferContractRouterOutputs<typeof userCreateContract>) {
  return output;
}

export function testUserUpdateInput(input: InferContractRouterInputs<typeof userUpdateContract>) {
  return input;
}

export function testUserUpdateOutput(output: InferContractRouterOutputs<typeof userUpdateContract>) {
  return output;
}

export function testUserDeleteInput(input: InferContractRouterInputs<typeof userDeleteContract>) {
  return input;
}

export function testUserDeleteOutput(output: InferContractRouterOutputs<typeof userDeleteContract>) {
  return output;
}

export function testUserCountInput(input: InferContractRouterInputs<typeof userCountContract>) {
  return input;
}

export function testUserCountOutput(output: InferContractRouterOutputs<typeof userCountContract>) {
  return output;
}

export function testUserExistsInput(input: InferContractRouterInputs<typeof userExistsContract>) {
  return input;
}

export function testUserExistsOutput(output: InferContractRouterOutputs<typeof userExistsContract>) {
  return output;
}

export function testUserBatchCreateInput(input: InferContractRouterInputs<typeof userBatchCreateContract>) {
  return input;
}

export function testUserBatchDeleteInput(input: InferContractRouterInputs<typeof userBatchDeleteContract>) {
  return input;
}

export function testUserBatchDeleteOutput(output: InferContractRouterOutputs<typeof userBatchDeleteContract>) {
  return output;
}

export function testUserBatchUpdateInput(input: InferContractRouterInputs<typeof userBatchUpdateContract>) {
  return input;
}

export function testUserStreamingReadInput(input: InferContractRouterInputs<typeof userStreamingReadContract>) {
  return input;
}

export function testUserStreamingReadOutput(output: InferContractRouterOutputs<typeof userStreamingReadContract>) {
  return output;
}

export function testUserCreateMinimalInput(input: InferContractRouterInputs<typeof userCreateMinimalContract>) {
  return input;
}

// Let's also inspect the contract structure directly
export function inspectUserReadContract() {
  const contract = userReadContract;
  // Accessing internal property to debug  
  const orpc = contract['~orpc'];
  return {
    inputSchema: orpc.inputSchema,
    outputSchema: orpc.outputSchema,
    route: orpc.route,
  };
}

// Test with actual values to see what the runtime schemas are
export const runtimeUserReadContract = userReadContract;
export const runtimeUserReadInputSchema = runtimeUserReadContract['~orpc'].inputSchema;
export const runtimeUserReadOutputSchema = runtimeUserReadContract['~orpc'].outputSchema;

export const runtimeUserCreateContract = userCreateContract;
export const runtimeUserCreateInputSchema = runtimeUserCreateContract['~orpc'].inputSchema;
export const runtimeUserCreateOutputSchema = runtimeUserCreateContract['~orpc'].outputSchema;

// Explicitly test type structure
type ExpandRecursively<T> = T extends object
  ? T extends infer O
    ? { [K in keyof O]: ExpandRecursively<O[K]> }
    : never
  : T;

export type ExpandedUserReadInput = ExpandRecursively<InferContractRouterInputs<typeof userReadContract>>;
export type ExpandedUserReadOutput = ExpandRecursively<InferContractRouterOutputs<typeof userReadContract>>;

export type ExpandedUserCreateInput = ExpandRecursively<InferContractRouterInputs<typeof userCreateContract>>;
export type ExpandedUserCreateOutput = ExpandRecursively<InferContractRouterOutputs<typeof userCreateContract>>;

export type ExpandedUserDeleteInput = ExpandRecursively<InferContractRouterInputs<typeof userDeleteContract>>;
export type ExpandedUserDeleteOutput = ExpandRecursively<InferContractRouterOutputs<typeof userDeleteContract>>;

export type ExpandedUserCountInput = ExpandRecursively<InferContractRouterInputs<typeof userCountContract>>;
export type ExpandedUserCountOutput = ExpandRecursively<InferContractRouterOutputs<typeof userCountContract>>;

export type ExpandedUserBatchCreateInput = ExpandRecursively<InferContractRouterInputs<typeof userBatchCreateContract>>;
export type ExpandedUserBatchDeleteInput = ExpandRecursively<InferContractRouterInputs<typeof userBatchDeleteContract>>;
export type ExpandedUserBatchUpdateInput = ExpandRecursively<InferContractRouterInputs<typeof userBatchUpdateContract>>;
