# Flow UI Components

Visual flow builder components for creating and executing flows with a drag-and-drop interface.

## Installation

```bash
npm install @repo/flow
# or
bun add @repo/flow
```

## Quick Start

```tsx
import { ReactFlowProvider } from 'reactflow';
import { FlowEditor } from '@repo/flow/ui';
import 'reactflow/dist/style.css';
import '@repo/flow/ui/styles.css';

function App() {
  return (
    <ReactFlowProvider>
      <div style={{ width: '100vw', height: '100vh' }}>
        <FlowEditor
          onExecutionComplete={(result) => {
            console.log('Flow completed:', result);
          }}
        />
      </div>
    </ReactFlowProvider>
  );
}
```

## Components

### FlowEditor

Main visual flow editor component with canvas, nodes, and edges.

```tsx
<FlowEditor
  initialFlow={flow}
  plugins={availablePlugins}
  onChange={(flow) => setFlow(flow)}
  onExecutionComplete={(result) => console.log(result)}
  onExecutionError={(error) => console.error(error)}
  showControls={true}
  showVariables={true}
  readOnly={false}
/>
```

**Props:**
- `initialFlow?: Flow` - Initial flow to load
- `plugins?: FlowPlugin[]` - Available plugins (defaults to all registered)
- `onChange?: (flow: Flow) => void` - Callback when flow changes
- `onExecutionComplete?: (result: unknown) => void` - Callback when execution completes
- `onExecutionError?: (error: Error) => void` - Callback when execution errors
- `showControls?: boolean` - Show execution controls (default: true)
- `showVariables?: boolean` - Show variable inspector (default: true)
- `readOnly?: boolean` - Make editor read-only (default: false)
- `className?: string` - Custom CSS class

### NodePalette

Plugin library for dragging nodes onto the canvas.

```tsx
<NodePalette
  categories={[
    {
      id: 'triggers',
      name: 'Triggers',
      plugins: triggerPlugins,
    },
    {
      id: 'actions',
      name: 'Actions',
      plugins: actionPlugins,
    },
  ]}
  onPluginDragStart={(plugin) => console.log('Dragging:', plugin)}
  filter={searchText}
/>
```

**Props:**
- `categories: PluginCategory[]` - Plugin categories with plugins
- `onPluginDragStart?: (plugin: FlowPlugin) => void` - Callback when drag starts
- `filter?: string` - Search filter text
- `collapsed?: boolean` - Whether palette is collapsed

### PropertyPanel

Node configuration panel for editing node properties.

```tsx
<PropertyPanel
  node={selectedNode}
  plugin={selectedPlugin}
  onChange={(nodeId, config) => {
    // Update node configuration
  }}
  onDelete={(nodeId) => {
    // Delete node
  }}
/>
```

**Props:**
- `node?: FlowNode` - Selected node to edit
- `plugin?: FlowPlugin` - Plugin definition for the node
- `onChange?: (nodeId: string, config: Record<string, unknown>) => void` - Config change callback
- `onDelete?: (nodeId: string) => void` - Delete callback

### VariableInspector

Display and edit flow variables.

```tsx
<VariableInspector
  variables={executionState.variables}
  editable={true}
  onVariableChange={(name, value) => {
    // Update variable
  }}
  onVariableDelete={(name) => {
    // Delete variable
  }}
/>
```

**Props:**
- `variables: Record<string, unknown>` - Current variables
- `editable?: boolean` - Whether variables can be edited (default: true)
- `onVariableChange?: (name: string, value: unknown) => void` - Update callback
- `onVariableDelete?: (name: string) => void` - Delete callback

### ExecutionControls

Flow execution controls (play, pause, stop, reset).

```tsx
<ExecutionControls
  state={executionState}
  onStart={() => startExecution()}
  onPause={() => pauseExecution()}
  onResume={() => resumeExecution()}
  onStop={() => stopExecution()}
  onReset={() => resetExecution()}
/>
```

**Props:**
- `state: ExecutionState` - Current execution state
- `onStart?: () => void` - Start execution
- `onPause?: () => void` - Pause execution
- `onResume?: () => void` - Resume execution
- `onStop?: () => void` - Stop execution
- `onReset?: () => void` - Reset execution

## Hooks

### useFlowStore

Zustand store for flow editor state.

```tsx
import { useFlowStore } from '@repo/flow/ui';

function MyComponent() {
  const { flow, selectedNodeId, setFlow, updateNode } = useFlowStore();

  // Use flow state
  return <div>{flow?.name}</div>;
}
```

**State:**
- `flow: Flow | null` - Current flow
- `selectedNodeId: string | null` - Selected node ID
- `executionState: ExecutionState | null` - Execution state
- `isDirty: boolean` - Unsaved changes flag

**Actions:**
- `setFlow(flow)` - Set current flow
- `updateNode(nodeId, updates)` - Update node properties
- `updateEdge(edgeId, updates)` - Update edge properties
- `addNode(node)` - Add new node
- `deleteNode(nodeId)` - Delete node
- `deleteEdge(edgeId)` - Delete edge
- `setSelectedNodeId(nodeId)` - Select node
- `setExecutionState(state)` - Update execution state
- `clearSelection()` - Clear selection
- `resetFlow()` - Reset to initial state

### useFlowExecution

Hook for executing flows.

```tsx
import { useFlowExecution } from '@repo/flow/ui';

function MyComponent() {
  const { execute, pause, stop, isRunning, isPaused, error } = useFlowExecution();

  const runFlow = async () => {
    const result = await execute(myFlow);
    console.log('Result:', result);
  };

  return (
    <button onClick={runFlow} disabled={isRunning}>
      {isRunning ? 'Running...' : 'Run Flow'}
    </button>
  );
}
```

**Returns:**
- `execute: (flow: Flow) => Promise<ExecutionResult>` - Execute flow
- `pause: () => void` - Pause execution
- `stop: () => void` - Stop execution
- `isRunning: boolean` - Whether flow is running
- `isPaused: boolean` - Whether flow is paused
- `error: Error | null` - Execution error

## Complete Example

```tsx
import React, { useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import '@repo/flow/ui/styles.css';

import {
  FlowEditor,
  NodePalette,
  PropertyPanel,
  VariableInspector,
  ExecutionControls,
  useFlowStore,
  useFlowExecution,
} from '@repo/flow/ui';

import { pluginRegistry } from '@repo/flow/plugins';

export const FlowEditorApp: React.FC = () => {
  const { flow, selectedNodeId } = useFlowStore();
  const [executionState, setExecutionState] = useState({
    status: 'idle',
    completedNodes: new Set(),
    variables: {},
  });

  const { execute, pause, stop } = useFlowExecution();

  // Get plugins
  const allPlugins = pluginRegistry.list();
  const selectedNode = flow?.nodes.find((n) => n.id === selectedNodeId);
  const selectedPlugin = selectedNode
    ? pluginRegistry.get(selectedNode.pluginId)
    : undefined;

  const handleExecute = async () => {
    if (!flow) return;
    
    setExecutionState({ status: 'running', completedNodes: new Set(), variables: {} });

    try {
      const result = await execute(flow);
      setExecutionState({
        status: 'completed',
        completedNodes: new Set(flow.nodes.map((n) => n.id)),
        variables: result.variables || {},
        output: result.output,
      });
    } catch (error) {
      setExecutionState({
        status: 'error',
        completedNodes: new Set(),
        variables: {},
        error: error as Error,
      });
    }
  };

  return (
    <ReactFlowProvider>
      <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '12px', background: 'white', borderBottom: '1px solid #e5e7eb' }}>
          <ExecutionControls
            state={executionState}
            onStart={handleExecute}
            onPause={pause}
            onStop={stop}
          />
        </div>

        {/* Main Content */}
        <div style={{ display: 'flex', flex: 1 }}>
          {/* Left: Node Palette */}
          <div style={{ width: '250px', background: 'white', borderRight: '1px solid #e5e7eb', padding: '16px' }}>
            <NodePalette
              categories={[
                { id: 'triggers', name: 'Triggers', plugins: allPlugins.filter((p) => p.category === 'trigger') },
                { id: 'actions', name: 'Actions', plugins: allPlugins.filter((p) => p.category === 'action') },
              ]}
            />
          </div>

          {/* Center: Canvas */}
          <div style={{ flex: 1 }}>
            <FlowEditor plugins={allPlugins} />
          </div>

          {/* Right: Properties & Variables */}
          <div style={{ width: '300px', background: 'white', borderLeft: '1px solid #e5e7eb', padding: '16px' }}>
            {selectedNode && selectedPlugin && (
              <PropertyPanel node={selectedNode} plugin={selectedPlugin} />
            )}
            <VariableInspector variables={executionState.variables} />
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
};
```

## Styling

The UI components come with default styles. Import the stylesheet:

```tsx
import '@repo/flow/ui/styles.css';
```

Or customize with CSS variables:

```css
:root {
  --flow-node-bg: white;
  --flow-node-border: #d1d5db;
  --flow-node-selected: #3b82f6;
  --flow-node-executing: #10b981;
  --flow-node-error: #ef4444;
}
```

## Custom Node Types

You can create custom node types by extending the `FlowNode` component:

```tsx
import { FlowNode } from '@repo/flow/ui';
import type { NodeProps } from 'reactflow';

export const CustomNode: React.FC<NodeProps<FlowNodeData>> = (props) => {
  return (
    <div className="custom-node">
      <FlowNode {...props} />
      {/* Add custom UI */}
    </div>
  );
};
```

## TypeScript Support

Full TypeScript support with exported types:

```tsx
import type {
  FlowEditorProps,
  NodePaletteProps,
  PropertyPanelProps,
  VariableInspectorProps,
  ExecutionControlsProps,
  ExecutionState,
  FlowNodeData,
  ReactFlowNode,
  ReactFlowEdge,
} from '@repo/flow/ui';
```

## Contributing

See the main [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## License

MIT
