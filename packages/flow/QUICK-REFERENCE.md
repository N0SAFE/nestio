# Flow Builder System - Quick Reference

> Quick reference guide for the Flow Builder package

## Package Location

```
packages/flow/
├── FLOW-BUILDER-SPECIFICATION.md  # Complete architecture (8000+ lines)
├── IMPLEMENTATION-GUIDE.md         # Code examples (5000+ lines)
├── AGENTS.md                       # Development rules
└── README.md                       # Package documentation
```

## What is Flow Builder?

A visual programming interface for creating workflow automation using drag-and-drop components. Think of it as a low-code platform for building complex business logic flows.

## Core Use Case: File Upload Processing

The primary use case is to create configurable file upload workflows:

```
File Upload → Validate → Process → Transform → Store → Save Metadata → Success
                ↓
              Error → Handle Error → Return Response
```

Each step in this flow is a **node** that can be:
- Configured visually
- Reused across flows
- Tested independently
- Monitored during execution

## Key Concepts (5-Minute Overview)

### 1. Flow
A complete workflow containing nodes and connections.

```typescript
{
  id: 'file-upload-flow',
  name: 'File Upload Flow',
  nodes: [...],      // Individual steps
  edges: [...],      // Connections between steps
  variables: [...],  // Data storage
  subFlows: [...]    // Reusable components
}
```

### 2. Plugin Categories

**CORE Plugins** (Essential - Cannot be removed):
- **Conditions**: if/else, switch/case
- **Loops**: for, while, forEach
- **Sub-Flows**: call, define
- **Flow Control**: start, end

**Built-in Engine Features** (Not plugins - always available):
- **Variables**: Runtime variable system (`context.variables`)
- **Parallel Execution**: Fork (`parallel-split`) and join (`parallel-join`) with aggregation strategies
- **Code Executor**: TypeScript code execution with Monaco editor, IntelliSense, and secure sandbox

**BUSINESS Plugins** (Optional - Domain-specific):
- **Transform**: Configurable data operations (map, filter, reduce, group, sort)
- **Actions**: HTTP, file ops, database
- **Triggers**: events, timers, webhooks

### 3. Node UI Patterns

Each plugin defines how its node appears:

| Pattern | Behavior | Use Case |
|---------|----------|----------|
| **Info** | Display-only | Status, progress, monitoring |
| **Editable** | Inline editing | Quick config on canvas |
| **Clickable** | Opens modal/sheet | Complex configuration |

### 4. Node Types

| Type | Purpose | Example |
|------|---------|---------|
| **Trigger** | Start the flow | File uploaded event |
| **Action** | Do something | Validate file, Upload to S3 |
| **Condition** | Make decision | If file is valid |
| **Loop** | Repeat steps | Process each image |
| **Sub-Flow** | Call reusable flow | Resize image function |

> Variables are accessed via `context.variables` in any plugin - no dedicated node type needed.

### 3. Plugin System

Everything is a plugin. Want a new action? Create a plugin:

```typescript
export const myPlugin: FlowPlugin = {
  id: 'validate-file',
  name: 'Validate File',
  category: 'business',        // 'core' or 'business'
  subCategory: 'action',       // action/trigger/condition/etc
  nodeUIPattern: 'clickable',  // info/editable/clickable
  
  // What config it needs
  configSchema: z.object({
    maxSize: z.number(),
    allowedTypes: z.array(z.string()),
  }),
  
  // What it does
  async execute(context, config) {
    const file = context.inputs.file;
    const valid = file.size <= config.maxSize;
    return { valid, errors: [] };
  },
  
  // How it looks (for clickable nodes)
  NodeComponent: ({ data, onClick }) => (
    <div onClick={onClick} className="cursor-pointer">
      <div>Validate File</div>
      {data.config.maxSize && <div>Max: {data.config.maxSize}MB</div>}
    </div>
  ),
};
```

**CORE vs BUSINESS Plugins:**
- CORE: Essential for system operation (conditions, loops, variables, sub-flows)
- BUSINESS: Domain-specific functionality (HTTP, files, database)

### 4. Variables & Expressions

Store data and reference it anywhere:

```typescript
// Set a variable
context.variables.set('fileName', 'photo.jpg');

// Use in expressions
'{{ fileName }}'           // → "photo.jpg"
'{{ uploadResult.url }}'   // → "https://..."
'{{ fileSize > 1000000 }}' // → true/false
```

### 5. Sub-Flows

Reusable flow components with inputs/outputs:

```typescript
// Define once
{
  name: 'Resize Image',
  inputs: [
    { name: 'image', type: 'file' },
    { name: 'width', type: 'number' },
  ],
  outputs: [
    { name: 'resizedImage', type: 'file' },
  ],
  flow: { /* resize logic */ }
}

// Use many times
{
  type: 'subflow',
  config: {
    subFlowId: 'resize-image',
    inputs: { image: '{{ uploadedFile }}', width: 800 },
  }
}
```

## File Upload Flow Example

Here's what a complete file upload flow looks like:

```
┌─────────────┐
│   Trigger   │ File Uploaded Event
│  (Event)    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Action    │ Validate File
│ (Validate)  │ • Max size: 10MB
└──────┬──────┘ • Types: jpg, png
       │
       ▼
┌─────────────┐
│  Condition  │ Is Valid?
│  (If/Else)  │
└──┬────────┬─┘
   │        │
   │ true   │ false
   ▼        ▼
┌──────┐ ┌──────┐
│ Process│ Error │
│ Image  │ Response
└───┬──┘ └──────┘
    │
    ▼
┌──────────┐
│ Sub-Flow │ Resize & Thumbnail
│ (Resize) │
└────┬─────┘
     │
     ▼
┌──────────┐
│  Action  │ Upload to S3
│ (Upload) │
└────┬─────┘
     │
     ▼
┌──────────┐
│  Action  │ Save Metadata
│   (DB)   │
└────┬─────┘
     │
     ▼
┌──────────┐
│ Response │ Success
└──────────┘
```

## Architecture Layers

```
┌─────────────────────────────────────┐
│        React Flow UI Layer          │
│  (Canvas, Nodes, Palette, Config)   │
│  Node Patterns: Info/Edit/Click     │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│       Plugin System Layer           │
│   CORE: Conditions, Loops, Vars     │
│   BUSINESS: Actions, Triggers       │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│      Execution Engine Layer         │
│  (Parser, Executor, Variables)      │
└─────────────────────────────────────┘
```

## Implementation Phases

| Phase | Duration | Focus |
|-------|----------|-------|
| 1 | Week 1-2 | Core engine (executor, variables, types) |
| 2 | Week 3 | Plugin system (actions, triggers, conditions) |
| 3 | Week 4-5 | React Flow UI (canvas, nodes, palette) |
| 4 | Week 6 | Sub-flows (reusable components) |
| 5 | Week 7-8 | Advanced (debugger, validation, serialization) |
| 6 | Week 9-10 | Integration & testing |

## Technology Stack

```
Frontend:
  - React 18+        (UI framework)
  - React Flow 11+   (Canvas)
  - Zustand          (State management)

Backend:
  - TypeScript 5.0+  (Type safety)
  - Zod             (Validation)
  - Vitest          (Testing)

Integration:
  - ORPC contracts   (Type-safe API)
  - TanStack Query   (Data fetching)
```

## Quick Stats

- **Documents**: 5 files, ~15,000 lines total
- **Plugin Categories**: CORE (required) + BUSINESS (optional)
- **Node UI Patterns**: 3 (info, editable, clickable)
- **Core Node Types**: 6 categories
- **CORE Plugins**: 8 (conditions, loops, sub-flows, flow control)
- **BUSINESS Plugins**: 10+ planned (actions, triggers, storage)
- **Variables**: Core runtime component (not a plugin)
- **Test Coverage**: 80% minimum
- **Browser Support**: Chrome, Firefox, Safari (latest 2)

## Next Actions

1. ✅ Documentation complete
2. ⏳ Create package structure
3. ⏳ Implement core engine
4. ⏳ Build plugin system
5. ⏳ Develop React Flow UI

## References

- **Full Spec**: [FLOW-BUILDER-SPECIFICATION.md](./FLOW-BUILDER-SPECIFICATION.md)
- **Code Examples**: [IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md)
- **Dev Rules**: [AGENTS.md](./AGENTS.md)
- **Package Info**: [README.md](./README.md)

---

**Questions?**
- Architecture → Read FLOW-BUILDER-SPECIFICATION.md
- Implementation → Read IMPLEMENTATION-GUIDE.md
- Development → Read AGENTS.md
- Usage → Read README.md
