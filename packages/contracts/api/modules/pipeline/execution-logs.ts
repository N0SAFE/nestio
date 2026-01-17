/**
 * Execution Logs Streaming Contract
 * 
 * Provides real-time log output from pipeline execution.
 * Streams all log entries (debug, info, warn, error) as they are generated.
 * 
 * @see docs/PLANIFIED-FILE-ACTIONS-SYSTEM.md
 */

import { oc, eventIterator } from "@orpc/contract";
import { z } from "zod/v4";

/**
 * Log level enum
 */
const LogLevel = z.enum(["debug", "info", "warn", "error"]);

/**
 * Execution log entry schema
 */
const ExecutionLogEntrySchema = z.object({
  executionId: z.uuid(),
  actionId: z.string().optional(),
  level: LogLevel,
  message: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.number().int(),
});

/**
 * Execution logs streaming contract
 * 
 * Stream real-time log output from a pipeline execution.
 * Optionally filter by log level to reduce noise.
 * 
 * @example
 * ```typescript
 * // Stream all logs
 * const { data: logs } = useQuery(
 *   orpc.pipeline.executionLogs.experimental_streamedOptions({
 *     input: { executionId: 'abc-123' },
 *     queryFnOptions: { maxChunks: 1000 }, // Keep last 1000 entries
 *     retry: true,
 *   })
 * );
 * 
 * // Stream only errors
 * const { data: errorLogs } = useQuery(
 *   orpc.pipeline.executionLogs.experimental_streamedOptions({
 *     input: { executionId: 'abc-123', level: 'error' },
 *     retry: true,
 *   })
 * );
 * ```
 */
export const pipelineExecutionLogsContract = oc.route({
  method: "GET",
  path: "/{executionId}/logs",
  summary: "Stream execution logs",
  description:
    "Subscribe to real-time log output from a pipeline execution. " +
    "Optionally filter by log level. Logs accumulate in an array on the client.",
  tags: ["Pipeline Execution"],
})
.input(
  z.object({
    executionId: z.uuid().describe("Pipeline execution ID"),
    level: LogLevel.optional().describe("Filter logs by minimum level (debug, info, warn, error)"),
  })
)
.output(eventIterator(ExecutionLogEntrySchema));

// Type exports
export type PipelineExecutionLogsInput = z.infer<
  typeof pipelineExecutionLogsContract["~orpc"]["inputSchema"]
>;

export type PipelineExecutionLogEntry = z.infer<typeof ExecutionLogEntrySchema>;
