# Flow Builder System - Complete Specification

> **Version:** 1.0.0  
> **Package:** `@repo/flow`  
> **Purpose:** Visual flow builder using React Flow for creating complex, plugin-based workflow automation

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Concepts](#core-concepts)
4. [Node Types](#node-types)
5. [Plugin System](#plugin-system)
6. [Variable System](#variable-system)
7. [Sub-Flows (Reusable Components)](#sub-flows-reusable-components)
8. [Flow Versioning & Immutable Executions](#flow-versioning--immutable-executions)
9. [State Persistence & Execution Snapshots](#state-persistence--execution-snapshots)
10. [Execution Engine](#execution-engine)
11. [React Flow Integration](#react-flow-integration)
12. [File Upload Flow Example](#file-upload-flow-example)
13. [Implementation Plan](#implementation-plan)
14. [API Reference](#api-reference)

---

## Overview

The Flow Builder is a visual programming interface that allows users to create complex workflows through drag-and-drop components. It's designed for maximum flexibility, scalability, and reusability.

### Key Features

- **Visual Programming**: Build flows using React Flow's canvas
- **Plugin Architecture**: Extend functionality through modular plugins
- **Type-Safe**: Full TypeScript support with runtime validation
- **Variable Management**: Dynamic variable creation and manipulation
- **Control Flow**: If/else, switch/case, loops (for/while)
- **Sub-Flows**: Create reusable flow components (like functions)
- **Execution Context**: Isolated execution with scope management
- **Real-time Validation**: Validate flows as you build them
- **Execution History**: Track and debug flow executions

### Use Cases

- File upload processing with validation
- Data transformation pipelines
- API orchestration workflows
- Conditional business logic
- Batch operations with loops
- Multi-step form processing

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Flow Builder UI                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Node Palette │  │ Canvas Area  │  │ Config Panel │     │
│  │  (Plugins)   │  │ (React Flow) │  │   (Props)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Flow Core Runtime                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Parser     │  │  Validator   │  │   Executor   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Variable Mgr │  │ Scope Stack  │  │ Event System │     │
│  │  (Runtime)   │  │  (Runtime)   │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Plugin System                             │
│                                                               │
│  CORE Plugins (Required):                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Conditions  │  │    Loops     │  │  Sub-Flows   │     │
│  │ (If, Switch) │  │ (For, While) │  │  (Reusable)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                               │
│  BUSINESS Plugins (Optional):                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Actions    │  │   Triggers   │  │   Storage    │     │
│  │  (HTTP, DB)  │  │(Event, Timer)│  │ (S3, Local)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Package Structure

```
packages/flow/
├── src/
│   ├── core/
│   │   ├── engine/
│   │   │   ├── executor.ts           # Flow execution engine
│   │   │   ├── parser.ts             # Flow definition parser
│   │   │   ├── validator.ts          # Flow validation
│   │   │   └── context.ts            # Execution context
│   │   ├── runtime/
│   │   │   ├── variables/
│   │   │   │   ├── manager.ts        # Variable management
│   │   │   │   ├── scope.ts          # Scope stack
│   │   │   │   ├── resolver.ts       # Variable resolution
│   │   │   │   └── types.ts          # Variable types
│   │   │   ├── executor/
│   │   │   │   ├── flow-runner.ts    # Main executor
│   │   │   │   ├── node-executor.ts  # Individual node execution
│   │   │   │   ├── parallel-executor.ts  # Built-in parallel execution
│   │   │   │   └── error-handler.ts  # Error handling
│   │   │   ├── snapshots/            # Snapshot integration layer
│   │   │   │   └── checkpoint-hooks.ts   # Automatic checkpoint triggers
│   │   │   ├── parallel/             # Built-in parallel execution
│   │   │   │   ├── split-handler.ts  # Parallel split logic
│   │   │   │   ├── join-handler.ts   # Parallel join & aggregation
│   │   │   │   └── strategies.ts     # Execution strategies
│   │   │   ├── code/                 # Built-in code executor
│   │   │   │   ├── executor.ts       # TypeScript executor
│   │   │   │   ├── sandbox.ts        # Secure sandbox
│   │   │   │   ├── type-checker.ts   # Runtime type checking
│   │   │   │   └── editor-support.ts # IDE integration helpers
│   │   │   ├── context/
│   │   │   │   ├── execution-context.ts  # Runtime context
│   │   │   │   └── scope-manager.ts      # Scope management
│   │   │   └── debugger/
│   │   │       ├── breakpoints.ts    # Breakpoint system
│   │   │       ├── step-debugger.ts  # Step-by-step execution
│   │   │       └── inspector.ts      # Variable inspection
│   │   ├── events/
│   │   │   ├── emitter.ts            # Event system
│   │   │   └── types.ts              # Event types
│   │   ├── plugins/                  # CORE plugins (required)
│   │   │   ├── conditions/
│   │   │   │   ├── if-condition.ts       # If/else
│   │   │   │   ├── switch-condition.ts   # Switch/case
│   │   │   │   └── index.ts
│   │   │   ├── loops/
│   │   │   │   ├── for-loop.ts           # For loop
│   │   │   │   ├── while-loop.ts         # While loop
│   │   │   │   ├── foreach-loop.ts       # ForEach loop
│   │   │   │   └── index.ts
│   │   │   ├── subflows/
│   │   │   │   ├── call-subflow.ts       # Call sub-flow
│   │   │   │   ├── define-subflow.ts     # Define sub-flow
│   │   │   │   └── index.ts
│   │   │   ├── flow-control/
│   │   │   │   ├── start-trigger.ts      # Manual start
│   │   │   │   ├── end-flow.ts           # Flow termination
│   │   │   │   └── index.ts
│   │   │   └── index.ts              # Core plugin registry
│   │   └── types/
│   │       ├── flow.ts               # Flow types
│   │       ├── node.ts               # Node types
│   │       └── plugin.ts             # Plugin types
│   ├── plugins/                      # BUSINESS plugins (optional)
│   │   ├── transform/
│   │   │   ├── transform-node.ts     # Configurable data transformation
│   │   │   ├── operators/            # Transform operators
│   │   │   │   ├── map.ts
│   │   │   │   ├── filter.ts
│   │   │   │   ├── reduce.ts
│   │   │   │   ├── pick.ts
│   │   │   │   ├── omit.ts
│   │   │   │   ├── merge.ts
│   │   │   │   ├── group.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── actions/
│   │   │   ├── http-request.ts       # HTTP action
│   │   │   ├── database-query.ts     # DB action
│   │   │   ├── file-operation.ts     # File action
│   │   │   ├── data-transform.ts     # Data transformation
│   │   │   └── index.ts
│   │   ├── triggers/
│   │   │   ├── event-trigger.ts      # Event-based trigger
│   │   │   ├── timer-trigger.ts      # Schedule trigger
│   │   │   ├── webhook-trigger.ts    # Webhook trigger
│   │   │   └── index.ts
│   │   ├── storage/
│   │   │   ├── s3-storage.ts         # S3 operations
│   │   │   ├── local-storage.ts      # Local file operations
│   │   │   └── index.ts
│   │   └── index.ts                  # Business plugin registry
│   ├── ui/
│   │   ├── components/
│   │   │   ├── FlowCanvas.tsx        # Main canvas
│   │   │   ├── NodePalette.tsx       # Node selection
│   │   │   ├── ConfigPanel.tsx       # Node configuration
│   │   │   ├── VariablePanel.tsx     # Variable viewer
│   │   │   ├── ExecutionPanel.tsx    # Execution history
│   │   │   └── nodes/
│   │   │       ├── BaseNode.tsx      # Base node component
│   │   │       ├── ActionNode.tsx    # Action node UI
│   │   │       ├── ConditionNode.tsx # Condition node UI
│   │   │       ├── LoopNode.tsx      # Loop node UI
│   │   │       └── index.ts
│   │   ├── hooks/
│   │   │   ├── useFlow.ts            # Flow state management
│   │   │   ├── useNodeConfig.ts      # Node configuration
│   │   │   ├── useVariables.ts       # Variable management
│   │   │   ├── useExecution.ts       # Execution control
│   │   │   └── index.ts
│   │   ├── stores/
│   │   │   ├── flowStore.ts          # Flow state (Zustand)
│   │   │   ├── variableStore.ts      # Variable state
│   │   │   └── executionStore.ts     # Execution state
│   │   └── utils/
│   │       ├── layout.ts             # Auto-layout algorithms
│   │       ├── validation.ts         # UI validation helpers
│   │       └── serialization.ts      # Save/load flows
│   ├── storage/
│   │   ├── serializers/
│   │   │   ├── flow-serializer.ts    # Flow to JSON
│   │   │   └── flow-deserializer.ts  # JSON to Flow
│   │   ├── validators/
│   │   │   └── schema-validator.ts   # JSON schema validation
│   │   ├── versions/
│   │   │   ├── version-manager.ts    # Version lifecycle
│   │   │   ├── version-storage.ts    # Version persistence
│   │   │   ├── version-comparator.ts # Diff & comparison
│   │   │   └── version-tagger.ts     # Tagging & deployment
│   │   ├── execution/
│   │   │   ├── snapshot-manager.ts   # Snapshot creation & retrieval
│   │   │   ├── snapshot-storage.ts   # Snapshot persistence
│   │   │   ├── checkpoint-manager.ts # Automatic checkpoint creation
│   │   │   ├── checkpoint-storage.ts # Checkpoint persistence
│   │   │   └── rerun-executor.ts     # Resume & rerun logic
│   │   └── index.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

## Core Concepts

### Flow

A **Flow** is the top-level container representing a complete workflow.

```typescript
interface Flow {
  id: string;
  name: string;
  description?: string;
  version: string;  // User-facing semantic version (e.g., "1.0.0", "2.1.3")
  nodes: FlowNode[];
  edges: FlowEdge[];
  variables: FlowVariable[];
  subFlows: SubFlow[];
  metadata: FlowMetadata;
}

interface FlowMetadata {
  createdAt: Date;
  updatedAt: Date;
  author?: string;
  tags?: string[];
  category?: string;
}
```

**Note:** The `version` field in `Flow` is a user-facing semantic version for the flow definition (e.g., "1.0.0"). This is separate from the automatic **version tracking system** (`FlowVersion`) which creates immutable snapshots on every save for execution reproducibility.

### Node

A **Node** represents a single unit of work in a flow.

```typescript
interface FlowNode {
  id: string;
  type: NodeType;
  pluginId: string;
  label: string;
  position: { x: number; y: number };
  data: NodeData;
  config: NodeConfig;
}

type NodeType = 
  | 'trigger'      // Entry point
  | 'action'       // Perform operation
  | 'condition'    // If/Switch
  | 'loop'         // For/While
  | 'subflow'      // Call sub-flow
  | 'parallel'     // Parallel split/join
  | 'transform'    // Transform data
  | 'code';        // Custom TypeScript code

interface NodeData {
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  errors?: Record<string, ErrorOutput>;  // Typed error outputs
  state?: 'idle' | 'running' | 'success' | 'error' | 'warning';
  error?: Error;
  errorHandling?: NodeErrorHandling;
}

interface NodeErrorHandling {
  strategy: 'throw' | 'catch' | 'retry' | 'ignore';
  retryConfig?: {
    maxAttempts: number;
    backoffStrategy: 'fixed' | 'exponential' | 'linear';
    initialDelay: number;  // milliseconds
    maxDelay?: number;
  };
  timeout?: number;  // milliseconds
  onTimeout?: 'fail' | 'continue-partial' | 'default-value';
}

interface ErrorOutput {
  type: string;  // Error type identifier
  code?: string | number;  // Error code
  message: string;
  data?: any;  // Additional error data
  schema?: z.ZodSchema;  // Validation schema for error data
  recoverable: boolean;  // Can this error be recovered from?
}
```

### Edge

An **Edge** connects nodes and defines execution flow.

```typescript
interface FlowEdge {
  id: string;
  source: string;      // Source node ID
  target: string;      // Target node ID
  sourceHandle?: string;
  targetHandle?: string;
  type?: 'default' | 'conditional' | 'loop' | 'parallel' | 'error';
  label?: string;
  condition?: EdgeCondition;
  parallelBranch?: string;  // Branch ID for parallel execution
  errorFilter?: ErrorFilter;  // Filter specific error types
}

interface ErrorFilter {
  errorTypes?: string[];  // Match specific error types
  errorCodes?: Array<string | number>;  // Match specific error codes
  matchUnknown?: boolean;  // Match unknown/unhandled errors
  severity?: 'critical' | 'error' | 'warning';  // Filter by severity
}

interface EdgeCondition {
  expression: string;  // e.g., "{{ output.status === 'success' }}"
  variables?: string[];
}
```

### Variable

Variables store and pass data between nodes.

```typescript
interface FlowVariable {
  id: string;
  name: string;
  type: VariableType;
  value?: any;
  scope: 'global' | 'local';
  description?: string;
}

type VariableType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'file'
  | 'any';
```

### Sub-Flow

A **Sub-Flow** is a reusable flow component (like a function).

```typescript
interface SubFlow {
  id: string;
  name: string;
  description?: string;
  inputs: SubFlowParameter[];
  outputs: SubFlowParameter[];
  flow: Flow;
}

interface SubFlowParameter {
  name: string;
  type: VariableType;
  required: boolean;
  defaultValue?: any;
  description?: string;
}
```

---

## Node Types

### 1. Trigger Nodes

Entry points for flow execution.

#### Event Trigger
```typescript
{
  type: 'trigger',
  pluginId: 'event-trigger',
  config: {
    eventName: string;
    filter?: {
      expression: string;
    };
  }
}
```

#### Timer Trigger
```typescript
{
  type: 'trigger',
  pluginId: 'timer-trigger',
  config: {
    schedule: string;  // Cron expression
    timezone?: string;
  }
}
```

#### Manual Trigger
```typescript
{
  type: 'trigger',
  pluginId: 'manual-trigger',
  config: {
    buttonLabel: string;
    confirmRequired?: boolean;
  }
}
```

### 2. Action Nodes

Perform operations.

#### HTTP Request
```typescript
{
  type: 'action',
  pluginId: 'http-request',
  config: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url: string;  // Supports {{ variables }}
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
  },
  outputs: {
    response: any;
    status: number;
    headers: Record<string, string>;
  },
  // Typed error outputs
  errors: {
    // Network errors
    networkError: {
      type: 'NetworkError',
      code: 'NETWORK_ERROR',
      message: 'Failed to reach server',
      data: { url: string; cause: string },
      recoverable: true,
    },
    // Timeout errors
    timeoutError: {
      type: 'TimeoutError',
      code: 'TIMEOUT',
      message: 'Request timed out',
      data: { timeout: number; url: string },
      recoverable: true,
    },
    // HTTP errors (4xx, 5xx)
    httpError: {
      type: 'HttpError',
      code: 'HTTP_ERROR',
      message: 'HTTP request failed',
      data: { status: number; statusText: string; body: any },
      schema: z.object({
        status: z.number(),
        statusText: z.string(),
        body: z.any(),
      }),
      recoverable: false,  // Depends on status code
    },
  },
  // Error handling configuration
  errorHandling: {
    strategy: 'retry',
    retryConfig: {
      maxAttempts: 3,
      backoffStrategy: 'exponential',
      initialDelay: 1000,
      maxDelay: 10000,
    },
    timeout: 30000,
    onTimeout: 'fail',
  },
}
```

**Error Output Handles:**

Each error type creates a visual output handle on the node that can be connected to error handling flows:

```
┌─────────────────────┐
│   HTTP Request      │
├─────────────────────┤
│ GET /api/users      │
└─────────────────────┘
  │ success (200-299)
  ├─► Next node
  │ networkError
  ├─► Retry handler
  │ timeoutError  
  ├─► Timeout handler
  │ httpError (4xx/5xx)
  ├─► Error logger
  │ unknown
  └─► Fallback handler
```

#### Database Query
```typescript
{
  type: 'action',
  pluginId: 'database-query',
  config: {
    connection: string;  // Connection ID
    query: string;       // SQL or query object
    parameters?: Record<string, any>;
  },
  outputs: {
    rows: any[];
    count: number;
  }
}
```

#### File Operation
```typescript
{
  type: 'action',
  pluginId: 'file-operation',
  config: {
    operation: 'read' | 'write' | 'move' | 'delete' | 'validate';
    path: string;
    options?: {
      encoding?: string;
      validation?: {
        maxSize?: number;
        allowedTypes?: string[];
      };
    };
  },
  outputs: {
    success: boolean;
    data?: any;
    metadata?: FileMetadata;
  }
}
```

### 3. Condition Nodes

Control flow based on conditions.

#### If/Else
```typescript
{
  type: 'condition',
  pluginId: 'if-condition',
  config: {
    condition: string;  // {{ variable.value > 10 }}
    thenHandle: string; // Output handle ID for true
    elseHandle: string; // Output handle ID for false
  }
}
```

#### Switch/Case
```typescript
{
  type: 'condition',
  pluginId: 'switch-condition',
  config: {
    expression: string;  // {{ variable.type }}
    cases: Array<{
      value: any;
      handle: string;
    }>;
    defaultHandle?: string;
  }
}
```

### 4. Loop Nodes

Iterate over data.

#### For Loop
```typescript
{
  type: 'loop',
  pluginId: 'for-loop',
  config: {
    start: number;
    end: number;
    step?: number;
    indexVariable: string;  // Variable name for index
  }
}
```

#### While Loop
```typescript
{
  type: 'loop',
  pluginId: 'while-loop',
  config: {
    condition: string;  // {{ variable.hasMore }}
    maxIterations?: number;  // Safety limit
  }
}
```

#### ForEach Loop
```typescript
{
  type: 'loop',
  pluginId: 'foreach-loop',
  config: {
    array: string;  // Variable name or {{ expression }}
    itemVariable: string;
    indexVariable?: string;
  }
}
```

### 5. Variable Nodes

Manipulate variables.

#### Set Variable
```typescript
{
  type: 'variable',
  pluginId: 'set-variable',
  config: {
    variableName: string;
    value: any;  // Supports {{ expressions }}
    type?: VariableType;
  }
}
```

#### Transform Data
```typescript
{
  type: 'variable',
  pluginId: 'transform-data',
  config: {
    input: string;  // Variable name
    output: string; // Variable name
    transformation: {
      type: 'map' | 'filter' | 'reduce' | 'custom';
      expression: string;
    };
  }
}
```

### 6. Sub-Flow Nodes

Call reusable sub-flows.

```typescript
{
  type: 'subflow',
  pluginId: 'call-subflow',
  config: {
    subFlowId: string;
    inputs: Record<string, any>;
    outputMapping: Record<string, string>;
  }
}
```

### 7. Parallel Execution Nodes

Manage concurrent execution paths.

#### Parallel Split
```typescript
{
  type: 'parallel',
  pluginId: 'parallel-split',
  config: {
    branches: Array<{
      id: string;
      name: string;
      condition?: string;  // Optional condition to execute branch
    }>;
    strategy: 'all' | 'race' | 'first-success';  // Execution strategy
  },
  outputs: {
    // Creates output handle for each branch
    [branchId: string]: any;
  }
}
```

#### Parallel Join
```typescript
{
  type: 'parallel',
  pluginId: 'parallel-join',
  config: {
    aggregationStrategy: 'merge' | 'array' | 'custom';
    timeout?: number;  // Max wait time in ms
    customAggregator?: string;  // Custom TypeScript code for aggregation
  },
  inputs: {
    // Receives inputs from multiple branches
    [branchId: string]: any;
  },
  outputs: {
    aggregated: any;  // Combined result
    individual: Record<string, any>;  // Original results by branch
    metadata: {
      executionTimes: Record<string, number>;
      completedBranches: string[];
      failedBranches?: string[];
    };
  }
}
```

### 8. Transform Nodes (Business Plugin)

Configurable data transformation without code.

```typescript
{
  type: 'transform',
  pluginId: 'transform-node',
  category: 'business',
  config: {
    transformations: Array<{
      operator: 'map' | 'filter' | 'reduce' | 'pick' | 'omit' | 'merge' | 'group' | 'flatten' | 'sort' | 'unique';
      input: string;   // Source variable/path (supports dot notation)
      output: string;  // Target variable/path
      params: TransformParams;  // Operator-specific parameters
    }>;
    schema?: z.ZodSchema;  // Optional output validation
    errorHandling: 'throw' | 'skip' | 'default';  // Error behavior
    defaultValue?: any;  // Fallback value on error
  },
  outputs: {
    transformed: any;
    original: any;
    metadata: {
      appliedTransformations: number;
      skippedTransformations: number;
      errors?: Array<{ step: number; error: string }>;
    };
  }
}
```

**Transform Operators:**

```typescript
// Map: Transform each item
{
  operator: 'map',
  params: {
    mapping: Record<string, string>;  // { outputKey: 'inputPath' }
    // Example: { name: 'user.fullName', age: 'user.age' }
  }
}

// Filter: Filter items by condition
{
  operator: 'filter',
  params: {
    conditions: Array<{
      field: string;
      operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains' | 'regex';
      value: any;
    }>;
    logic: 'and' | 'or';  // How to combine conditions
  }
}

// Reduce: Aggregate array to single value
{
  operator: 'reduce',
  params: {
    operation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'concat' | 'custom';
    field?: string;  // Field to reduce on
    initialValue?: any;
  }
}

// Pick: Select specific fields
{
  operator: 'pick',
  params: {
    fields: string[];  // Array of field paths to keep
  }
}

// Omit: Remove specific fields
{
  operator: 'omit',
  params: {
    fields: string[];  // Array of field paths to remove
  }
}

// Merge: Combine multiple objects
{
  operator: 'merge',
  params: {
    sources: string[];  // Array of variable paths to merge
    strategy: 'shallow' | 'deep' | 'concat-arrays';
  }
}

// Group: Group array by field
{
  operator: 'group',
  params: {
    by: string;  // Field to group by
    aggregate?: Record<string, 'sum' | 'avg' | 'count' | 'first' | 'last'>;
  }
}

// Sort: Sort array
{
  operator: 'sort',
  params: {
    by: string;  // Field to sort by
    order: 'asc' | 'desc';
    type: 'string' | 'number' | 'date';
  }
}

// Flatten: Flatten nested arrays
{
  operator: 'flatten',
  params: {
    depth?: number;  // How many levels to flatten (default: 1)
  }
}

// Unique: Remove duplicates
{
  operator: 'unique',
  params: {
    by?: string;  // Optional field to check uniqueness
  }
}
```

**Transform Node Example:**
```typescript
// Transform user data
{
  type: 'transform',
  pluginId: 'transform-node',
  config: {
    transformations: [
      // Pick only needed fields
      {
        operator: 'pick',
        input: 'apiResponse.users',
        output: 'filteredUsers',
        params: { fields: ['id', 'name', 'email', 'role'] }
      },
      // Filter active users
      {
        operator: 'filter',
        input: 'filteredUsers',
        output: 'activeUsers',
        params: {
          conditions: [{ field: 'status', operator: 'eq', value: 'active' }],
          logic: 'and'
        }
      },
      // Group by role
      {
        operator: 'group',
        input: 'activeUsers',
        output: 'usersByRole',
        params: {
          by: 'role',
          aggregate: { count: 'count' }
        }
      }
    ],
    errorHandling: 'skip',
    schema: z.object({
      usersByRole: z.record(z.array(z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
      })))
    })
  }
}
```

### 9. Code Executor (Built-in Engine Feature)

Execute custom TypeScript code with full IDE support.

```typescript
{
  type: 'code',
  pluginId: 'code-executor',
  config: {
    code: string;  // TypeScript code
    language: 'typescript';  // Future: support other languages
    timeout?: number;  // Execution timeout
    allowedImports?: string[];  // Whitelist of allowed imports
    inputSchema?: z.ZodSchema;  // Validate inputs
    outputSchema?: z.ZodSchema;  // Validate outputs
  },
  // Code has access to:
  // - context: ExecutionContext
  // - inputs: Record<string, any>
  // - variables: VariableManager
  // Must return: any (validated against outputSchema)
  outputs: {
    result: any;
    logs: string[];  // Console logs from execution
    executionTime: number;
  }
}
```

**Code Executor Example:**
```typescript
// User writes this in the Monaco editor with full TypeScript support
async function execute({ 
  context,   // ExecutionContext with full types
  inputs,    // Validated input data
  variables  // VariableManager instance
}) {
  // Access variables with IntelliSense
  const fileData = variables.get<FileMetadata>('uploadedFile');
  
  console.log('Processing', fileData.name);
  
  // Type-safe operations with async support
  const results = await Promise.all(
    inputs.items.map(async (item: FileItem) => {
      // Custom business logic
      const processed = await processItem(item);
      
      // Complex transformations
      return {
        id: item.id,
        size: processed.size,
        checksum: await calculateChecksum(processed),
        metadata: {
          processedAt: new Date().toISOString(),
          originalSize: item.size,
          compressionRatio: item.size / processed.size,
        },
      };
    })
  );
  
  // Set variables for downstream nodes
  variables.set('processedResults', results);
  variables.set('totalProcessed', results.length);
  
  // Return typed output (validated against outputSchema)
  return {
    success: true,
    count: results.length,
    items: results,
    summary: {
      totalSize: results.reduce((sum, r) => sum + r.size, 0),
      avgCompressionRatio: results.reduce((sum, r) => sum + r.metadata.compressionRatio, 0) / results.length,
    },
    timestamp: new Date().toISOString(),
  };
}
```

**Security Configuration:**
```typescript
// Strict: No imports, limited Node APIs
{
  securityLevel: 'strict',
  allowedAPIs: [],  // Only basic JavaScript
  timeout: 10000,
}

// Moderate: Some imports, select Node APIs
{
  securityLevel: 'moderate',
  allowedImports: ['lodash', 'date-fns', 'zod'],
  allowedAPIs: ['crypto'],  // For checksums, etc.
  timeout: 30000,
}

// Permissive: Most imports, many Node APIs (use carefully)
{
  securityLevel: 'permissive',
  allowedImports: ['*'],  // All installed packages
  allowedAPIs: ['crypto', 'buffer', 'stream'],
  timeout: 60000,
}
```

---

## Plugin System

Plugins extend the Flow Builder with new node types and capabilities.

### Plugin Categories

**CORE Plugins** (Essential for system operation):
- Required for the flow builder to function
- Installed by default, cannot be removed
- Provide fundamental control flow capabilities
- Examples: conditions, loops, variables, sub-flows

**BUSINESS Plugins** (Domain-specific functionality):
- Extend the system with specific capabilities
- Can be installed/removed as needed
- Domain-specific operations
- Examples: HTTP requests, file operations, database queries

### Plugin Interface

```typescript
type PluginCategory = 'core' | 'business';
type PluginSubCategory = 'action' | 'trigger' | 'condition' | 'loop' | 'variable' | 'subflow';

interface FlowPlugin {
  id: string;
  name: string;
  version: string;
  category: PluginCategory;
  subCategory: PluginSubCategory;
  icon?: string;
  description?: string;
  
  // Node definition
  nodeType: NodeType;
  
  // Configuration schema (Zod)
  configSchema: z.ZodSchema;
  
  // Input/Output schema
  inputSchema?: z.ZodSchema;
  outputSchema?: z.ZodSchema;
  
  // Execution handler
  execute: (context: ExecutionContext, config: any) => Promise<any>;
  
  // Validation
  validate?: (config: any) => ValidationResult;
  
  // UI Components
  ConfigComponent?: React.ComponentType<NodeConfigProps>;
  NodeComponent?: React.ComponentType<CustomNodeProps>;
  
  // Node UI pattern
  nodeUIPattern: 'info' | 'editable' | 'clickable';
  
  // Node UI configuration
  nodeUIConfig?: NodeUIConfig;
  
  // Lifecycle hooks
  onInit?: (context: ExecutionContext) => Promise<void>;
  onDestroy?: (context: ExecutionContext) => Promise<void>;
}

// Node UI Patterns
type NodeUIPattern = 
  | 'info'      // Display-only node showing status/information
  | 'editable'  // Node with inline editing capabilities
  | 'clickable'; // Node that opens modal/sheet on click

interface NodeUIConfig {
  pattern: NodeUIPattern;
  
  // For 'info' nodes
  displayFields?: string[];  // Which fields to display
  
  // For 'editable' nodes
  editableFields?: Array<{
    key: string;
    type: 'text' | 'number' | 'select';
    label: string;
    options?: Array<{ label: string; value: any }>;
  }>;
  
  // For 'clickable' nodes
  onClick?: {
    action: 'modal' | 'sheet' | 'panel' | 'custom';
    component?: React.ComponentType<any>;
  };
}
```

### Core Plugins (Required)

These plugins are essential and always available:

#### 1. Condition Plugins
- `if-condition` - If/else branching
- `switch-condition` - Switch/case branching

#### 2. Loop Plugins
- `for-loop` - Fixed iteration
- `while-loop` - Condition-based iteration
- `foreach-loop` - Array iteration

#### 3. Sub-Flow Plugins
- `call-subflow` - Call reusable sub-flow
- `define-subflow` - Define sub-flow

#### 4. Flow Control
- `start-trigger` - Manual flow start
- `end-flow` - Terminate flow

**Note:** Variables are NOT plugins - they are part of the core runtime system. All plugins can access the variable manager through the execution context.

**Built-in Engine Features** (not plugins):
- **Parallel Execution**: Fork and join execution paths with `parallel-split` and `parallel-join` nodes
- **Code Executor**: Execute custom TypeScript code with full type support and IDE integration
- These are core engine capabilities that all flows can use without installing plugins

### Plugin Registration

```typescript
// Create plugin registry
const pluginRegistry = new PluginRegistry();

// Register CORE plugin
pluginRegistry.register({
  id: 'if-condition',
  name: 'If Condition',
  version: '1.0.0',
  category: 'core',
  subCategory: 'condition',
  nodeType: 'condition',
  nodeUIPattern: 'clickable',  // Opens modal on click
});

// Register BUSINESS plugin
pluginRegistry.register({
  id: 'http-request',
  name: 'HTTP Request',
  version: '1.0.0',
  category: 'business',
  subCategory: 'action',
  nodeType: 'action',
  nodeUIPattern: 'clickable',  // Opens config modal
  
  configSchema: z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    url: z.string().url(),
    headers: z.record(z.string()).optional(),
    body: z.any().optional(),
  }),
  
  outputSchema: z.object({
    response: z.any(),
    status: z.number(),
    headers: z.record(z.string()),
  }),
  
  async execute(context, config) {
    const { method, url, headers, body } = config;
    const response = await fetch(url, { method, headers, body });
    return {
      response: await response.json(),
      status: response.status,
      headers: Object.fromEntries(response.headers),
    };
  },
  
  ConfigComponent: HttpRequestConfig,
});
```

### Node UI Patterns

#### 1. Info Node (Display Only)
```typescript
export const statusDisplayPlugin: FlowPlugin = {
  id: 'status-display',
  name: 'Status Display',
  version: '1.0.0',
  category: 'business',
  subCategory: 'action',
  nodeType: 'action',
  nodeUIPattern: 'info',
  
  configSchema: z.object({
    statusField: z.string(),
  }),
  
  // Display configuration
  nodeUIConfig: {
    pattern: 'info',
    displayFields: ['status', 'timestamp', 'message'],
  },
  
  NodeComponent: ({ data }) => (
    <div className="p-4 bg-white rounded-lg border">
      <div className="text-sm font-medium">{data.label}</div>
      <div className="text-xs text-gray-600 mt-1">
        Status: {data.status || 'Idle'}
      </div>
      {data.timestamp && (
        <div className="text-xs text-gray-500">
          {new Date(data.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  ),
};
```

#### 2. Editable Node (Inline Editing)
```typescript
export const variableSetPlugin: FlowPlugin = {
  id: 'set-variable',
  name: 'Set Variable',
  version: '1.0.0',
  category: 'core',
  subCategory: 'variable',
  nodeType: 'variable',
  nodeUIPattern: 'editable',
  
  configSchema: z.object({
    variableName: z.string(),
    value: z.any(),
  }),
  
  nodeUIConfig: {
    pattern: 'editable',
    editableFields: [
      { key: 'variableName', type: 'text', label: 'Variable' },
      { key: 'value', type: 'text', label: 'Value' },
    ],
  },
  
  NodeComponent: ({ data, onChange }) => (
    <div className="p-3 bg-white rounded-lg border">
      <div className="text-sm font-medium mb-2">Set Variable</div>
      <input
        type="text"
        placeholder="Variable name"
        value={data.config.variableName || ''}
        onChange={(e) => onChange({ variableName: e.target.value })}
        className="text-xs w-full px-2 py-1 border rounded mb-1"
      />
      <input
        type="text"
        placeholder="Value"
        value={data.config.value || ''}
        onChange={(e) => onChange({ value: e.target.value })}
        className="text-xs w-full px-2 py-1 border rounded"
      />
    </div>
  ),
};
```

#### 3. Clickable Node (Opens Modal)
```typescript
export const httpRequestPlugin: FlowPlugin = {
  id: 'http-request',
  name: 'HTTP Request',
  version: '1.0.0',
  category: 'business',
  subCategory: 'action',
  nodeType: 'action',
  nodeUIPattern: 'clickable',
  
  configSchema: z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
    url: z.string().url(),
    headers: z.record(z.string()).optional(),
  }),
  
  nodeUIConfig: {
    pattern: 'clickable',
    onClick: {
      action: 'modal',
      component: HttpRequestConfigModal,
    },
  },
  
  NodeComponent: ({ data, onClick }) => (
    <div
      onClick={onClick}
      className="p-3 bg-white rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">🌐</span>
        <div>
          <div className="text-sm font-medium">HTTP Request</div>
          {data.config.url && (
            <div className="text-xs text-gray-600 truncate">
              {data.config.method} {data.config.url}
            </div>
          )}
        </div>
      </div>
    </div>
  ),
};
```

### Custom Plugin Example

```typescript
// File validation plugin (BUSINESS plugin)
export const fileValidationPlugin: FlowPlugin = {
  id: 'file-validation',
  name: 'File Validation',
  version: '1.0.0',
  category: 'business',
  subCategory: 'action',
  nodeType: 'action',
  nodeUIPattern: 'clickable',
  
  configSchema: z.object({
    maxSize: z.number().positive(),
    allowedTypes: z.array(z.string()),
    validateContent: z.boolean().optional(),
  }),
  
  inputSchema: z.object({
    file: z.instanceof(File),
  }),
  
  outputSchema: z.object({
    valid: z.boolean(),
    errors: z.array(z.string()),
    metadata: z.object({
      name: z.string(),
      size: z.number(),
      type: z.string(),
    }),
  }),
  
  async execute(context, config) {
    const { file } = context.inputs;
    const { maxSize, allowedTypes, validateContent } = config;
    
    const errors: string[] = [];
    
    // Size validation
    if (file.size > maxSize) {
      errors.push(`File size ${file.size} exceeds maximum ${maxSize}`);
    }
    
    // Type validation
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} not allowed`);
    }
    
    // Content validation (if enabled)
    if (validateContent) {
      const buffer = await file.arrayBuffer();
      const magic = new Uint8Array(buffer.slice(0, 4));
      // Validate magic numbers...
    }
    
    return {
      valid: errors.length === 0,
      errors,
      metadata: {
        name: file.name,
        size: file.size,
        type: file.type,
      },
    };
  },
};
```

---

## Variable System

**Variables are a core runtime component**, not a plugin. The variable system is built into the execution context and is accessible to all plugins through the `ExecutionContext` interface.

### Core Principles

1. **Universal Access**: Every plugin can access variables through the execution context
2. **Scope Management**: Variables support global and local scopes with proper isolation
3. **Type Safety**: Runtime type checking with TypeScript support
4. **Expression Evaluation**: Support for dynamic expressions like `{{ variable.path }}`

### Variable Manager

```typescript
class VariableManager {
  private variables: Map<string, FlowVariable>;
  private scopes: ScopeStack;
  
  set(name: string, value: any, type?: VariableType): void {
    const scope = this.scopes.current();
    const variable: FlowVariable = {
      id: generateId(),
      name,
      type: type || inferType(value),
      value,
      scope: scope.level === 0 ? 'global' : 'local',
    };
    this.variables.set(name, variable);
  }
  
  get(name: string): any {
    const variable = this.resolve(name);
    return variable?.value;
  }
  
  resolve(name: string): FlowVariable | undefined {
    // Check current scope and parent scopes
    return this.scopes.resolve(name) || this.variables.get(name);
  }
  
  exists(name: string): boolean {
    return this.resolve(name) !== undefined;
  }
  
  delete(name: string): void {
    this.variables.delete(name);
  }
  
  clear(): void {
    this.variables.clear();
  }
}
```

### Scope Stack

```typescript
class ScopeStack {
  private stack: Scope[] = [];
  
  push(name: string): void {
    this.stack.push({
      name,
      level: this.stack.length,
      variables: new Map(),
    });
  }
  
  pop(): void {
    this.stack.pop();
  }
  
  current(): Scope {
    return this.stack[this.stack.length - 1] || this.global();
  }
  
  global(): Scope {
    return this.stack[0];
  }
  
  resolve(name: string): FlowVariable | undefined {
    // Search from current scope up to global
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const scope = this.stack[i];
      if (scope.variables.has(name)) {
        return scope.variables.get(name);
      }
    }
    return undefined;
  }
}
```

### Expression Evaluation

```typescript
class ExpressionEvaluator {
  evaluate(expression: string, context: ExecutionContext): any {
    // Parse {{ variable.path.to.value }}
    const matches = expression.match(/\{\{(.+?)\}\}/g);
    
    if (!matches) return expression;
    
    let result = expression;
    for (const match of matches) {
      const path = match.slice(2, -2).trim();
      const value = this.resolvePath(path, context);
      result = result.replace(match, String(value));
    }
    
    return result;
  }
  
  private resolvePath(path: string, context: ExecutionContext): any {
    const parts = path.split('.');
    let value = context.variables.get(parts[0]);
    
    for (let i = 1; i < parts.length; i++) {
      value = value?.[parts[i]];
    }
    
    return value;
  }
}
```

---

## Error Handling System

**Error handling is a first-class citizen** in the flow builder. Every node can declare typed error outputs that can be visually routed to error handling flows.

### Core Principles

1. **Typed Errors**: Each error type has a schema for type-safe error handling
2. **Visual Error Routing**: Error outputs appear as handles on nodes for visual connection
3. **Granular Control**: Handle specific error types differently
4. **Unknown Error Catching**: Catch unexpected errors with special "unknown" output
5. **Per-Node Configuration**: Each node can have its own retry/timeout policy

### Error Output Definition

Every plugin can define the errors it might throw:

```typescript
interface FlowPlugin {
  // ... other properties
  
  // Define possible errors this plugin can produce
  errorOutputs?: Record<string, ErrorOutputDefinition>;
  
  // Default error handling strategy
  defaultErrorHandling?: NodeErrorHandling;
}

interface ErrorOutputDefinition {
  type: string;  // Error class/type name
  code?: string | number;  // Standard error code
  description: string;  // Human-readable description
  dataSchema?: z.ZodSchema;  // Schema for error data
  recoverable: boolean;  // Can this be retried?
  severity: 'critical' | 'error' | 'warning';  // Error severity
  suggestedActions?: string[];  // Hints for handling
}

interface NodeErrorHandling {
  strategy: 'throw' | 'catch' | 'retry' | 'ignore';
  retryConfig?: {
    maxAttempts: number;
    backoffStrategy: 'fixed' | 'exponential' | 'linear';
    initialDelay: number;  // milliseconds
    maxDelay?: number;
  };
  timeout?: number;  // milliseconds
  onTimeout?: 'fail' | 'continue-partial' | 'default-value';
}
```

### Example: File Validation Plugin with Typed Errors

```typescript
export const fileValidationPlugin: FlowPlugin = {
  id: 'file-validation',
  name: 'File Validation',
  category: 'business',
  nodeType: 'action',
  
  configSchema: z.object({
    maxSize: z.number().positive(),
    allowedTypes: z.array(z.string()),
  }),
  
  // Define typed error outputs
  errorOutputs: {
    fileTooLarge: {
      type: 'FileSizeError',
      code: 'FILE_TOO_LARGE',
      description: 'File exceeds maximum allowed size',
      dataSchema: z.object({
        fileSize: z.number(),
        maxSize: z.number(),
        fileName: z.string(),
      }),
      recoverable: false,  // Can't fix size automatically
      severity: 'error',
      suggestedActions: ['Compress file', 'Split into chunks'],
    },
    invalidFileType: {
      type: 'FileTypeError',
      code: 'INVALID_FILE_TYPE',
      description: 'File type not in allowed list',
      dataSchema: z.object({
        fileType: z.string(),
        allowedTypes: z.array(z.string()),
        fileName: z.string(),
      }),
      recoverable: false,
      severity: 'error',
      suggestedActions: ['Convert file format'],
    },
    corruptedFile: {
      type: 'FileCorruptionError',
      code: 'FILE_CORRUPTED',
      description: 'File data is corrupted or unreadable',
      dataSchema: z.object({
        fileName: z.string(),
        errorDetails: z.string(),
      }),
      recoverable: true,  // Could retry with different file
      severity: 'critical',
      suggestedActions: ['Request file re-upload'],
    },
  },
  
  defaultErrorHandling: {
    strategy: 'catch',  // Don't retry, let error flow handle it
    timeout: 10000,
    onTimeout: 'fail',
  },
  
  async execute(context, config) {
    const file = context.inputs.file;
    
    // Throw typed errors
    if (file.size > config.maxSize) {
      throw new FlowError('fileTooLarge', {
        fileSize: file.size,
        maxSize: config.maxSize,
        fileName: file.name,
      });
    }
    
    if (!config.allowedTypes.includes(file.type)) {
      throw new FlowError('invalidFileType', {
        fileType: file.type,
        allowedTypes: config.allowedTypes,
        fileName: file.name,
      });
    }
    
    // Validate file integrity
    try {
      await validateFileIntegrity(file);
    } catch (error) {
      throw new FlowError('corruptedFile', {
        fileName: file.name,
        errorDetails: error.message,
      });
    }
    
    return { valid: true, fileName: file.name };
  },
};
```

### Visual Error Routing

Error outputs appear as colored handles on nodes:

```
┌─────────────────────────────┐
│  File Validation            │
├─────────────────────────────┤
│ Max: 10MB                   │
│ Types: jpg, png, pdf        │
└─────────────────────────────┘
  │ ✓ success (green)
  ├─► [Process File]
  │ ⚠ fileTooLarge (yellow)
  ├─► [Compress & Retry]
  │ ✗ invalidFileType (red)
  ├─► [Send Error Email]
  │ ✗ corruptedFile (red)
  ├─► [Request Re-upload]
  │ ? unknown (purple)
  └─► [Alert Admin]
```

### Error Flow Patterns

#### Pattern 1: Retry with Backoff
```typescript
[HTTP Request] ──success──► [Process Response]
       │
       └──networkError──► (automatic retry 3x)
                          └──still fails──► [Log Error]
```

#### Pattern 2: Error-Specific Handling
```typescript
[File Upload] ──success────────► [Process File]
       │
       ├──fileTooLarge───────────► [Compress & Retry]
       │
       ├──invalidFileType────────► [Send Error Email]
       │
       ├──corruptedFile──────────► [Request Re-upload]
       │
       └──unknown────────────────► [Alert Admin]
```

#### Pattern 3: Fallback Chain
```typescript
[Primary DB] ──success─────────► [Continue]
      │
      └──connectionError──► [Backup DB] ──success──► [Continue]
                                  └──error──────► [Fail]
```

### Unknown Error Handling

Every node automatically gets an 'unknown' error output for errors not declared in `errorOutputs`:

```typescript
// Catches:
// - Unhandled exceptions
// - System errors  
// - Memory issues
// - Unexpected crashes

[Custom Code Node] ──success──► [Next]
       │
       ├──syntaxError───────► [Show Error to User]
       ├──runtimeError──────► [Log & Retry]
       └──unknown───────────► [Alert Admin + Stop Flow]
```

### Error Context

When an error is caught, the downstream node receives full error context:

```typescript
interface ErrorContext {
  nodeId: string;
  nodeName: string;
  errorType: string;  // From errorOutputs or 'unknown'
  errorCode?: string | number;
  message: string;
  data?: any;  // Validated against dataSchema
  
  // Execution context
  executionId: string;
  timestamp: Date;
  attemptNumber: number;  // For retries
  
  // Stack trace (for unknown errors)
  stack?: string;
  
  // Variables at time of error
  variables?: Record<string, any>;
  
  // Input that caused error
  inputs?: Record<string, any>;
}
```

### Error Edges

Error edges are a special edge type for routing errors:

```typescript
interface FlowEdge {
  // ... other properties
  type?: 'default' | 'conditional' | 'loop' | 'parallel' | 'error';
  
  // Filter specific error types
  errorFilter?: {
    errorTypes?: string[];  // Match specific error types
    errorCodes?: Array<string | number>;  // Match specific error codes
    matchUnknown?: boolean;  // Match unknown/unhandled errors
    severity?: 'critical' | 'error' | 'warning';  // Filter by severity
  };
}
```

---

## Sub-Flows (Reusable Components)

Sub-flows allow you to create reusable flow components that can be called like functions.

### Defining a Sub-Flow

```typescript
interface SubFlowDefinition {
  id: string;
  name: string;
  description?: string;
  
  // Input parameters
  inputs: SubFlowParameter[];
  
  // Output values
  outputs: SubFlowParameter[];
  
  // The actual flow
  flow: Flow;
  
  // Metadata
  metadata: {
    version: string;
    tags?: string[];
    category?: string;
  };
}

// Example: Image resize sub-flow
const imageResizeSubFlow: SubFlowDefinition = {
  id: 'image-resize',
  name: 'Image Resize',
  description: 'Resize an image to specified dimensions',
  
  inputs: [
    { name: 'image', type: 'file', required: true },
    { name: 'width', type: 'number', required: true },
    { name: 'height', type: 'number', required: true },
    { name: 'quality', type: 'number', required: false, defaultValue: 80 },
  ],
  
  outputs: [
    { name: 'resizedImage', type: 'file' },
    { name: 'metadata', type: 'object' },
  ],
  
  flow: {
    // ... flow definition
  },
  
  metadata: {
    version: '1.0.0',
    tags: ['image', 'transform'],
    category: 'media',
  },
};
```

### Calling a Sub-Flow

```typescript
// In a flow node
{
  type: 'subflow',
  pluginId: 'call-subflow',
  config: {
    subFlowId: 'image-resize',
    inputs: {
      image: '{{ uploadedFile }}',
      width: 800,
      height: 600,
      quality: 90,
    },
    outputMapping: {
      resizedImage: 'processedImage',
      metadata: 'imageMetadata',
    },
  }
}
```

### Sub-Flow Execution

```typescript
class SubFlowExecutor {
  async execute(
    subFlow: SubFlowDefinition,
    inputs: Record<string, any>,
    context: ExecutionContext
  ): Promise<Record<string, any>> {
    // Create new scope for sub-flow
    context.scopes.push(`subflow:${subFlow.id}`);
    
    // Map inputs to sub-flow variables
    for (const param of subFlow.inputs) {
      const value = inputs[param.name] ?? param.defaultValue;
      if (param.required && value === undefined) {
        throw new Error(`Required parameter ${param.name} not provided`);
      }
      context.variables.set(param.name, value, param.type);
    }
    
    // Execute sub-flow
    const flowExecutor = new FlowExecutor(context);
    await flowExecutor.execute(subFlow.flow);
    
    // Extract outputs
    const outputs: Record<string, any> = {};
    for (const param of subFlow.outputs) {
      outputs[param.name] = context.variables.get(param.name);
    }
    
    // Pop scope
    context.scopes.pop();
    
    return outputs;
  }
}
```

---

## Flow Versioning & Immutable Executions

**Every execution uses an immutable snapshot of the flow definition** at the time it started. Changes to the flow don't affect running executions.

### Core Principles

1. **Automatic Versioning** - Every save creates a new version
2. **Immutable Executions** - Running flow uses captured definition snapshot
3. **Version Tracking** - Each execution records which version was used
4. **Version Selection** - Rerun with any previous version
5. **Version Comparison** - Diff between versions for debugging

### Flow Version

```typescript
interface FlowVersion {
  // Version identity
  versionId: string;  // UUID
  flowId: string;     // Parent flow ID
  version: number;    // Sequential version number (1, 2, 3...)
  
  // Complete flow definition at this version
  definition: Flow;   // Full flow structure
  
  // Version metadata
  createdAt: Date;
  createdBy: string;  // User who saved this version
  
  // Version description
  changelog?: string;  // What changed in this version
  tags?: string[];     // e.g., ['production', 'stable', 'v2.0']
  
  // Automatic change detection
  changes: {
    nodesAdded: string[];
    nodesRemoved: string[];
    nodesModified: Array<{
      nodeId: string;
      changes: string[];  // ['config.url changed', 'label changed']
    }>;
    edgesAdded: string[];
    edgesRemoved: string[];
    variablesChanged: boolean;
    subFlowsChanged: boolean;
  };
  
  // Version status
  status: 'draft' | 'active' | 'archived';
  
  // Deployment info (if tagged for production)
  deployedAt?: Date;
  deployedBy?: string;
  
  // Statistics
  stats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    avgExecutionTime: number;
  };
}
```

### Version Manager

```typescript
class FlowVersionManager {
  private versions = new Map<string, FlowVersion[]>();
  private storage: VersionStorage;
  
  /**
   * Create new version when flow is saved
   */
  async createVersion(
    flowId: string,
    definition: Flow,
    metadata: {
      createdBy: string;
      changelog?: string;
      tags?: string[];
    }
  ): Promise<FlowVersion> {
    // Get previous version for comparison
    const previousVersion = await this.getLatestVersion(flowId);
    
    // Calculate changes
    const changes = previousVersion
      ? this.detectChanges(previousVersion.definition, definition)
      : this.getInitialChanges(definition);
    
    // Create new version
    const version: FlowVersion = {
      versionId: nanoid(),
      flowId,
      version: previousVersion ? previousVersion.version + 1 : 1,
      definition: structuredClone(definition),  // Deep clone
      createdAt: new Date(),
      createdBy: metadata.createdBy,
      changelog: metadata.changelog,
      tags: metadata.tags || [],
      changes,
      status: 'active',
      stats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        avgExecutionTime: 0,
      },
    };
    
    // Save to storage
    await this.storage.saveVersion(version);
    
    // Update in-memory cache
    if (!this.versions.has(flowId)) {
      this.versions.set(flowId, []);
    }
    this.versions.get(flowId)!.push(version);
    
    return version;
  }
  
  /**
   * Get specific version
   */
  async getVersion(versionId: string): Promise<FlowVersion | null> {
    return await this.storage.loadVersion(versionId);
  }
  
  /**
   * Get latest version of a flow
   */
  async getLatestVersion(flowId: string): Promise<FlowVersion | null> {
    const versions = await this.getVersionHistory(flowId);
    return versions[0] || null;  // Most recent first
  }
  
  /**
   * Get version by number
   */
  async getVersionByNumber(
    flowId: string,
    versionNumber: number
  ): Promise<FlowVersion | null> {
    const versions = await this.getVersionHistory(flowId);
    return versions.find(v => v.version === versionNumber) || null;
  }
  
  /**
   * Get all versions of a flow
   */
  async getVersionHistory(flowId: string): Promise<FlowVersion[]> {
    return await this.storage.loadVersionHistory(flowId);
  }
  
  /**
   * Detect changes between versions
   */
  private detectChanges(oldDef: Flow, newDef: Flow): FlowVersion['changes'] {
    const oldNodeIds = new Set(oldDef.nodes.map(n => n.id));
    const newNodeIds = new Set(newDef.nodes.map(n => n.id));
    
    const nodesAdded = newDef.nodes
      .filter(n => !oldNodeIds.has(n.id))
      .map(n => n.id);
    
    const nodesRemoved = oldDef.nodes
      .filter(n => !newNodeIds.has(n.id))
      .map(n => n.id);
    
    const nodesModified: FlowVersion['changes']['nodesModified'] = [];
    
    for (const newNode of newDef.nodes) {
      const oldNode = oldDef.nodes.find(n => n.id === newNode.id);
      if (oldNode) {
        const nodeChanges = this.detectNodeChanges(oldNode, newNode);
        if (nodeChanges.length > 0) {
          nodesModified.push({ nodeId: newNode.id, changes: nodeChanges });
        }
      }
    }
    
    // Similar for edges
    const oldEdgeIds = new Set(oldDef.edges.map(e => e.id));
    const newEdgeIds = new Set(newDef.edges.map(e => e.id));
    
    const edgesAdded = [...newEdgeIds].filter(id => !oldEdgeIds.has(id));
    const edgesRemoved = [...oldEdgeIds].filter(id => !newEdgeIds.has(id));
    
    return {
      nodesAdded,
      nodesRemoved,
      nodesModified,
      edgesAdded,
      edgesRemoved,
      variablesChanged: JSON.stringify(oldDef.variables) !== JSON.stringify(newDef.variables),
      subFlowsChanged: JSON.stringify(oldDef.subFlows) !== JSON.stringify(newDef.subFlows),
    };
  }
  
  private detectNodeChanges(oldNode: FlowNode, newNode: FlowNode): string[] {
    const changes: string[] = [];
    
    if (oldNode.label !== newNode.label) {
      changes.push(`label changed: "${oldNode.label}" → "${newNode.label}"`);
    }
    
    if (JSON.stringify(oldNode.config) !== JSON.stringify(newNode.config)) {
      changes.push('config changed');
    }
    
    if (oldNode.position.x !== newNode.position.x || oldNode.position.y !== newNode.position.y) {
      changes.push('position changed');
    }
    
    return changes;
  }
}
```

### Execution with Version Capture

```typescript
interface ExecutionRecord {
  executionId: string;
  flowId: string;
  
  // CRITICAL: Version used for this execution
  versionId: string;
  version: number;
  
  // Snapshot of flow definition (immutable)
  flowDefinitionSnapshot: Flow;
  
  status: 'running' | 'paused' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  
  triggeredBy: string;  // User/event that started it
  triggerData?: any;
  
  resumedFrom?: string;  // Snapshot ID if resumed
  
  metadata: {
    totalNodes: number;
    executedNodes: number;
    failedNodes: number;
    skippedNodes: number;
  };
}

class FlowExecutor {
  constructor(
    private flowId: string,
    private versionManager: FlowVersionManager,
    private snapshotManager: SnapshotManager
  ) {}
  
  async start(options?: { versionId?: string }): Promise<string> {
    // Get version to execute
    let version: FlowVersion;
    
    if (options?.versionId) {
      // Use specific version (for reruns)
      version = await this.versionManager.getVersion(options.versionId);
      if (!version) {
        throw new Error(`Version ${options.versionId} not found`);
      }
    } else {
      // Use latest version (normal execution)
      version = await this.versionManager.getLatestVersion(this.flowId);
      if (!version) {
        throw new Error(`No versions found for flow ${this.flowId}`);
      }
    }
    
    // Create execution record
    const executionId = nanoid();
    const execution: ExecutionRecord = {
      executionId,
      flowId: this.flowId,
      versionId: version.versionId,
      version: version.version,
      flowDefinitionSnapshot: structuredClone(version.definition),  // Immutable copy
      status: 'running',
      startTime: new Date(),
    };
    
    // Save execution record
    await this.storage.saveExecution(execution);
    
    // Execute using the captured definition
    await this.executeFlow(execution.flowDefinitionSnapshot, executionId);
    
    return executionId;
  }
}
```

### Rerun with Version Selection

```typescript
interface RerunOptions {
  fromSnapshotId: string;
  
  // Version selection for rerun
  versionSelection: {
    mode: 'original' | 'latest' | 'specific';
    
    // For 'specific' mode
    versionId?: string;
    
    // Show changes before rerun
    showDiff?: boolean;
  };
  
  stateModifications?: {
    variables?: Record<string, any>;
    inputs?: Record<string, any>;
  };
  
  mode: 'resume' | 'rerun' | 'debug';
}

class FlowRerunExecutor {
  async rerun(options: RerunOptions): Promise<string> {
    // Load original execution
    const originalExecution = await this.getExecutionFromSnapshot(
      options.fromSnapshotId
    );
    
    // Determine which version to use
    let flowDefinition: Flow;
    let versionId: string;
    
    switch (options.versionSelection.mode) {
      case 'original':
        // Use the same version as original execution
        flowDefinition = originalExecution.flowDefinitionSnapshot;
        versionId = originalExecution.versionId;
        break;
      
      case 'latest':
        // Use the latest version
        const latestVersion = await this.versionManager.getLatestVersion(
          originalExecution.flowId
        );
        flowDefinition = latestVersion.definition;
        versionId = latestVersion.versionId;
        break;
      
      case 'specific':
        // Use specific version
        if (!options.versionSelection.versionId) {
          throw new Error('versionId required for specific mode');
        }
        const specificVersion = await this.versionManager.getVersion(
          options.versionSelection.versionId
        );
        flowDefinition = specificVersion.definition;
        versionId = specificVersion.versionId;
        break;
    }
    
    // Show diff if requested
    if (options.versionSelection.showDiff && 
        versionId !== originalExecution.versionId) {
      const diff = await this.compareVersions(
        originalExecution.versionId,
        versionId
      );
      console.log('Flow changes detected:', diff);
    }
    
    // Resume with selected version
    return await this.resumeWithVersion(
      options.fromSnapshotId,
      flowDefinition,
      versionId,
      options
    );
  }
  
  async compareVersions(
    versionId1: string,
    versionId2: string
  ): Promise<VersionDiff> {
    const v1 = await this.versionManager.getVersion(versionId1);
    const v2 = await this.versionManager.getVersion(versionId2);
    
    return this.versionManager.detectChanges(v1.definition, v2.definition);
  }
}
```

### Version Management UI

```typescript
// Version selector in rerun dialog
interface RerunDialogState {
  snapshot: ExecutionSnapshot;
  originalVersion: FlowVersion;
  
  versionOptions: Array<{
    value: string;
    label: string;
    description: string;
  }>;
  
  selectedVersion: string;
  versionDiff?: VersionDiff;
}

// UI Component
function RerunDialog({ executionId, snapshotId }: Props) {
  const [state, setState] = useState<RerunDialogState>();
  
  return (
    <Dialog>
      <h2>Rerun Flow Execution</h2>
      
      <Section>
        <Label>Original Execution</Label>
        <Info>
          Execution: {executionId}
          <br />
          Version: v{state.originalVersion.version}
          <br />
          Created: {state.originalVersion.createdAt}
        </Info>
      </Section>
      
      <Section>
        <Label>Select Version to Use</Label>
        <Select onChange={(v) => loadVersionDiff(v)}>
          <option value="original">
            Use Original Version (v{state.originalVersion.version})
          </option>
          <option value="latest">
            Use Latest Version (v{latestVersion.version}) ⭐
          </option>
          {state.versionOptions.map(v => (
            <option key={v.value} value={v.value}>
              {v.label} - {v.description}
            </option>
          ))}
        </Select>
      </Section>
      
      {state.versionDiff && (
        <Section>
          <Label>Changes Since Original</Label>
          <DiffView>
            {state.versionDiff.nodesAdded.length > 0 && (
              <div>+ {state.versionDiff.nodesAdded.length} nodes added</div>
            )}
            {state.versionDiff.nodesRemoved.length > 0 && (
              <div>- {state.versionDiff.nodesRemoved.length} nodes removed</div>
            )}
            {state.versionDiff.nodesModified.map(mod => (
              <div key={mod.nodeId}>
                ✎ {mod.nodeId}: {mod.changes.join(', ')}
              </div>
            ))}
          </DiffView>
        </Section>
      )}
      
      <Button onClick={handleRerun}>Rerun with Selected Version</Button>
    </Dialog>
  );
}
```

### Version Storage Schema

```typescript
// flow_versions table
interface FlowVersionRecord {
  versionId: string;  // PK
  flowId: string;     // FK to flows table
  version: number;    // Sequential version number
  
  // Flow definition stored as JSON
  definitionData: Buffer | string;  // Compressed Flow object
  
  createdAt: Date;
  createdBy: string;
  
  changelog?: string;
  tags: string[];  // JSON array
  
  status: 'draft' | 'active' | 'archived';
  
  // Change summary (for quick display)
  changeSummary: {
    nodesAdded: number;
    nodesRemoved: number;
    nodesModified: number;
    edgesChanged: number;
  };
  
  // Deployment tracking
  deployedAt?: Date;
  deployedBy?: string;
  
  // Indexes
  indexes: {
    flowId_version: [flowId, version];
    flowId_createdAt: [flowId, createdAt];
    tags: tags;  // For filtering by tag
  };
}

// Link executions to versions
interface ExecutionRecord {
  // ... existing fields
  versionId: string;  // FK to flow_versions
  version: number;    // Denormalized for quick access
}
```

### Version Tagging & Deployment

```typescript
// Tag versions for organization
await versionManager.tagVersion(versionId, 'production');
await versionManager.tagVersion(versionId, 'stable-v2.0');

// Deploy specific version
await versionManager.deployVersion(versionId, {
  deployedBy: 'user@example.com',
  environment: 'production',
});

// Rollback to previous version
const previousVersion = await versionManager.getVersionByTag(
  flowId,
  'production'
);
await versionManager.deployVersion(previousVersion.versionId);

// Get production version
const productionVersion = await versionManager.getVersionByTag(
  flowId,
  'production'
);

// Always execute with production tag
await executor.start({ versionId: productionVersion.versionId });
```

### Automatic Versioning Behavior

```typescript
// Every save creates a new version
function handleFlowSave(flow: Flow, userId: string) {
  // Create new version
  const version = await versionManager.createVersion(flow.id, flow, {
    createdBy: userId,
    changelog: 'Auto-save',  // Or from user input
  });
  
  // Show version created notification
  notify(`Flow saved as version ${version.version}`);
}

// Version comparison in UI
function showVersionHistory(flowId: string) {
  const versions = await versionManager.getVersionHistory(flowId);
  
  return (
    <Timeline>
      {versions.map((v, i) => (
        <TimelineItem key={v.versionId}>
          <Badge>v{v.version}</Badge>
          <Time>{v.createdAt}</Time>
          <User>{v.createdBy}</User>
          <Tags>{v.tags.join(', ')}</Tags>
          
          <Changes>
            {v.changes.nodesAdded.length > 0 && `+${v.changes.nodesAdded.length} nodes `}
            {v.changes.nodesRemoved.length > 0 && `-${v.changes.nodesRemoved.length} nodes `}
            {v.changes.nodesModified.length > 0 && `✎${v.changes.nodesModified.length} modified`}
          </Changes>
          
          <Actions>
            <Button onClick={() => viewVersion(v.versionId)}>View</Button>
            <Button onClick={() => compareWith(v.versionId, versions[i+1]?.versionId)}>
              Compare
            </Button>
            <Button onClick={() => rerunWithVersion(v.versionId)}>
              Rerun with this version
            </Button>
          </Actions>
        </TimelineItem>
      ))}
    </Timeline>
  );
}
```

---

## State Persistence & Execution Snapshots

**Every node execution creates a checkpoint** that can be used for debugging, resuming failed flows, and time-travel execution.

### Core Principles

1. **Automatic Checkpointing** - State saved after every node execution
2. **Resume from Anywhere** - Restart execution from any node in the tree
3. **State Modification** - Alter variables/inputs before resuming
4. **Full Context Capture** - Variables, inputs, outputs, errors, timestamps
5. **Uncontrolled Failure Recovery** - System crashes are recoverable

### Execution Snapshot

```typescript
interface ExecutionSnapshot {
  // Snapshot identity
  snapshotId: string;
  executionId: string;
  flowId: string;
  nodeId: string;
  nodeName: string;
  
  // Timing
  timestamp: Date;
  executionTime: number;  // milliseconds
  
  // Complete state at this point
  state: {
    // All variables and their values
    variables: Record<string, any>;
    
    // Scope stack state
    scopes: Array<{
      name: string;
      level: number;
      variables: Record<string, any>;
    }>;
    
    // Node inputs that were used
    inputs: Record<string, any>;
    
    // Node outputs that were produced
    outputs: Record<string, any>;
    
    // Error information (if any)
    error?: {
      type: string;
      code?: string | number;
      message: string;
      data?: any;
      stack?: string;
    };
    
    // Node execution status
    nodeStatus: 'success' | 'error' | 'warning' | 'skipped';
  };
  
  // Execution path (how we got here)
  executionPath: Array<{
    nodeId: string;
    nodeName: string;
    timestamp: Date;
    status: 'success' | 'error';
  }>;
  
  // Metadata
  metadata: {
    nodeType: NodeType;
    pluginId: string;
    attemptNumber: number;  // For retries
    parentSnapshotId?: string;  // Previous snapshot
    childSnapshotIds?: string[];  // Next snapshots (for parallel)
  };
  
  // Storage optimization
  compressed: boolean;  // Large outputs can be compressed
  storedInArchive: boolean;  // Old snapshots moved to cold storage
}
```

### Snapshot Manager

```typescript
// Located in: src/storage/execution/snapshot-manager.ts
class SnapshotManager {
  private snapshots = new Map<string, ExecutionSnapshot>();
  private storage: SnapshotStorage;  // Database/file storage
  
  /**
   * Create snapshot after node execution
   */
  async createSnapshot(
    context: ExecutionContext,
    node: FlowNode,
    result: {
      outputs?: any;
      error?: Error;
      status: 'success' | 'error';
    }
  ): Promise<ExecutionSnapshot> {
    const snapshot: ExecutionSnapshot = {
      snapshotId: nanoid(),
      executionId: context.executionId,
      flowId: context.flowId,
      nodeId: node.id,
      nodeName: node.label,
      timestamp: new Date(),
      executionTime: Date.now() - context.state.nodeStartTime,
      
      state: {
        // Deep clone all variables
        variables: this.cloneVariables(context.variables),
        
        // Clone scope stack
        scopes: this.cloneScopeStack(context.scopes),
        
        // Clone inputs/outputs
        inputs: structuredClone(context.inputs),
        outputs: result.outputs ? structuredClone(result.outputs) : {},
        
        // Error info
        error: result.error ? this.serializeError(result.error) : undefined,
        
        nodeStatus: result.status,
      },
      
      executionPath: [...context.executionPath],
      
      metadata: {
        nodeType: node.type,
        pluginId: node.pluginId,
        attemptNumber: context.currentAttempt || 1,
        parentSnapshotId: context.lastSnapshotId,
      },
      
      compressed: false,
      storedInArchive: false,
    };
    
    // Store snapshot
    await this.storage.save(snapshot);
    
    // Keep in memory for quick access
    this.snapshots.set(snapshot.snapshotId, snapshot);
    
    // Emit event
    context.events.emit('snapshot:created', snapshot);
    
    return snapshot;
  }
  
  /**
   * Get snapshot by ID
   */
  async getSnapshot(snapshotId: string): Promise<ExecutionSnapshot | null> {
    // Check memory first
    if (this.snapshots.has(snapshotId)) {
      return this.snapshots.get(snapshotId)!;
    }
    
    // Load from storage
    return await this.storage.load(snapshotId);
  }
  
  /**
   * Get all snapshots for an execution
   */
  async getExecutionSnapshots(executionId: string): Promise<ExecutionSnapshot[]> {
    return await this.storage.query({ executionId });
  }
  
  /**
   * Get snapshot at specific node in execution
   */
  async getSnapshotAtNode(
    executionId: string,
    nodeId: string
  ): Promise<ExecutionSnapshot | null> {
    const snapshots = await this.getExecutionSnapshots(executionId);
    return snapshots.find(s => s.nodeId === nodeId) || null;
  }
}
```

### Resume & Rerun System

```typescript
interface RerunOptions {
  // Where to start from
  fromSnapshotId: string;
  
  // Or specify node ID (will find latest snapshot)
  fromNodeId?: string;
  
  // Modified state before resuming
  stateModifications?: {
    variables?: Record<string, any>;  // Override variables
    inputs?: Record<string, any>;     // Override node inputs
    skipNodes?: string[];              // Skip these nodes
    stopAtNode?: string;               // Stop execution at this node
  };
  
  // Execution mode
  mode: 'resume' | 'rerun' | 'debug';
  
  // For debug mode
  debugOptions?: {
    breakpoints?: string[];  // Node IDs to pause at
    stepMode?: boolean;      // Execute one node at a time
    logLevel?: 'verbose' | 'normal' | 'minimal';
  };
}

// Located in: src/storage/execution/rerun-executor.ts
class FlowRerunExecutor extends FlowExecutor {
  constructor(
    context: ExecutionContext,
    private snapshotManager: SnapshotManager,
    private rerunOptions: RerunOptions
  ) {
    super(context);
  }
  
  async resume(flow: Flow): Promise<void> {
    // Load snapshot
    const snapshot = await this.snapshotManager.getSnapshot(
      this.rerunOptions.fromSnapshotId
    );
    
    if (!snapshot) {
      throw new Error(`Snapshot ${this.rerunOptions.fromSnapshotId} not found`);
    }
    
    // Restore execution context from snapshot
    await this.restoreContext(snapshot);
    
    // Apply state modifications
    if (this.rerunOptions.stateModifications) {
      this.applyStateModifications(this.rerunOptions.stateModifications);
    }
    
    // Find the node to resume from
    const resumeNode = flow.nodes.find(n => n.id === snapshot.nodeId);
    
    if (!resumeNode) {
      throw new Error(`Node ${snapshot.nodeId} not found in flow`);
    }
    
    // Resume execution from this node
    this.context.state.status = 'running';
    this.context.state.resumedFrom = snapshot.snapshotId;
    
    await this.executeFromNode(resumeNode, flow);
  }
  
  private async restoreContext(snapshot: ExecutionSnapshot): Promise<void> {
    // Restore variables
    this.context.variables.clear();
    for (const [name, value] of Object.entries(snapshot.state.variables)) {
      this.context.variables.set(name, value);
    }
    
    // Restore scope stack
    this.context.scopes.clear();
    for (const scope of snapshot.state.scopes) {
      this.context.scopes.push(scope.name);
      for (const [name, value] of Object.entries(scope.variables)) {
        this.context.scopes.current().variables.set(name, value);
      }
    }
    
    // Restore execution path
    this.context.executionPath = [...snapshot.executionPath];
    
    // Set last snapshot
    this.context.lastSnapshotId = snapshot.snapshotId;
  }
  
  private applyStateModifications(mods: RerunOptions['stateModifications']): void {
    // Override variables
    if (mods?.variables) {
      for (const [name, value] of Object.entries(mods.variables)) {
        this.context.variables.set(name, value);
      }
    }
    
    // Override inputs
    if (mods?.inputs) {
      this.context.inputs = { ...this.context.inputs, ...mods.inputs };
    }
    
    // Set skip/stop nodes
    if (mods?.skipNodes) {
      this.context.skipNodes = new Set(mods.skipNodes);
    }
    
    if (mods?.stopAtNode) {
      this.context.stopAtNode = mods.stopAtNode;
    }
  }
  
  private async executeFromNode(node: FlowNode, flow: Flow): Promise<void> {
    // Check if should skip
    if (this.context.skipNodes?.has(node.id)) {
      this.context.events.emit('node:skipped', node);
      // Continue to next nodes
      const nextEdges = flow.edges.filter(e => e.source === node.id);
      for (const edge of nextEdges) {
        const nextNode = flow.nodes.find(n => n.id === edge.target);
        if (nextNode) await this.executeFromNode(nextNode, flow);
      }
      return;
    }
    
    // Check if should stop
    if (this.context.stopAtNode === node.id) {
      this.context.state.status = 'paused';
      this.context.events.emit('execution:paused', node);
      return;
    }
    
    // Normal execution with snapshot
    await this.executeNodeWithSnapshot(node, flow);
  }
  
  private async executeNodeWithSnapshot(
    node: FlowNode,
    flow: Flow
  ): Promise<void> {
    try {
      // Execute node
      const result = await this.executeNode(node, flow);
      
      // Create snapshot after successful execution
      await this.snapshotManager.createSnapshot(this.context, node, {
        outputs: result,
        status: 'success',
      });
    } catch (error) {
      // Create snapshot with error
      await this.snapshotManager.createSnapshot(this.context, node, {
        error: error as Error,
        status: 'error',
      });
      
      throw error;
    }
  }
}
```

### Rerun UI Patterns

#### 1. Resume from Failure

```typescript
// Flow failed at node "validate-file"
const lastExecution = await getExecutionHistory(flowId, { limit: 1 });
const failedSnapshot = lastExecution.snapshots.find(s => s.state.error);

// Resume from failed node with modified config
await rerunFlow(flowId, {
  fromSnapshotId: failedSnapshot.snapshotId,
  stateModifications: {
    variables: {
      // Fix the issue
      maxFileSize: 50 * 1024 * 1024,  // Increase to 50MB
    },
  },
  mode: 'resume',
});
```

#### 2. Time-Travel Debugging

```typescript
// Go back to specific node and replay with different data
const snapshot = await getSnapshotAtNode(executionId, 'transform-data');

await rerunFlow(flowId, {
  fromSnapshotId: snapshot.snapshotId,
  stateModifications: {
    variables: {
      inputData: modifiedTestData,  // Try with different input
    },
  },
  debugOptions: {
    breakpoints: ['http-request', 'process-response'],
    logLevel: 'verbose',
  },
  mode: 'debug',
});
```

#### 3. Partial Rerun

```typescript
// Rerun only a specific section of the flow
await rerunFlow(flowId, {
  fromNodeId: 'compress-image',
  stateModifications: {
    skipNodes: ['upload-to-s3'],  // Skip already completed
    stopAtNode: 'send-notification',  // Stop before notification
  },
  mode: 'rerun',
});
```

### Snapshot Storage Schema

```typescript
// Database tables for snapshot storage

// executions table
interface ExecutionRecord {
  executionId: string;  // PK
  flowId: string;
  flowVersion: string;
  
  status: 'running' | 'paused' | 'completed' | 'failed';
  
  startTime: Date;
  endTime?: Date;
  duration?: number;
  
  triggeredBy: string;  // User/event that started it
  triggerData?: any;
  
  resumedFrom?: string;  // Snapshot ID if resumed
  
  metadata: {
    totalNodes: number;
    executedNodes: number;
    failedNodes: number;
    skippedNodes: number;
  };
}

// snapshots table
interface SnapshotRecord {
  snapshotId: string;  // PK
  executionId: string;  // FK to executions
  nodeId: string;
  nodeName: string;
  
  timestamp: Date;
  executionTime: number;
  
  // State stored as JSON (or compressed binary)
  stateData: Buffer | string;  // Compressed snapshot.state
  
  status: 'success' | 'error' | 'warning' | 'skipped';
  errorType?: string;
  errorCode?: string;
  
  // Indexes for fast queries
  indexes: {
    executionId_nodeId: [executionId, nodeId];
    executionId_timestamp: [executionId, timestamp];
  };
  
  // Archive flag
  archived: boolean;
  archivedAt?: Date;
}

// execution_paths table (for visualization)
interface ExecutionPathRecord {
  executionId: string;
  sequence: number;
  fromNodeId: string;
  toNodeId: string;
  edgeType: 'default' | 'conditional' | 'error' | 'parallel';
  timestamp: Date;
}
```

### Snapshot Visualization

In the UI, show execution history with snapshots:

```
Execution #1234 - Failed
├─ [✓] Start Trigger (10ms) 
├─ [✓] Validate File (25ms)
│   └─ Snapshot: variables: { file: {...}, maxSize: 10MB }
├─ [✓] Compress Image (1.2s)
│   └─ Snapshot: variables: { compressed: {...}, ratio: 0.65 }
├─ [✗] Upload to S3 (5s) ← FAILED HERE
│   └─ Snapshot: error: NetworkError
│       variables: { compressed: {...} }
│       
│   [Resume from here] [Modify state] [View details]
│
└─ [⊘] Send Notification (not executed)

Actions:
- Resume from Upload to S3
- Rerun from Compress Image  
- Modify variables and retry
- View full execution trace
```

---

## Execution Engine

### Execution Context

```typescript
interface ExecutionContext {
  flowId: string;
  executionId: string;
  
  // Variable management
  variables: VariableManager;
  scopes: ScopeStack;
  
  // Node inputs/outputs
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  
  // State
  state: ExecutionState;
  
  // Events
  events: EventEmitter;
  
  // Utilities
  logger: Logger;
  errorHandler: ErrorHandler;
}

interface ExecutionState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  currentNode?: string;
  startTime?: Date;
  endTime?: Date;
  error?: Error;
}
```

### Flow Executor

```typescript
class FlowExecutor {
  constructor(private context: ExecutionContext) {}
  
  async execute(flow: Flow): Promise<void> {
    try {
      this.context.state.status = 'running';
      this.context.state.startTime = new Date();
      
      // Find trigger nodes
      const triggers = flow.nodes.filter(n => n.type === 'trigger');
      
      // Execute from each trigger
      for (const trigger of triggers) {
        await this.executeNode(trigger, flow);
      }
      
      this.context.state.status = 'completed';
      this.context.state.endTime = new Date();
    } catch (error) {
      this.context.state.status = 'failed';
      this.context.state.error = error as Error;
      throw error;
    }
  }
  
  private async executeNode(node: FlowNode, flow: Flow): Promise<void> {
    this.context.state.currentNode = node.id;
    this.context.events.emit('node:start', node);
    
    try {
      // Get plugin
      const plugin = pluginRegistry.get(node.pluginId);
      
      // Prepare inputs
      this.prepareInputs(node);
      
      // Execute plugin
      const outputs = await plugin.execute(this.context, node.config);
      
      // Store outputs
      node.data.outputs = outputs;
      this.context.outputs = outputs;
      
      this.context.events.emit('node:success', node, outputs);
      
      // Find next nodes
      const nextEdges = flow.edges.filter(e => e.source === node.id);
      
      // Handle different node types
      if (node.type === 'condition') {
        await this.executeCondition(node, nextEdges, flow);
      } else if (node.type === 'loop') {
        await this.executeLoop(node, nextEdges, flow);
      } else {
        // Regular flow
        for (const edge of nextEdges) {
          const nextNode = flow.nodes.find(n => n.id === edge.target);
          if (nextNode) {
            await this.executeNode(nextNode, flow);
          }
        }
      }
    } catch (error) {
      this.context.events.emit('node:error', node, error);
      throw error;
    }
  }
  
  private async executeCondition(
    node: FlowNode,
    edges: FlowEdge[],
    flow: Flow
  ): Promise<void> {
    // Evaluate condition
    const result = this.context.outputs;
    
    // Find matching edge
    const nextEdge = edges.find(e => {
      if (e.condition) {
        return this.evaluateCondition(e.condition);
      }
      return false;
    });
    
    if (nextEdge) {
      const nextNode = flow.nodes.find(n => n.id === nextEdge.target);
      if (nextNode) {
        await this.executeNode(nextNode, flow);
      }
    }
  }
  
  private async executeLoop(
    node: FlowNode,
    edges: FlowEdge[],
    flow: Flow
  ): Promise<void> {
    const { pluginId, config } = node;
    
    if (pluginId === 'for-loop') {
      const { start, end, step = 1, indexVariable } = config;
      for (let i = start; i < end; i += step) {
        this.context.variables.set(indexVariable, i);
        await this.executeLoopBody(edges, flow);
      }
    } else if (pluginId === 'while-loop') {
      const { condition, maxIterations = 1000 } = config;
      let iterations = 0;
      while (this.evaluateExpression(condition) && iterations < maxIterations) {
        await this.executeLoopBody(edges, flow);
        iterations++;
      }
    } else if (pluginId === 'foreach-loop') {
      const { array, itemVariable, indexVariable } = config;
      const items = this.context.variables.get(array);
      for (let i = 0; i < items.length; i++) {
        this.context.variables.set(itemVariable, items[i]);
        if (indexVariable) {
          this.context.variables.set(indexVariable, i);
        }
        await this.executeLoopBody(edges, flow);
      }
    }
  }
  
  private async executeLoopBody(edges: FlowEdge[], flow: Flow): Promise<void> {
    // Create new scope for loop iteration
    this.context.scopes.push('loop-iteration');
    
    // Execute loop body (edges with type 'loop')
    const loopEdges = edges.filter(e => e.type === 'loop');
    for (const edge of loopEdges) {
      const nextNode = flow.nodes.find(n => n.id === edge.target);
      if (nextNode) {
        await this.executeNode(nextNode, flow);
      }
    }
    
    // Pop scope
    this.context.scopes.pop();
  }
  
  private prepareInputs(node: FlowNode): void {
    const inputs: Record<string, any> = {};
    
    // Resolve input expressions
    for (const [key, value] of Object.entries(node.data.inputs)) {
      if (typeof value === 'string' && value.includes('{{')) {
        inputs[key] = this.evaluateExpression(value);
      } else {
        inputs[key] = value;
      }
    }
    
    this.context.inputs = inputs;
  }
  
  private evaluateExpression(expression: string): any {
    const evaluator = new ExpressionEvaluator();
    return evaluator.evaluate(expression, this.context);
  }
  
  private evaluateCondition(condition: EdgeCondition): boolean {
    const result = this.evaluateExpression(condition.expression);
    return Boolean(result);
  }
}
```

---

## React Flow Integration

### Flow Canvas Component

```typescript
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';

export function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );
  
  const nodeTypes = useMemo(
    () => ({
      action: ActionNode,
      condition: ConditionNode,
      loop: LoopNode,
      variable: VariableNode,
      subflow: SubFlowNode,
    }),
    []
  );
  
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
```

### Custom Node Components

```typescript
// Base Node Component
interface CustomNodeProps {
  id: string;
  data: NodeData;
  selected: boolean;
}

export function BaseNode({ id, data, selected }: CustomNodeProps) {
  const { label, state, error } = data;
  
  return (
    <div
      className={cn(
        'px-4 py-2 rounded-lg border-2 bg-white shadow-md',
        selected && 'border-blue-500',
        state === 'running' && 'border-yellow-500',
        state === 'success' && 'border-green-500',
        state === 'error' && 'border-red-500'
      )}
    >
      <Handle type="target" position={Position.Top} />
      
      <div className="flex items-center gap-2">
        <NodeIcon type={data.type} />
        <span className="font-medium">{label}</span>
      </div>
      
      {error && (
        <div className="mt-2 text-xs text-red-600">
          {error.message}
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

// Action Node
export function ActionNode(props: CustomNodeProps) {
  const { data } = props;
  
  return (
    <BaseNode {...props}>
      <div className="mt-2 text-xs text-gray-600">
        {data.pluginName}
      </div>
    </BaseNode>
  );
}

// Condition Node (with multiple handles)
export function ConditionNode(props: CustomNodeProps) {
  return (
    <BaseNode {...props}>
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: '30%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: '70%' }}
      />
    </BaseNode>
  );
}
```

### Node Palette

```typescript
export function NodePalette() {
  const plugins = usePluginRegistry();
  const [search, setSearch] = useState('');
  
  const filteredPlugins = useMemo(
    () => plugins.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase())
    ),
    [plugins, search]
  );
  
  const onDragStart = (event: DragEvent, plugin: FlowPlugin) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: plugin.nodeType,
      pluginId: plugin.id,
    }));
    event.dataTransfer.effectAllowed = 'move';
  };
  
  return (
    <div className="w-64 border-r bg-gray-50 p-4">
      <Input
        placeholder="Search nodes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      
      <div className="mt-4 space-y-2">
        {Object.entries(groupBy(filteredPlugins, 'category')).map(
          ([category, plugins]) => (
            <div key={category}>
              <h3 className="font-medium text-sm text-gray-700 mb-2">
                {category}
              </h3>
              {plugins.map((plugin) => (
                <div
                  key={plugin.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, plugin)}
                  className="p-2 bg-white rounded border cursor-move hover:shadow-md"
                >
                  <div className="flex items-center gap-2">
                    {plugin.icon && <span>{plugin.icon}</span>}
                    <span className="text-sm">{plugin.name}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
```

### Configuration Panel

```typescript
export function ConfigPanel() {
  const selectedNode = useFlowStore((state) => state.selectedNode);
  const updateNode = useFlowStore((state) => state.updateNode);
  
  if (!selectedNode) {
    return (
      <div className="w-80 border-l bg-gray-50 p-4">
        <p className="text-sm text-gray-500">
          Select a node to configure
        </p>
      </div>
    );
  }
  
  const plugin = pluginRegistry.get(selectedNode.pluginId);
  const ConfigComponent = plugin.ConfigComponent;
  
  return (
    <div className="w-80 border-l bg-gray-50 p-4 overflow-y-auto">
      <h2 className="font-semibold text-lg mb-4">
        {selectedNode.label}
      </h2>
      
      {ConfigComponent ? (
        <ConfigComponent
          config={selectedNode.config}
          onChange={(config) => updateNode(selectedNode.id, { config })}
        />
      ) : (
        <JsonEditor
          value={selectedNode.config}
          onChange={(config) => updateNode(selectedNode.id, { config })}
        />
      )}
      
      <div className="mt-6 border-t pt-4">
        <h3 className="font-medium mb-2">Node ID</h3>
        <code className="text-xs bg-gray-200 p-2 rounded block">
          {selectedNode.id}
        </code>
      </div>
    </div>
  );
}
```

---

## File Upload Flow Example

Here's a complete example flow for handling file uploads with validation, transformation, and storage.

### Flow Definition

```typescript
const fileUploadFlow: Flow = {
  id: 'file-upload-flow',
  name: 'File Upload with Validation',
  version: '1.0.0',
  
  nodes: [
    // 1. Trigger: File upload event
    {
      id: 'trigger-1',
      type: 'trigger',
      pluginId: 'event-trigger',
      label: 'File Uploaded',
      position: { x: 250, y: 0 },
      config: {
        eventName: 'file:uploaded',
      },
      data: {
        inputs: {},
        outputs: {
          file: 'File',
          metadata: 'object',
        },
      },
    },
    
    // 2. Validate file
    {
      id: 'validate-1',
      type: 'action',
      pluginId: 'file-validation',
      label: 'Validate File',
      position: { x: 250, y: 100 },
      config: {
        maxSize: 10485760, // 10MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
        validateContent: true,
      },
      data: {
        inputs: {
          file: '{{ file }}',
        },
        outputs: {
          valid: 'boolean',
          errors: 'array',
          metadata: 'object',
        },
      },
    },
    
    // 3. Check if valid
    {
      id: 'condition-1',
      type: 'condition',
      pluginId: 'if-condition',
      label: 'Is Valid?',
      position: { x: 250, y: 200 },
      config: {
        condition: '{{ valid === true }}',
        thenHandle: 'true',
        elseHandle: 'false',
      },
      data: {
        inputs: {
          valid: '{{ valid }}',
        },
        outputs: {},
      },
    },
    
    // 4a. Process image (if valid)
    {
      id: 'subflow-1',
      type: 'subflow',
      pluginId: 'call-subflow',
      label: 'Process Image',
      position: { x: 100, y: 300 },
      config: {
        subFlowId: 'image-processing',
        inputs: {
          image: '{{ file }}',
          width: 800,
          height: 600,
          quality: 90,
        },
        outputMapping: {
          processedImage: 'processedFile',
          thumbnail: 'thumbnailFile',
        },
      },
      data: {
        inputs: {
          image: '{{ file }}',
        },
        outputs: {
          processedImage: 'File',
          thumbnail: 'File',
        },
      },
    },
    
    // 5a. Upload to storage
    {
      id: 'action-1',
      type: 'action',
      pluginId: 'storage-upload',
      label: 'Upload to S3',
      position: { x: 100, y: 400 },
      config: {
        bucket: 'uploads',
        path: '{{ metadata.originalName }}',
        contentType: '{{ metadata.type }}',
      },
      data: {
        inputs: {
          file: '{{ processedFile }}',
          bucket: 'string',
          path: 'string',
        },
        outputs: {
          url: 'string',
          etag: 'string',
        },
      },
    },
    
    // 6a. Save to database
    {
      id: 'action-2',
      type: 'action',
      pluginId: 'database-query',
      label: 'Save Metadata',
      position: { x: 100, y: 500 },
      config: {
        connection: 'main-db',
        query: `
          INSERT INTO uploads (url, etag, original_name, size, type)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `,
        parameters: {
          $1: '{{ url }}',
          $2: '{{ etag }}',
          $3: '{{ metadata.originalName }}',
          $4: '{{ metadata.size }}',
          $5: '{{ metadata.type }}',
        },
      },
      data: {
        inputs: {
          url: '{{ url }}',
          etag: '{{ etag }}',
        },
        outputs: {
          id: 'string',
        },
      },
    },
    
    // 4b. Return error (if invalid)
    {
      id: 'action-3',
      type: 'action',
      pluginId: 'http-response',
      label: 'Return Error',
      position: { x: 400, y: 300 },
      config: {
        status: 400,
        body: {
          error: 'Invalid file',
          details: '{{ errors }}',
        },
      },
      data: {
        inputs: {
          errors: '{{ errors }}',
        },
        outputs: {},
      },
    },
    
    // 7. Success response
    {
      id: 'action-4',
      type: 'action',
      pluginId: 'http-response',
      label: 'Return Success',
      position: { x: 100, y: 600 },
      config: {
        status: 200,
        body: {
          success: true,
          id: '{{ id }}',
          url: '{{ url }}',
        },
      },
      data: {
        inputs: {
          id: '{{ id }}',
          url: '{{ url }}',
        },
        outputs: {},
      },
    },
  ],
  
  edges: [
    {
      id: 'e1',
      source: 'trigger-1',
      target: 'validate-1',
    },
    {
      id: 'e2',
      source: 'validate-1',
      target: 'condition-1',
    },
    {
      id: 'e3-true',
      source: 'condition-1',
      target: 'subflow-1',
      sourceHandle: 'true',
      label: 'Valid',
    },
    {
      id: 'e3-false',
      source: 'condition-1',
      target: 'action-3',
      sourceHandle: 'false',
      label: 'Invalid',
    },
    {
      id: 'e4',
      source: 'subflow-1',
      target: 'action-1',
    },
    {
      id: 'e5',
      source: 'action-1',
      target: 'action-2',
    },
    {
      id: 'e6',
      source: 'action-2',
      target: 'action-4',
    },
  ],
  
  variables: [],
  subFlows: [],
  metadata: {
    createdAt: new Date(),
    updatedAt: new Date(),
    category: 'file-handling',
    tags: ['upload', 'validation', 'storage'],
  },
};
```

### Image Processing Sub-Flow

```typescript
const imageProcessingSubFlow: SubFlowDefinition = {
  id: 'image-processing',
  name: 'Image Processing',
  description: 'Resize and create thumbnail',
  
  inputs: [
    { name: 'image', type: 'file', required: true },
    { name: 'width', type: 'number', required: true },
    { name: 'height', type: 'number', required: true },
    { name: 'quality', type: 'number', required: false, defaultValue: 80 },
  ],
  
  outputs: [
    { name: 'processedImage', type: 'file' },
    { name: 'thumbnail', type: 'file' },
  ],
  
  flow: {
    id: 'image-processing-flow',
    name: 'Image Processing Flow',
    version: '1.0.0',
    nodes: [
      {
        id: 'resize-1',
        type: 'action',
        pluginId: 'image-resize',
        label: 'Resize Main',
        position: { x: 100, y: 0 },
        config: {
          width: '{{ width }}',
          height: '{{ height }}',
          quality: '{{ quality }}',
          fit: 'cover',
        },
        data: {
          inputs: { image: '{{ image }}' },
          outputs: { resizedImage: 'file' },
        },
      },
      {
        id: 'resize-2',
        type: 'action',
        pluginId: 'image-resize',
        label: 'Create Thumbnail',
        position: { x: 100, y: 100 },
        config: {
          width: 200,
          height: 200,
          quality: 70,
          fit: 'cover',
        },
        data: {
          inputs: { image: '{{ image }}' },
          outputs: { resizedImage: 'file' },
        },
      },
      {
        id: 'set-1',
        type: 'variable',
        pluginId: 'set-variable',
        label: 'Set Output',
        position: { x: 100, y: 200 },
        config: {
          variables: {
            processedImage: '{{ resize-1.resizedImage }}',
            thumbnail: '{{ resize-2.resizedImage }}',
          },
        },
        data: {
          inputs: {},
          outputs: {},
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'resize-1', target: 'set-1' },
      { id: 'e2', source: 'resize-2', target: 'set-1' },
    ],
    variables: [],
    subFlows: [],
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  
  metadata: {
    version: '1.0.0',
    tags: ['image', 'transform'],
    category: 'media',
  },
};
```

---

## Implementation Plan

### Phase 1: Core Engine (Week 1-2)

1. **Setup package structure**
   - Initialize `@repo/flow` package
   - Setup TypeScript, Vitest, ESLint
   - Add core dependencies (React Flow, Zod, etc.)

2. **Implement core types**
   - Flow, Node, Edge interfaces
   - Variable types
   - Plugin interface

3. **Build execution engine**
   - ExecutionContext
   - VariableManager
   - ScopeStack
   - ExpressionEvaluator
   - FlowExecutor

4. **Add event system**
   - EventEmitter
   - Execution events
   - Node lifecycle hooks

### Phase 2: Plugin System (Week 3)

1. **Plugin registry**
   - PluginRegistry class
   - Plugin registration
   - Plugin validation

2. **Core plugins**
   - Action plugins (HTTP, File)
   - Trigger plugins (Event, Manual)
   - Condition plugins (If, Switch)
   - Loop plugins (For, While, ForEach)
   - Variable plugins (Set, Get, Transform)

3. **Plugin validation**
   - Schema validation (Zod)
   - Runtime validation
   - Error handling

### Phase 3: React Flow UI (Week 4-5)

1. **Canvas components**
   - FlowCanvas
   - Custom node components
   - Edge components
   - Handles and ports

2. **Panels**
   - NodePalette
   - ConfigPanel
   - VariablePanel
   - ExecutionPanel

3. **State management**
   - Zustand stores
   - Flow state
   - Execution state
   - Variable state

4. **Drag & drop**
   - Node dragging from palette
   - Connection validation
   - Auto-layout

### Phase 4: Sub-Flows (Week 6)

1. **Sub-flow system**
   - SubFlow definition
   - SubFlowExecutor
   - Input/output mapping

2. **Sub-flow UI**
   - Sub-flow editor
   - Input/output configuration
   - Sub-flow library

### Phase 5: Advanced Features (Week 7-8)

1. **Debugger**
   - Breakpoints
   - Step-by-step execution
   - Variable inspection
   - Execution history

2. **Validation**
   - Flow validation
   - Circular dependency detection
   - Type checking

3. **Serialization**
   - Save/load flows
   - JSON schema
   - Import/export

### Phase 6: Integration & Testing (Week 9-10)

1. **Integration with Nestio**
   - File upload flow
   - Storage integration
   - Auth integration

2. **Testing**
   - Unit tests
   - Integration tests
   - E2E tests

3. **Documentation**
   - API documentation
   - User guide
   - Plugin development guide

---

## API Reference

### Core Classes

#### FlowExecutor

```typescript
class FlowExecutor {
  constructor(context: ExecutionContext);
  
  execute(flow: Flow): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
}
```

#### VariableManager

```typescript
class VariableManager {
  set(name: string, value: any, type?: VariableType): void;
  get(name: string): any;
  exists(name: string): boolean;
  delete(name: string): void;
  clear(): void;
  list(): FlowVariable[];
}
```

#### PluginRegistry

```typescript
class PluginRegistry {
  register(plugin: FlowPlugin): void;
  unregister(pluginId: string): void;
  get(pluginId: string): FlowPlugin;
  list(): FlowPlugin[];
  listByCategory(category: string): FlowPlugin[];
}
```

### Hooks

#### useFlow

```typescript
function useFlow(flowId?: string): {
  flow: Flow | null;
  loading: boolean;
  error: Error | null;
  
  load: (flowId: string) => Promise<void>;
  save: () => Promise<void>;
  execute: () => Promise<void>;
  reset: () => void;
}
```

#### useExecution

```typescript
function useExecution(): {
  state: ExecutionState;
  logs: ExecutionLog[];
  
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  step: () => void;
}
```

#### useVariables

```typescript
function useVariables(): {
  variables: FlowVariable[];
  
  set: (name: string, value: any, type?: VariableType) => void;
  get: (name: string) => any;
  delete: (name: string) => void;
  clear: () => void;
}
```

---

## Next Steps

1. **Create package structure** using MCP tools
2. **Implement core engine** (Phase 1)
3. **Build plugin system** (Phase 2)
4. **Develop React Flow UI** (Phase 3)
5. **Add sub-flows** (Phase 4)
6. **Implement advanced features** (Phase 5)
7. **Integration & testing** (Phase 6)

This specification provides a complete blueprint for building a powerful, extensible flow builder system. The architecture is designed to be scalable, maintainable, and easy to extend with new plugins and features.
