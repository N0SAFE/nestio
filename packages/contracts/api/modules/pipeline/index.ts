/**
 * Pipeline Contracts Module
 * 
 * ORPC contracts for the planified file actions system.
 * Includes CRUD operations for pipelines, actions, triggers, and real-time streaming for execution progress.
 * 
 * @see docs/PLANIFIED-FILE-ACTIONS-SYSTEM.md for architecture documentation
 */

import { oc } from "@orpc/contract";

// Streaming contracts
export * from "./execution-progress";
export * from "./action-progress";
export * from "./execution-logs";

// CRUD contracts
export * from "./pipeline";
export * from "./execution";

// Import for router
import { pipelineExecutionProgressContract } from "./execution-progress";
import { pipelineActionProgressContract } from "./action-progress";
import { pipelineExecutionLogsContract } from "./execution-logs";
import {
  pipelineListContract,
  pipelineGetContract,
  pipelineCreateContract,
  pipelineUpdateContract,
  pipelineDeleteContract,
  pipelineAddActionContract,
  pipelineRemoveActionContract,
  pipelineUpdateActionContract,
} from "./pipeline";
import {
  pipelineExecuteContract,
  pipelineGetExecutionContract,
  pipelineCancelExecutionContract,
  pipelineListExecutionsContract,
} from "./execution";

/**
 * Pipeline Contract Router
 * 
 * Groups all pipeline-related contracts under the /pipeline prefix.
 * 
 * Routes:
 * - GET    /pipeline                      - List pipelines
 * - POST   /pipeline                      - Create pipeline
 * - GET    /pipeline/{id}                 - Get pipeline
 * - PATCH  /pipeline/{id}                 - Update pipeline
 * - DELETE /pipeline/{id}                 - Delete pipeline
 * - POST   /pipeline/{id}/actions         - Add action to pipeline
 * - PATCH  /pipeline/{id}/actions/{actionId} - Update action in pipeline
 * - DELETE /pipeline/{id}/actions/{actionId} - Remove action from pipeline
 * - POST   /pipeline/{id}/execute         - Execute pipeline
 * - GET    /pipeline/executions           - List executions
 * - GET    /pipeline/executions/{executionId} - Get execution
 * - POST   /pipeline/executions/{executionId}/cancel - Cancel execution
 * - GET    /pipeline/executions/{executionId}/progress - Stream progress (SSE)
 * - GET    /pipeline/executions/{executionId}/logs - Stream logs (SSE)
 * - GET    /pipeline/executions/{executionId}/actions/{actionId}/progress - Stream action progress (SSE)
 */
export const pipelineContract = oc.tag("Pipeline").prefix("/pipeline").router({
  // Pipeline CRUD
  list: pipelineListContract,
  get: pipelineGetContract,
  create: pipelineCreateContract,
  update: pipelineUpdateContract,
  delete: pipelineDeleteContract,

  // Pipeline actions
  addAction: pipelineAddActionContract,
  updateAction: pipelineUpdateActionContract,
  removeAction: pipelineRemoveActionContract,

  // Execution management
  execute: pipelineExecuteContract,
  listExecutions: pipelineListExecutionsContract,
  getExecution: pipelineGetExecutionContract,
  cancelExecution: pipelineCancelExecutionContract,

  // Real-time streaming (SSE)
  executionProgress: pipelineExecutionProgressContract,
  actionProgress: pipelineActionProgressContract,
  executionLogs: pipelineExecutionLogsContract,
});
