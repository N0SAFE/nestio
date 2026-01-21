/**
 * Pipeline Executor Service
 * 
 * Handles the execution of pipelines, managing action execution flow,
 * progress tracking, error handling, and real-time event emission.
 * 
 * This service coordinates with PipelineEventService to provide real-time
 * updates to connected clients via Server-Sent Events.
 * 
 * @see docs/PLANIFIED-FILE-ACTIONS-SYSTEM.md
 */

import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import * as schema from "@/config/drizzle/schema";
import { PipelineEventService } from "../events/pipeline-event.service";
import type { DatabaseService } from "@/core/modules/database/services/database.service";

// Type for pipeline with nested relations
type PipelineWithActions = typeof schema.pipelines.$inferSelect & {
  pipelineActions: (typeof schema.pipelineActions.$inferSelect & {
    action: typeof schema.actions.$inferSelect & {
      provider: typeof schema.actionProviders.$inferSelect;
    };
  })[];
};

type PipelineAction = PipelineWithActions['pipelineActions'][number];
type Action = PipelineAction['action'];

interface ExecutionContext {
  executionId: string;
  pipelineId: string;
  userId: string;
  inputObjects: { bucket: string; key: string }[];
  variables: Record<string, unknown>;
  isDryRun: boolean;
}

@Injectable()
export class PipelineExecutorService {
  private readonly logger = new Logger(PipelineExecutorService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly events: PipelineEventService
  ) {}

  /**
   * Start pipeline execution
   * Creates execution record and begins processing asynchronously
   */
  async startExecution(params: {
    pipelineId: string;
    userId: string;
    inputObjects: { bucket: string; key: string }[];
    variables?: Record<string, unknown>;
    dryRun?: boolean;
  }) {
    const {
      pipelineId,
      userId,
      inputObjects,
      variables = {},
      dryRun = false,
    } = params;

    // Load pipeline with actions
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
      throw new BadRequestException(`Pipeline ${pipelineId} not found`);
    }

    if (!pipeline.isEnabled) {
      throw new BadRequestException("Pipeline is disabled");
    }

    if (pipeline.ownerId !== userId) {
      throw new BadRequestException("You do not have access to this pipeline");
    }

    if (pipeline.pipelineActions.length === 0) {
      throw new BadRequestException("Pipeline has no actions");
    }

    // Create execution record
    const [execution] = await this.db.db
      .insert(schema.pipelineExecutions)
      .values({
        pipelineId,
        ownerId: userId,
        inputObjects,
        variables,
        status: "pending",
        currentStep: 0,
        totalSteps: pipeline.pipelineActions.length,
        isDryRun: dryRun,
      })
      .returning();

    if (!execution) {
      throw new Error("Failed to create execution");
    }

    // Execute asynchronously
    const context: ExecutionContext = {
      executionId: execution.id,
      pipelineId,
      userId,
      inputObjects,
      variables,
      isDryRun: dryRun,
    };

    // Don't await - run in background
    this.executeAsync(context, pipeline).catch((error: unknown) => {
      this.logger.error(`Execution ${execution.id} failed unexpectedly:`, error);
    });

    return execution;
  }

  /**
   * Execute pipeline asynchronously
   */
  private async executeAsync(
    context: ExecutionContext,
    pipeline: PipelineWithActions
  ): Promise<void> {
    const { executionId, pipelineId } = context;
    const startTime = Date.now();

    try {
      // Update status to running
      await this.db.db
        .update(schema.pipelineExecutions)
        .set({
          status: "running",
          startedAt: new Date(),
        })
        .where(eq(schema.pipelineExecutions.id, executionId));

      // Emit started event
      this.events.emitExecutionStarted(
        executionId,
        pipelineId,
        pipeline.pipelineActions.length
      );

      this.events.logInfo(
        executionId,
        `Starting pipeline execution: ${pipeline.name}`
      );

      const completedActions: {
        id: string;
        name: string;
        status: "completed" | "failed" | "skipped";
        duration: number;
      }[] = [];

      // Execute actions based on processing strategy
      if (pipeline.processingStrategy === "parallel") {
        await this.executeParallel(context, pipeline.pipelineActions, completedActions);
      } else {
        // Default to queue (sequential)
        await this.executeSequential(context, pipeline.pipelineActions, completedActions);
      }

      // Mark as completed
      const duration = Date.now() - startTime;
      await this.db.db
        .update(schema.pipelineExecutions)
        .set({
          status: "completed",
          completedAt: new Date(),
          durationMs: duration,
          currentStep: pipeline.pipelineActions.length,
        })
        .where(eq(schema.pipelineExecutions.id, executionId));

      this.events.emitExecutionCompleted(executionId, pipelineId, completedActions);
      this.events.logInfo(
        executionId,
        `Pipeline execution completed in ${String(duration)}ms`
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorDetails = {
        code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      };

      await this.db.db
        .update(schema.pipelineExecutions)
        .set({
          status: "failed",
          completedAt: new Date(),
          durationMs: duration,
          error: errorDetails,
        })
        .where(eq(schema.pipelineExecutions.id, executionId));

      this.events.emitExecutionFailed(executionId, pipelineId, errorDetails, []);
      this.events.logError(executionId, `Pipeline execution failed: ${errorDetails.message}`);
    }
  }

  /**
   * Execute actions sequentially (queue mode)
   */
  private async executeSequential(
    context: ExecutionContext,
    pipelineActions: PipelineAction[],
    completedActions: { id: string; name: string; status: 'completed' | 'failed' | 'skipped'; duration: number }[]
  ): Promise<void> {
    let stepNumber = 1;
    for (const pipelineAction of pipelineActions) {
      const action = pipelineAction.action;

      await this.executeAction(
        context,
        pipelineAction,
        action,
        stepNumber,
        pipelineActions.length,
        completedActions
      );
      stepNumber++;
    }
  }

  /**
   * Execute actions in parallel
   */
  private async executeParallel(
    context: ExecutionContext,
    pipelineActions: PipelineAction[],
    completedActions: { id: string; name: string; status: 'completed' | 'failed' | 'skipped'; duration: number }[]
  ): Promise<void> {
    await Promise.all(
      pipelineActions.map((pipelineAction, index) =>
        this.executeAction(
          context,
          pipelineAction,
          pipelineAction.action,
          index + 1,
          pipelineActions.length,
          completedActions
        )
      )
    );
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    context: ExecutionContext,
    pipelineAction: PipelineAction,
    action: Action,
    stepNumber: number,
    totalSteps: number,
    completedActions: { id: string; name: string; status: 'completed' | 'failed' | 'skipped'; duration: number }[]
  ): Promise<void> {
    const { executionId, pipelineId } = context;
    const actionStartTime = Date.now();

    try {
      // Create execution action record
      const [executionAction] = await this.db.db
        .insert(schema.executionActions)
        .values({
          executionId,
          pipelineActionId: pipelineAction.id,
          actionId: action.id,
          status: "running",
          startedAt: new Date(),
        })
        .returning();

      if (!executionAction) {
        throw new Error(`Failed to create execution action for ${action.name}`);
      }

      // Emit action started
      this.events.emitActionStarted(
        executionId,
        pipelineId,
        executionAction.id,
        action.name,
        stepNumber,
        totalSteps
      );

      this.events.logInfo(
        executionId,
        `Starting action: ${action.name}`,
        executionAction.id
      );

      // TODO: Implement actual action execution based on provider type
      // For now, simulate execution
      await this.simulateActionExecution(context, executionAction.id, action);

      const duration = Date.now() - actionStartTime;

      // Mark action as completed
      await this.db.db
        .update(schema.executionActions)
        .set({
          status: "completed",
          completedAt: new Date(),
          durationMs: duration,
          progress: 100,
        })
        .where(eq(schema.executionActions.id, executionAction.id));

      // Emit action completion
      this.events.emitActionCompletion(
        executionId,
        executionAction.id,
        action.name,
        "completed",
        duration
      );

      this.events.logInfo(
        executionId,
        `Action completed: ${action.name} (${String(duration)}ms)`,
        executionAction.id
      );

      completedActions.push({
        id: executionAction.id,
        name: action.name,
        status: "completed",
        duration,
      });
    } catch (error) {
      const duration = Date.now() - actionStartTime;
      const errorDetails = {
        code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      };

      this.events.logError(
        executionId,
        `Action failed: ${action.name} - ${errorDetails.message}`
      );

      completedActions.push({
        id: action.id,
        name: action.name,
        status: "failed",
        duration,
      });

      if (!pipelineAction.continueOnError) {
        throw error;
      }
    }
  }

  /**
   * Simulate action execution (placeholder for actual implementation)
   */
  private async simulateActionExecution(
    context: ExecutionContext,
    actionId: string,
    action: Action
  ): Promise<void> {
    const { executionId } = context;

    // Simulate progress updates
    for (let progress = 0; progress <= 100; progress += 25) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      this.events.emitActionProgress(
        executionId,
        actionId,
        action.name,
        progress,
        `Processing... ${String(progress)}%`
      );
    }
  }

  /**
   * Cancel a running execution
   */
  async cancelExecution(executionId: string, userId: string): Promise<void> {
    const execution = await this.db.db.query.pipelineExecutions.findFirst({
      where: eq(schema.pipelineExecutions.id, executionId),
    });

    if (!execution) {
      throw new BadRequestException(`Execution ${executionId} not found`);
    }

    if (execution.ownerId !== userId) {
      throw new BadRequestException("You do not have access to this execution");
    }

    if (execution.status !== "running") {
      throw new BadRequestException("Can only cancel running executions");
    }

    await this.db.db
      .update(schema.pipelineExecutions)
      .set({
        status: "cancelled",
        completedAt: new Date(),
      })
      .where(eq(schema.pipelineExecutions.id, executionId));

    this.events.emitExecutionCancelled(executionId, execution.pipelineId, []);
    this.events.logInfo(executionId, "Execution cancelled by user");
  }
}
