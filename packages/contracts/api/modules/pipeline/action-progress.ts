/**
 * Action Progress Streaming Contract
 * 
 * Provides granular, real-time progress updates for individual actions within a pipeline execution.
 * Useful for displaying detailed progress for long-running operations like file compression or image processing.
 * 
 * @see docs/PLANIFIED-FILE-ACTIONS-SYSTEM.md
 */

import { oc, eventIterator } from "@orpc/contract";
import { z } from "zod/v4";

/**
 * Action progress event schema
 * Provides detailed progress information for a single action
 */
const ActionProgressEventSchema = z.object({
  executionId: z.uuid(),
  actionId: z.string(),
  actionName: z.string(),

  // Progress percentage (0-100)
  progress: z.number().min(0).max(100),
  message: z.string().optional(),

  // For file processing actions
  bytesProcessed: z.number().int().min(0).optional(),
  totalBytes: z.number().int().min(0).optional(),

  // Custom metrics from action provider
  metrics: z.record(z.string(), z.unknown()).optional(),

  timestamp: z.number().int(),
});

/**
 * Action progress streaming contract
 * 
 * Stream real-time progress updates for a specific action within a pipeline execution.
 * Provides granular progress information including bytes processed, custom metrics, and status messages.
 * 
 * @example
 * ```typescript
 * // Frontend usage
 * const { data: actionProgress } = useQuery(
 *   orpc.pipeline.actionProgress.experimental_liveOptions({
 *     input: { executionId: 'abc-123', actionId: 'action-1' },
 *     retry: true,
 *   })
 * );
 * 
 * // Display: "Compressing image... 75% (3.2 MB / 4.3 MB)"
 * ```
 */
export const pipelineActionProgressContract = oc.route({
  method: "GET",
  path: "/{executionId}/actions/{actionId}/progress",
  summary: "Stream action progress",
  description:
    "Subscribe to real-time progress updates for a specific action within a pipeline execution. " +
    "Provides detailed progress information including percentage, bytes processed, and custom metrics.",
  tags: ["Pipeline Execution"],
})
.input(
  z.object({
    executionId: z.uuid().describe("Pipeline execution ID"),
    actionId: z.string().describe("Action ID within the pipeline"),
  })
)
.output(eventIterator(ActionProgressEventSchema));

// Type exports
export type PipelineActionProgressInput = z.infer<
  typeof pipelineActionProgressContract["~orpc"]["inputSchema"]
>;

export type PipelineActionProgressEvent = z.infer<typeof ActionProgressEventSchema>;
