/**
 * Flow Editor Example
 * 
 * Complete example of using the Flow Editor UI
 */

import React, { useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import '../styles.css';

import {
  FlowEditor,
  NodePalette,
  VariableInspector,
  ExecutionControls,
  useFlowStore,
  useFlowExecution,
} from '../index';

import { pluginRegistry } from '../../core/plugins/registry';
import type { Flow } from '../../core/types/flow';
import type { ExecutionState } from '../types';

/**
 * Complete Flow Editor Application
 */
export const FlowEditorApp: React.FC = () => {
  const { flow } = useFlowStore();
  const [executionState, setExecutionState] = useState<ExecutionState>({
    status: 'idle',
    completedNodes: new Set(),
    variables: {},
  });

  const { execute, pause, stop } = useFlowExecution();

  // Get all available plugins
  const allPlugins = pluginRegistry.list();

  const handleExecute = async () => {
    if (!flow) return;
    
    setExecutionState({
      status: 'running',
      completedNodes: new Set(),
      variables: {},
    });

    try {
      await execute();
      // Execution state is updated by the hook via store
      const currentState = executionState;
      setExecutionState({
        status: 'completed',
        completedNodes: new Set(flow.nodes.map((n) => n.id)),
        variables: currentState.variables || {},
        output: currentState.output,
      });
    } catch (err) {
      setExecutionState({
        status: 'error',
        completedNodes: new Set(),
        variables: {},
        error: err as Error,
      });
    }
  };

  const handlePause = () => {
    pause();
    setExecutionState((prev) => ({
      ...prev,
      status: 'paused',
    }));
  };

  const handleResume = async () => {
    if (!flow) return;
    
    setExecutionState((prev) => ({
      ...prev,
      status: 'running',
    }));

    try {
      await execute();
      // Execution state is updated by the hook via store
      const currentState = executionState;
      setExecutionState({
        status: 'completed',
        completedNodes: new Set(flow.nodes.map((n) => n.id)),
        variables: currentState.variables || {},
        output: currentState.output,
      });
    } catch (err) {
      setExecutionState({
        status: 'error',
        completedNodes: new Set(),
        variables: {},
        error: err as Error,
      });
    }
  };

  const handleStop = () => {
    stop();
    setExecutionState({
      status: 'idle',
      completedNodes: new Set(),
      variables: {},
    });
  };

  const handleReset = () => {
    setExecutionState({
      status: 'idle',
      completedNodes: new Set(),
      variables: {},
    });
  };

  return (
    <ReactFlowProvider>
      <div className="flow-editor">
        {/* Header with execution controls */}
        <div className="flow-editor__header">
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
            Flow Editor
          </h1>
          <ExecutionControls
            state={executionState}
            onStart={handleExecute}
            onPause={handlePause}
            onResume={handleResume}
            onStop={handleStop}
            onReset={handleReset}
          />
        </div>

        {/* Main content area */}
        <div className="flow-editor__main">
          {/* Left sidebar: Node Palette */}
          <div className="flow-editor__sidebar flow-editor__sidebar--left">
            <NodePalette
              categories={[
                {
                  id: 'triggers',
                  name: 'Triggers',
                  plugins: allPlugins.filter((p) => p.subCategory === 'trigger'),
                },
                {
                  id: 'actions',
                  name: 'Actions',
                  plugins: allPlugins.filter((p) => p.subCategory === 'action'),
                },
                {
                  id: 'conditions',
                  name: 'Conditions',
                  plugins: allPlugins.filter((p) => p.subCategory === 'condition'),
                },
                {
                  id: 'loops',
                  name: 'Loops',
                  plugins: allPlugins.filter((p) => p.subCategory === 'loop'),
                },
                {
                  id: 'flow-control',
                  name: 'Flow Control',
                  plugins: allPlugins.filter((p) => p.subCategory === 'subflow'),
                },
              ]}
            />
          </div>

          {/* Center: Canvas - ConfigSheet is built into FlowEditor */}
          <div className="flow-editor__canvas">
            <FlowEditor
              initialFlow={flow ?? undefined}
              plugins={allPlugins}
              showControls={false} // We have controls in header
              showVariables={false} // We have variable inspector in sidebar
            />
          </div>

          {/* Right sidebar: Variable Inspector */}
          <div className="flow-editor__sidebar">
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
              Double-click a node to edit its configuration
            </div>

            {/* Variable Inspector */}
            <div style={{ marginTop: '20px' }}>
              <VariableInspector
                variables={executionState.variables}
                editable={executionState.status !== 'running'}
              />
            </div>
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
};

/**
 * Simple example with just the flow editor
 */
export const SimpleFlowEditor: React.FC = () => {
  const [flow, setFlow] = useState<Flow | undefined>(undefined);

  return (
    <ReactFlowProvider>
      <div style={{ width: '100vw', height: '100vh' }}>
        <FlowEditor
          initialFlow={flow}
          onChange={setFlow}
          onExecutionComplete={(result) => {
            console.log('Flow completed:', result);
          }}
          onExecutionError={(error) => {
            console.error('Flow error:', error);
          }}
        />
      </div>
    </ReactFlowProvider>
  );
};

export default FlowEditorApp;
