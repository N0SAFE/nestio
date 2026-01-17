/**
 * Pipeline Event Contracts
 * 
 * Type-safe event definitions for real-time pipeline execution streaming.
 * These contracts define the structure of events emitted during pipeline execution
 * and consumed by the PipelineEventService.
 * 
 * @see docs/PLANIFIED-FILE-ACTIONS-SYSTEM.md for full architecture documentation
 */

import { z } from "zod/v4";
import { contractBuilder, ProcessingStrategy } from "@/core/modules/events";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Pipeline execution status
 */
export const PipelineExecutionStatus = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
  "timeout",
]);

export type PipelineExecutionStatus = z.infer<typeof PipelineExecutionStatus>;

/**
 * Action execution status within a pipeline
 */
export const ActionExecutionStatus = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
]);

export type ActionExecutionStatus = z.infer<typeof ActionExecutionStatus>;

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * Progress event payload - emitted during pipeline execution
 * This represents the high-level pipeline execution progress
 */
export const ExecutionProgressSchema = z.object({
  executionId: z.uuid(),
  pipelineId: z.uuid(),
  status: PipelineExecutionStatus,

  // Overall progress
  progress: z.object({
    currentStep: z.number().int().min(0),
    totalSteps: z.number().int().min(0),
    percentage: z.number().min(0).max(100),
  }),

  // Current action details
  currentAction: z
    .object({
      id: z.string(),
      name: z.string(),
      status: ActionExecutionStatus,
      startedAt: z.iso.datetime().optional(),
      progress: z.number().min(0).max(100).optional(),
      message: z.string().optional(),
    })
    .nullable(),

  // Completed actions summary
  completedActions: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      status: ActionExecutionStatus,
      duration: z.number().int().min(0), // milliseconds
    })
  ),

  // Error details (if failed)
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      actionId: z.string().optional(),
      stack: z.string().optional(),
    })
    .nullable(),

  // Timing
  startedAt: z.iso.datetime().optional(),
  estimatedCompletion: z.iso.datetime().optional(),

  // Metadata
  timestamp: z.number().int(),
});

export type ExecutionProgress = z.infer<typeof ExecutionProgressSchema>;

/**
 * Action-level progress event - granular updates within an action
 * This provides detailed progress information for long-running actions
 */
export const ActionProgressSchema = z.object({
  executionId: z.uuid(),
  actionId: z.string(),
  actionName: z.string(),

  // Progress within the action
  progress: z.number().min(0).max(100),
  message: z.string().optional(),

  // For file processing actions
  bytesProcessed: z.number().int().min(0).optional(),
  totalBytes: z.number().int().min(0).optional(),

  // Custom metrics from action provider
  metrics: z.record(z.string(), z.unknown()).optional(),

  timestamp: z.number().int(),
});

export type ActionProgress = z.infer<typeof ActionProgressSchema>;

/**
 * Execution log entry
 * Real-time log output from pipeline execution
 */
export const ExecutionLogSchema = z.object({
  executionId: z.uuid(),
  actionId: z.string().optional(),
  level: z.enum(["debug", "info", "warn", "error"]),
  message: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.number().int(),
});

export type ExecutionLog = z.infer<typeof ExecutionLogSchema>;

/**
 * Action completion event
 * Emitted when a single action completes (success or failure)
 */
export const ActionCompletionSchema = z.object({
  executionId: z.uuid(),
  actionId: z.string(),
  actionName: z.string(),
  status: ActionExecutionStatus,
  output: z.unknown().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      stack: z.string().optional(),
    })
    .nullable(),
  durationMs: z.number().int().min(0),
  timestamp: z.number().int(),
});

export type ActionCompletion = z.infer<typeof ActionCompletionSchema>;

// ============================================================================
// EVENT CONTRACTS
// ============================================================================

/**
 * Pipeline Event Contracts
 * Type-safe event definitions for the PipelineEventService
 * 
 * Each contract defines:
 * - input: Event subscription parameters
 * - output: Event payload schema
 * - strategy: Processing strategy (PARALLEL, QUEUE, ABORT, IGNORE)
 */
export const pipelineEventContracts = {
  /**
   * Execution progress - high-level pipeline execution updates
   * Uses ABORT strategy: new subscription cancels previous for same executionId
   * 
   * @example
   * ```typescript
   * const subscription = pipelineEvents.subscribe('executionProgress', {
   *   executionId: 'abc-123'
   * });
   * 
   * for await (const progress of subscription) {
   *   console.log(`Progress: ${progress.progress.percentage}%`);
   *   if (progress.status === 'completed') break;
   * }
   * ```
   */
  executionProgress: contractBuilder()
    .input(
      z.object({
        executionId: z.uuid(),
      })
    )
    .output(ExecutionProgressSchema)
    .strategy(ProcessingStrategy.ABORT, {
      onAbort: (input, { signal: _signal }) => {
        console.log(`Aborting progress stream for execution ${input.executionId}`);
      },
    })
    .build(),

  /**
   * Action progress - granular progress within a single action
   * Uses PARALLEL strategy: multiple actions can emit simultaneously
   * 
   * @example
   * ```typescript
   * const subscription = pipelineEvents.subscribe('actionProgress', {
   *   executionId: 'abc-123',
   *   actionId: 'action-1'
   * });
   * 
   * for await (const progress of subscription) {
   *   console.log(`Action progress: ${progress.progress}%`);
   *   if (progress.progress >= 100) break;
   * }
   * ```
   */
  actionProgress: contractBuilder()
    .input(
      z.object({
        executionId: z.uuid(),
        actionId: z.string(),
      })
    )
    .output(ActionProgressSchema)
    .strategy(ProcessingStrategy.PARALLEL)
    .build(),

  /**
   * Execution log - real-time log streaming
   * Uses PARALLEL strategy for concurrent log streams
   * 
   * @example
   * ```typescript
   * const subscription = pipelineEvents.subscribe('executionLog', {
   *   executionId: 'abc-123',
   *   level: 'info' // Optional filter by level
   * });
   * 
   * for await (const log of subscription) {
   *   console.log(`[${log.level}] ${log.message}`);
   * }
   * ```
   */
  executionLog: contractBuilder()
    .input(
      z.object({
        executionId: z.uuid(),
        level: z.enum(["debug", "info", "warn", "error"]).optional(),
      })
    )
    .output(ExecutionLogSchema)
    .strategy(ProcessingStrategy.PARALLEL)
    .build(),

  /**
   * Action completion - emitted when each action finishes
   * Uses PARALLEL strategy for concurrent action completions
   * 
   * @example
   * ```typescript
   * const subscription = pipelineEvents.subscribe('actionCompletion', {
   *   executionId: 'abc-123'
   * });
   * 
   * for await (const completion of subscription) {
   *   console.log(`Action ${completion.actionName} ${completion.status}`);
   * }
   * ```
   */
  actionCompletion: contractBuilder()
    .input(
      z.object({
        executionId: z.uuid(),
      })
    )
    .output(ActionCompletionSchema)
    .strategy(ProcessingStrategy.PARALLEL)
    .build(),
} as const;

export type PipelineEventContracts = typeof pipelineEventContracts;
