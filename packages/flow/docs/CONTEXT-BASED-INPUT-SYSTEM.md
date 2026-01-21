# Context-Based Input System

## Overview

Instead of data flowing through edges, nodes now explicitly select data from the **execution context**. This provides more flexibility and allows nodes to reference any previous node's output, apply transformations, and aggregate data from multiple sources.

## Key Concepts

### 1. Execution Context
All nodes have access to the full execution context, which includes:
- `nodeOutputs`: Map of node ID → output data
- `variables`: Flow-level variables
- `state`: Current execution state

### 2. Input Selectors
Nodes use **input selectors** to explicitly define what data they need:

#### Context Reference
Points to a specific node's output:
```typescript
{
  type: 'context',
  nodeId: 'node-123',
  path: 'data.items[0].name'  // Optional JSON path
}
```

#### Static Value
Hardcoded value:
```typescript
{
  type: 'static',
  value: { foo: 'bar' }
}
```

#### Map Operation
Transform array items:
```typescript
{
  type: 'map',
  source: { type: 'context', nodeId: 'node-123', path: 'items' },
  expression: 'item.name.toUpperCase()'  // JavaScript expression
}
```

#### Filter Operation
Filter array items:
```typescript
{
  type: 'filter',
  source: { type: 'context', nodeId: 'node-123', path: 'items' },
  expression: 'item.price > 100'  // Boolean expression
}
```

#### Aggregate Operation
Combine multiple values:
```typescript
{
  type: 'aggregate',
  sources: [
    { type: 'context', nodeId: 'node-1' },
    { type: 'context', nodeId: 'node-2' }
  ],
  operation: 'merge'  // 'merge' | 'concat' | 'sum' | 'min' | 'max' | 'count'
}
```

### 3. Input Configuration
Nodes define their input configuration as a map of field names to selectors:

```typescript
const inputConfig: InputConfig = {
  // Get user data from a specific node
  user: {
    type: 'context',
    nodeId: 'fetch-user-node',
    path: 'data.user'
  },
  
  // Transform product list
  productNames: {
    type: 'map',
    source: { type: 'context', nodeId: 'fetch-products-node', path: 'data.products' },
    expression: 'item.name'
  },
  
  // Static configuration
  apiKey: {
    type: 'static',
    value: 'my-api-key'
  },
  
  // Aggregate totals
  totalRevenue: {
    type: 'aggregate',
    sources: [
      { type: 'context', nodeId: 'sales-q1', path: 'total' },
      { type: 'context', nodeId: 'sales-q2', path: 'total' }
    ],
    operation: 'sum'
  }
};
```

## Helper Functions

```typescript
import { fromNode, mapItems, filterItems, aggregate, staticValue } from '@repo/flow';

// Reference a node
const userInput = fromNode('user-fetch-node', 'data.user');

// Map transformation
const names = mapItems(
  fromNode('users-node', 'users'),
  'item.name'
);

// Filter
const expensiveItems = filterItems(
  fromNode('products-node', 'products'),
  'item.price > 100'
);

// Aggregate
const total = aggregate(
  [
    fromNode('sales-1', 'amount'),
    fromNode('sales-2', 'amount')
  ],
  'sum'
);

// Static value
const config = staticValue({ timeout: 5000 });
```

## Usage in Plugins

Plugins can define their input requirements using this system:

```typescript
export const myPlugin: FlowPlugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  
  // Instead of inputSchema, define how to configure inputs
  configSchema: z.object({
    inputConfig: inputConfigSchema  // Input configuration
  }),
  
  async execute(context, config) {
    // Resolve inputs from context
    const inputs = resolveInputConfig(config.inputConfig, context);
    
    // Use resolved inputs
    const user = inputs.user;
    const products = inputs.products;
    
    // Your logic here
    return { result: ... };
  }
};
```

## Advantages

1. **No dependency on edge connections** - Nodes can reference any previous node
2. **Explicit data flow** - Clear what data each node needs
3. **Built-in transformations** - Map/filter/aggregate without extra nodes
4. **Type safety** - Input schemas can be generated from selectors
5. **Flexibility** - Easy to reorganize flows without breaking data connections

## Migration from Edge-Based Input

Before (edge-based):
```
[Node A] --data--> [Node B] --transformed--> [Node C]
```

After (context-based):
```
[Node A outputs to context]
[Node B] selects from Node A, transforms, outputs
[Node C] selects from Node B, OR directly from Node A with transformation
```

Nodes are now more independent and can be rearranged without affecting their data sources.
