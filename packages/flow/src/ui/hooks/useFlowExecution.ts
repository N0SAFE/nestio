/**
 * Flow Execution Hook
 * 
 * Manages flow execution with the FlowExecutor
 */

import { useCallback, useEffect, useRef } from 'react';
import { FlowExecutor } from '../../core/engine/executor';
import { useFlowStore } from '../store/flowStore';
import { nanoid } from 'nanoid';

export function useFlowExecution() {
  const { flow, executionState, updateExecutionState, stopExecution } = useFlowStore();
  const executorRef = useRef<FlowExecutor | null>(null);
  const executionIdRef = useRef<string>(nanoid());

  /**
   * Start flow execution
   */
  const execute = useCallback(async () => {
    if (!flow) {
      console.error('No flow to execute');
      return;
    }

    try {
      // Create new executor
      executionIdRef.current = nanoid();
      const executor = new FlowExecutor(
        flow.id,
        executionIdRef.current,
        {
          initialVariables: Object.fromEntries(
            flow.variables.map((v) => [v.name, v.value])
          ),
        }
      );
      executorRef.current = executor;

      // Listen to execution events
      const context = executor.getContext();
      
      context.events.on('node:start', (data) => {
        updateExecutionState({
          currentNodeId: data.nodeId,
        });
      });

      context.events.on('node:complete', (data) => {
        updateExecutionState({
          completedNodes: new Set([
            ...Array.from(executionState.completedNodes),
            data.nodeId,
          ]),
        });
      });

      context.events.on('variable:set', (data) => {
        updateExecutionState({
          variables: {
            ...executionState.variables,
            [data.name]: data.value,
          },
        });
      });

      // Execute flow
      await executor.execute(flow);

      // Get final state
      const finalState = executor.getState();
      const finalVariables = executor.getVariables();

      updateExecutionState({
        status: finalState.status === 'completed' ? 'completed' : 'error',
        output: finalState.output,
        error: finalState.error,
        endTime: Date.now(),
        variables: Object.fromEntries(
          finalVariables.list().map((v) => [v.name, v.value])
        ),
      });

    } catch (error) {
      console.error('Flow execution error:', error);
      updateExecutionState({
        status: 'error',
        error: error as Error,
        endTime: Date.now(),
      });
    }
  }, [flow, executionState.completedNodes, updateExecutionState]);

  /**
   * Pause execution
   */
  const pause = useCallback(() => {
    if (executorRef.current) {
      executorRef.current.pause();
    }
  }, []);

  /**
   * Stop execution
   */
  const stop = useCallback(() => {
    stopExecution();
    executorRef.current = null;
  }, [stopExecution]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      executorRef.current = null;
    };
  }, []);

  return {
    execute,
    pause,
    stop,
    isExecuting: executionState.status === 'running',
    isPaused: executionState.status === 'paused',
    isCompleted: executionState.status === 'completed',
    hasError: executionState.status === 'error',
    executionState,
  };
}
