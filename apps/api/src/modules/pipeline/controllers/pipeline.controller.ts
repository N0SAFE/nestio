/**
 * Pipeline Controller
 * 
 * ORPC controller for pipeline management and execution streaming.
 * Implements all contracts defined in packages/contracts/api/modules/pipeline/
 * 
 * Provides:
 * - CRUD operations for pipelines
 * - Pipeline execution management
 * - Real-time streaming of execution progress via Server-Sent Events
 * 
 * @see docs/PLANIFIED-FILE-ACTIONS-SYSTEM.md
 */

import { Controller } from "@nestjs/common";
import { implement, Implement } from "@orpc/nest";
import { pipelineContract } from "@repo/api-contracts";
import { requireAuth } from "@/core/modules/auth/orpc/middlewares";
import { PipelineService } from "../services/pipeline.service";
import { PipelineExecutorService } from "../services/pipeline-executor.service";
import { PipelineEventService } from "../events/pipeline-event.service";

@Controller()
export class PipelineController {
  constructor(
    private readonly pipelineService: PipelineService,
    private readonly executorService: PipelineExecutorService,
    private readonly events: PipelineEventService
  ) {}

  // =========================================================================
  // PIPELINE CRUD
  // =========================================================================

  @Implement(pipelineContract.list)
  list() {
    return implement(pipelineContract.list)
      .use(requireAuth())
      .handler(async ({ input, context }) => {
        return this.pipelineService.listPipelines({
          userId: context.auth.user.id,
          ...input,
        });
      });
  }

  @Implement(pipelineContract.get)
  get() {
    return implement(pipelineContract.get)
      .use(requireAuth())
      .handler(async ({ input, context }) => {
        return this.pipelineService.getPipeline(input.id, context.auth.user.id);
      });
  }

  @Implement(pipelineContract.create)
  create() {
    return implement(pipelineContract.create)
      .use(requireAuth())
      .handler(async ({ input, context }) => {
        return this.pipelineService.createPipeline({
          userId: context.auth.user.id,
          ...input,
        });
      });
  }

  @Implement(pipelineContract.update)
  update() {
    return implement(pipelineContract.update)
      .use(requireAuth())
      .handler(async ({ input, context }) => {
        return this.pipelineService.updatePipeline({
          pipelineId: input.id,
          userId: context.auth.user.id,
          ...input,
        });
      });
  }

  @Implement(pipelineContract.delete)
  delete() {
    return implement(pipelineContract.delete)
      .use(requireAuth())
      .handler(async ({ input, context }) => {
        return this.pipelineService.deletePipeline(input.id, context.auth.user.id);
      });
  }

  // =========================================================================
  // PIPELINE ACTIONS MANAGEMENT
  // =========================================================================

  @Implement(pipelineContract.addAction)
  addAction() {
    return implement(pipelineContract.addAction)
      .use(requireAuth())
      .handler(async ({ input, context }) => {
        return this.pipelineService.addActionToPipeline({
          pipelineId: input.id,
          userId: context.auth.user.id,
          actionId: input.actionId,
          order: input.order,
          condition: input.condition,
          dependsOn: input.dependsOn,
          continueOnError: input.continueOnError,
          retryCount: input.retryCount,
        });
      });
  }

  @Implement(pipelineContract.updateAction)
  updateAction() {
    return implement(pipelineContract.updateAction)
      .use(requireAuth())
      .handler(async ({ input, context }) => {
        return this.pipelineService.updateActionInPipeline({
          pipelineId: input.id,
          pipelineActionId: input.actionId,
          userId: context.auth.user.id,
          order: input.order,
          condition: input.condition,
          dependsOn: input.dependsOn,
          continueOnError: input.continueOnError,
          retryCount: input.retryCount,
        });
      });
  }

  @Implement(pipelineContract.removeAction)
  removeAction() {
    return implement(pipelineContract.removeAction)
      .use(requireAuth())
      .handler(async ({ input, context }) => {
        return this.pipelineService.removeActionFromPipeline(
          input.id,
          input.actionId,
          context.auth.user.id
        );
      });
  }

  // =========================================================================
  // EXECUTION MANAGEMENT
  // =========================================================================

  @Implement(pipelineContract.execute)
  execute() {
    return implement(pipelineContract.execute)
      .use(requireAuth())
      .handler(async ({ input, context }) => {
        const execution = await this.executorService.startExecution({
          pipelineId: input.id,
          userId: context.auth.user.id,
          inputObjects: input.inputObjects,
          variables: input.variables,
          dryRun: input.dryRun,
        });

        return {
          executionId: execution.id,
          status: execution.status as any,
          dryRunResult: execution.isDryRun ? execution.dryRunResult : undefined,
        };
      });
  }

  @Implement(pipelineContract.listExecutions)
  listExecutions() {
    return implement(pipelineContract.listExecutions)
      .use(requireAuth())
      .handler(async ({ input, context }) => {
        return this.pipelineService.listExecutions({
          userId: context.auth.user.id,
          pipelineId: input.pipelineId,
          status: input.status,
          limit: input.limit,
          offset: input.offset,
        });
      });
  }

  @Implement(pipelineContract.getExecution)
  getExecution() {
    return implement(pipelineContract.getExecution)
      .use(requireAuth())
      .handler(async ({ input, context }) => {
        const execution = await this.pipelineService.getExecution(
          input.executionId,
          context.auth.user.id
        );

        return { execution };
      });
  }

  @Implement(pipelineContract.cancelExecution)
  cancelExecution() {
    return implement(pipelineContract.cancelExecution)
      .use(requireAuth())
      .handler(async ({ input, context }) => {
        await this.executorService.cancelExecution(input.executionId, context.auth.user.id);
        return { success: true };
      });
  }

  // =========================================================================
  // REAL-TIME STREAMING (Server-Sent Events)
  // =========================================================================

  /**
   * Stream execution progress via SSE
   * 
   * This endpoint returns an async generator that yields progress events.
   * ORPC automatically handles the SSE streaming protocol with keep-alive.
   * 
   * The stream automatically closes when execution reaches a terminal state.
   */
  @Implement(pipelineContract.executionProgress)
  executionProgress() {
    const events = this.events;
    const pipelineService = this.pipelineService;

    return implement(pipelineContract.executionProgress)
      .use(requireAuth())
      .handler(async function* ({ input, context }) {
        const { executionId } = input;

        // Verify user has access to this execution
        await pipelineService.verifyExecutionAccess(executionId, context.auth.user.id);

        // Check if execution is already completed
        const execution = await pipelineService.getExecution(executionId, context.auth.user.id);

        if (
          execution.status === "completed" ||
          execution.status === "failed" ||
          execution.status === "cancelled" ||
          execution.status === "timeout"
        ) {
          // Yield final state and close
          yield {
            executionId: execution.id,
            pipelineId: execution.pipelineId,
            status: execution.status as any,
            progress: {
              currentStep: execution.currentStep,
              totalSteps: execution.totalSteps,
              percentage: Math.round((execution.currentStep / execution.totalSteps) * 100),
            },
            currentAction: null,
            completedActions: [],
            error: execution.error as any,
            timestamp: Date.now(),
          };
          return;
        }

        // Subscribe to live progress updates
        const subscription = events.subscribe("executionProgress", { executionId });

        // Stream events as they arrive
        for await (const progress of subscription) {
          yield progress;

          // Stop streaming when execution completes
          if (
            progress.status === "completed" ||
            progress.status === "failed" ||
            progress.status === "cancelled" ||
            progress.status === "timeout"
          ) {
            break;
          }
        }
      });
  }

  /**
   * Stream action-level progress via SSE
   * 
   * Provides granular progress updates for a specific action within an execution.
   */
  @Implement(pipelineContract.actionProgress)
  actionProgress() {
    const events = this.events;
    const pipelineService = this.pipelineService;

    return implement(pipelineContract.actionProgress)
      .use(requireAuth())
      .handler(async function* ({ input, context }) {
        const { executionId, actionId } = input;

        // Verify access
        await pipelineService.verifyExecutionAccess(executionId, context.auth.user.id);

        // Subscribe to action progress
        const subscription = events.subscribe("actionProgress", {
          executionId,
          actionId,
        });

        for await (const progress of subscription) {
          yield progress;

          // Stop when action reaches 100%
          if (progress.progress >= 100) {
            break;
          }
        }
      });
  }

  /**
   * Stream execution logs via SSE
   * 
   * Provides real-time log output from pipeline execution.
   */
  @Implement(pipelineContract.executionLogs)
  executionLogs() {
    const events = this.events;
    const pipelineService = this.pipelineService;

    return implement(pipelineContract.executionLogs)
      .use(requireAuth())
      .handler(async function* ({ input, context }) {
        const { executionId, level } = input;

        // Verify access
        await pipelineService.verifyExecutionAccess(executionId, context.auth.user.id);

        // Subscribe to logs
        const subscription = events.subscribe("executionLog", {
          executionId,
          level,
        });

        for await (const log of subscription) {
          // Filter by level if specified
          if (level && log.level !== level) {
            continue;
          }
          yield log;
        }
      });
  }
}
