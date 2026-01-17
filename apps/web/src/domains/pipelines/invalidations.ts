/**
 * Pipeline Domain - Cache Invalidation Configuration
 *
 * Defines which queries to invalidate when mutations succeed.
 * Ensures UI stays in sync with server state.
 */

import { defineInvalidations } from "../shared/helpers";
import { pipelineEndpoints } from "./endpoints";

/**
 * Pipeline invalidation configuration
 *
 * Maps each mutation to the queries it should invalidate:
 * 
 * Pipeline operations:
 * - create: Invalidates pipeline list
 * - update: Invalidates pipeline list and the specific pipeline
 * - delete: Invalidates pipeline list and the specific pipeline
 * - addAction: Invalidates the specific pipeline (actions changed)
 * - removeAction: Invalidates the specific pipeline (actions changed)
 * 
 * Execution operations:
 * - execute: Invalidates pipeline executions list and the specific pipeline (status may change)
 * - cancel: Invalidates the specific execution and pipeline executions list
 * - retry: Invalidates the specific execution and pipeline executions list
 */
export const pipelineInvalidations = defineInvalidations(pipelineEndpoints, {
  // =============================================================================
  // Pipeline Mutations
  // =============================================================================
  
  /**
   * After creating a pipeline, invalidate the pipeline list
   */
  create: ({ keys }) => [
    keys.list(),
  ],
  
  /**
   * After updating a pipeline, invalidate:
   * - The pipeline list (in case name/status changed)
   * - The specific pipeline
   */
  update: ({ input, keys }) => [
    keys.list(),
    keys.get({ input: { id: input.id } }),
  ],
  
  /**
   * After deleting a pipeline, invalidate:
   * - The pipeline list
   * - The specific pipeline
   */
  delete: ({ input, keys }) => [
    keys.list(),
    keys.get({ input: { id: input.id } }),
  ],
  
  /**
   * After adding an action to a pipeline, invalidate the specific pipeline
   */
  addAction: ({ input, keys }) => [
    keys.get({ input: { id: input.id } }),
  ],
  
  /**
   * After removing an action from a pipeline, invalidate the specific pipeline
   */
  removeAction: ({ input, keys }) => [
    keys.get({ input: { id: input.id } }),
  ],
  
  // =============================================================================
  // Execution Mutations
  // =============================================================================
  
  /**
   * After executing a pipeline, invalidate:
   * - Pipeline executions list for this pipeline
   * - All executions list (if viewing all executions)
   * - The specific pipeline (in case status/lastExecutedAt changed)
   */
  execute: ({ input, keys }) => [
    keys.listExecutions({ input: { pipelineId: input.id } }),
    keys.listExecutions(),
    keys.get({ input: { id: input.id } }),
  ],
  
  /**
   * After cancelling an execution, invalidate:
   * - The specific execution
   * - Pipeline executions list
   */
  cancelExecution: ({ input, keys }) => [
    keys.getExecution({ input: { executionId: input.executionId } }),
    keys.listExecutions(),
  ],
});
