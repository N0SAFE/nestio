/**
 * Pipeline Domain - Endpoints
 * 
 * Defines all ORPC endpoints for pipeline operations.
 * These map directly to backend contracts and provide type-safe API calls.
 * 
 * @see docs/DOMAIN-BASED-FETCH-STRUCTURE.md
 * @see docs/PLANIFIED-FILE-ACTIONS-SYSTEM.md
 */

import { orpc } from "@/lib/orpc";

/**
 * Pipeline endpoints for CRUD operations
 */
export const pipelineEndpoints = {
  // List & Get
  list: orpc.pipeline.list,
  get: orpc.pipeline.get,
  listExecutions: orpc.pipeline.listExecutions,
  getExecution: orpc.pipeline.getExecution,

  // Create & Update
  create: orpc.pipeline.create,
  update: orpc.pipeline.update,
  delete: orpc.pipeline.delete,

  // Pipeline actions
  addAction: orpc.pipeline.addAction,
  updateAction: orpc.pipeline.updateAction,
  removeAction: orpc.pipeline.removeAction,

  // Execution
  execute: orpc.pipeline.execute,
  cancelExecution: orpc.pipeline.cancelExecution,

  // Streaming (SSE)
  executionProgress: orpc.pipeline.executionProgress,
  actionProgress: orpc.pipeline.actionProgress,
  executionLogs: orpc.pipeline.executionLogs,
} as const;
