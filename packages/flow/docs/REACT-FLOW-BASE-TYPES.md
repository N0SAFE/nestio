# React Flow Base Types Integration

## Overview

`FlowNode` and `FlowEdge` now **extend React Flow's base types** (`Node` and `Edge`), making them directly compatible with the React Flow library without needing conversion layers.

## What Changed

### Before
```typescript
// Separate types that needed conversion
interface FlowNode {
  id: string;
  type: NodeType;
  pluginId: string;
  label: string;
  position: { x: number; y: number };
  data: NodeData;
  config: NodeConfig;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type?: EdgeType;
  // ...
}

// Conversion needed for React Flow
type ReactFlowNode = Node<FlowNodeData>;
type ReactFlowEdge = Edge;
```

### After
```typescript
import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from 'reactflow';

// FlowNode extends React Flow's base Node type
interface FlowNode extends Omit<ReactFlowNode, 'data' | 'type'> {
  id: string;
  type: NodeType;  // Our custom type
  pluginId: string;
  label: string;
  position: { x: number; y: number };
  data: NodeData;  // Our custom data
  config: NodeConfig;
}

// FlowEdge extends React Flow's base Edge type
interface FlowEdge extends Omit<ReactFlowEdge, 'type'> {
  id: string;
  source: string;
  target: string;
  type?: EdgeType;  // Our custom type
  // ... additional properties
}
```

## Benefits

### 1. **Direct Compatibility**
No conversion needed when passing nodes/edges to React Flow:
```typescript
// Before: conversion required
const reactFlowNodes = flowNodes.map(convertToReactFlowNode);

// After: direct usage
<ReactFlow nodes={flowNodes} edges={flowEdges} />
```

### 2. **All React Flow Properties Available**
```typescript
const node: FlowNode = {
  id: 'node-1',
  type: 'action',
  pluginId: 'http-request',
  label: 'API Call',
  position: { x: 100, y: 100 },
  
  // React Flow native properties work automatically
  selected: true,
  dragging: false,
  width: 200,
  height: 100,
  
  // Our custom properties
  data: { /* ... */ },
  config: { /* ... */ }
};
```

### 3. **Type Safety**
TypeScript ensures compatibility:
```typescript
function updateNode(node: FlowNode) {
  // Type-safe access to both React Flow and custom properties
  console.log(node.position);  // React Flow property
  console.log(node.pluginId);  // Custom property
}
```

## Migration Guide

### For Plugin Developers
No changes needed! Plugins continue to work with `FlowNode` and `FlowEdge` as before.

### For UI Components
Components using React Flow can now directly use `FlowNode`/`FlowEdge`:

**Before:**
```typescript
import { Node } from 'reactflow';
import { FlowNode } from '../types';

function MyComponent() {
  const [nodes, setNodes] = useState<Node[]>([]);
  
  // Conversion needed
  const flowNodes = nodes.map(convertFromReactFlow);
}
```

**After:**
```typescript
import { FlowNode } from '../types';

function MyComponent() {
  // FlowNode IS a React Flow Node
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  
  // No conversion needed
  <ReactFlow nodes={nodes} />
}
```

### For Flow Execution
Flow execution logic uses `FlowNode` and `FlowEdge` directly - no changes needed.

## React Flow Properties

### Node Properties (automatically included)
- `id` - Unique identifier
- `position` - { x, y } coordinates
- `type` - Node type (we override with our NodeType)
- `data` - Node data (we override with our NodeData)
- `selected?` - Whether node is selected
- `dragging?` - Whether node is being dragged
- `width?` - Node width
- `height?` - Node height
- `zIndex?` - Z-index for layering
- `draggable?` - Whether node can be dragged
- `selectable?` - Whether node can be selected
- `connectable?` - Whether node can connect to edges
- `focusable?` - Whether node can receive focus
- `deletable?` - Whether node can be deleted
- `parentNode?` - Parent node ID (for nested nodes)
- `extent?` - Movement boundaries
- `expandParent?` - Whether to expand parent on drag
- `positionAbsolute?` - Absolute position
- `ariaLabel?` - Accessibility label
- `style?` - Inline styles
- `className?` - CSS class name
- `hidden?` - Whether node is hidden
- `measured?` - Internal React Flow state

### Edge Properties (automatically included)
- `id` - Unique identifier
- `source` - Source node ID
- `target` - Target node ID
- `type` - Edge type (we override with our EdgeType)
- `sourceHandle?` - Source handle ID
- `targetHandle?` - Target handle ID
- `label?` - Edge label
- `selected?` - Whether edge is selected
- `animated?` - Whether edge is animated
- `hidden?` - Whether edge is hidden
- `deletable?` - Whether edge can be deleted
- `focusable?` - Whether edge can receive focus
- `style?` - Inline styles
- `className?` - CSS class name
- `labelStyle?` - Label styles
- `labelBgStyle?` - Label background styles
- `labelBgPadding?` - Label background padding
- `labelBgBorderRadius?` - Label background border radius
- `markerStart?` - Start marker configuration
- `markerEnd?` - End marker configuration
- `zIndex?` - Z-index for layering
- `ariaLabel?` - Accessibility label
- `interactionWidth?` - Interaction area width

## Best Practices

### 1. Use React Flow Properties
Take advantage of React Flow's built-in properties:
```typescript
const node: FlowNode = {
  // ... required properties
  selected: true,          // Visual feedback
  draggable: false,        // Disable dragging for certain nodes
  deletable: false,        // Prevent deletion
  className: 'important',  // Custom styling
};
```

### 2. Type Safety
Let TypeScript guide you:
```typescript
// TypeScript will error if required properties are missing
const node: FlowNode = {
  id: 'node-1',
  // Error: missing required properties!
};
```

### 3. Backwards Compatibility
Existing code continues to work - the types are extended, not replaced.

## Technical Details

### Why `Omit<ReactFlowNode, 'data' | 'type'>`?
We omit these properties because:
- `data`: We define our own `NodeData` type for plugin-specific data
- `type`: We define our own `NodeType` enum instead of `string | undefined`

This gives us type safety while maintaining React Flow compatibility.

### React Flow Version
Compatible with `reactflow` v11.x and later.

## Summary

✅ **Direct React Flow compatibility** - No conversion needed  
✅ **Full type safety** - TypeScript enforces correct usage  
✅ **All React Flow features** - Access to selection, dragging, styling, etc.  
✅ **Backwards compatible** - Existing code continues to work  
✅ **Better DX** - Simpler, more intuitive API  

Your flow nodes and edges are now **first-class React Flow citizens**! 🎉
