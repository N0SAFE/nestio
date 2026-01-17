/**
 * Pipeline Service
 * 
 * Core service for pipeline management (CRUD operations).
 * Handles pipeline creation, updates, action management, and access control.
 * 
 * @see docs/PLANIFIED-FILE-ACTIONS-SYSTEM.md
 */

import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { eq, and, desc, sql, like, or } from "drizzle-orm";
import * as schema from "@/config/drizzle/schema";
import type { DatabaseService } from "@/core/modules/database/services/database.service";

@Injectable()
export class PipelineService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * List pipelines for a user with filtering and pagination
   */
  async listPipelines(params: {
    userId: string;
    limit?: number;
    offset?: number;
    search?: string;
    isEnabled?: boolean;
  }) {
    const { userId, limit = 20, offset = 0, search, isEnabled } = params;

    const conditions = [eq(schema.pipelines.ownerId, userId)];

    if (search) {
      conditions.push(
        or(
          like(schema.pipelines.name, `%${search}%`),
          like(schema.pipelines.description, `%${search}%`)
        )!
      );
    }

    if (isEnabled !== undefined) {
      conditions.push(eq(schema.pipelines.isEnabled, isEnabled));
    }

    const [pipelines, [{ count }]] = await Promise.all([
      this.db.db
        .select()
        .from(schema.pipelines)
        .where(and(...conditions))
        .orderBy(desc(schema.pipelines.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.pipelines)
        .where(and(...conditions)),
    ]);

    return {
      pipelines,
      total: count,
    };
  }

  /**
   * Get a single pipeline by ID with its actions
   */
  async getPipeline(pipelineId: string, userId: string) {
    const pipeline = await this.db.db.query.pipelines.findFirst({
      where: eq(schema.pipelines.id, pipelineId),
      with: {
        pipelineActions: {
          orderBy: [schema.pipelineActions.order],
          with: {
            action: {
              with: {
                provider: true,
              },
            },
          },
        },
      },
    });

    if (!pipeline) {
      throw new NotFoundException(`Pipeline ${pipelineId} not found`);
    }

    // Verify ownership
    if (pipeline.ownerId !== userId) {
      throw new ForbiddenException("You do not have access to this pipeline");
    }

    return {
      pipeline,
      actions: pipeline.pipelineActions,
    };
  }

  /**
   * Create a new pipeline
   */
  async createPipeline(params: {
    userId: string;
    name: string;
    description?: string;
    processingStrategy?: "parallel" | "queue" | "abort" | "ignore";
    timeoutMs?: number;
    maxRetries?: number;
    variablesSchema?: Record<string, unknown>;
    defaultVariables?: Record<string, unknown>;
  }) {
    const {
      userId,
      name,
      description,
      processingStrategy = "queue",
      timeoutMs,
      maxRetries = 0,
      variablesSchema,
      defaultVariables = {},
    } = params;

    const [pipeline] = await this.db.db
      .insert(schema.pipelines)
      .values({
        ownerId: userId,
        name,
        description: description ?? null,
        processingStrategy,
        timeoutMs: timeoutMs ?? null,
        maxRetries,
        variablesSchema: variablesSchema ?? null,
        defaultVariables,
        isEnabled: true,
      })
      .returning();

    return { pipeline };
  }

  /**
   * Update an existing pipeline
   */
  async updatePipeline(params: {
    pipelineId: string;
    userId: string;
    name?: string;
    description?: string | null;
    processingStrategy?: "parallel" | "queue" | "abort" | "ignore";
    timeoutMs?: number | null;
    maxRetries?: number;
    variablesSchema?: Record<string, unknown> | null;
    defaultVariables?: Record<string, unknown>;
    isEnabled?: boolean;
  }) {
    const { pipelineId, userId, ...updates } = params;

    // Verify ownership
    await this.verifyPipelineOwnership(pipelineId, userId);

    const [pipeline] = await this.db.db
      .update(schema.pipelines)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(schema.pipelines.id, pipelineId))
      .returning();

    if (!pipeline) {
      throw new NotFoundException(`Pipeline ${pipelineId} not found`);
    }

    return { pipeline };
  }

  /**
   * Delete a pipeline
   */
  async deletePipeline(pipelineId: string, userId: string) {
    // Verify ownership
    await this.verifyPipelineOwnership(pipelineId, userId);

    // Check for running executions
    const runningExecutions = await this.db.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.pipelineExecutions)
      .where(
        and(
          eq(schema.pipelineExecutions.pipelineId, pipelineId),
          eq(schema.pipelineExecutions.status, "running")
        )
      );

    if (runningExecutions[0].count > 0) {
      throw new BadRequestException(
        "Cannot delete pipeline with running executions. Cancel them first."
      );
    }

    await this.db.db.delete(schema.pipelines).where(eq(schema.pipelines.id, pipelineId));

    return { success: true };
  }

  /**
   * Add an action to a pipeline
   */
  async addActionToPipeline(params: {
    pipelineId: string;
    userId: string;
    actionId: string;
    order: number;
    condition?: Record<string, unknown>;
    dependsOn?: string[];
    continueOnError?: boolean;
    retryCount?: number;
  }) {
    const {
      pipelineId,
      userId,
      actionId,
      order,
      condition,
      dependsOn,
      continueOnError = false,
      retryCount = 0,
    } = params;

    // Verify ownership
    await this.verifyPipelineOwnership(pipelineId, userId);

    // Verify action exists and user has access
    const action = await this.db.db.query.actions.findFirst({
      where: eq(schema.actions.id, actionId),
    });

    if (!action) {
      throw new NotFoundException(`Action ${actionId} not found`);
    }

    if (action.ownerId !== userId) {
      throw new ForbiddenException("You do not have access to this action");
    }

    const [pipelineAction] = await this.db.db
      .insert(schema.pipelineActions)
      .values({
        pipelineId,
        actionId,
        order,
        condition: condition ?? null,
        dependsOn: dependsOn ?? null,
        continueOnError,
        retryCount,
      })
      .returning();

    return { pipelineAction };
  }

  /**
   * Remove an action from a pipeline
   */
  async removeActionFromPipeline(pipelineId: string, pipelineActionId: string, userId: string) {
    // Verify ownership
    await this.verifyPipelineOwnership(pipelineId, userId);

    await this.db.db
      .delete(schema.pipelineActions)
      .where(
        and(
          eq(schema.pipelineActions.id, pipelineActionId),
          eq(schema.pipelineActions.pipelineId, pipelineId)
        )
      );

    return { success: true };
  }

  /**
   * Update an action in a pipeline
   */
  async updateActionInPipeline(params: {
    pipelineId: string;
    pipelineActionId: string;
    userId: string;
    order?: number;
    condition?: Record<string, unknown> | null;
    dependsOn?: string[] | null;
    continueOnError?: boolean;
    retryCount?: number;
  }) {
    const { pipelineId, pipelineActionId, userId, ...updates } = params;

    // Verify ownership
    await this.verifyPipelineOwnership(pipelineId, userId);

    const [pipelineAction] = await this.db.db
      .update(schema.pipelineActions)
      .set(updates)
      .where(
        and(
          eq(schema.pipelineActions.id, pipelineActionId),
          eq(schema.pipelineActions.pipelineId, pipelineId)
        )
      )
      .returning();

    if (!pipelineAction) {
      throw new NotFoundException(
        `Pipeline action ${pipelineActionId} not found in pipeline ${pipelineId}`
      );
    }

    return { pipelineAction };
  }

  /**
   * Helper: Verify pipeline ownership
   */
  private async verifyPipelineOwnership(pipelineId: string, userId: string): Promise<void> {
    const pipeline = await this.db.db.query.pipelines.findFirst({
      where: eq(schema.pipelines.id, pipelineId),
      columns: { ownerId: true },
    });

    if (!pipeline) {
      throw new NotFoundException(`Pipeline ${pipelineId} not found`);
    }

    if (pipeline.ownerId !== userId) {
      throw new ForbiddenException("You do not have access to this pipeline");
    }
  }

  /**
   * Get execution by ID with ownership verification
   */
  async getExecution(executionId: string, userId: string) {
    const execution = await this.db.db.query.pipelineExecutions.findFirst({
      where: eq(schema.pipelineExecutions.id, executionId),
      with: {
        pipeline: true,
        executionActions: {
          with: {
            action: true,
          },
        },
      },
    });

    if (!execution) {
      throw new NotFoundException(`Execution ${executionId} not found`);
    }

    if (execution.ownerId !== userId) {
      throw new ForbiddenException("You do not have access to this execution");
    }

    return execution;
  }

  /**
   * List executions with filtering
   */
  async listExecutions(params: {
    userId: string;
    pipelineId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const { userId, pipelineId, status, limit = 20, offset = 0 } = params;

    const conditions = [eq(schema.pipelineExecutions.ownerId, userId)];

    if (pipelineId) {
      conditions.push(eq(schema.pipelineExecutions.pipelineId, pipelineId));
    }

    if (status) {
      conditions.push(eq(schema.pipelineExecutions.status, status as any));
    }

    const [executions, [{ count }]] = await Promise.all([
      this.db.db
        .select()
        .from(schema.pipelineExecutions)
        .where(and(...conditions))
        .orderBy(desc(schema.pipelineExecutions.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.pipelineExecutions)
        .where(and(...conditions)),
    ]);

    return {
      executions,
      total: count,
    };
  }

  /**
   * Verify execution access (used by streaming endpoints)
   */
  async verifyExecutionAccess(executionId: string, userId: string): Promise<boolean> {
    const execution = await this.db.db.query.pipelineExecutions.findFirst({
      where: eq(schema.pipelineExecutions.id, executionId),
      columns: { ownerId: true },
    });

    if (!execution) {
      throw new NotFoundException(`Execution ${executionId} not found`);
    }

    if (execution.ownerId !== userId) {
      throw new ForbiddenException("You do not have access to this execution");
    }

    return true;
  }
}
