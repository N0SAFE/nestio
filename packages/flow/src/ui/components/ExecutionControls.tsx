/**
 * Execution Controls Component
 * 
 * Controls for flow execution (play, pause, stop)
 */

import React from 'react';
import type { ExecutionControlsProps } from '../types';

export const ExecutionControls: React.FC<ExecutionControlsProps> = ({
  state,
  onStart,
  onPause,
  onResume,
  onStop,
  onReset,
}) => {
  const isRunning = state.status === 'running';
  const isPaused = state.status === 'paused';
  const isCompleted = state.status === 'completed';
  const hasError = state.status === 'error';

  return (
    <div
      style={{
        background: 'white',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        position: 'relative',
      }}
    >
      {/* Play/Resume Button */}
      {(state.status === 'idle' || isPaused || isCompleted) && (
        <button
          onClick={isPaused ? onResume : onStart}
          style={{
            padding: '8px 16px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>▶</span>
          {isPaused ? 'Resume' : isCompleted ? 'Restart' : 'Run'}
        </button>
      )}

      {/* Pause Button */}
      {isRunning && (
        <button
          onClick={onPause}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>⏸</span>
          Pause
        </button>
      )}

      {/* Stop Button */}
      {(isRunning || isPaused) && (
        <button
          onClick={onStop}
          style={{
            padding: '8px 16px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>■</span>
          Stop
        </button>
      )}

      {/* Reset Button */}
      {(isCompleted || hasError) && (
        <button
          onClick={onReset}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>↻</span>
          Reset
        </button>
      )}

      {/* Status Indicator */}
      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '14px',
          fontWeight: 500,
        }}
      >
        {hasError ? (
          <>
            <span style={{ color: '#ef4444' }}>●</span>
            <span style={{ color: '#ef4444' }}>Error</span>
          </>
        ) : isPaused ? (
          <>
            <span style={{ color: '#f59e0b' }}>●</span>
            <span style={{ color: '#6b7280' }}>Paused</span>
          </>
        ) : isRunning ? (
          <>
            <span style={{ color: '#10b981' }}>●</span>
            <span style={{ color: '#6b7280' }}>Running</span>
          </>
        ) : isCompleted ? (
          <>
            <span style={{ color: '#10b981' }}>●</span>
            <span style={{ color: '#6b7280' }}>Completed</span>
          </>
        ) : (
          <>
            <span style={{ color: '#9ca3af' }}>●</span>
            <span style={{ color: '#6b7280' }}>Idle</span>
          </>
        )}
      </div>

      {/* Error Message */}
      {hasError && state.error && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '8px',
            padding: '8px 12px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#991b1b',
          }}
        >
          {state.error.message}
        </div>
      )}
    </div>
  );
};
