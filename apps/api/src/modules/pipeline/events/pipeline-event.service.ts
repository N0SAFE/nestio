/**
 * Pipeline Event Service
 * 
 * Provides type-safe event emission and subscription for pipeline execution.
 * Extends BaseEventService with pipeline-specific event contracts.
 * 
 * This service is the central hub for all real-time events during pipeline execution,
 * enabling:
 * - Progress streaming to frontend via SSE
 * - Inter-service communication for pipeline coordination
 * - Audit logging and monitoring
 * 
 * @example
 * ```typescript
 * // In PipelineExecutorService
 * @Injectable()
 * class PipelineExecutorService {
 *   constructor(private pipelineEvents: PipelineEventService) {}
 *   
 *   async executePipeline(executionId: string, pipelineId: string) {
 *     // Emit execution started
 *     this.pipelineEvents.emitExecutionStarted(executionId, pipelineId, 5);
 *     
 *     // Emit progress updates
 *     this.pipelineEvents.emitActionStarted(
 *       executionId,
 *       pipelineId,
 *       'action-1',
 *       'Compress Image',
 *       1,
 *       5
 *     );
 *     
 *     // ... execute action ...
 *     
 *     // Emit completion
 *     this.pipelineEvents.emitExecutionCompleted(executionId, pipelineId, completedActions);
 *   }
 * }
 * 
 * // In PipelineController (ORPC handler)
 * @Implement(pipelineContract.executionProgress)
 * executionProgress() {
 *   return implement(pipelineContract.executionProgress)
 *     .use(requireAuth())
 *     .handler(async function* ({ input }) {
 *       const subscription = this.pipelineEvents.subscribe(
 *         'executionProgress',
 *         { executionId: input.executionId }
 *       );
 *       
 *       for await (const progress of subscription) {
 *         yield progress;
 *         if (progress.status === 'completed' || progress.status === 'failed') {
 *           break;
 *         }
 *       }
 *     });
 * }
 * ```
 * 
 * @see docs/PLANIFIED-FILE-ACTIONS-SYSTEM.md for full architecture documentation
 */

import { Injectable } from "@nestjs/common";
import { BaseEventService } from "@/core/modules/events";
import {
  pipelineEventContracts,
  type PipelineEventContracts,
  type ExecutionProgress,
  type ActionProgress,
  type ExecutionLog,
  type ActionCompletion,
  type ActionExecutionStatus,
} from "./pipeline-event.contracts";

@Injectable()
export class PipelineEventService extends BaseEventService<PipelineEventContracts> {
  constructor() {
    super("pipeline", pipelineEventContracts);
  }

  /**
   * Build full event name for pipeline events
   * Format: pipeline:{eventName}:{executionId}[:actionId]
   * 
   * This naming convention allows for efficient event routing and subscription filtering.
   */
  protected buildFullEventName(
    eventName: string,
    input: Record<string, unknown>
  ): string {
    const executionId = input.executionId as string;
    const actionId = input.actionId as string | undefined;

    if (actionId) {
      return `pipeline:${eventName}:${executionId}:${actionId}`;
    }
    return `pipeline:${eventName}:${executionId}`;
  }

  // =========================================================================
  // CONVENIENCE METHODS FOR EXECUTION PROGRESS
  // =========================================================================

  /**
   * Emit execution started event
   * Call this when a pipeline execution begins
   * 
   * @param executionId - Unique ID for this execution
   * @param pipelineId - ID of the pipeline being executed
   * @param totalSteps - Total number of actions in the pipeline
   */
  emitExecutionStarted(
    executionId: string,
    pipelineId: string,
    totalSteps: number
  ): void {
    const progress: ExecutionProgress = {
      executionId,
      pipelineId,
      status: "running",
      progress: {
        currentStep: 0,
        totalSteps,
        percentage: 0,
      },
      currentAction: null,
      completedActions: [],
      error: null,
      startedAt: new Date(),
      timestamp: Date.now(),
    };

    this.emit("executionProgress", { executionId }, progress);
  }

  /**
   * Emit action started event
   * Call this when an action within the pipeline starts executing
   * 
   * @param executionId - Execution ID
   * @param pipelineId - Pipeline ID
   * @param actionId - Action ID
   * @param actionName - Human-readable action name
   * @param stepNumber - Current step number (1-indexed)
   * @param totalSteps - Total steps in pipeline
   */
  emitActionStarted(
    executionId: string,
    pipelineId: string,
    actionId: string,
    actionName: string,
    stepNumber: number,
    totalSteps: number
  ): void {
    const progress: ExecutionProgress = {
      executionId,
      pipelineId,
      status: "running",
      progress: {
        currentStep: stepNumber,
        totalSteps,
        percentage: Math.round((stepNumber / totalSteps) * 100),
      },
      currentAction: {
        id: actionId,
        name: actionName,
        status: "running",
        startedAt: new Date(),
        progress: 0,
      },
      completedActions: [],
      error: null,
      timestamp: Date.now(),
    };

    this.emit("executionProgress", { executionId }, progress);
  }

  /**
   * Emit action progress update
   * Call this periodically during long-running action execution
   * 
   * @param executionId - Execution ID
   * @param actionId - Action ID
   * @param actionName - Action name
   * @param progress - Progress percentage (0-100)
   * @param message - Optional progress message
   * @param bytesProcessed - Optional bytes processed (for file operations)
   * @param totalBytes - Optional total bytes
   * @param metrics - Optional custom metrics
   */
  emitActionProgress(
    executionId: string,
    actionId: string,
    actionName: string,
    progress: number,
    message?: string,
    bytesProcessed?: number,
    totalBytes?: number,
    metrics?: Record<string, unknown>
  ): void {
    const actionProgress: ActionProgress = {
      executionId,
      actionId,
      actionName,
      progress: Math.min(100, Math.max(0, progress)), // Clamp to 0-100
      message,
      bytesProcessed,
      totalBytes,
      metrics,
      timestamp: Date.now(),
    };

    this.emit("actionProgress", { executionId, actionId }, actionProgress);
  }

  /**
   * Emit action completion
   * Call this when an action finishes (success or failure)
   * 
   * @param executionId - Execution ID
   * @param actionId - Action ID
   * @param actionName - Action name
   * @param status - Final status
   * @param durationMs - Action execution time in milliseconds
   * @param output - Optional action output
   * @param error - Optional error details
   */
  emitActionCompletion(
    executionId: string,
    actionId: string,
    actionName: string,
    status: ActionExecutionStatus,
    durationMs: number,
    output?: unknown,
    error?: { code: string; message: string; stack?: string }
  ): void {
    const completion: ActionCompletion = {
      executionId,
      actionId,
      actionName,
      status,
      output,
      error: error ?? null,
      durationMs,
      timestamp: Date.now(),
    };

    this.emit("actionCompletion", { executionId }, completion);
  }

  /**
   * Emit execution completed event
   * Call this when the entire pipeline successfully completes
   * 
   * @param executionId - Execution ID
   * @param pipelineId - Pipeline ID
   * @param completedActions - Summary of all completed actions
   */
  emitExecutionCompleted(
    executionId: string,
    pipelineId: string,
    completedActions: {
      id: string;
      name: string;
      status: ActionExecutionStatus;
      duration: number;
    }[]
  ): void {
    const progress: ExecutionProgress = {
      executionId,
      pipelineId,
      status: "completed",
      progress: {
        currentStep: completedActions.length,
        totalSteps: completedActions.length,
        percentage: 100,
      },
      currentAction: null,
      completedActions,
      error: null,
      timestamp: Date.now(),
    };

    this.emit("executionProgress", { executionId }, progress);
  }

  /**
   * Emit execution failed event
   * Call this when the pipeline execution fails
   * 
   * @param executionId - Execution ID
   * @param pipelineId - Pipeline ID
   * @param error - Error details
   * @param completedActions - Actions that were completed before failure
   */
  emitExecutionFailed(
    executionId: string,
    pipelineId: string,
    error: {
      code: string;
      message: string;
      actionId?: string;
      stack?: string;
    },
    completedActions: {
      id: string;
      name: string;
      status: ActionExecutionStatus;
      duration: number;
    }[]
  ): void {
    const progress: ExecutionProgress = {
      executionId,
      pipelineId,
      status: "failed",
      progress: {
        currentStep: completedActions.length,
        totalSteps: completedActions.length,
        percentage:
          completedActions.length > 0
            ? Math.round((completedActions.length / completedActions.length) * 100)
            : 0,
      },
      currentAction: null,
      completedActions,
      error,
      timestamp: Date.now(),
    };

    this.emit("executionProgress", { executionId }, progress);
  }

  /**
   * Emit execution cancelled event
   * Call this when the user cancels a running execution
   * 
   * @param executionId - Execution ID
   * @param pipelineId - Pipeline ID
   * @param completedActions - Actions completed before cancellation
   */
  emitExecutionCancelled(
    executionId: string,
    pipelineId: string,
    completedActions: {
      id: string;
      name: string;
      status: ActionExecutionStatus;
      duration: number;
    }[]
  ): void {
    const progress: ExecutionProgress = {
      executionId,
      pipelineId,
      status: "cancelled",
      progress: {
        currentStep: completedActions.length,
        totalSteps: completedActions.length,
        percentage:
          completedActions.length > 0
            ? Math.round((completedActions.length / completedActions.length) * 100)
            : 0,
      },
      currentAction: null,
      completedActions,
      error: null,
      timestamp: Date.now(),
    };

    this.emit("executionProgress", { executionId }, progress);
  }

  /**
   * Emit execution timeout event
   * Call this when execution exceeds the timeout limit
   * 
   * @param executionId - Execution ID
   * @param pipelineId - Pipeline ID
   * @param timeoutMs - Timeout value that was exceeded
   * @param completedActions - Actions completed before timeout
   */
  emitExecutionTimeout(
    executionId: string,
    pipelineId: string,
    timeoutMs: number,
    completedActions: {
      id: string;
      name: string;
      status: ActionExecutionStatus;
      duration: number;
    }[]
  ): void {
    const progress: ExecutionProgress = {
      executionId,
      pipelineId,
      status: "timeout",
      progress: {
        currentStep: completedActions.length,
        totalSteps: completedActions.length,
        percentage:
          completedActions.length > 0
            ? Math.round((completedActions.length / completedActions.length) * 100)
            : 0,
      },
      currentAction: null,
      completedActions,
      error: {
        code: "EXECUTION_TIMEOUT",
        message: `Execution exceeded timeout of ${String(timeoutMs)}ms`,
      },
      timestamp: Date.now(),
    };

    this.emit("executionProgress", { executionId }, progress);
  }

  // =========================================================================
  // LOGGING METHODS
  // =========================================================================

  /**
   * Emit log entry
   * Use this to stream log output to subscribers
   * 
   * @param executionId - Execution ID
   * @param level - Log level
   * @param message - Log message
   * @param actionId - Optional action ID for action-specific logs
   * @param data - Optional structured data
   */
  emitLog(
    executionId: string,
    level: "debug" | "info" | "warn" | "error",
    message: string,
    actionId?: string,
    data?: Record<string, unknown>
  ): void {
    const log: ExecutionLog = {
      executionId,
      actionId,
      level,
      message,
      data,
      timestamp: Date.now(),
    };

    this.emit("executionLog", { executionId, level }, log);
  }

  /**
   * Convenience methods for different log levels
   */

  logDebug(executionId: string, message: string, actionId?: string, data?: Record<string, unknown>): void {
    this.emitLog(executionId, "debug", message, actionId, data);
  }

  logInfo(executionId: string, message: string, actionId?: string, data?: Record<string, unknown>): void {
    this.emitLog(executionId, "info", message, actionId, data);
  }

  logWarn(executionId: string, message: string, actionId?: string, data?: Record<string, unknown>): void {
    this.emitLog(executionId, "warn", message, actionId, data);
  }

  logError(executionId: string, message: string, actionId?: string, data?: Record<string, unknown>): void {
    this.emitLog(executionId, "error", message, actionId, data);
  }
}
