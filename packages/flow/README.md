# @repo/flow

> Visual flow builder for creating complex, plugin-based workflow automation using React Flow

## Overview

`@repo/flow` is a comprehensive flow builder system that enables visual programming through drag-and-drop components. Built on top of React Flow, it provides a scalable and extensible framework for creating workflow automation.

## Features

✨ **Visual Programming** - Build flows using drag-and-drop canvas  
🔌 **Plugin Architecture** - Extend functionality with modular plugins  
🎯 **Type-Safe** - Full TypeScript support with Zod validation  
🔄 **Control Flow** - If/else, switch/case, for/while loops  
📦 **Sub-Flows** - Reusable flow components (like functions)  
🎨 **Beautiful UI** - Clean, modern interface built with React Flow  
⚡ **Real-time Execution** - Execute flows with live feedback  
🐛 **Debugger** - Step-through debugging with breakpoints  

## Installation

```bash
bun add @repo/flow
```

## Quick Start

### 1. Create a Flow Editor

```typescript
import { FlowCanvas } from '@repo/flow/ui';

export default function FlowEditor() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <FlowCanvas />
    </div>
  );
}
```

### 2. Execute a Flow

```typescript
import { FlowExecutor } from '@repo/flow';
import { ExecutionContextImpl } from '@repo/flow/core';

// Load flow definition
const flow = {
  id: 'my-flow',
  name: 'My First Flow',
  nodes: [...],
  edges: [...],
  // ...
};

// Create execution context
const context = new ExecutionContextImpl(flow.id);

// Execute flow
const executor = new FlowExecutor(context);
await executor.execute(flow);
```

### 3. Create a Custom Plugin

```typescript
import { z } from 'zod';
import type { FlowPlugin } from '@repo/flow';

export const myPlugin: FlowPlugin = {
  id: 'my-custom-action',
  name: 'My Custom Action',
  version: '1.0.0',
  category: 'business',      // 'core' or 'business'
  subCategory: 'action',      // 'action' | 'trigger' | etc.
  nodeType: 'action',
  nodeUIPattern: 'clickable', // 'info' | 'editable' | 'clickable'
  
  configSchema: z.object({
    message: z.string().min(1),
  }),
  
  async execute(context, config) {
    console.log(config.message);
    return { success: true };
  },
};

// Register plugin
import { pluginRegistry } from '@repo/flow/plugins';
pluginRegistry.register(myPlugin);
```

## Core Concepts

### Flow

A flow is a complete workflow definition containing nodes, edges, variables, and sub-flows.

### Node

A node represents a single unit of work:
- **Trigger** - Entry point (event, timer, manual)
- **Action** - Perform operation (HTTP, database, file)
- **Condition** - If/else or switch/case logic
- **Loop** - For, while, or forEach iteration
- **Variable** - Set or transform data
- **Sub-Flow** - Call reusable flow component

### Edge

Edges connect nodes and define execution flow, with support for conditional branching.

### Variable

Variables store and pass data between nodes, with proper scoping (global/local).

### Sub-Flow

Sub-flows are reusable flow components with defined inputs and outputs (like functions).

## Plugin System

All node types are implemented as plugins. A plugin defines:

1. **Schema** - Zod schema for configuration
2. **Execution** - Async handler function
3. **UI** (optional) - React component for configuration
4. **Validation** (optional) - Custom validation logic

### Plugin System

Plugins are categorized into **CORE** (essential) and **BUSINESS** (domain-specific):

#### CORE Plugins (Required)

These plugins are essential for the flow builder to function and cannot be removed:

**Conditions:**
- `if-condition` - If/else branching
- `switch-condition` - Switch/case branching

**Loops:**
- `for-loop` - Fixed iteration count
- `while-loop` - Condition-based iteration
- `foreach-loop` - Iterate over arrays

**Sub-Flows:**
- `call-subflow` - Call reusable sub-flow
- `define-subflow` - Define sub-flow

**Flow Control:**
- `start-trigger` - Manual flow start
- `end-flow` - Terminate flow

### Built-in Engine Features

These are core capabilities built into the engine, not plugins:

- **Parallel Execution**: Fork execution with `parallel-split` and aggregate with `parallel-join`
- **Code Executor**: Write custom TypeScript code with full IDE support (Monaco editor)
- **Variables**: Runtime variable management accessible to all plugins

#### BUSINESS Plugins (Optional)

These plugins extend the system with domain-specific functionality:

**Transform:**
- `transform-node` - Configurable data transformation (map, filter, reduce, group, sort, etc.)

**Actions:**
- `http-request` - Make HTTP requests
- `file-operation` - Read/write/validate files
- `database-query` - Execute database queries
- `storage-upload` - Upload to storage

**Triggers:**
- `event-trigger` - Respond to events
- `timer-trigger` - Schedule with cron
- `webhook-trigger` - HTTP webhook

### Node UI Patterns

Each plugin defines how its node appears and behaves:

- **Info Node**: Display-only, shows status/information
- **Editable Node**: Inline editing on canvas
- **Clickable Node**: Opens modal/sheet for configuration

## Expression System

Use `{{ }}` syntax to reference variables:

```typescript
// Simple variable reference
'{{ userName }}'

// Object path
'{{ user.profile.name }}'

// Node output
'{{ nodeId.outputKey }}'

// Conditions
'{{ count > 10 }}'
'{{ status === "success" }}'
```

## Example: File Upload Flow

```typescript
const fileUploadFlow = {
  id: 'file-upload',
  name: 'File Upload Flow',
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      pluginId: 'event-trigger',
      config: { eventName: 'file:uploaded' },
    },
    {
      id: 'validate-1',
      type: 'action',
      pluginId: 'file-validation',
      config: {
        maxSize: 10485760, // 10MB
        allowedTypes: ['image/jpeg', 'image/png'],
      },
    },
    {
      id: 'condition-1',
      type: 'condition',
      pluginId: 'if-condition',
      config: { condition: '{{ valid === true }}' },
    },
    // ... more nodes
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'validate-1' },
    { id: 'e2', source: 'validate-1', target: 'condition-1' },
    // ... more edges
  ],
};
```

## React Hooks

### useFlow

```typescript
const { flow, execute, save } = useFlow(flowId);
```

### useExecution

```typescript
const { state, logs, start, pause, stop } = useExecution();
```

### useVariables

```typescript
const { variables, set, get } = useVariables();
```

## Architecture

```
@repo/flow
├── core/           # Execution engine
│   ├── engine/     # Parser, validator, executor
│   ├── variables/  # Variable management
│   └── events/     # Event system
├── plugins/        # Plugin implementations
│   ├── actions/
│   ├── triggers/
│   ├── conditions/
│   └── loops/
├── ui/             # React Flow UI
│   ├── components/
│   ├── hooks/
│   └── stores/
├── runtime/        # Execution runtime
└── storage/        # Serialization
```

## Documentation

- [Complete Specification](./FLOW-BUILDER-SPECIFICATION.md) - Full architecture and design
- [Implementation Guide](./IMPLEMENTATION-GUIDE.md) - Code examples and best practices
- [Agent Rules](./AGENTS.md) - Development guidelines for AI agents

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Watch mode
bun test:watch

# Type check
bun run type-check

# Lint
bun run lint
```

## Testing

```typescript
import { describe, it, expect } from 'vitest';
import { FlowExecutor } from '@repo/flow';

describe('FlowExecutor', () => {
  it('should execute a simple flow', async () => {
    // Test implementation
  });
});
```

## Contributing

1. Read [AGENTS.md](./AGENTS.md) for development rules
2. Create plugins in `plugins/<category>/`
3. Add tests for all new features
4. Follow TypeScript and ESLint conventions
5. Update documentation

## Use Cases

- **File Processing** - Upload, validate, transform, and store files
- **API Orchestration** - Chain multiple API calls with error handling
- **Data Pipelines** - Transform and move data between systems
- **Business Logic** - Implement complex conditional workflows
- **Batch Operations** - Process arrays with loops and transformations

## Performance

- Parallel execution of independent nodes
- Lazy loading of plugins
- Memoization of expensive operations
- Efficient variable scoping
- Optimized React Flow rendering

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

## License

Part of the Nestio monorepo project.

---

**Built with:**
- [React Flow](https://reactflow.dev/) - Flow canvas
- [Zustand](https://zustand-demo.pmnd.rs/) - State management
- [Zod](https://zod.dev/) - Schema validation
- TypeScript, Vitest, ESLint
