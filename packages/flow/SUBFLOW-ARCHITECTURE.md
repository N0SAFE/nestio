# SubFlow Architecture Implementation

## Overview

Complete reimplementation of the flow system where **everything is a SubFlow**. This aligns with the user's request: "all things should be a sub flow and each subflow can have multiple function".

## Key Concepts

### 1. SubFlow Types

- **Main SubFlows**: Entry points with triggers (like `main()` functions)
- **Callable SubFlows**: Reusable function-like blocks with defined inputs/outputs

### 2. Architecture Hierarchy

```
SubFlowBasedFlow (root)
├── SubFlow 1 (Main)
│   ├── Input Ports → Internal Nodes
│   ├── Internal Canvas
│   │   ├── Input Port Nodes
│   │   ├── Action/Condition/Loop Nodes
│   │   └── Output Port Nodes
│   └── Output Ports
├── SubFlow 2 (Callable Function)
│   ├── Input Ports (typed parameters)
│   ├── Internal Canvas
│   └── Output Ports (typed returns)
└── SubFlow Edges (connections between SubFlows)
```

### 3. Port System

SubFlows have **named ports** with types:
- **trigger**: Start execution
- **flow**: Flow control
- **data**: Typed data (string, number, object, etc.)
- **error**: Error channels

Ports appear as **visual handles** on SubFlow containers.

## Core Files Created

### Types (`packages/flow/src/core/types/subflow.ts`)

- `SubFlow` - The fundamental building block
- `SubFlowPort`, `SubFlowInputPort`, `SubFlowOutputPort` - Port definitions
- `InternalNode`, `InternalEdge` - Nodes/edges inside SubFlows
- `SubFlowBasedFlow` - Complete flow definition
- `SubFlowEdge` - Connections between SubFlows
- Factory functions: `createMainSubFlow()`, `createCallableSubFlow()`, `createSubFlowBasedFlow()`

### UI Components

#### `SubFlowEditor` (`packages/flow/src/ui/components/SubFlowEditor.tsx`)

Main editor component with:
- **Root level view**: Shows SubFlows as nodes
- **Drill-down navigation**: Click to edit SubFlow internals
- **Breadcrumb navigation**: Navigate hierarchy
- **Add buttons**: Create Main or Callable SubFlows

#### `SubFlowNode` (`packages/flow/src/ui/components/nodes/SubFlowNode.tsx`)

Visual representation of a SubFlow:
- **Header**: Name, type badge, collapse/expand controls
- **Input handles** (left): Named ports with type indicators
- **Output handles** (right): Named ports with type indicators
- **Body**: Shows port summary (collapsed) or internal preview (expanded)
- **Type badges**: GREEN for Main, BLUE for Callable

#### `SubFlowCanvas` (`packages/flow/src/ui/components/SubFlowCanvas.tsx`)

Internal canvas for editing SubFlow contents:
- Embedded React Flow instance
- Shows internal nodes and edges
- Special port nodes for SubFlow inputs/outputs

#### `InternalNode` (`packages/flow/src/ui/components/nodes/InternalNode.tsx`)

Nodes inside SubFlows (action, condition, loop, etc.):
- Icon and color based on type
- Settings and delete buttons
- State indicators (idle, running, success, error)

#### `PortNode` (`packages/flow/src/ui/components/nodes/PortNode.tsx`)

Special nodes representing SubFlow ports inside the canvas:
- Input ports: Have output handles (data flows OUT to internal nodes)
- Output ports: Have input handles (data flows IN from internal nodes)
- Type and data type indicators

## Usage Example

```typescript
import {
  SubFlowEditor,
  createMainSubFlow,
  createCallableSubFlow,
  createSubFlowBasedFlow,
} from '@repo/flow';

// Create a callable SubFlow (reusable function)
const calculateSubFlow = createCallableSubFlow(
  'Calculate Sum',
  [
    { id: 'a', name: 'a', type: 'data', dataType: 'number' },
    { id: 'b', name: 'b', type: 'data', dataType: 'number' },
  ],
  [
    { id: 'result', name: 'result', type: 'data', dataType: 'number' },
  ]
);

// Create main entry point
const mainSubFlow = createMainSubFlow('Main Flow');

// Create flow with SubFlows
const flow = createSubFlowBasedFlow('My Flow', {
  subFlows: [mainSubFlow, calculateSubFlow],
});

// Render editor
<SubFlowEditor
  flow={flow}
  onChange={setFlow}
  theme="dark"
/>
```

## Key Features

### ✅ Visual Nesting

- SubFlows are containers with embedded canvases
- Double-click to drill down
- Breadcrumb navigation to go back

### ✅ Named Input/Output Ports

- Ports have names, types, and descriptions
- Visible as handles on SubFlow containers
- Connect SubFlows by linking ports

### ✅ Main vs Callable Distinction

- **Main SubFlows** (green badge): Entry points with triggers
- **Callable SubFlows** (blue badge): Reusable functions

### ✅ Type Safety

- Ports have data types (string, number, object, array, etc.)
- Schema validation support with Zod
- Typed connections between SubFlows

### ✅ Execution Context

- `SubFlowExecutionState` tracks SubFlow execution
- `FlowExecutionContext` manages global execution state
- Call stack for nested SubFlow calls

## Migration Path

The system supports **both architectures**:

1. **Legacy** (`FlowEditor`, `FlowNode`) - Current individual nodes
2. **New** (`SubFlowEditor`, `SubFlowNode`) - SubFlow-based architecture

This allows gradual migration. The new system is cleaner and aligns with the user's vision of "everything is a SubFlow".

## Next Steps

1. **Demo/Example**: Create a demo in apps/doc showcasing SubFlow editor
2. **Execution Engine**: Adapt execution engine to work with SubFlow structure
3. **Plugin Integration**: Convert existing plugins to SubFlow-compatible nodes
4. **Testing**: Add tests for SubFlow operations
5. **Documentation**: Complete user guide for SubFlow system

## Files Modified/Created

### Created

- `packages/flow/src/core/types/subflow.ts` (537 lines) - Core types
- `packages/flow/src/ui/components/SubFlowEditor.tsx` (467 lines) - Main editor
- `packages/flow/src/ui/components/SubFlowCanvas.tsx` (174 lines) - Internal canvas
- `packages/flow/src/ui/components/nodes/SubFlowNode.tsx` (235 lines) - SubFlow node
- `packages/flow/src/ui/components/nodes/InternalNode.tsx` (156 lines) - Internal nodes
- `packages/flow/src/ui/components/nodes/PortNode.tsx` (162 lines) - Port nodes
- `packages/flow/src/ui/components/nodes/index.ts` - Node exports

### Modified

- `packages/flow/src/core/types/index.ts` - Added subflow exports
- `packages/flow/src/ui/components/index.ts` - Added SubFlow components
- `packages/flow/src/ui/index.ts` - Added SubFlow exports
- `packages/flow/src/index.ts` - Public API with SubFlow types/components

## Architecture Comparison

### Old (Individual Nodes)

```
Flow
├── Node (Trigger)
├── Node (Action)
├── Node (Condition)
└── Node (Action)
```

### New (SubFlow-Based)

```
Flow
├── SubFlow (Main)
│   ├── Ports: [trigger] → [complete]
│   └── Canvas: [InputPort] → [Action] → [OutputPort]
├── SubFlow (Function: ProcessData)
│   ├── Ports: [data] → [result, error]
│   └── Canvas: [InputPort] → [Transform] → [OutputPort]
└── SubFlow (Function: HandleError)
    ├── Ports: [error] → [handled]
    └── Canvas: [InputPort] → [Log] → [OutputPort]
```

The new architecture provides:
- Better organization via containment
- Clearer boundaries and interfaces
- Reusable SubFlows
- Visual nesting and drill-down
- Typed inputs/outputs at the container level
