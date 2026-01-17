/**
 * Pipeline Execution Contract
 * 
 * Contracts for executing pipelines and managing executions.
 */

import { oc } from "@orpc/contract";
import { z } from "zod/v4";

const ExecutionStatus = z.enum(["pending", "running", "completed", "failed", "cancelled", "timeout"]);

const PipelineExecutionSchema = z.object({
  id: z.uuid(),
  pipelineId: z.uuid(),
  status: ExecutionStatus,
  inputObjects: z.array(z.object({ bucket: z.string(), key: z.string() })),
  variables: z.record(z.string(), z.unknown()),
  currentStep: z.number().int().min(0),
  totalSteps: z.number().int().min(0),
  output: z.unknown().nullable(),
  error: z.record(z.string(), z.unknown()).nullable(),
  startedAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
  durationMs: z.number().int().nullable(),
  isDryRun: z.boolean(),
  createdAt: z.iso.datetime(),
});

/**
 * Execute pipeline contract
 */
export const pipelineExecuteContract = oc.route({
  method: "POST",
  path: "/{id}/execute",
  summary: "Execute pipeline",
  description: "Start pipeline execution on specified objects",
  tags: ["Pipeline Execution"],
})
.input(
  z.object({
    id: z.uuid().describe("Pipeline ID"),
    inputObjects: z.array(z.object({ bucket: z.string(), key: z.string() })),
    variables: z.record(z.string(), z.unknown()).optional(),
    dryRun: z.boolean().default(false),
  })
)
.output(
  z.object({
    executionId: z.uuid(),
    status: ExecutionStatus,
    dryRunResult: z.record(z.string(), z.unknown()).optional(),
  })
);

/**
 * Get execution details
 */
export const pipelineGetExecutionContract = oc.route({
  method: "GET",
  path: "/executions/{executionId}",
  summary: "Get execution",
  description: "Get detailed information about a pipeline execution",
  tags: ["Pipeline Execution"],
})
.input(
  z.object({
    executionId: z.uuid(),
  })
)
.output(
  z.object({
    execution: PipelineExecutionSchema,
  })
);

/**
 * Cancel execution
 */
export const pipelineCancelExecutionContract = oc.route({
  method: "POST",
  path: "/executions/{executionId}/cancel",
  summary: "Cancel execution",
  description: "Cancel a running pipeline execution",
  tags: ["Pipeline Execution"],
})
.input(
  z.object({
    executionId: z.uuid(),
  })
)
.output(
  z.object({
    success: z.boolean(),
  })
);

/**
 * List executions
 */
export const pipelineListExecutionsContract = oc.route({
  method: "GET",
  path: "/executions",
  summary: "List executions",
  description: "List pipeline executions with filtering",
  tags: ["Pipeline Execution"],
})
.input(
  z.object({
    pipelineId: z.uuid().optional(),
    status: ExecutionStatus.optional(),
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
  })
)
.output(
  z.object({
    executions: z.array(PipelineExecutionSchema),
    total: z.number().int().min(0),
  })
);

export type PipelineExecuteInput = z.infer<typeof pipelineExecuteContract["~orpc"]["inputSchema"]>;
export type PipelineExecuteOutput = z.infer<typeof pipelineExecuteContract["~orpc"]["outputSchema"]>;
export type PipelineExecution = z.infer<typeof PipelineExecutionSchema>;
