/**
 * Pipeline CRUD Contracts
 * 
 * Standard CRUD operations for pipeline management.
 */

import { oc } from "@orpc/contract";
import { z } from "zod/v4";

// ============================================================================
// SHARED SCHEMAS
// ============================================================================

const ProcessingStrategy = z.enum(["parallel", "queue", "abort", "ignore"]);

const PipelineSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  processingStrategy: ProcessingStrategy,
  timeoutMs: z.number().int().positive().nullable(),
  maxRetries: z.number().int().min(0),
  variablesSchema: z.record(z.string(), z.unknown()).nullable(),
  defaultVariables: z.record(z.string(), z.unknown()),
  isEnabled: z.boolean(),
  ownerId: z.uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const PipelineActionSchema = z.object({
  id: z.uuid(),
  pipelineId: z.uuid(),
  actionId: z.uuid(),
  order: z.number().int().min(0),
  condition: z.record(z.string(), z.unknown()).nullable(),
  dependsOn: z.array(z.uuid()).nullable(),
  continueOnError: z.boolean(),
  retryCount: z.number().int().min(0),
  createdAt: z.date(),
});

// ============================================================================
// LIST PIPELINES
// ============================================================================

export const pipelineListContract = oc.route({
  method: "GET",
  path: "/",
  summary: "List pipelines",
  description: "Get a paginated list of pipelines owned by the current user",
  tags: ["Pipeline"],
})
.input(
  z.object({
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
    search: z.string().optional(),
    isEnabled: z.boolean().optional(),
  })
)
.output(
  z.object({
    pipelines: z.array(PipelineSchema),
    total: z.number().int().min(0),
  })
);

// ============================================================================
// GET PIPELINE
// ============================================================================

export const pipelineGetContract = oc.route({
  method: "GET",
  path: "/{id}",
  summary: "Get pipeline",
  description: "Get a single pipeline by ID with its actions",
  tags: ["Pipeline"],
})
.input(
  z.object({
    id: z.uuid(),
  })
)
.output(
  z.object({
    pipeline: PipelineSchema,
    actions: z.array(PipelineActionSchema),
  })
);

// ============================================================================
// CREATE PIPELINE
// ============================================================================

export const pipelineCreateContract = oc.route({
  method: "POST",
  path: "/",
  summary: "Create pipeline",
  description: "Create a new pipeline",
  tags: ["Pipeline"],
})
.input(
  z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    processingStrategy: ProcessingStrategy.default("queue"),
    timeoutMs: z.number().int().positive().optional(),
    maxRetries: z.number().int().min(0).default(0),
    variablesSchema: z.record(z.string(), z.unknown()).optional(),
    defaultVariables: z.record(z.string(), z.unknown()).default({}),
  })
)
.output(
  z.object({
    pipeline: PipelineSchema,
  })
);

// ============================================================================
// UPDATE PIPELINE
// ============================================================================

export const pipelineUpdateContract = oc.route({
  method: "PATCH",
  path: "/{id}",
  summary: "Update pipeline",
  description: "Update an existing pipeline",
  tags: ["Pipeline"],
})
.input(
  z.object({
    id: z.uuid(),
    name: z.string().min(1).max(255).optional(),
    description: z.string().nullable().optional(),
    processingStrategy: ProcessingStrategy.optional(),
    timeoutMs: z.number().int().positive().nullable().optional(),
    maxRetries: z.number().int().min(0).optional(),
    variablesSchema: z.record(z.string(), z.unknown()).nullable().optional(),
    defaultVariables: z.record(z.string(), z.unknown()).optional(),
    isEnabled: z.boolean().optional(),
  })
)
.output(
  z.object({
    pipeline: PipelineSchema,
  })
);

// ============================================================================
// DELETE PIPELINE
// ============================================================================

export const pipelineDeleteContract = oc.route({
  method: "DELETE",
  path: "/{id}",
  summary: "Delete pipeline",
  description: "Delete a pipeline and all its actions",
  tags: ["Pipeline"],
})
.input(
  z.object({
    id: z.uuid(),
  })
)
.output(
  z.object({
    success: z.boolean(),
  })
);

// ============================================================================
// ADD ACTION TO PIPELINE
// ============================================================================

export const pipelineAddActionContract = oc.route({
  method: "POST",
  path: "/{id}/actions",
  summary: "Add action to pipeline",
  description: "Add an action to a pipeline with ordering and dependencies",
  tags: ["Pipeline"],
})
.input(
  z.object({
    id: z.uuid().describe("Pipeline ID"),
    actionId: z.uuid().describe("Action ID to add"),
    order: z.number().int().min(0).describe("Execution order (0-indexed)"),
    condition: z.record(z.string(), z.unknown()).optional(),
    dependsOn: z.array(z.uuid()).optional(),
    continueOnError: z.boolean().default(false),
    retryCount: z.number().int().min(0).default(0),
  })
)
.output(
  z.object({
    pipelineAction: PipelineActionSchema,
  })
);

// ============================================================================
// REMOVE ACTION FROM PIPELINE
// ============================================================================

export const pipelineRemoveActionContract = oc.route({
  method: "DELETE",
  path: "/{id}/actions/{actionId}",
  summary: "Remove action from pipeline",
  description: "Remove an action from a pipeline",
  tags: ["Pipeline"],
})
.input(
  z.object({
    id: z.uuid().describe("Pipeline ID"),
    actionId: z.uuid().describe("Pipeline action ID to remove"),
  })
)
.output(
  z.object({
    success: z.boolean(),
  })
);

// ============================================================================
// UPDATE ACTION IN PIPELINE
// ============================================================================

export const pipelineUpdateActionContract = oc.route({
  method: "PATCH",
  path: "/{id}/actions/{actionId}",
  summary: "Update action in pipeline",
  description: "Update action configuration within a pipeline",
  tags: ["Pipeline"],
})
.input(
  z.object({
    id: z.uuid().describe("Pipeline ID"),
    actionId: z.uuid().describe("Pipeline action ID"),
    order: z.number().int().min(0).optional(),
    condition: z.record(z.string(), z.unknown()).nullable().optional(),
    dependsOn: z.array(z.uuid()).nullable().optional(),
    continueOnError: z.boolean().optional(),
    retryCount: z.number().int().min(0).optional(),
  })
)
.output(
  z.object({
    pipelineAction: PipelineActionSchema,
  })
);

// Type exports
export type PipelineListInput = z.infer<typeof pipelineListContract["~orpc"]["inputSchema"]>;
export type PipelineListOutput = z.infer<typeof pipelineListContract["~orpc"]["outputSchema"]>;
export type PipelineGetInput = z.infer<typeof pipelineGetContract["~orpc"]["inputSchema"]>;
export type PipelineGetOutput = z.infer<typeof pipelineGetContract["~orpc"]["outputSchema"]>;
export type PipelineCreateInput = z.infer<typeof pipelineCreateContract["~orpc"]["inputSchema"]>;
export type PipelineCreateOutput = z.infer<typeof pipelineCreateContract["~orpc"]["outputSchema"]>;
export type PipelineUpdateInput = z.infer<typeof pipelineUpdateContract["~orpc"]["inputSchema"]>;
export type PipelineUpdateOutput = z.infer<typeof pipelineUpdateContract["~orpc"]["outputSchema"]>;
export type PipelineDeleteInput = z.infer<typeof pipelineDeleteContract["~orpc"]["inputSchema"]>;
export type PipelineDeleteOutput = z.infer<typeof pipelineDeleteContract["~orpc"]["outputSchema"]>;

export type Pipeline = z.infer<typeof PipelineSchema>;
export type PipelineAction = z.infer<typeof PipelineActionSchema>;
