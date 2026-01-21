# Flow Builder - Implementation Guide

> **Companion to:** FLOW-BUILDER-SPECIFICATION.md  
> **Purpose:** Practical implementation details, code examples, and best practices

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Package Setup](#package-setup)
3. [Core Implementation Examples](#core-implementation-examples)
4. [Plugin Development Guide](#plugin-development-guide)
5. [UI Component Examples](#ui-component-examples)
6. [Testing Strategy](#testing-strategy)
7. [Performance Optimization](#performance-optimization)
8. [Best Practices](#best-practices)

---

## Getting Started

### Prerequisites

- Bun runtime
- TypeScript 5.0+
- React 18+
- React Flow 11+

### Technology Stack

```typescript
// Core dependencies
{
  "dependencies": {
    "react": "^18.2.0",
    "reactflow": "^11.10.0",
    "zustand": "^4.4.0",
    "zod": "^3.22.0",
    "immer": "^10.0.0",
    "nanoid": "^5.0.0"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@repo/eslint-config": "workspace:*",
    "@repo/vitest-config": "workspace:*",
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0"
  }
}
```

---

## Package Setup

### 1. Create Package Structure

```bash
# Using MCP Repo Manager
# This will create the package with proper configuration
```

### 2. Package Configuration

**package.json**
```json
{
  "name": "@repo/flow",
  "version": "0.1.0",
  "description": "Visual flow builder for workflow automation",
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./ui": {
      "types": "./src/ui/index.ts",
      "default": "./src/ui/index.ts"
    },
    "./plugins": {
      "types": "./src/plugins/index.ts",
      "default": "./src/plugins/index.ts"
    }
  },
  "scripts": {
    "dev": "tsc --watch",
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "type-check": "tsc --noEmit",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

**tsconfig.json**
```json
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.test.tsx"]
}
```

---

## Core Implementation Examples

### 1. Execution Context

```typescript
// src/core/engine/context.ts
import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';
import type { ExecutionContext, ExecutionState } from '../types';
import { VariableManager } from '../variables/manager';
import { ScopeStack } from '../variables/scope';

export class ExecutionContextImpl implements ExecutionContext {
  readonly flowId: string;
  readonly executionId: string;
  readonly variables: VariableManager;
  readonly scopes: ScopeStack;
  readonly events: EventEmitter;
  
  public inputs: Record<string, any> = {};
  public outputs: Record<string, any> = {};
  public state: ExecutionState;
  
  constructor(flowId: string) {
    this.flowId = flowId;
    this.executionId = nanoid();
    this.variables = new VariableManager();
    this.scopes = new ScopeStack();
    this.events = new EventEmitter();
    
    this.state = {
      status: 'idle',
      currentNode: undefined,
      startTime: undefined,
      endTime: undefined,
      error: undefined,
    };
    
    // Initialize global scope
    this.scopes.push('global');
  }
  
  reset(): void {
    this.inputs = {};
    this.outputs = {};
    this.state = {
      status: 'idle',
      currentNode: undefined,
      startTime: undefined,
      endTime: undefined,
      error: undefined,
    };
    this.variables.clear();
    this.scopes.clear();
    this.scopes.push('global');
  }
  
  clone(): ExecutionContextImpl {
    const cloned = new ExecutionContextImpl(this.flowId);
    
    // Copy variables
    for (const [name, variable] of this.variables.entries()) {
      cloned.variables.set(name, variable.value, variable.type);
    }
    
    return cloned;
  }
}
```

### 2. Variable Manager

```typescript
// src/core/variables/manager.ts
import type { FlowVariable, VariableType } from '../types';
import { nanoid } from 'nanoid';

export class VariableManager {
  private variables = new Map<string, FlowVariable>();
  
  set(name: string, value: any, type?: VariableType): void {
    const existingVar = this.variables.get(name);
    
    const variable: FlowVariable = {
      id: existingVar?.id || nanoid(),
      name,
      type: type || this.inferType(value),
      value,
      scope: 'global', // Will be updated by scope manager
      description: existingVar?.description,
    };
    
    this.variables.set(name, variable);
  }
  
  get(name: string): any {
    return this.variables.get(name)?.value;
  }
  
  exists(name: string): boolean {
    return this.variables.has(name);
  }
  
  delete(name: string): void {
    this.variables.delete(name);
  }
  
  clear(): void {
    this.variables.clear();
  }
  
  list(): FlowVariable[] {
    return Array.from(this.variables.values());
  }
  
  entries(): IterableIterator<[string, FlowVariable]> {
    return this.variables.entries();
  }
  
  private inferType(value: any): VariableType {
    if (value === null || value === undefined) return 'any';
    if (Array.isArray(value)) return 'array';
    if (value instanceof File) return 'file';
    
    const type = typeof value;
    if (type === 'string') return 'string';
    if (type === 'number') return 'number';
    if (type === 'boolean') return 'boolean';
    if (type === 'object') return 'object';
    
    return 'any';
  }
}
```

### 3. Expression Evaluator

```typescript
// src/core/engine/evaluator.ts
import type { ExecutionContext } from '../types';

export class ExpressionEvaluator {
  private static readonly EXPRESSION_REGEX = /\{\{(.+?)\}\}/g;
  
  evaluate(expression: string, context: ExecutionContext): any {
    // If not a template string, return as-is
    if (!expression.includes('{{')) {
      return expression;
    }
    
    // Replace all {{ variable.path }} with actual values
    const result = expression.replace(
      ExpressionEvaluator.EXPRESSION_REGEX,
      (match, path) => {
        const value = this.resolvePath(path.trim(), context);
        return String(value ?? '');
      }
    );
    
    // If entire string was a single expression, return the actual value
    if (expression.trim().startsWith('{{') && expression.trim().endsWith('}}')) {
      const path = expression.trim().slice(2, -2).trim();
      return this.resolvePath(path, context);
    }
    
    return result;
  }
  
  private resolvePath(path: string, context: ExecutionContext): any {
    // Handle node outputs: {{ nodeId.outputKey }}
    if (path.includes('.')) {
      const parts = path.split('.');
      let value: any = context.variables.get(parts[0]);
      
      // If not in variables, might be a constant or node output
      if (value === undefined) {
        value = this.resolveSpecialPath(parts[0], context);
      }
      
      // Traverse object path
      for (let i = 1; i < parts.length && value !== undefined; i++) {
        value = value[parts[i]];
      }
      
      return value;
    }
    
    // Simple variable lookup
    return context.variables.get(path);
  }
  
  private resolveSpecialPath(key: string, context: ExecutionContext): any {
    // Special keywords
    if (key === 'input') return context.inputs;
    if (key === 'output') return context.outputs;
    if (key === 'env') return process.env;
    
    // Otherwise, try to get from variables
    return context.variables.get(key);
  }
  
  evaluateCondition(condition: string, context: ExecutionContext): boolean {
    const evaluated = this.evaluate(condition, context);
    
    // If it's a boolean expression string, evaluate it
    if (typeof evaluated === 'string') {
      return this.evaluateBooleanExpression(evaluated, context);
    }
    
    return Boolean(evaluated);
  }
  
  private evaluateBooleanExpression(expr: string, context: ExecutionContext): boolean {
    // Simple expression evaluation
    // In production, use a proper expression parser (e.g., mathjs, expr-eval)
    try {
      // Replace variable references with actual values
      const resolved = this.evaluate(expr, context);
      
      // Simple comparison operators
      if (typeof resolved === 'string') {
        if (resolved.includes('===')) {
          const [left, right] = resolved.split('===').map(s => s.trim());
          return left === right;
        }
        if (resolved.includes('!==')) {
          const [left, right] = resolved.split('!==').map(s => s.trim());
          return left !== right;
        }
        if (resolved.includes('>=')) {
          const [left, right] = resolved.split('>=').map(s => s.trim());
          return Number(left) >= Number(right);
        }
        if (resolved.includes('<=')) {
          const [left, right] = resolved.split('<=').map(s => s.trim());
          return Number(left) <= Number(right);
        }
        if (resolved.includes('>')) {
          const [left, right] = resolved.split('>').map(s => s.trim());
          return Number(left) > Number(right);
        }
        if (resolved.includes('<')) {
          const [left, right] = resolved.split('<').map(s => s.trim());
          return Number(left) < Number(right);
        }
      }
      
      return Boolean(resolved);
    } catch (error) {
      console.error('Expression evaluation error:', error);
      return false;
    }
  }
}
```

### 4. Flow Executor

```typescript
// src/runtime/executor/flow-runner.ts
import type { Flow, FlowNode, FlowEdge } from '../../core/types';
import type { ExecutionContext } from '../../core/engine/context';
import { ExpressionEvaluator } from '../../core/engine/evaluator';
import { pluginRegistry } from '../../plugins';

export class FlowRunner {
  private evaluator = new ExpressionEvaluator();
  private aborted = false;
  
  constructor(private context: ExecutionContext) {}
  
  async execute(flow: Flow): Promise<void> {
    try {
      this.context.state.status = 'running';
      this.context.state.startTime = new Date();
      this.context.events.emit('flow:start', { flowId: flow.id });
      
      // Find trigger nodes (entry points)
      const triggers = flow.nodes.filter(n => n.type === 'trigger');
      
      if (triggers.length === 0) {
        throw new Error('No trigger nodes found in flow');
      }
      
      // Execute from each trigger
      for (const trigger of triggers) {
        if (this.aborted) break;
        await this.executeNode(trigger, flow);
      }
      
      this.context.state.status = 'completed';
      this.context.state.endTime = new Date();
      this.context.events.emit('flow:complete', { 
        flowId: flow.id,
        duration: this.context.state.endTime.getTime() - this.context.state.startTime!.getTime(),
      });
    } catch (error) {
      this.context.state.status = 'failed';
      this.context.state.error = error as Error;
      this.context.events.emit('flow:error', { flowId: flow.id, error });
      throw error;
    }
  }
  
  abort(): void {
    this.aborted = true;
    this.context.state.status = 'idle';
  }
  
  private async executeNode(node: FlowNode, flow: Flow): Promise<void> {
    if (this.aborted) return;
    
    this.context.state.currentNode = node.id;
    this.context.events.emit('node:start', { nodeId: node.id, node });
    
    try {
      // Get plugin
      const plugin = pluginRegistry.get(node.pluginId);
      if (!plugin) {
        throw new Error(`Plugin not found: ${node.pluginId}`);
      }
      
      // Prepare inputs by resolving expressions
      this.prepareInputs(node);
      
      // Execute plugin
      const outputs = await plugin.execute(this.context, node.config);
      
      // Store outputs
      node.data.outputs = outputs;
      node.data.state = 'success';
      
      // Update context outputs
      this.context.outputs = outputs;
      
      // Store outputs in variables (using node ID as prefix)
      for (const [key, value] of Object.entries(outputs)) {
        this.context.variables.set(`${node.id}.${key}`, value);
      }
      
      this.context.events.emit('node:success', { nodeId: node.id, outputs });
      
      // Find and execute next nodes
      await this.executeNextNodes(node, flow);
      
    } catch (error) {
      node.data.state = 'error';
      node.data.error = error as Error;
      this.context.events.emit('node:error', { nodeId: node.id, error });
      throw error;
    }
  }
  
  private prepareInputs(node: FlowNode): void {
    const inputs: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(node.data.inputs)) {
      if (typeof value === 'string') {
        inputs[key] = this.evaluator.evaluate(value, this.context);
      } else {
        inputs[key] = value;
      }
    }
    
    this.context.inputs = inputs;
  }
  
  private async executeNextNodes(node: FlowNode, flow: Flow): Promise<void> {
    const outgoingEdges = flow.edges.filter(e => e.source === node.id);
    
    // Handle different node types
    if (node.type === 'condition') {
      await this.executeConditionalBranch(node, outgoingEdges, flow);
    } else if (node.type === 'loop') {
      await this.executeLoop(node, outgoingEdges, flow);
    } else {
      // Regular sequential execution
      for (const edge of outgoingEdges) {
        const nextNode = flow.nodes.find(n => n.id === edge.target);
        if (nextNode) {
          await this.executeNode(nextNode, flow);
        }
      }
    }
  }
  
  private async executeConditionalBranch(
    node: FlowNode,
    edges: FlowEdge[],
    flow: Flow
  ): Promise<void> {
    // For if/else: find the edge whose condition matches
    for (const edge of edges) {
      if (edge.condition) {
        const matches = this.evaluator.evaluateCondition(
          edge.condition.expression,
          this.context
        );
        
        if (matches) {
          const nextNode = flow.nodes.find(n => n.id === edge.target);
          if (nextNode) {
            await this.executeNode(nextNode, flow);
          }
          return; // Only execute first matching branch
        }
      }
    }
    
    // Execute default branch if no condition matched
    const defaultEdge = edges.find(e => !e.condition);
    if (defaultEdge) {
      const nextNode = flow.nodes.find(n => n.id === defaultEdge.target);
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
    const loopEdges = edges.filter(e => e.type === 'loop');
    
    if (pluginId === 'for-loop') {
      await this.executeForLoop(config, loopEdges, flow);
    } else if (pluginId === 'while-loop') {
      await this.executeWhileLoop(config, loopEdges, flow);
    } else if (pluginId === 'foreach-loop') {
      await this.executeForEachLoop(config, loopEdges, flow);
    }
    
    // After loop, execute next edges (non-loop edges)
    const nextEdges = edges.filter(e => e.type !== 'loop');
    for (const edge of nextEdges) {
      const nextNode = flow.nodes.find(n => n.id === edge.target);
      if (nextNode) {
        await this.executeNode(nextNode, flow);
      }
    }
  }
  
  private async executeForLoop(
    config: any,
    edges: FlowEdge[],
    flow: Flow
  ): Promise<void> {
    const { start, end, step = 1, indexVariable } = config;
    
    for (let i = start; i < end; i += step) {
      if (this.aborted) break;
      
      // Set loop variable
      this.context.variables.set(indexVariable, i, 'number');
      
      // Execute loop body
      await this.executeLoopBody(edges, flow);
    }
  }
  
  private async executeWhileLoop(
    config: any,
    edges: FlowEdge[],
    flow: Flow
  ): Promise<void> {
    const { condition, maxIterations = 1000 } = config;
    let iterations = 0;
    
    while (
      this.evaluator.evaluateCondition(condition, this.context) &&
      iterations < maxIterations &&
      !this.aborted
    ) {
      await this.executeLoopBody(edges, flow);
      iterations++;
    }
    
    if (iterations >= maxIterations) {
      console.warn(`While loop reached max iterations: ${maxIterations}`);
    }
  }
  
  private async executeForEachLoop(
    config: any,
    edges: FlowEdge[],
    flow: Flow
  ): Promise<void> {
    const { array, itemVariable, indexVariable } = config;
    const items = this.evaluator.evaluate(array, this.context);
    
    if (!Array.isArray(items)) {
      throw new Error(`ForEach target is not an array: ${array}`);
    }
    
    for (let i = 0; i < items.length; i++) {
      if (this.aborted) break;
      
      // Set loop variables
      this.context.variables.set(itemVariable, items[i]);
      if (indexVariable) {
        this.context.variables.set(indexVariable, i, 'number');
      }
      
      // Execute loop body
      await this.executeLoopBody(edges, flow);
    }
  }
  
  private async executeLoopBody(edges: FlowEdge[], flow: Flow): Promise<void> {
    // Create new scope for loop iteration
    this.context.scopes.push('loop-iteration');
    
    try {
      for (const edge of edges) {
        const bodyNode = flow.nodes.find(n => n.id === edge.target);
        if (bodyNode) {
          await this.executeNode(bodyNode, flow);
        }
      }
    } finally {
      // Pop scope after iteration
      this.context.scopes.pop();
    }
  }
}
```

---

## Plugin Development Guide

### Creating a Custom Plugin

```typescript
// src/plugins/actions/custom-action.ts
import { z } from 'zod';
import type { FlowPlugin } from '../../core/types';

export const customActionPlugin: FlowPlugin = {
  id: 'custom-action',
  name: 'Custom Action',
  version: '1.0.0',
  category: 'business',      // 'core' or 'business'
  subCategory: 'action',      // 'action' | 'trigger' | 'condition' | etc.
  nodeType: 'action',
  nodeUIPattern: 'clickable', // 'info' | 'editable' | 'clickable'
  description: 'Performs a custom action',
  icon: '⚡',
  
  // Define configuration schema
  configSchema: z.object({
    param1: z.string().min(1, 'Parameter 1 is required'),
    param2: z.number().positive(),
    param3: z.boolean().optional().default(false),
  }),
  
  // Define input schema (what the node receives)
  inputSchema: z.object({
    data: z.any(),
  }),
  
  // Define output schema (what the node produces)
  outputSchema: z.object({
    result: z.string(),
    processed: z.boolean(),
    metadata: z.object({
      timestamp: z.date(),
    }),
  }),
  
  // Validation function (optional)
  validate(config: any) {
    try {
      this.configSchema.parse(config);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: error instanceof z.ZodError ? error.errors : [String(error)],
      };
    }
  },
  
  // Execution handler
  async execute(context, config) {
    const { param1, param2, param3 } = config;
    const { data } = context.inputs;
    
    // Your custom logic here
    const result = `Processed ${param1} with ${param2}`;
    
    // Return outputs matching outputSchema
    return {
      result,
      processed: true,
      metadata: {
        timestamp: new Date(),
      },
    };
  },
  
  // Optional: React component for configuration
  ConfigComponent: ({ config, onChange }) => {
    return (
      <div className="space-y-4">
        <div>
          <label>Parameter 1</label>
          <input
            type="text"
            value={config.param1 || ''}
            onChange={(e) => onChange({ ...config, param1: e.target.value })}
          />
        </div>
        <div>
          <label>Parameter 2</label>
          <input
            type="number"
            value={config.param2 || 0}
            onChange={(e) => onChange({ ...config, param2: Number(e.target.value) })}
          />
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={config.param3 || false}
              onChange={(e) => onChange({ ...config, param3: e.target.checked })}
            />
            Parameter 3
          </label>
        </div>
      </div>
    );
  },
};
```

### Registering Plugins

```typescript
// src/plugins/index.ts
import { PluginRegistry } from '../core/plugin-registry';

// Import CORE plugins
import { ifConditionPlugin } from './conditions/if-condition';
import { switchConditionPlugin } from './conditions/switch-condition';
import { forLoopPlugin } from './loops/for-loop';
import { whileLoopPlugin } from './loops/while-loop';
import { setVariablePlugin } from './variables/set-variable';
import { callSubFlowPlugin } from './subflows/call-subflow';

// Import BUSINESS plugins
import { httpRequestPlugin } from './actions/http-request';
import { fileValidationPlugin } from './actions/file-validation';
import { databaseQueryPlugin } from './actions/database-query';

// Create singleton registry
export const pluginRegistry = new PluginRegistry();

// Register CORE plugins (always available)
export function registerCorePlugins() {
  pluginRegistry.register(ifConditionPlugin);
  pluginRegistry.register(switchConditionPlugin);
  pluginRegistry.register(forLoopPlugin);
  pluginRegistry.register(whileLoopPlugin);
  pluginRegistry.register(setVariablePlugin);
  pluginRegistry.register(callSubFlowPlugin);
}

// Register BUSINESS plugins (optional)
export function registerBusinessPlugins() {
  pluginRegistry.register(httpRequestPlugin);
  pluginRegistry.register(fileValidationPlugin);
  pluginRegistry.register(databaseQueryPlugin);
}

// Register all default plugins
export function registerDefaultPlugins() {
  registerCorePlugins();    // Required
  registerBusinessPlugins(); // Optional
}

// Auto-register on import
registerDefaultPlugins();
```

---

## UI Component Examples

### Flow Canvas with Zustand Store

```typescript
// src/ui/stores/flowStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Flow, FlowNode, FlowEdge } from '../../core/types';

interface FlowStore {
  flow: Flow | null;
  selectedNode: FlowNode | null;
  
  // Actions
  setFlow: (flow: Flow) => void;
  addNode: (node: FlowNode) => void;
  updateNode: (nodeId: string, updates: Partial<FlowNode>) => void;
  deleteNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  addEdge: (edge: FlowEdge) => void;
  deleteEdge: (edgeId: string) => void;
}

export const useFlowStore = create<FlowStore>()(
  immer((set) => ({
    flow: null,
    selectedNode: null,
    
    setFlow: (flow) => set({ flow }),
    
    addNode: (node) => set((state) => {
      if (state.flow) {
        state.flow.nodes.push(node);
      }
    }),
    
    updateNode: (nodeId, updates) => set((state) => {
      if (state.flow) {
        const index = state.flow.nodes.findIndex(n => n.id === nodeId);
        if (index !== -1) {
          Object.assign(state.flow.nodes[index], updates);
        }
      }
    }),
    
    deleteNode: (nodeId) => set((state) => {
      if (state.flow) {
        state.flow.nodes = state.flow.nodes.filter(n => n.id !== nodeId);
        state.flow.edges = state.flow.edges.filter(
          e => e.source !== nodeId && e.target !== nodeId
        );
      }
    }),
    
    selectNode: (nodeId) => set((state) => {
      if (!state.flow) return;
      state.selectedNode = nodeId 
        ? state.flow.nodes.find(n => n.id === nodeId) || null
        : null;
    }),
    
    addEdge: (edge) => set((state) => {
      if (state.flow) {
        state.flow.edges.push(edge);
      }
    }),
    
    deleteEdge: (edgeId) => set((state) => {
      if (state.flow) {
        state.flow.edges = state.flow.edges.filter(e => e.id !== edgeId);
      }
    }),
  }))
);
```

### Complete Flow Canvas

```typescript
// src/ui/components/FlowCanvas.tsx
import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { ActionNode } from './nodes/ActionNode';
import { ConditionNode } from './nodes/ConditionNode';
import { LoopNode } from './nodes/LoopNode';
import { useFlowStore } from '../stores/flowStore';

export function FlowCanvas() {
  const flow = useFlowStore((state) => state.flow);
  const updateNode = useFlowStore((state) => state.updateNode);
  const addEdge = useFlowStore((state) => state.addEdge);
  const selectNode = useFlowStore((state) => state.selectNode);
  
  // Convert flow nodes to React Flow nodes
  const reactFlowNodes = useMemo<Node[]>(
    () => flow?.nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        ...node.data,
        label: node.label,
        pluginId: node.pluginId,
        config: node.config,
      },
    })) || [],
    [flow]
  );
  
  // Convert flow edges to React Flow edges
  const reactFlowEdges = useMemo<Edge[]>(
    () => flow?.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: edge.type,
      label: edge.label,
    })) || [],
    [flow]
  );
  
  const [nodes, setNodes, onNodesChange] = useNodesState(reactFlowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(reactFlowEdges);
  
  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge = {
        id: `e${connection.source}-${connection.target}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      };
      
      setEdges((eds) => addEdge(connection, eds));
      addEdge(newEdge);
    },
    [setEdges, addEdge]
  );
  
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );
  
  const nodeTypes = useMemo(
    () => ({
      action: ActionNode,
      condition: ConditionNode,
      loop: LoopNode,
      variable: ActionNode, // Reuse ActionNode for now
      subflow: ActionNode,  // Reuse ActionNode for now
    }),
    []
  );
  
  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// src/core/variables/__tests__/manager.test.ts
import { describe, it, expect } from 'vitest';
import { VariableManager } from '../manager';

describe('VariableManager', () => {
  it('should set and get variables', () => {
    const manager = new VariableManager();
    
    manager.set('testVar', 'testValue');
    expect(manager.get('testVar')).toBe('testValue');
  });
  
  it('should infer variable types', () => {
    const manager = new VariableManager();
    
    manager.set('stringVar', 'hello');
    manager.set('numberVar', 42);
    manager.set('booleanVar', true);
    manager.set('arrayVar', [1, 2, 3]);
    
    const vars = manager.list();
    expect(vars.find(v => v.name === 'stringVar')?.type).toBe('string');
    expect(vars.find(v => v.name === 'numberVar')?.type).toBe('number');
    expect(vars.find(v => v.name === 'booleanVar')?.type).toBe('boolean');
    expect(vars.find(v => v.name === 'arrayVar')?.type).toBe('array');
  });
  
  it('should check variable existence', () => {
    const manager = new VariableManager();
    
    manager.set('existingVar', 'value');
    expect(manager.exists('existingVar')).toBe(true);
    expect(manager.exists('nonExistingVar')).toBe(false);
  });
});
```

### Integration Tests

```typescript
// src/runtime/executor/__tests__/flow-runner.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { FlowRunner } from '../flow-runner';
import { ExecutionContextImpl } from '../../../core/engine/context';
import type { Flow } from '../../../core/types';

describe('FlowRunner', () => {
  let context: ExecutionContextImpl;
  let runner: FlowRunner;
  
  beforeEach(() => {
    context = new ExecutionContextImpl('test-flow');
    runner = new FlowRunner(context);
  });
  
  it('should execute a simple flow', async () => {
    const flow: Flow = {
      id: 'simple-flow',
      name: 'Simple Flow',
      version: '1.0.0',
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          pluginId: 'manual-trigger',
          label: 'Start',
          position: { x: 0, y: 0 },
          data: { inputs: {}, outputs: {} },
          config: {},
        },
        {
          id: 'action-1',
          type: 'action',
          pluginId: 'set-variable',
          label: 'Set Variable',
          position: { x: 0, y: 100 },
          data: {
            inputs: { variableName: 'result', value: 'success' },
            outputs: {},
          },
          config: { variableName: 'result', value: 'success' },
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'action-1' },
      ],
      variables: [],
      subFlows: [],
      metadata: { createdAt: new Date(), updatedAt: new Date() },
    };
    
    await runner.execute(flow);
    
    expect(context.state.status).toBe('completed');
    expect(context.variables.get('result')).toBe('success');
  });
});
```

---

## Performance Optimization

### 1. Memoization

```typescript
// Memoize plugin registry lookups
const pluginCache = new Map<string, FlowPlugin>();

export function getPlugin(id: string): FlowPlugin {
  if (pluginCache.has(id)) {
    return pluginCache.get(id)!;
  }
  
  const plugin = pluginRegistry.get(id);
  pluginCache.set(id, plugin);
  return plugin;
}
```

### 2. Lazy Loading Plugins

```typescript
// Load plugins on demand
const pluginLoaders = new Map<string, () => Promise<FlowPlugin>>();

export async function loadPlugin(id: string): Promise<FlowPlugin> {
  const loader = pluginLoaders.get(id);
  if (!loader) {
    throw new Error(`Plugin loader not found: ${id}`);
  }
  
  return await loader();
}
```

### 3. Execution Batching

```typescript
// Execute independent nodes in parallel
private async executeNextNodes(node: FlowNode, flow: Flow): Promise<void> {
  const outgoingEdges = flow.edges.filter(e => e.source === node.id);
  
  // Group edges by dependency
  const independentEdges = this.findIndependentEdges(outgoingEdges, flow);
  
  // Execute independent nodes in parallel
  await Promise.all(
    independentEdges.map(edge => {
      const nextNode = flow.nodes.find(n => n.id === edge.target);
      return nextNode ? this.executeNode(nextNode, flow) : Promise.resolve();
    })
  );
}
```

---

## Best Practices

### 1. Error Handling

```typescript
// Always wrap plugin execution in try-catch
try {
  const outputs = await plugin.execute(context, config);
  node.data.outputs = outputs;
  node.data.state = 'success';
} catch (error) {
  node.data.state = 'error';
  node.data.error = error as Error;
  
  // Emit error event for UI
  context.events.emit('node:error', { nodeId: node.id, error });
  
  // Decide whether to continue or abort
  if (config.continueOnError) {
    console.error(`Node ${node.id} failed but continuing:`, error);
  } else {
    throw error;
  }
}
```

### 2. Variable Naming Conventions

```typescript
// Use namespaces for node outputs
this.context.variables.set(`${node.id}.output`, value);

// Use descriptive names for user variables
this.context.variables.set('uploadedFileUrl', url);

// Use camelCase for variable names
this.context.variables.set('userFirstName', firstName);
```

### 3. Flow Validation

```typescript
// Validate flow before execution
export function validateFlow(flow: Flow): ValidationResult {
  const errors: string[] = [];
  
  // Check for cycles
  if (hasCycle(flow)) {
    errors.push('Flow contains circular dependencies');
  }
  
  // Check for orphaned nodes
  const orphans = findOrphanedNodes(flow);
  if (orphans.length > 0) {
    errors.push(`Orphaned nodes: ${orphans.map(n => n.label).join(', ')}`);
  }
  
  // Check for missing plugins
  for (const node of flow.nodes) {
    if (!pluginRegistry.has(node.pluginId)) {
      errors.push(`Plugin not found: ${node.pluginId} (node: ${node.label})`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
```

### 4. Memory Management

```typescript
// Clear execution context after flow completion
export class FlowExecutor {
  async execute(flow: Flow): Promise<void> {
    try {
      await this.runner.execute(flow);
    } finally {
      // Clean up
      this.context.reset();
      this.abortController?.abort();
    }
  }
}
```

---

## Next Steps

1. **Initialize package** using MCP tools
2. **Implement core engine** (context, variables, executor)
3. **Create basic plugins** (trigger, action, condition)
4. **Build React Flow UI** (canvas, nodes, palette)
5. **Add sub-flows** support
6. **Write tests** for all components
7. **Document** APIs and usage

This implementation guide provides the foundation for building the Flow Builder system. Refer to FLOW-BUILDER-SPECIFICATION.md for the complete architecture and design details.
