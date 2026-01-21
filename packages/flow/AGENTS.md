# Flow Package - Agent Rules

This document defines local rules for AI agents working within `packages/flow`.

## Package Overview

`@repo/flow` is a visual flow builder system using React Flow for creating complex workflow automation. It provides:
- Plugin-based architecture for extensibility
- Visual flow editor with drag-and-drop
- Execution engine for running flows
- Variable management and expression evaluation
- Support for conditions, loops, and sub-flows

## Architecture Principles

1. **Separation of Concerns**
   - `core/` - Engine logic (execution, variables, types)
   - `plugins/` - Extensible node implementations
   - `ui/` - React Flow UI components
   - `runtime/` - Flow execution runtime

2. **Plugin-First Design**
   - All node types are plugins
   - Plugins define schema, validation, execution, and UI
   - Registry pattern for plugin management

3. **Type Safety**
   - Zod schemas for all plugin configurations
   - Strict TypeScript types throughout
   - Runtime validation for expressions and variables

## Development Rules

### 1. Plugin Development

#### Plugin Categories

**CORE Plugins** (Required for system operation):
- Cannot be removed or disabled
- Essential for flow control and data management
- Categories: conditions, loops, variables, sub-flows, flow control
- Examples: `if-condition`, `for-loop`, `set-variable`, `call-subflow`

**BUSINESS Plugins** (Domain-specific functionality):
- Can be installed/removed as needed
- Extend system with specific capabilities
- Categories: actions, triggers, transformers
- Examples: `http-request`, `file-validation`, `database-query`

When creating new plugins:

```typescript
// REQUIRED structure
export const myPlugin: FlowPlugin = {
  id: 'unique-plugin-id',
  name: 'Human Readable Name',
  version: '1.0.0',
  category: 'core' | 'business',  // Plugin category
  subCategory: 'action' | 'trigger' | 'condition' | 'loop' | 'variable' | 'subflow',
  nodeType: NodeType,
  nodeUIPattern: 'info' | 'editable' | 'clickable',  // Node UI behavior
  
  // MUST provide Zod schema
  configSchema: z.object({ /* ... */ }),
  
  // MUST implement execute
  async execute(context, config) {
    // ...
  },
  
  // OPTIONAL but recommended
  inputSchema: z.object({ /* ... */ }),
  outputSchema: z.object({ /* ... */ }),
  ConfigComponent: MyConfigComponent,
};
```

**Rules:**
- Always register CORE plugins in `registerCorePlugins()`
- Register BUSINESS plugins in `registerBusinessPlugins()`
- Plugin IDs must be unique and kebab-case
- CORE plugins cannot be removed from registry
- All config must be validated with Zod schemas
- Execute function must be async
- Return outputs matching outputSchema
- Choose appropriate `nodeUIPattern` for the plugin

#### Node UI Patterns

**Info Node** (Display only):
- Shows status, progress, or information
- No user interaction (read-only)
- Examples: status display, progress indicator
- Use `nodeUIPattern: 'info'`

**Editable Node** (Inline editing):
- Allows direct editing on canvas
- Quick changes without opening modal
- Examples: set variable, simple text input
- Use `nodeUIPattern: 'editable'`

**Clickable Node** (Opens modal/sheet):
- Complex configuration
- Opens dialog when clicked
- Examples: HTTP request, file validation, database query
- Use `nodeUIPattern: 'clickable'`

```typescript
// Info node example
nodeUIPattern: 'info',
NodeComponent: ({ data }) => (
  <div className="p-3 bg-white rounded-lg">
    <div>Status: {data.status}</div>
  </div>
),

// Editable node example
nodeUIPattern: 'editable',
NodeComponent: ({ data, onChange }) => (
  <div>
    <input
      value={data.config.value}
      onChange={(e) => onChange({ value: e.target.value })}
    />
  </div>
),

// Clickable node example
nodeUIPattern: 'clickable',
nodeUIConfig: {
  onClick: { action: 'modal', component: ConfigModal },
},
NodeComponent: ({ data, onClick }) => (
  <div onClick={onClick} className="cursor-pointer">
    Click to configure
  </div>
),
```

### 2. Variable Management

Variables follow scoping rules:

```typescript
// Global scope (accessible everywhere)
context.variables.set('globalVar', value);

// Node output (namespaced by node ID)
context.variables.set(`${nodeId}.outputKey`, value);

// Loop variables (local to iteration)
context.scopes.push('loop-iteration');
context.variables.set('item', value);
// ... execution ...
context.scopes.pop();
```

**Rules:**
- Use node ID prefixes for outputs: `${nodeId}.${outputKey}`
- Use descriptive names for user-facing variables
- Always pop scopes after pushing
- Never mutate variables directly (use VariableManager)

### 3. Expression Evaluation

Template expressions use `{{ variable.path }}` syntax:

```typescript
// Valid expressions
'{{ variableName }}'
'{{ nodeId.outputKey }}'
'{{ array.length }}'
'{{ user.profile.name }}'

// Conditions
'{{ value > 10 }}'
'{{ status === "success" }}'
```

**Rules:**
- Always use double curly braces: `{{ }}`
- Expressions are evaluated lazily (at execution time)
- Support dot notation for object paths
- Boolean expressions for conditions
- Never expose sensitive data in expressions

### 4. Event System

Use events for execution tracking:

```typescript
// Standard events
context.events.emit('flow:start', { flowId });
context.events.emit('node:start', { nodeId, node });
context.events.emit('node:success', { nodeId, outputs });
context.events.emit('node:error', { nodeId, error });
context.events.emit('flow:complete', { flowId, duration });
```

**Rules:**
- Emit events at all lifecycle stages
- Include relevant context in event data
- Never throw in event handlers (catch and log)
- Use events for UI updates (don't poll state)

### 5. React Flow Integration

Custom nodes must follow this pattern:

```typescript
import { Handle, Position } from 'reactflow';
import type { CustomNodeProps } from '../types';

export function MyNode({ id, data, selected }: CustomNodeProps) {
  return (
    <div>
      <Handle type="target" position={Position.Top} />
      {/* Node content */}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

// For multiple outputs (conditions, switches)
<Handle type="source" position={Position.Bottom} id="true" />
<Handle type="source" position={Position.Bottom} id="false" />
```

**Rules:**
- Always include target handle (except triggers)
- Always include source handle (except terminators)
- Use handle IDs for conditional/loop edges
- Keep node components pure (no side effects)
- Use Zustand store for state management

### 6. Testing Requirements

Every component must have tests:

```typescript
// Unit tests for core logic
describe('VariableManager', () => {
  it('should set and get variables', () => {
    // ...
  });
});

// Integration tests for flows
describe('FlowRunner', () => {
  it('should execute a complete flow', async () => {
    // ...
  });
});

// Component tests for UI
describe('FlowCanvas', () => {
  it('should render nodes and edges', () => {
    // ...
  });
});
```

**Rules:**
- Minimum 80% code coverage
- Test edge cases and error paths
- Mock external dependencies
- Use Vitest for all tests

### 7. Error Handling

Robust error handling is critical:

```typescript
// Plugin execution
try {
  const outputs = await plugin.execute(context, config);
  return outputs;
} catch (error) {
  // Log error
  console.error(`Plugin ${plugin.id} failed:`, error);
  
  // Emit event
  context.events.emit('node:error', { nodeId, error });
  
  // Decide: continue or abort
  if (config.continueOnError) {
    return defaultOutputs;
  } else {
    throw error;
  }
}
```

**Rules:**
- Always wrap plugin execution in try-catch
- Emit error events for UI updates
- Support continueOnError flag in config
- Provide meaningful error messages
- Never swallow errors silently

### 8. Performance Considerations

Optimize for large flows:

```typescript
// ✅ Good: Parallel execution of independent nodes
await Promise.all(independentNodes.map(n => executeNode(n)));

// ✅ Good: Memoize plugin lookups
const plugin = pluginCache.get(id) || pluginRegistry.get(id);

// ❌ Bad: Sequential execution when parallel is possible
for (const node of nodes) {
  await executeNode(node);
}

// ❌ Bad: Re-evaluating same expression
for (let i = 0; i < 1000; i++) {
  const value = evaluator.evaluate('{{ constant }}', context);
}
```

**Rules:**
- Execute independent nodes in parallel
- Cache plugin instances
- Memoize expensive computations
- Use lazy loading for large plugins
- Avoid unnecessary re-renders in UI

## File Organization

```
packages/flow/
├── src/
│   ├── core/           # Core engine (no UI dependencies)
│   │   ├── engine/     # Execution, parser, validator
│   │   ├── variables/  # Variable management
│   │   ├── events/     # Event system
│   │   └── types/      # Type definitions
│   ├── plugins/        # Plugin implementations
│   │   ├── actions/
│   │   ├── triggers/
│   │   ├── conditions/
│   │   ├── loops/
│   │   ├── variables/
│   │   └── subflows/
│   ├── ui/             # React Flow UI
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── stores/
│   │   └── utils/
│   ├── runtime/        # Execution runtime
│   │   ├── executor/
│   │   ├── context/
│   │   └── debugger/
│   └── storage/        # Serialization
│       ├── serializers/
│       └── validators/
```

**Rules:**
- Core logic must not import from `ui/`
- UI components can import from `core/`
- Plugins are self-contained (one file if simple)
- Types go in `core/types/`
- Tests live next to source files (`__tests__/`)

## Dependencies

### Allowed Dependencies

- `react`, `react-dom` - UI framework
- `reactflow` - Flow canvas
- `zustand` - State management
- `zod` - Schema validation
- `immer` - Immutable updates
- `nanoid` - ID generation

### Forbidden Dependencies

- ❌ Any state management other than Zustand (no Redux, MobX, etc.)
- ❌ Any validation library other than Zod
- ❌ Any UUID library other than nanoid
- ❌ Heavy libraries (Lodash, Moment.js, etc.) - use native JS

### Workspace Dependencies

- `@repo/types` - Shared types
- `@repo/ui` - Shared UI components (if needed for config panels)
- `@repo/typescript-config` - TypeScript config
- `@repo/eslint-config` - ESLint config
- `@repo/vitest-config` - Vitest config

## Integration Points

### With Web App (`apps/web`)

The web app can use the flow builder:

```typescript
import { FlowCanvas } from '@repo/flow/ui';
import { FlowExecutor } from '@repo/flow';

// In a page component
export default function FlowBuilderPage() {
  return <FlowCanvas />;
}
```

### With API (`apps/api`)

The API can execute flows server-side:

```typescript
import { FlowExecutor } from '@repo/flow';
import { ExecutionContextImpl } from '@repo/flow/core';

// Execute flow from stored JSON
const flow = await loadFlowFromDatabase(flowId);
const context = new ExecutionContextImpl(flowId);
const executor = new FlowExecutor(context);
await executor.execute(flow);
```

## Common Tasks

### Adding a New Plugin

1. Create plugin file in `plugins/<category>/<name>.ts`
2. Define schema, execute, and optional UI
3. Register in `plugins/index.ts`
4. Add tests in `__tests__/`
5. Update plugin documentation

### Adding a New Node Type

1. Define node type in `core/types/node.ts`
2. Create React component in `ui/components/nodes/`
3. Register in `nodeTypes` map in FlowCanvas
4. Add execution logic in FlowRunner
5. Add tests

### Debugging Flows

Use the built-in debugger:

```typescript
// Set breakpoint
context.debugger.setBreakpoint(nodeId);

// Step through execution
context.debugger.step();

// Inspect variables
context.debugger.inspect('variableName');
```

## Best Practices Summary

1. **Always validate** plugin configs with Zod schemas
2. **Always emit events** at execution milestones
3. **Always handle errors** gracefully
4. **Always test** new features
5. **Never mutate** state directly (use Zustand/Immer)
6. **Never block** the UI thread (use async/await)
7. **Prefer composition** over inheritance
8. **Keep components pure** and reusable
9. **Document complex logic** with comments
10. **Follow naming conventions** (camelCase, kebab-case, PascalCase)

## Questions?

If you're unsure about:
- **Plugin design** → Check `plugins/actions/http-request.ts` example
- **Execution flow** → Read `runtime/executor/flow-runner.ts`
- **UI patterns** → See `ui/components/FlowCanvas.tsx`
- **Testing** → Look at `__tests__/` examples

Refer to FLOW-BUILDER-SPECIFICATION.md for complete architecture details.
