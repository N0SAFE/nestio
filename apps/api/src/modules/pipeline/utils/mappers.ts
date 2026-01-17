/**
 * Type Mappers for Pipeline Module
 * 
 * Converts database types (with nullable/unknown fields) to contract types (strict types).
 * Ensures type safety between database layer and API contracts.
 */

import type * as schema from "@/config/drizzle/schema/pipeline";

/**
 * Map database pipeline to contract pipeline type
 */
export function mapPipeline(dbPipeline: typeof schema.pipelines.$inferSelect) {
  return {
    ...dbPipeline,
    variablesSchema: (dbPipeline.variablesSchema as Record<string, unknown> | null) ?? null,
    defaultVariables: dbPipeline.defaultVariables as Record<string, unknown>,
  };
}

/**
 * Map database pipeline action to contract pipeline action type
 */
export function mapPipelineAction(dbAction: typeof schema.pipelineActions.$inferSelect) {
  return {
    ...dbAction,
    condition: (dbAction.condition as Record<string, unknown> | null) ?? null,
    dependsOn: dbAction.dependsOn ?? null,
  };
}

/**
 * Map database pipeline execution to contract execution type
 */
export function mapPipelineExecution(dbExecution: typeof schema.pipelineExecutions.$inferSelect) {
  return {
    ...dbExecution,
    variables: dbExecution.variables as Record<string, unknown>,
    error: (dbExecution.error as { code: string; message: string; actionId?: string; stack?: string } | null) ?? null,
    currentStep: dbExecution.currentStep ?? 0,
  };
}

/**
 * Map database execution action to contract type
 */
export function mapExecutionAction(dbAction: typeof schema.executionActions.$inferSelect) {
  return {
    ...dbAction,
    input: dbAction.input as Record<string, unknown>,
    output: (dbAction.output as Record<string, unknown> | null) ?? null,
    error: (dbAction.error as { code: string; message: string; stack?: string } | null) ?? null,
  };
}
