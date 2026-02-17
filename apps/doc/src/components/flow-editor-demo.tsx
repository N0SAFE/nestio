'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-confusing-void-expression, @typescript-eslint/no-empty-function */

import React, { useState, useEffect, useRef } from 'react';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import '../styles/flow-editor.css';

import {
  FlowEditor,
  NodePalette,
  ExecutionControls,
  useFlowStore,
  useFlowExecution,
  pluginRegistry,
  registerCorePlugins,
  createFlow,
  createTriggerSubFlow,
  createCallableSubFlow,
} from '@repo/flow';

// Register plugins once on module load
if (typeof window !== 'undefined') {
  registerCorePlugins();
}

/**
 * Complete Flow Editor Application Demo
 * 
 * The FlowEditor now has a built-in ConfigSheet that opens on double-click.
 * No need for external property panels.
 */
export function FlowEditorDemo() {
  const { flow, setFlow } = useFlowStore();
  const [executionState, setExecutionState] = useState<any>({
    status: 'idle',
    completedNodes: new Set(),
    variables: {},
  });

  const { execute, pause, stop } = useFlowExecution();
  
  // Drag-and-drop refs shared between palette and editor
  const draggedPluginRef = useRef<any>(null);
  const draggedSubFlowRef = useRef<any>(null);

  // Initialize flow on mount
  useEffect(() => {
    if (!flow) {
      const newFlow = createFlow('demo-flow', {
        name: 'Demo Flow',
        description: 'Example flow for demonstration',
      });
      setFlow(newFlow);
    }
  }, [flow, setFlow]);

  // Get all available plugins grouped by category
  const allPlugins = pluginRegistry.list();
  
  // Create example SubFlows to show in palette
  const exampleSubFlows = [
    createTriggerSubFlow('Manual Trigger', 'manual', {
      description: 'Start flow manually',
    }),
    createTriggerSubFlow('Webhook Trigger', 'webhook', {
      description: 'Trigger from HTTP webhook',
    }),
    createTriggerSubFlow('Schedule Trigger', 'schedule', {
      description: 'Run on a schedule',
    }),
    createCallableSubFlow(
      'Process Data',
      [{ id: 'in1', name: 'data', type: 'data', dataType: 'any' }],
      [{ id: 'out1', name: 'result', type: 'data', dataType: 'any' }],
      {
        description: 'Reusable data processor',
      }
    ),
  ];
  
  const categories = [
    {
      id: 'trigger',
      name: '🎯 Triggers',
      description: 'Start points for flows',
      plugins: allPlugins.filter((p: any) => p.subCategory === 'trigger'),
    },
    {
      id: 'action',
      name: '⚡ Actions',
      description: 'Perform operations',
      plugins: allPlugins.filter((p: any) => p.subCategory === 'action'),
    },
    {
      id: 'condition',
      name: '🔀 Conditions',
      description: 'Make decisions',
      plugins: allPlugins.filter((p: any) => p.subCategory === 'condition'),
    },
    {
      id: 'loop',
      name: '🔄 Loops',
      description: 'Repeat operations',
      plugins: allPlugins.filter((p: any) => p.subCategory === 'loop'),
    },
    {
      id: 'subflow',
      name: '📦 Subflows',
      description: 'Reusable flows',
      plugins: allPlugins.filter((p: any) => p.subCategory === 'subflow'),
    },
  ].filter(cat => cat.plugins.length > 0);

  const handleExecute = async () => {
    if (!flow) return;

    setExecutionState({
      status: 'running',
      completedNodes: new Set(),
      variables: {},
      startTime: Date.now(),
    });

    try {
      const result = await execute();

      setExecutionState((prev: any) => ({
        ...prev,
        status: 'completed',
        output: result,
        endTime: Date.now(),
      }));
    } catch (error) {
      setExecutionState((prev: any) => ({
        ...prev,
        status: 'error',
        error: error as Error,
        endTime: Date.now(),
      }));
    }
  };

  const handlePause = () => {
    pause();
    setExecutionState((prev: any) => ({ ...prev, status: 'paused' }));
  };

  const handleResume = () => {
    setExecutionState((prev: any) => ({ ...prev, status: 'running' }));
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
      <div style={{
        display: 'flex',
        height: '700px',
        width: '100%',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#fff',
      }}>
        {/* Left Sidebar - Node Palette */}
        <div className="w-72 border-r border-border bg-background overflow-hidden flex flex-col">
          <NodePalette
            categories={categories}
            subFlows={exampleSubFlows as never[]}
            onPluginDragStart={(plugin: any) => {
              console.log('[Demo] NodePalette onPluginDragStart:', plugin.name);
              draggedPluginRef.current = plugin;
            }}
            onSubFlowDragStart={(subFlow: any) => {
              console.log('[Demo] NodePalette onSubFlowDragStart:', subFlow.name);
              draggedSubFlowRef.current = subFlow;
            }}
          />
        </div>

        {/* Main Editor Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Top Controls */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#fff',
          }}>
            <ExecutionControls
              state={executionState}
              onStart={handleExecute}
              onPause={handlePause}
              onResume={handleResume}
              onStop={handleStop}
              onReset={handleReset}
            />
          </div>

          {/* Canvas - ConfigSheet is built into FlowEditor now */}
          <div style={{ flex: 1, position: 'relative' }}>
            <FlowEditor
              initialFlow={flow}
              plugins={allPlugins as never[]}
              onChange={() => {}}
              onExecutionComplete={() => {}}
              onExecutionError={() => {}}
              onNodeSettings={() => {}}
              onNodeDelete={() => {}}
              showControls={false}
              showVariables={false}
              showPalette={false}
              readOnly={false}
              draggedPluginRef={draggedPluginRef}
              draggedSubFlowRef={draggedSubFlowRef}
            />
          </div>
        </div>
      </div>

      {/* Instructions below the editor */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        backgroundColor: '#f0f9ff',
        border: '1px solid #bfdbfe',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#1e40af',
      }}>
        <strong>💡 How to use:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li><strong>NEW: SubFlows</strong> - Drag trigger SubFlows (purple) or callable SubFlows (blue) from the palette</li>
          <li>Drag plugin nodes from the palette onto the canvas</li>
          <li>Connect nodes by dragging from one node's output to another's input</li>
          <li><strong>Double-click</strong> a node to open the configuration panel</li>
          <li>Click "Run" to execute your flow</li>
        </ul>
        <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '4px', fontSize: '13px' }}>
          <strong>⚠️ Architecture Update:</strong> Deprecated plugins (like "start-trigger") are now hidden. Use SubFlow triggers instead!
        </div>
      </div>
    </ReactFlowProvider>
  );
}
