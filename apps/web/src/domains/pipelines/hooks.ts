/**
 * Pipeline Domain - Client Hooks
 *
 * React hooks for pipeline management with automatic cache invalidation.
 * Provides planified file action operations with real-time progress streaming.
 */

"use client";

import { useQuery, useMutation, skipToken } from "@tanstack/react-query";
import { pipelineEndpoints } from "./endpoints";
import { pipelineInvalidations } from "./invalidations";
import { wrapWithInvalidations } from "../shared/helpers";
import { toast } from "sonner";

// Wrap endpoints with automatic invalidation
const enhancedPipeline = wrapWithInvalidations(pipelineEndpoints, pipelineInvalidations);

// ============================================================================
// PIPELINE QUERY HOOKS (Read Operations)
// ============================================================================

/**
 * List all pipelines with optional filtering
 * 
 * @example
 * const { data: pipelines, isLoading } = usePipelines()
 */
export function usePipelines(options?: { 
  enabled?: boolean;
  search?: string;
  status?: "active" | "inactive";
}) {
  return useQuery(
    pipelineEndpoints.list.queryOptions({ 
      input: {
        search: options?.search,
        status: options?.status,
      },
      enabled: options?.enabled,
    }),
  );
}

/**
 * Get pipeline details by ID
 * 
 * @example
 * const { data: pipeline } = usePipeline(pipelineId)
 */
export function usePipeline(
  id: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery(
    pipelineEndpoints.get.queryOptions({
      input: id ? { id } : skipToken,
      enabled: options?.enabled,
    }),
  );
}

/**
 * List pipeline executions with optional filtering
 * 
 * @example
 * const { data: executions } = usePipelineExecutions(pipelineId)
 */
export function usePipelineExecutions(options?: {
  pipelineId?: string;
  status?: "pending" | "running" | "completed" | "failed" | "cancelled" | "timeout";
  limit?: number;
  offset?: number;
  enabled?: boolean;
}) {
  return useQuery(
    pipelineEndpoints.listExecutions.queryOptions({
      input: {
        pipelineId: options?.pipelineId,
        status: options?.status,
        limit: options?.limit ?? 20,
        offset: options?.offset ?? 0,
      },
      enabled: options?.enabled,
    }),
  );
}

/**
 * Get execution details by ID
 * 
 * @example
 * const { data: execution } = useExecution(executionId)
 */
export function useExecution(
  executionId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery(
    pipelineEndpoints.getExecution.queryOptions({
      input: executionId ? { executionId } : skipToken,
      enabled: options?.enabled,
    }),
  );
}

// ============================================================================
// STREAMING QUERY HOOKS (Real-time SSE)
// ============================================================================

/**
 * Stream execution progress (latest state)
 * Uses experimental_liveOptions to show the most recent progress update
 * 
 * @example
 * const { data: progress } = useExecutionProgress(executionId)
 * // data contains: { executionId, status, progress, currentStep, totalSteps, currentAction }
 */
export function useExecutionProgress(
  executionId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery(
    pipelineEndpoints.executionProgress.experimental_liveOptions({
      input: executionId ? { executionId } : skipToken,
      enabled: options?.enabled,
      retry: true,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    }),
  );
}

/**
 * Stream action progress (latest action state)
 * Uses experimental_liveOptions to show the most recent action update
 * 
 * @example
 * const { data: actionProgress } = useActionProgress(executionId, actionId)
 * // data contains: { actionId, actionName, actionType, status, progress, message }
 */
export function useActionProgress(
  executionId: string | undefined,
  actionId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery(
    pipelineEndpoints.actionProgress.experimental_liveOptions({
      input: executionId && actionId ? { executionId, actionId } : skipToken,
      enabled: options?.enabled,
      retry: true,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    }),
  );
}

/**
 * Stream execution logs (accumulated history)
 * Uses experimental_streamedOptions to accumulate all log entries
 * 
 * @example
 * const { data: logs } = useExecutionLogs(executionId)
 * // data is an array of log entries: [{ timestamp, level, message, actionId }, ...]
 */
export function useExecutionLogs(
  executionId: string | undefined,
  options?: { 
    enabled?: boolean;
    maxChunks?: number;
  }
) {
  return useQuery(
    pipelineEndpoints.executionLogs.experimental_streamedOptions({
      input: executionId ? { executionId } : skipToken,
      enabled: options?.enabled,
      queryFnOptions: {
        maxChunks: options?.maxChunks ?? 1000,
      },
      retry: true,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    }),
  );
}

// ============================================================================
// PIPELINE MUTATION HOOKS (Write Operations)
// ============================================================================

/**
 * Create pipeline mutation
 * Invalidates pipeline list after creation
 * 
 * @example
 * const createPipeline = useCreatePipeline()
 * await createPipeline.mutateAsync({ name: 'My Pipeline', ... })
 */
export function useCreatePipeline() {
  return useMutation(
    pipelineEndpoints.create.mutationOptions({
      onSuccess: enhancedPipeline.create.withInvalidationOnSuccess((data, variables) => {
        toast.success(`Pipeline "${variables.name}" created successfully`);
      }),
      onError: (error: Error) => {
        toast.error(`Failed to create pipeline: ${error.message}`);
      },
    }),
  );
}

/**
 * Update pipeline mutation
 * Invalidates pipeline list and specific pipeline
 * 
 * @example
 * const updatePipeline = useUpdatePipeline()
 * await updatePipeline.mutateAsync({ id: pipelineId, name: 'Updated Name', ... })
 */
export function useUpdatePipeline() {
  return useMutation(
    pipelineEndpoints.update.mutationOptions({
      onSuccess: enhancedPipeline.update.withInvalidationOnSuccess(() => {
        toast.success('Pipeline updated successfully');
      }),
      onError: (error: Error) => {
        toast.error(`Failed to update pipeline: ${error.message}`);
      },
    }),
  );
}

/**
 * Delete pipeline mutation
 * Invalidates pipeline list and specific pipeline
 * 
 * @example
 * const deletePipeline = useDeletePipeline()
 * await deletePipeline.mutateAsync(pipelineId)
 */
export function useDeletePipeline() {
  return useMutation(
    pipelineEndpoints.delete.mutationOptions({
      onSuccess: enhancedPipeline.delete.withInvalidationOnSuccess(() => {
        toast.success('Pipeline deleted successfully');
      }),
      onError: (error: Error) => {
        toast.error(`Failed to delete pipeline: ${error.message}`);
      },
    }),
  );
}

/**
 * Add action to pipeline mutation
 * Invalidates the specific pipeline
 * 
 * @example
 * const addAction = useAddPipelineAction()
 * await addAction.mutateAsync({ pipelineId, actionType: 'copy', config: {...} })
 */
export function useAddPipelineAction() {
  return useMutation(
    pipelineEndpoints.addAction.mutationOptions({
      onSuccess: enhancedPipeline.addAction.withInvalidationOnSuccess(() => {
        toast.success('Action added to pipeline');
      }),
      onError: (error: Error) => {
        toast.error(`Failed to add action: ${error.message}`);
      },
    }),
  );
}

/**
 * Remove action from pipeline mutation
 * Invalidates the specific pipeline
 * 
 * @example
 * const removeAction = useRemovePipelineAction()
 * await removeAction.mutateAsync({ pipelineId, actionId })
 */
export function useRemovePipelineAction() {
  return useMutation(
    pipelineEndpoints.removeAction.mutationOptions({
      onSuccess: enhancedPipeline.removeAction.withInvalidationOnSuccess(() => {
        toast.success('Action removed from pipeline');
      }),
      onError: (error: Error) => {
        toast.error(`Failed to remove action: ${error.message}`);
      },
    }),
  );
}

// ============================================================================
// EXECUTION MUTATION HOOKS
// ============================================================================

/**
 * Execute pipeline mutation
 * Invalidates executions list and pipeline details
 * 
 * @example
 * const execute = useExecutePipeline()
 * const result = await execute.mutateAsync({
 *   id: pipelineId,
 *   inputObjects: [{ bucket: 'my-bucket', key: 'file.txt' }],
 *   variables: { targetBucket: 'destination' },
 * })
 * // result.executionId can be used to track progress
 */
export function useExecutePipeline() {
  return useMutation(
    pipelineEndpoints.execute.mutationOptions({
      onSuccess: enhancedPipeline.execute.withInvalidationOnSuccess((data) => {
        toast.success(`Execution started: ${data.executionId}`);
      }),
      onError: (error: Error) => {
        toast.error(`Failed to execute pipeline: ${error.message}`);
      },
    }),
  );
}

/**
 * Cancel execution mutation
 * Invalidates the specific execution and executions list
 * 
 * @example
 * const cancel = useCancelExecution()
 * await cancel.mutateAsync(executionId)
 */
export function useCancelExecution() {
  return useMutation(
    pipelineEndpoints.cancelExecution.mutationOptions({
      onSuccess: enhancedPipeline.cancelExecution.withInvalidationOnSuccess(() => {
        toast.success('Execution cancelled');
      }),
      onError: (error: Error) => {
        toast.error(`Failed to cancel execution: ${error.message}`);
      },
    }),
  );
}

// ============================================================================
// COMPOSITE HOOKS
// ============================================================================

/**
 * Get all pipeline mutations in one hook
 * 
 * @example
 * const pipelines = usePipelineActions()
 * await pipelines.create.mutateAsync({ name: 'My Pipeline', ... })
 * await pipelines.update.mutateAsync({ id, name: 'Updated', ... })
 * await pipelines.delete.mutateAsync(id)
 */
export function usePipelineActions() {
  const create = useCreatePipeline();
  const update = useUpdatePipeline();
  const deletePipeline = useDeletePipeline();
  const addAction = useAddPipelineAction();
  const removeAction = useRemovePipelineAction();

  return {
    create,
    update,
    delete: deletePipeline,
    addAction,
    removeAction,

    isLoading: {
      create: create.isPending,
      update: update.isPending,
      delete: deletePipeline.isPending,
      addAction: addAction.isPending,
      removeAction: removeAction.isPending,
    },

    errors: {
      create: create.error,
      update: update.error,
      delete: deletePipeline.error,
      addAction: addAction.error,
      removeAction: removeAction.error,
    },
  };
}

/**
 * Get all execution actions in one hook
 * 
 * @example
 * const executions = useExecutionActions()
 * const { executionId } = await executions.execute.mutateAsync({ id: pipelineId, ... })
 * await executions.cancel.mutateAsync(executionId)
 */
export function useExecutionActions() {
  const execute = useExecutePipeline();
  const cancel = useCancelExecution();

  return {
    execute,
    cancel,

    isLoading: {
      execute: execute.isPending,
      cancel: cancel.isPending,
    },

    errors: {
      execute: execute.error,
      cancel: cancel.error,
    },
  };
}

/**
 * Get all pipeline data and actions in one hook
 * Useful for comprehensive pipeline management pages
 * 
 * @example
 * const pipeline = usePipelineManagement(pipelineId)
 * const { data } = pipeline.queries.pipeline
 * await pipeline.actions.execute.mutateAsync({ id: pipelineId, ... })
 */
export function usePipelineManagement(pipelineId: string | undefined) {
  const pipeline = usePipeline(pipelineId);
  const executions = usePipelineExecutions({ pipelineId });
  const actions = usePipelineActions();
  const executionActions = useExecutionActions();

  return {
    queries: {
      pipeline,
      executions,
    },
    actions,
    executionActions,
  };
}

/**
 * Get execution monitoring data with real-time streaming
 * Provides both static data and live progress updates
 * 
 * @example
 * const execution = useExecutionMonitoring(executionId)
 * const { data: details } = execution.queries.execution
 * const { data: progress } = execution.streams.progress
 * const { data: logs } = execution.streams.logs
 */
export function useExecutionMonitoring(
  executionId: string | undefined,
  actionId?: string,
  options?: { enabled?: boolean }
) {
  const execution = useExecution(executionId, options);
  const progress = useExecutionProgress(executionId, options);
  const actionProgress = useActionProgress(executionId, actionId, options);
  const logs = useExecutionLogs(executionId, options);
  const cancel = useCancelExecution();

  return {
    queries: {
      execution,
    },
    streams: {
      progress,
      actionProgress,
      logs,
    },
    actions: {
      cancel,
    },
  };
}
