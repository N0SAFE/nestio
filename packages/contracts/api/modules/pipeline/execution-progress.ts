/**
 * Pipeline Execution Progress Streaming Contract
 * 
 * Provides real-time Server-Sent Events (SSE) streaming of pipeline execution progress.
 * Clients subscribe to this endpoint to receive live updates as the pipeline executes.
 * 
 * @see docs/PLANIFIED-FILE-ACTIONS-SYSTEM.md for usage documentation
 */

import { oc, eventIterator } from "@orpc/contract";
import { z } from "zod/v4";

/**
 * Pipeline execution status enum
 */
const PipelineExecutionStatus = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
  "timeout",
]);

/**
 * Action execution status enum
 */
const ActionExecutionStatus = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
]);

/**
 * Execution progress event schema
 * Streamed to clients during pipeline execution
 */
const ExecutionProgressEventSchema = z.object({
  executionId: z.uuid(),
  pipelineId: z.uuid(),
  status: PipelineExecutionStatus,

  progress: z.object({
    currentStep: z.number().int().min(0),
    totalSteps: z.number().int().min(0),
    percentage: z.number().min(0).max(100),
  }),

  currentAction: z
    .object({
      id: z.string(),
      name: z.string(),
      status: ActionExecutionStatus,
      startedAt: z.date().optional(),
      progress: z.number().min(0).max(100).optional(),
      message: z.string().optional(),
    })
    .nullable(),

  completedActions: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      status: ActionExecutionStatus,
      duration: z.number().int().min(0), // milliseconds
    })
  ),

  error: z
    .object({
      code: z.string(),
      message: z.string(),
      actionId: z.string().optional(),
      stack: z.string().optional(),
    })
    .nullable(),

  // Timing information
  startedAt: z.date().optional(),
  estimatedCompletion: z.date().optional(),

  timestamp: z.number().int(),
});

/**
 * Execution progress streaming contract
 * 
 * Stream real-time progress updates for a pipeline execution via Server-Sent Events (SSE).
 * The connection stays open until the execution completes, fails, or is cancelled.
 * 
 * @example
 * ```typescript
 * // Frontend usage with TanStack Query
 * const { data: progress } = useQuery(
 *   orpc.pipeline.executionProgress.experimental_liveOptions({
 *     input: { executionId: 'abc-123' },
 *     retry: true,
 *     staleTime: Infinity,
 *   })
 * );
 * ```
 */
export const pipelineExecutionProgressContract = oc.route({
  method: "GET",
  path: "/{executionId}/progress",
  summary: "Stream execution progress",
  description:
    "Subscribe to real-time progress updates for a pipeline execution via Server-Sent Events (SSE). " +
    "The stream automatically closes when execution reaches a terminal state (completed, failed, cancelled, timeout).",
  tags: ["Pipeline Execution"],
})
.input(
  z.object({
    executionId: z.uuid().describe("Pipeline execution ID to monitor"),
  })
)
.output(eventIterator(ExecutionProgressEventSchema));

// Type exports
export type PipelineExecutionProgressInput = z.infer<
  typeof pipelineExecutionProgressContract["~orpc"]["inputSchema"]
>;

export type PipelineExecutionProgressEvent = z.infer<typeof ExecutionProgressEventSchema>;
