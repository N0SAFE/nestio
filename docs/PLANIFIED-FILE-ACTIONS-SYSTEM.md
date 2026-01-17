# Planified File Actions System

## Overview

The Planified File Actions System is a powerful, fully customizable automation framework for processing files stored in Nestio buckets. Unlike traditional systems with preset transformations, this system provides a **plugin-based architecture** where users can define, configure, and chain custom actions on their files.

## Core Concepts

### 1. Actions
An **Action** is a discrete unit of work that can be performed on a file. Actions are:
- Fully user-defined (no presets)
- Configurable via JSON schemas
- Chainable into pipelines
- Versioned and auditable

### 2. Triggers
A **Trigger** defines when an action or pipeline should execute:
- **Event-based**: On file upload, update, delete
- **Schedule-based**: Cron expressions, intervals
- **Manual**: User-initiated
- **Conditional**: Based on file metadata, tags, or custom rules

### 3. Pipelines
A **Pipeline** is an ordered sequence of actions that process files:
- Sequential or parallel execution
- Conditional branching
- Error handling and retry policies
- Input/output mapping between actions

### 4. Action Providers
An **Action Provider** is a plugin that registers one or more actions:
- Self-contained execution logic
- Declarative configuration schema
- Resource requirements declaration
- Health checks and monitoring

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Nestio Storage API                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐   │
│  │   Triggers   │───▶│  Scheduler   │───▶│    Pipeline Executor     │   │
│  └──────────────┘    └──────────────┘    └──────────────────────────┘   │
│         │                                           │                    │
│         │            ┌──────────────┐               │                    │
│         └───────────▶│ Event Queue  │───────────────┘                    │
│                      └──────────────┘                                    │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                      Action Provider Registry                     │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │  FFmpeg     │  │  ImageMagick│  │   Custom    │   ...        │   │
│  │  │  Provider   │  │  Provider   │  │  Provider   │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                         Execution Layer                           │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │   │
│  │  │   Worker    │  │   Worker    │  │   External Executor     │  │   │
│  │  │   Pool      │  │   Sandbox   │  │   (Docker/K8s Jobs)     │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Actions Table

```sql
CREATE TABLE actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  provider_id UUID NOT NULL REFERENCES action_providers(id),
  
  -- JSON Schema for action configuration
  config_schema JSONB NOT NULL,
  
  -- Default configuration values
  default_config JSONB DEFAULT '{}',
  
  -- Resource requirements
  resource_requirements JSONB DEFAULT '{
    "cpu": "100m",
    "memory": "128Mi",
    "timeout_seconds": 300,
    "max_file_size_bytes": null
  }',
  
  -- Supported input/output types
  supported_input_types TEXT[] DEFAULT ARRAY['*/*'],
  supported_output_types TEXT[] DEFAULT ARRAY['*/*'],
  
  -- Versioning
  version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  
  -- Status
  is_enabled BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- User who created this action (for custom actions)
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_actions_provider ON actions(provider_id);
CREATE INDEX idx_actions_slug ON actions(slug);
```

### Action Providers Table

```sql
CREATE TABLE action_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  
  -- Provider type: 'builtin', 'docker', 'wasm', 'http', 'script'
  type VARCHAR(50) NOT NULL,
  
  -- Provider configuration (docker image, wasm module URL, HTTP endpoint, etc.)
  provider_config JSONB NOT NULL,
  
  -- Health check configuration
  health_check JSONB DEFAULT '{
    "enabled": true,
    "interval_seconds": 60,
    "timeout_seconds": 10,
    "endpoint": "/health"
  }',
  
  -- Status
  is_enabled BOOLEAN DEFAULT true,
  status VARCHAR(50) DEFAULT 'unknown', -- 'healthy', 'unhealthy', 'unknown'
  last_health_check TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- User who registered this provider
  registered_by UUID REFERENCES users(id)
);

CREATE INDEX idx_action_providers_slug ON action_providers(slug);
CREATE INDEX idx_action_providers_type ON action_providers(type);
```

### Pipelines Table

```sql
CREATE TABLE pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Owner (user or organization)
  owner_id UUID NOT NULL,
  owner_type VARCHAR(50) NOT NULL, -- 'user' or 'organization'
  
  -- Bucket scope (null = all buckets for this owner)
  bucket_id UUID REFERENCES buckets(id),
  
  -- Pipeline definition (see Pipeline Definition Schema below)
  definition JSONB NOT NULL,
  
  -- Execution settings
  settings JSONB DEFAULT '{
    "max_concurrent_executions": 5,
    "retry_policy": {
      "max_retries": 3,
      "backoff_multiplier": 2,
      "initial_delay_seconds": 5
    },
    "timeout_seconds": 3600,
    "on_error": "stop"
  }',
  
  -- Status
  is_enabled BOOLEAN DEFAULT true,
  
  -- Versioning
  version INTEGER DEFAULT 1,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(owner_id, owner_type, slug)
);

CREATE INDEX idx_pipelines_owner ON pipelines(owner_id, owner_type);
CREATE INDEX idx_pipelines_bucket ON pipelines(bucket_id);
```

### Triggers Table

```sql
CREATE TABLE triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  
  -- Associated pipeline
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  
  -- Trigger type: 'event', 'schedule', 'manual', 'conditional'
  type VARCHAR(50) NOT NULL,
  
  -- Trigger configuration (varies by type)
  config JSONB NOT NULL,
  
  -- Filter conditions (file patterns, metadata conditions, etc.)
  filters JSONB DEFAULT '{
    "file_patterns": ["*"],
    "content_types": ["*/*"],
    "min_size_bytes": null,
    "max_size_bytes": null,
    "metadata_conditions": []
  }',
  
  -- Status
  is_enabled BOOLEAN DEFAULT true,
  
  -- For scheduled triggers
  next_run_at TIMESTAMP WITH TIME ZONE,
  last_run_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_triggers_pipeline ON triggers(pipeline_id);
CREATE INDEX idx_triggers_type ON triggers(type);
CREATE INDEX idx_triggers_next_run ON triggers(next_run_at) WHERE type = 'schedule';
```

### Pipeline Executions Table

```sql
CREATE TABLE pipeline_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  pipeline_id UUID NOT NULL REFERENCES pipelines(id),
  trigger_id UUID REFERENCES triggers(id),
  
  -- Input file(s)
  input_objects JSONB NOT NULL, -- Array of { bucket_id, object_key }
  
  -- Execution status: 'pending', 'running', 'completed', 'failed', 'cancelled'
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  
  -- Progress tracking
  progress JSONB DEFAULT '{
    "current_step": 0,
    "total_steps": 0,
    "percentage": 0,
    "current_action": null
  }',
  
  -- Results
  output_objects JSONB, -- Array of { bucket_id, object_key }
  result JSONB,
  error JSONB,
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Execution context (variables, environment)
  context JSONB DEFAULT '{}',
  
  -- Who initiated this execution
  initiated_by UUID REFERENCES users(id),
  initiated_type VARCHAR(50) DEFAULT 'trigger', -- 'trigger', 'manual', 'api'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pipeline_executions_pipeline ON pipeline_executions(pipeline_id);
CREATE INDEX idx_pipeline_executions_status ON pipeline_executions(status);
CREATE INDEX idx_pipeline_executions_created ON pipeline_executions(created_at);
```

### Action Executions Table

```sql
CREATE TABLE action_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  pipeline_execution_id UUID NOT NULL REFERENCES pipeline_executions(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES actions(id),
  
  -- Step number in the pipeline
  step_number INTEGER NOT NULL,
  
  -- Action configuration used for this execution
  config JSONB NOT NULL,
  
  -- Status: 'pending', 'running', 'completed', 'failed', 'skipped'
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  
  -- Input/Output
  input JSONB,
  output JSONB,
  
  -- Error details
  error JSONB,
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Logs
  logs TEXT,
  
  -- Retry tracking
  attempt_number INTEGER DEFAULT 1,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_action_executions_pipeline ON action_executions(pipeline_execution_id);
CREATE INDEX idx_action_executions_action ON action_executions(action_id);
CREATE INDEX idx_action_executions_status ON action_executions(status);
```

---

## Pipeline Definition Schema

The pipeline definition is a JSON document that describes the flow of actions:

```typescript
interface PipelineDefinition {
  // Pipeline metadata
  version: '1.0';
  
  // Input schema - defines what files this pipeline accepts
  input: {
    // How many files: 'single', 'multiple', 'range'
    cardinality: 'single' | 'multiple' | { min: number; max: number };
    
    // Accepted content types
    contentTypes?: string[];
    
    // File size limits
    minSize?: number;
    maxSize?: number;
  };
  
  // Variables that can be used throughout the pipeline
  variables?: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'object' | 'array';
      default?: any;
      description?: string;
      // Can be overridden at execution time
      configurable?: boolean;
    };
  };
  
  // The actual pipeline steps
  steps: PipelineStep[];
  
  // Output configuration
  output: {
    // Where to store results
    destination: {
      // Same bucket as input, specific bucket, or dynamic
      bucket: 'source' | string | { variable: string };
      
      // Key template with variable substitution
      keyTemplate: string;
    };
    
    // What to do with original file
    sourceHandling: 'keep' | 'delete' | 'archive';
    
    // Archive destination if sourceHandling is 'archive'
    archiveDestination?: {
      bucket: string;
      keyTemplate: string;
    };
  };
  
  // Error handling
  onError?: {
    action: 'stop' | 'continue' | 'rollback';
    notification?: {
      type: 'webhook' | 'email';
      target: string;
    };
  };
}

interface PipelineStep {
  id: string;
  name: string;
  
  // The action to execute
  action: string; // Action slug
  
  // Action configuration (merged with action defaults)
  config?: Record<string, any>;
  
  // Conditional execution
  condition?: {
    // Expression language for conditions
    expression: string;
    // What to do if condition is false
    onFalse: 'skip' | 'stop';
  };
  
  // Input mapping
  input?: {
    // Map previous step outputs or variables to this step's input
    [key: string]: string | { step: string; output: string } | { variable: string };
  };
  
  // Output mapping
  output?: {
    // Store outputs in variables for later steps
    [variableName: string]: string; // output key
  };
  
  // Step-level retry configuration (overrides pipeline default)
  retry?: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelaySeconds: number;
  };
  
  // Parallel execution
  parallel?: {
    // Execute this step in parallel with others in the same group
    group: string;
    // How to handle parallel results
    aggregation?: 'all' | 'any' | 'first';
  };
}
```

### Example Pipeline Definition

```json
{
  "version": "1.0",
  "input": {
    "cardinality": "single",
    "contentTypes": ["video/*"],
    "maxSize": 5368709120
  },
  "variables": {
    "outputFormat": {
      "type": "string",
      "default": "mp4",
      "configurable": true
    },
    "quality": {
      "type": "string",
      "default": "high",
      "configurable": true
    },
    "generateThumbnail": {
      "type": "boolean",
      "default": true,
      "configurable": true
    }
  },
  "steps": [
    {
      "id": "analyze",
      "name": "Analyze Video",
      "action": "ffprobe-analyze",
      "config": {},
      "output": {
        "videoInfo": "info"
      }
    },
    {
      "id": "transcode",
      "name": "Transcode Video",
      "action": "ffmpeg-transcode",
      "config": {
        "outputFormat": "{{ variables.outputFormat }}",
        "preset": "{{ variables.quality == 'high' ? 'slow' : 'fast' }}",
        "crf": "{{ variables.quality == 'high' ? 18 : 28 }}"
      },
      "output": {
        "transcodedFile": "file"
      }
    },
    {
      "id": "thumbnail",
      "name": "Generate Thumbnail",
      "action": "ffmpeg-thumbnail",
      "condition": {
        "expression": "{{ variables.generateThumbnail }}",
        "onFalse": "skip"
      },
      "config": {
        "timestamp": "{{ videoInfo.duration / 2 }}",
        "width": 320,
        "height": -1
      },
      "output": {
        "thumbnailFile": "file"
      }
    }
  ],
  "output": {
    "destination": {
      "bucket": "source",
      "keyTemplate": "processed/{{ input.key | basename | stripext }}.{{ variables.outputFormat }}"
    },
    "sourceHandling": "archive",
    "archiveDestination": {
      "bucket": "source",
      "keyTemplate": "originals/{{ input.key }}"
    }
  },
  "onError": {
    "action": "stop",
    "notification": {
      "type": "webhook",
      "target": "{{ variables.errorWebhook }}"
    }
  }
}
```

---

## Action Provider Types

### 1. Docker Provider

Execute actions in isolated Docker containers:

```typescript
interface DockerProviderConfig {
  type: 'docker';
  
  // Docker image to use
  image: string;
  
  // Registry credentials (optional)
  registry?: {
    url: string;
    credentialsSecret: string;
  };
  
  // Command template
  command: string[];
  
  // Working directory in container
  workdir?: string;
  
  // Environment variables
  env?: Record<string, string>;
  
  // Volume mounts (input/output directories are auto-mounted)
  volumes?: Array<{
    hostPath: string;
    containerPath: string;
    readOnly?: boolean;
  }>;
  
  // Resource limits
  resources?: {
    cpuLimit?: string;
    memoryLimit?: string;
    gpuCount?: number;
  };
  
  // Network configuration
  network?: {
    mode: 'none' | 'bridge' | 'host';
    allowInternet?: boolean;
  };
}
```

### 2. WASM Provider

Execute WebAssembly modules for lightweight, sandboxed actions:

```typescript
interface WasmProviderConfig {
  type: 'wasm';
  
  // WASM module URL or inline base64
  module: string | { inline: string };
  
  // Runtime: 'wasmtime', 'wasmer', 'wazero'
  runtime?: string;
  
  // WASI capabilities
  wasi?: {
    allowFileSystem?: boolean;
    allowNetwork?: boolean;
    env?: Record<string, string>;
  };
  
  // Memory limits
  memoryLimit?: number;
  
  // Execution timeout
  timeoutMs?: number;
}
```

### 3. HTTP Provider

Call external HTTP services:

```typescript
interface HttpProviderConfig {
  type: 'http';
  
  // Base URL of the service
  baseUrl: string;
  
  // Authentication
  auth?: {
    type: 'none' | 'basic' | 'bearer' | 'api-key' | 'oauth2';
    credentialsSecret?: string;
  };
  
  // Request configuration
  request?: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH';
    headers?: Record<string, string>;
    timeout?: number;
  };
  
  // How to send files: 'multipart', 'binary', 'base64', 'url'
  fileTransfer?: 'multipart' | 'binary' | 'base64' | 'url';
  
  // Response parsing
  response?: {
    type: 'json' | 'binary' | 'text';
    fileField?: string;
  };
  
  // Health check endpoint
  healthEndpoint?: string;
}
```

### 4. Script Provider

Execute custom scripts (for advanced users):

```typescript
interface ScriptProviderConfig {
  type: 'script';
  
  // Script runtime: 'node', 'python', 'bash', 'deno'
  runtime: 'node' | 'python' | 'bash' | 'deno';
  
  // Script source
  script: string | { file: string };
  
  // Runtime version
  version?: string;
  
  // Dependencies
  dependencies?: Record<string, string>;
  
  // Sandbox configuration
  sandbox?: {
    allowNetwork?: boolean;
    allowFileSystem?: boolean;
    allowEnv?: string[];
  };
}
```

---

## Trigger Configuration

### Event Trigger

```typescript
interface EventTriggerConfig {
  type: 'event';
  
  // Events to listen for
  events: Array<
    | 'object.created'
    | 'object.updated'
    | 'object.deleted'
    | 'object.accessed'
    | 'bucket.created'
    | 'bucket.deleted'
  >;
  
  // Debounce settings (for rapid updates)
  debounce?: {
    enabled: boolean;
    windowSeconds: number;
    maxWaitSeconds: number;
  };
}
```

### Schedule Trigger

```typescript
interface ScheduleTriggerConfig {
  type: 'schedule';
  
  // Cron expression (with seconds support)
  cron?: string;
  
  // Or fixed interval
  interval?: {
    value: number;
    unit: 'seconds' | 'minutes' | 'hours' | 'days';
  };
  
  // Timezone
  timezone?: string;
  
  // File selection for scheduled runs
  fileSelection: {
    // Query to select files
    query?: {
      prefix?: string;
      suffix?: string;
      contentTypes?: string[];
      metadata?: Record<string, any>;
      
      // Age-based selection
      age?: {
        olderThan?: string; // Duration string: '1d', '2h', '30m'
        newerThan?: string;
      };
      
      // Processing status
      status?: 'unprocessed' | 'processed' | 'failed' | 'all';
    };
    
    // Limit
    maxFiles?: number;
    
    // Batch processing
    batchSize?: number;
  };
}
```

### Conditional Trigger

```typescript
interface ConditionalTriggerConfig {
  type: 'conditional';
  
  // Conditions to evaluate
  conditions: Array<{
    // Field to check
    field: 'size' | 'contentType' | 'metadata.*' | 'key' | 'age';
    
    // Operator
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'matches' | 'exists';
    
    // Value to compare
    value: any;
  }>;
  
  // How to combine conditions: 'and' | 'or'
  combinator: 'and' | 'or';
  
  // Base trigger (conditions are evaluated on top of this)
  baseTrigger: EventTriggerConfig | ScheduleTriggerConfig;
}
```

---

## API Endpoints

### Action Provider Management

```typescript
// Register a new action provider
POST /api/action-providers
{
  name: string;
  slug: string;
  description?: string;
  type: 'docker' | 'wasm' | 'http' | 'script';
  providerConfig: DockerProviderConfig | WasmProviderConfig | HttpProviderConfig | ScriptProviderConfig;
  healthCheck?: HealthCheckConfig;
}

// List action providers
GET /api/action-providers
Query: { type?: string; status?: string; page?: number; limit?: number }

// Get action provider details
GET /api/action-providers/:id

// Update action provider
PATCH /api/action-providers/:id

// Delete action provider
DELETE /api/action-providers/:id

// Test action provider health
POST /api/action-providers/:id/health-check
```

### Action Management

```typescript
// Register a new action
POST /api/actions
{
  name: string;
  slug: string;
  description?: string;
  providerId: string;
  configSchema: JSONSchema;
  defaultConfig?: Record<string, any>;
  resourceRequirements?: ResourceRequirements;
  supportedInputTypes?: string[];
  supportedOutputTypes?: string[];
}

// List actions
GET /api/actions
Query: { providerId?: string; inputType?: string; search?: string; page?: number; limit?: number }

// Get action details
GET /api/actions/:id

// Update action
PATCH /api/actions/:id

// Delete action
DELETE /api/actions/:id

// Test action with sample input
POST /api/actions/:id/test
{
  config: Record<string, any>;
  sampleFile?: { bucket: string; key: string } | { url: string };
}
```

### Pipeline Management

```typescript
// Create a new pipeline
POST /api/pipelines
{
  name: string;
  slug: string;
  description?: string;
  bucketId?: string;
  definition: PipelineDefinition;
  settings?: PipelineSettings;
}

// List pipelines
GET /api/pipelines
Query: { bucketId?: string; search?: string; page?: number; limit?: number }

// Get pipeline details
GET /api/pipelines/:id

// Update pipeline
PATCH /api/pipelines/:id

// Delete pipeline
DELETE /api/pipelines/:id

// Validate pipeline definition
POST /api/pipelines/validate
{
  definition: PipelineDefinition;
}

// Clone pipeline
POST /api/pipelines/:id/clone
{
  name: string;
  slug: string;
}
```

### Trigger Management

```typescript
// Create a trigger
POST /api/pipelines/:pipelineId/triggers
{
  name: string;
  type: 'event' | 'schedule' | 'conditional';
  config: EventTriggerConfig | ScheduleTriggerConfig | ConditionalTriggerConfig;
  filters?: TriggerFilters;
}

// List triggers for a pipeline
GET /api/pipelines/:pipelineId/triggers

// Update trigger
PATCH /api/pipelines/:pipelineId/triggers/:triggerId

// Delete trigger
DELETE /api/pipelines/:pipelineId/triggers/:triggerId

// Enable/disable trigger
POST /api/pipelines/:pipelineId/triggers/:triggerId/enable
POST /api/pipelines/:pipelineId/triggers/:triggerId/disable
```

### Execution Management

```typescript
// Execute pipeline manually
POST /api/pipelines/:id/execute
{
  inputObjects: Array<{ bucket: string; key: string }>;
  variables?: Record<string, any>;
  dryRun?: boolean;
}

// List executions
GET /api/pipelines/:id/executions
Query: { status?: string; from?: string; to?: string; page?: number; limit?: number }

// Get execution details
GET /api/pipeline-executions/:id

// Get execution logs
GET /api/pipeline-executions/:id/logs
Query: { stepId?: string; level?: string }

// Cancel execution
POST /api/pipeline-executions/:id/cancel

// Retry failed execution
POST /api/pipeline-executions/:id/retry
{
  fromStep?: string; // Resume from specific step
}
```

---

## ORPC Contracts

### Action Provider Contracts

```typescript
// packages/contracts/api/modules/action-provider/index.ts

import { oc } from "@orpc/contract";
import { z } from "zod";

const ActionProviderSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  type: z.enum(['docker', 'wasm', 'http', 'script']),
  providerConfig: z.record(z.unknown()),
  healthCheck: z.record(z.unknown()).nullable(),
  isEnabled: z.boolean(),
  status: z.enum(['healthy', 'unhealthy', 'unknown']),
  lastHealthCheck: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const CreateActionProviderSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  type: z.enum(['docker', 'wasm', 'http', 'script']),
  providerConfig: z.record(z.unknown()),
  healthCheck: z.record(z.unknown()).optional(),
});

export const actionProviderContract = oc.tag("ActionProvider").prefix("/action-providers").router({
  list: oc.route({ method: 'GET', path: '/' })
    .input(z.object({
      type: z.enum(['docker', 'wasm', 'http', 'script']).optional(),
      status: z.enum(['healthy', 'unhealthy', 'unknown']).optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .output(z.object({
      providers: z.array(ActionProviderSchema),
      total: z.number(),
      page: z.number(),
      limit: z.number(),
    })),
    
  create: oc.route({ method: 'POST', path: '/' })
    .input(CreateActionProviderSchema)
    .output(ActionProviderSchema),
    
  findById: oc.route({ method: 'GET', path: '/{id}' })
    .input(z.object({ id: z.string().uuid() }))
    .output(ActionProviderSchema),
    
  update: oc.route({ method: 'PATCH', path: '/{id}' })
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      providerConfig: z.record(z.unknown()).optional(),
      healthCheck: z.record(z.unknown()).optional(),
      isEnabled: z.boolean().optional(),
    }))
    .output(ActionProviderSchema),
    
  delete: oc.route({ method: 'DELETE', path: '/{id}' })
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ success: z.boolean() })),
    
  healthCheck: oc.route({ method: 'POST', path: '/{id}/health-check' })
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({
      status: z.enum(['healthy', 'unhealthy']),
      latencyMs: z.number(),
      details: z.record(z.unknown()).optional(),
    })),
});
```

### Pipeline Contracts

```typescript
// packages/contracts/api/modules/pipeline/index.ts

import { oc } from "@orpc/contract";
import { z } from "zod";

const PipelineStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  action: z.string(),
  config: z.record(z.unknown()).optional(),
  condition: z.object({
    expression: z.string(),
    onFalse: z.enum(['skip', 'stop']),
  }).optional(),
  input: z.record(z.unknown()).optional(),
  output: z.record(z.string()).optional(),
  retry: z.object({
    maxRetries: z.number(),
    backoffMultiplier: z.number(),
    initialDelaySeconds: z.number(),
  }).optional(),
  parallel: z.object({
    group: z.string(),
    aggregation: z.enum(['all', 'any', 'first']).optional(),
  }).optional(),
});

const PipelineDefinitionSchema = z.object({
  version: z.literal('1.0'),
  input: z.object({
    cardinality: z.union([
      z.enum(['single', 'multiple']),
      z.object({ min: z.number(), max: z.number() }),
    ]),
    contentTypes: z.array(z.string()).optional(),
    minSize: z.number().optional(),
    maxSize: z.number().optional(),
  }),
  variables: z.record(z.object({
    type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
    default: z.unknown().optional(),
    description: z.string().optional(),
    configurable: z.boolean().optional(),
  })).optional(),
  steps: z.array(PipelineStepSchema),
  output: z.object({
    destination: z.object({
      bucket: z.union([z.literal('source'), z.string(), z.object({ variable: z.string() })]),
      keyTemplate: z.string(),
    }),
    sourceHandling: z.enum(['keep', 'delete', 'archive']),
    archiveDestination: z.object({
      bucket: z.string(),
      keyTemplate: z.string(),
    }).optional(),
  }),
  onError: z.object({
    action: z.enum(['stop', 'continue', 'rollback']),
    notification: z.object({
      type: z.enum(['webhook', 'email']),
      target: z.string(),
    }).optional(),
  }).optional(),
});

const PipelineSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  ownerId: z.string().uuid(),
  ownerType: z.enum(['user', 'organization']),
  bucketId: z.string().uuid().nullable(),
  definition: PipelineDefinitionSchema,
  settings: z.record(z.unknown()),
  isEnabled: z.boolean(),
  version: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const pipelineContract = oc.tag("Pipeline").prefix("/pipelines").router({
  list: oc.route({ method: 'GET', path: '/' })
    .input(z.object({
      bucketId: z.string().uuid().optional(),
      search: z.string().optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .output(z.object({
      pipelines: z.array(PipelineSchema),
      total: z.number(),
      page: z.number(),
      limit: z.number(),
    })),
    
  create: oc.route({ method: 'POST', path: '/' })
    .input(z.object({
      name: z.string().min(1).max(255),
      slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
      description: z.string().optional(),
      bucketId: z.string().uuid().optional(),
      definition: PipelineDefinitionSchema,
      settings: z.record(z.unknown()).optional(),
    }))
    .output(PipelineSchema),
    
  findById: oc.route({ method: 'GET', path: '/{id}' })
    .input(z.object({ id: z.string().uuid() }))
    .output(PipelineSchema),
    
  update: oc.route({ method: 'PATCH', path: '/{id}' })
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      definition: PipelineDefinitionSchema.optional(),
      settings: z.record(z.unknown()).optional(),
      isEnabled: z.boolean().optional(),
    }))
    .output(PipelineSchema),
    
  delete: oc.route({ method: 'DELETE', path: '/{id}' })
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ success: z.boolean() })),
    
  validate: oc.route({ method: 'POST', path: '/validate' })
    .input(z.object({ definition: PipelineDefinitionSchema }))
    .output(z.object({
      valid: z.boolean(),
      errors: z.array(z.object({
        path: z.string(),
        message: z.string(),
      })),
      warnings: z.array(z.object({
        path: z.string(),
        message: z.string(),
      })),
    })),
    
  execute: oc.route({ method: 'POST', path: '/{id}/execute' })
    .input(z.object({
      id: z.string().uuid(),
      inputObjects: z.array(z.object({
        bucket: z.string(),
        key: z.string(),
      })),
      variables: z.record(z.unknown()).optional(),
      dryRun: z.boolean().optional(),
    }))
    .output(z.object({
      executionId: z.string().uuid(),
      status: z.string(),
      dryRunResult: z.object({
        steps: z.array(z.object({
          id: z.string(),
          action: z.string(),
          wouldExecute: z.boolean(),
          estimatedDuration: z.number().optional(),
        })),
      }).optional(),
    })),
});
```

---

## Frontend Components

### Pipeline Builder

A visual drag-and-drop interface for building pipelines:

```typescript
// apps/web/src/domains/pipelines/components/PipelineBuilder.tsx

interface PipelineBuilderProps {
  initialDefinition?: PipelineDefinition;
  availableActions: Action[];
  onSave: (definition: PipelineDefinition) => void;
  onTest?: (definition: PipelineDefinition) => void;
}

// Key features:
// - Drag & drop action nodes
// - Visual connection lines between steps
// - Inline configuration editors with JSON Schema forms
// - Real-time validation
// - Test execution with sample files
// - Import/Export pipeline definitions
```

### Execution Monitor

Real-time execution monitoring dashboard:

```typescript
// apps/web/src/domains/pipelines/components/ExecutionMonitor.tsx

interface ExecutionMonitorProps {
  executionId: string;
  onCancel?: () => void;
}

// Key features:
// - Real-time progress updates (WebSocket)
// - Step-by-step visualization
// - Live log streaming
// - Resource usage graphs
// - Error details with stack traces
// - Retry/Cancel controls
```

---

## Implementation Roadmap

### Phase 1: Foundation (2-3 weeks)

1. **Database Schema**
   - Create all tables with migrations
   - Set up indexes and constraints
   - Add audit logging triggers

2. **Core API**
   - Action Provider CRUD
   - Action CRUD
   - Pipeline CRUD with validation
   - Basic trigger management

3. **Built-in Providers**
   - Docker provider implementation
   - HTTP provider implementation
   - Basic health check system

### Phase 2: Execution Engine (2-3 weeks)

1. **Pipeline Executor**
   - Step execution logic
   - Variable substitution engine
   - Condition evaluator
   - Error handling and retries

2. **Worker System**
   - Job queue (BullMQ/PostgreSQL)
   - Worker pool management
   - Resource allocation

3. **Event System**
   - Storage event hooks
   - Event trigger processor
   - Debouncing logic

### Phase 3: Scheduling & Monitoring (1-2 weeks)

1. **Scheduler**
   - Cron parser and scheduler
   - File selection queries
   - Batch processing

2. **Monitoring**
   - Execution logging
   - Progress tracking
   - Metrics collection

### Phase 4: UI & Polish (2-3 weeks)

1. **Pipeline Builder UI**
   - Visual editor
   - Action catalog
   - Configuration forms

2. **Execution Dashboard**
   - Real-time updates
   - Log viewer
   - Analytics

3. **Documentation**
   - API documentation
   - Action development guide
   - Best practices

---

## Security Considerations

### Action Isolation

- All actions run in isolated environments (containers, WASM sandboxes)
- No direct access to host filesystem or network by default
- Resource limits enforced at runtime
- Secrets managed through secure vault integration

### Input Validation

- All pipeline definitions validated against schema
- User-provided scripts sandboxed
- File type and size validation before processing
- Rate limiting on API endpoints

### Audit Trail

- All operations logged with user context
- Pipeline version history maintained
- Execution logs retained for configurable period
- Sensitive data masked in logs

---

## Real-Time Event Streaming

The Planified File Actions System uses ORPC's `eventIterator` pattern combined with NestJS's event module for type-safe, real-time progress streaming to the frontend.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend (React)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    TanStack Query Hooks                              │   │
│  │  usePipelineExecutionProgress() - SSE-based live updates            │   │
│  │  usePipelineExecutionProgressStream() - One-time stream fetch       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      ORPC Client                                     │   │
│  │  orpc.pipeline.executionProgress.call() → AsyncIterator<Progress>   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Server-Sent Events (SSE)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Backend (NestJS)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                  ORPC Pipeline Controller                            │   │
│  │  @Implement(pipelineContract.executionProgress)                     │   │
│  │  → Returns async generator yielding progress events                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              PipelineEventService (extends BaseEventService)        │   │
│  │  - subscribe('executionProgress', { executionId })                  │   │
│  │  - emit('executionProgress', input, progressData)                   │   │
│  │  - Type-safe contracts with Zod validation                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Pipeline Executor Service                         │   │
│  │  - Emits progress events during execution                           │   │
│  │  - Supports ABORT strategy for cancellation                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Event Contracts Definition

```typescript
// apps/api/src/modules/pipeline/events/pipeline-event.contracts.ts

import { z } from "zod/v4";
import { contractBuilder, ProcessingStrategy } from "@/core/modules/events";

/**
 * Pipeline Event Types
 */
export const PipelineExecutionStatus = z.enum([
  "pending",
  "running", 
  "completed",
  "failed",
  "cancelled",
]);

export const ActionExecutionStatus = z.enum([
  "pending",
  "running",
  "completed", 
  "failed",
  "skipped",
]);

/**
 * Progress event payload - emitted during pipeline execution
 */
export const ExecutionProgressSchema = z.object({
  executionId: z.string().uuid(),
  pipelineId: z.string().uuid(),
  status: PipelineExecutionStatus,
  
  // Overall progress
  progress: z.object({
    currentStep: z.number(),
    totalSteps: z.number(),
    percentage: z.number().min(0).max(100),
  }),
  
  // Current action details
  currentAction: z.object({
    id: z.string(),
    name: z.string(),
    status: ActionExecutionStatus,
    startedAt: z.string().datetime().optional(),
    progress: z.number().min(0).max(100).optional(),
    message: z.string().optional(),
  }).nullable(),
  
  // Completed actions summary
  completedActions: z.array(z.object({
    id: z.string(),
    name: z.string(),
    status: ActionExecutionStatus,
    duration: z.number(), // milliseconds
  })),
  
  // Error details (if failed)
  error: z.object({
    code: z.string(),
    message: z.string(),
    actionId: z.string().optional(),
    stack: z.string().optional(),
  }).nullable(),
  
  // Timing
  startedAt: z.string().datetime().optional(),
  estimatedCompletion: z.string().datetime().optional(),
  
  // Metadata
  timestamp: z.number(),
});

export type ExecutionProgress = z.infer<typeof ExecutionProgressSchema>;

/**
 * Action-level progress event - granular updates within an action
 */
export const ActionProgressSchema = z.object({
  executionId: z.string().uuid(),
  actionId: z.string(),
  actionName: z.string(),
  
  // Progress within the action
  progress: z.number().min(0).max(100),
  message: z.string().optional(),
  
  // For file processing actions
  bytesProcessed: z.number().optional(),
  totalBytes: z.number().optional(),
  
  // Custom metrics from action provider
  metrics: z.record(z.unknown()).optional(),
  
  timestamp: z.number(),
});

export type ActionProgress = z.infer<typeof ActionProgressSchema>;

/**
 * Pipeline Event Contracts
 * Type-safe event definitions for the PipelineEventService
 */
export const pipelineEventContracts = {
  /**
   * Execution progress - high-level pipeline execution updates
   * Uses ABORT strategy: new subscription cancels previous for same executionId
   */
  executionProgress: contractBuilder()
    .input(z.object({ 
      executionId: z.string().uuid(),
    }))
    .output(ExecutionProgressSchema)
    .strategy(ProcessingStrategy.ABORT, {
      onAbort: (input, { signal }) => {
        console.log(`Aborting progress stream for execution ${input.executionId}`);
      },
    })
    .build(),

  /**
   * Action progress - granular progress within a single action
   * Uses PARALLEL strategy: multiple actions can emit simultaneously
   */
  actionProgress: contractBuilder()
    .input(z.object({ 
      executionId: z.string().uuid(),
      actionId: z.string(),
    }))
    .output(ActionProgressSchema)
    .strategy(ProcessingStrategy.PARALLEL)
    .build(),

  /**
   * Execution log - real-time log streaming
   */
  executionLog: contractBuilder()
    .input(z.object({ 
      executionId: z.string().uuid(),
      level: z.enum(["debug", "info", "warn", "error"]).optional(),
    }))
    .output(z.object({
      executionId: z.string().uuid(),
      actionId: z.string().optional(),
      level: z.enum(["debug", "info", "warn", "error"]),
      message: z.string(),
      data: z.record(z.unknown()).optional(),
      timestamp: z.number(),
    }))
    .strategy(ProcessingStrategy.PARALLEL)
    .build(),
} as const;

export type PipelineEventContracts = typeof pipelineEventContracts;
```

### Event Service Implementation

```typescript
// apps/api/src/modules/pipeline/events/pipeline-event.service.ts

import { Injectable } from "@nestjs/common";
import { BaseEventService } from "@/core/modules/events";
import { 
  pipelineEventContracts, 
  type PipelineEventContracts,
  type ExecutionProgress,
  type ActionProgress,
} from "./pipeline-event.contracts";

/**
 * Pipeline Event Service
 * 
 * Provides type-safe event emission and subscription for pipeline execution.
 * Extends BaseEventService with pipeline-specific event contracts.
 * 
 * @example
 * ```typescript
 * // In PipelineExecutorService
 * @Injectable()
 * class PipelineExecutorService {
 *   constructor(private pipelineEvents: PipelineEventService) {}
 *   
 *   async executePipeline(executionId: string) {
 *     // Emit progress updates
 *     this.pipelineEvents.emit('executionProgress', 
 *       { executionId },
 *       { 
 *         executionId,
 *         status: 'running',
 *         progress: { currentStep: 1, totalSteps: 5, percentage: 20 },
 *         // ... rest of progress data
 *       }
 *     );
 *   }
 * }
 * 
 * // In PipelineController (ORPC handler)
 * @Implement(pipelineContract.executionProgress)
 * executionProgress() {
 *   return implement(pipelineContract.executionProgress)
 *     .use(requireAuth())
 *     .handler(async function* ({ input }) {
 *       const subscription = this.pipelineEvents.subscribe(
 *         'executionProgress',
 *         { executionId: input.executionId }
 *       );
 *       
 *       for await (const progress of subscription) {
 *         yield progress;
 *         if (progress.status === 'completed' || progress.status === 'failed') {
 *           break;
 *         }
 *       }
 *     });
 * }
 * ```
 */
@Injectable()
export class PipelineEventService extends BaseEventService<PipelineEventContracts> {
  constructor() {
    super("pipeline", pipelineEventContracts);
  }

  /**
   * Build full event name for pipeline events
   * Format: pipeline:{eventName}:{executionId}[:actionId]
   */
  protected buildFullEventName(
    eventName: string,
    input: Record<string, unknown>
  ): string {
    const executionId = input.executionId as string;
    const actionId = input.actionId as string | undefined;
    
    if (actionId) {
      return `pipeline:${eventName}:${executionId}:${actionId}`;
    }
    return `pipeline:${eventName}:${executionId}`;
  }

  // =========================================================================
  // Convenience methods for common operations
  // =========================================================================

  /**
   * Emit execution started event
   */
  emitExecutionStarted(executionId: string, pipelineId: string, totalSteps: number): void {
    this.emit("executionProgress", { executionId }, {
      executionId,
      pipelineId,
      status: "running",
      progress: { currentStep: 0, totalSteps, percentage: 0 },
      currentAction: null,
      completedActions: [],
      error: null,
      startedAt: new Date().toISOString(),
      timestamp: Date.now(),
    });
  }

  /**
   * Emit action started event
   */
  emitActionStarted(
    executionId: string, 
    pipelineId: string,
    actionId: string, 
    actionName: string,
    stepNumber: number,
    totalSteps: number
  ): void {
    this.emit("executionProgress", { executionId }, {
      executionId,
      pipelineId,
      status: "running",
      progress: { 
        currentStep: stepNumber, 
        totalSteps, 
        percentage: Math.round((stepNumber / totalSteps) * 100),
      },
      currentAction: {
        id: actionId,
        name: actionName,
        status: "running",
        startedAt: new Date().toISOString(),
        progress: 0,
      },
      completedActions: [],
      error: null,
      timestamp: Date.now(),
    });
  }

  /**
   * Emit action progress update
   */
  emitActionProgress(
    executionId: string,
    actionId: string,
    actionName: string,
    progress: number,
    message?: string,
    bytesProcessed?: number,
    totalBytes?: number
  ): void {
    this.emit("actionProgress", { executionId, actionId }, {
      executionId,
      actionId,
      actionName,
      progress,
      message,
      bytesProcessed,
      totalBytes,
      timestamp: Date.now(),
    });
  }

  /**
   * Emit execution completed event
   */
  emitExecutionCompleted(
    executionId: string, 
    pipelineId: string,
    completedActions: ExecutionProgress["completedActions"]
  ): void {
    this.emit("executionProgress", { executionId }, {
      executionId,
      pipelineId,
      status: "completed",
      progress: { 
        currentStep: completedActions.length, 
        totalSteps: completedActions.length, 
        percentage: 100,
      },
      currentAction: null,
      completedActions,
      error: null,
      timestamp: Date.now(),
    });
  }

  /**
   * Emit execution failed event
   */
  emitExecutionFailed(
    executionId: string,
    pipelineId: string,
    error: ExecutionProgress["error"],
    completedActions: ExecutionProgress["completedActions"]
  ): void {
    this.emit("executionProgress", { executionId }, {
      executionId,
      pipelineId,
      status: "failed",
      progress: { 
        currentStep: completedActions.length, 
        totalSteps: completedActions.length, 
        percentage: Math.round((completedActions.length / completedActions.length) * 100) || 0,
      },
      currentAction: null,
      completedActions,
      error,
      timestamp: Date.now(),
    });
  }

  /**
   * Emit log entry
   */
  emitLog(
    executionId: string,
    level: "debug" | "info" | "warn" | "error",
    message: string,
    actionId?: string,
    data?: Record<string, unknown>
  ): void {
    this.emit("executionLog", { executionId }, {
      executionId,
      actionId,
      level,
      message,
      data,
      timestamp: Date.now(),
    });
  }
}
```

### ORPC Streaming Contracts

```typescript
// packages/contracts/api/modules/pipeline/execution-progress.ts

import { oc, eventIterator } from "@orpc/contract";
import { z } from "zod/v4";

/**
 * Execution progress streaming contract
 * Uses eventIterator for Server-Sent Events (SSE) streaming
 */
export const pipelineExecutionProgressContract = oc.route({
  method: "GET",
  path: "/{executionId}/progress",
  summary: "Stream execution progress",
  description: "Subscribe to real-time progress updates for a pipeline execution via SSE",
})
.input(z.object({
  executionId: z.string().uuid().describe("Pipeline execution ID to monitor"),
}))
.output(
  eventIterator(
    z.object({
      executionId: z.string().uuid(),
      pipelineId: z.string().uuid(),
      status: z.enum(["pending", "running", "completed", "failed", "cancelled"]),
      
      progress: z.object({
        currentStep: z.number(),
        totalSteps: z.number(),
        percentage: z.number(),
      }),
      
      currentAction: z.object({
        id: z.string(),
        name: z.string(),
        status: z.enum(["pending", "running", "completed", "failed", "skipped"]),
        startedAt: z.string().datetime().optional(),
        progress: z.number().optional(),
        message: z.string().optional(),
      }).nullable(),
      
      completedActions: z.array(z.object({
        id: z.string(),
        name: z.string(),
        status: z.enum(["pending", "running", "completed", "failed", "skipped"]),
        duration: z.number(),
      })),
      
      error: z.object({
        code: z.string(),
        message: z.string(),
        actionId: z.string().optional(),
      }).nullable(),
      
      timestamp: z.number(),
    })
  )
);

/**
 * Action-level progress streaming contract
 * For granular updates within a specific action
 */
export const pipelineActionProgressContract = oc.route({
  method: "GET",
  path: "/{executionId}/actions/{actionId}/progress",
  summary: "Stream action progress",
  description: "Subscribe to real-time progress updates for a specific action",
})
.input(z.object({
  executionId: z.string().uuid(),
  actionId: z.string(),
}))
.output(
  eventIterator(
    z.object({
      executionId: z.string().uuid(),
      actionId: z.string(),
      actionName: z.string(),
      progress: z.number(),
      message: z.string().optional(),
      bytesProcessed: z.number().optional(),
      totalBytes: z.number().optional(),
      metrics: z.record(z.unknown()).optional(),
      timestamp: z.number(),
    })
  )
);

/**
 * Execution logs streaming contract
 */
export const pipelineExecutionLogsContract = oc.route({
  method: "GET",
  path: "/{executionId}/logs",
  summary: "Stream execution logs",
  description: "Subscribe to real-time log output for a pipeline execution",
})
.input(z.object({
  executionId: z.string().uuid(),
  level: z.enum(["debug", "info", "warn", "error"]).optional(),
}))
.output(
  eventIterator(
    z.object({
      executionId: z.string().uuid(),
      actionId: z.string().optional(),
      level: z.enum(["debug", "info", "warn", "error"]),
      message: z.string(),
      data: z.record(z.unknown()).optional(),
      timestamp: z.number(),
    })
  )
);

// Type exports
export type PipelineExecutionProgressInput = z.infer<
  typeof pipelineExecutionProgressContract["~orpc"]["inputSchema"]
>;
export type PipelineExecutionProgressOutput = z.infer<
  typeof pipelineExecutionProgressContract["~orpc"]["outputSchema"]
>;
```

### Controller Implementation

```typescript
// apps/api/src/modules/pipeline/controllers/pipeline.controller.ts

import { Controller } from "@nestjs/common";
import { implement, Implement } from "@orpc/nest";
import { pipelineContract } from "@repo/api-contracts";
import { requireAuth } from "@/core/modules/auth/orpc/middlewares";
import { PipelineEventService } from "../events/pipeline-event.service";
import { PipelineService } from "../services/pipeline.service";

@Controller()
export class PipelineController {
  constructor(
    private readonly pipelineService: PipelineService,
    private readonly pipelineEvents: PipelineEventService,
  ) {}

  /**
   * Stream execution progress via SSE
   * 
   * This endpoint returns an async generator that yields progress events.
   * ORPC automatically handles the SSE streaming protocol.
   */
  @Implement(pipelineContract.executionProgress)
  executionProgress() {
    const pipelineEvents = this.pipelineEvents;
    const pipelineService = this.pipelineService;
    
    return implement(pipelineContract.executionProgress)
      .use(requireAuth())
      .handler(async function* ({ input, context }) {
        const { executionId } = input;
        
        // Verify user has access to this execution
        const execution = await pipelineService.getExecution(executionId);
        if (!execution) {
          throw new Error(`Execution ${executionId} not found`);
        }
        
        // Check ownership/permissions
        await pipelineService.verifyExecutionAccess(execution, context.auth.user.id);
        
        // If execution is already completed, yield final state and return
        if (execution.status === "completed" || execution.status === "failed") {
          yield {
            executionId: execution.id,
            pipelineId: execution.pipelineId,
            status: execution.status,
            progress: execution.progress,
            currentAction: null,
            completedActions: execution.completedActions ?? [],
            error: execution.error ?? null,
            timestamp: Date.now(),
          };
          return;
        }
        
        // Subscribe to live progress updates
        const subscription = pipelineEvents.subscribe(
          "executionProgress",
          { executionId }
        );
        
        // Yield events as they arrive
        for await (const progress of subscription) {
          yield progress;
          
          // Stop streaming when execution completes
          if (
            progress.status === "completed" || 
            progress.status === "failed" ||
            progress.status === "cancelled"
          ) {
            break;
          }
        }
      });
  }

  /**
   * Stream action-level progress via SSE
   */
  @Implement(pipelineContract.actionProgress)
  actionProgress() {
    const pipelineEvents = this.pipelineEvents;
    const pipelineService = this.pipelineService;
    
    return implement(pipelineContract.actionProgress)
      .use(requireAuth())
      .handler(async function* ({ input, context }) {
        const { executionId, actionId } = input;
        
        // Verify access
        const execution = await pipelineService.getExecution(executionId);
        if (!execution) {
          throw new Error(`Execution ${executionId} not found`);
        }
        await pipelineService.verifyExecutionAccess(execution, context.auth.user.id);
        
        // Subscribe to action progress
        const subscription = pipelineEvents.subscribe(
          "actionProgress",
          { executionId, actionId }
        );
        
        for await (const progress of subscription) {
          yield progress;
          
          // Stop when action reaches 100%
          if (progress.progress >= 100) {
            break;
          }
        }
      });
  }

  /**
   * Stream execution logs via SSE
   */
  @Implement(pipelineContract.executionLogs)
  executionLogs() {
    const pipelineEvents = this.pipelineEvents;
    const pipelineService = this.pipelineService;
    
    return implement(pipelineContract.executionLogs)
      .use(requireAuth())
      .handler(async function* ({ input, context }) {
        const { executionId, level } = input;
        
        // Verify access
        const execution = await pipelineService.getExecution(executionId);
        if (!execution) {
          throw new Error(`Execution ${executionId} not found`);
        }
        await pipelineService.verifyExecutionAccess(execution, context.auth.user.id);
        
        // Subscribe to logs
        const subscription = pipelineEvents.subscribe(
          "executionLog",
          { executionId, level }
        );
        
        for await (const log of subscription) {
          // Filter by level if specified
          if (level && log.level !== level) {
            continue;
          }
          yield log;
        }
      });
  }

  /**
   * Execute pipeline with progress streaming
   * 
   * This endpoint starts execution and returns immediately with executionId.
   * Use executionProgress endpoint to stream progress updates.
   */
  @Implement(pipelineContract.execute)
  execute() {
    const pipelineService = this.pipelineService;
    
    return implement(pipelineContract.execute)
      .use(requireAuth())
      .handler(async ({ input, context }) => {
        const { id: pipelineId, inputObjects, variables, dryRun } = input;
        
        // Validate pipeline access
        const pipeline = await pipelineService.getPipeline(pipelineId);
        if (!pipeline) {
          throw new Error(`Pipeline ${pipelineId} not found`);
        }
        
        // Start execution (async, returns immediately)
        const execution = await pipelineService.startExecution({
          pipelineId,
          inputObjects,
          variables,
          dryRun,
          userId: context.auth.user.id,
        });
        
        return {
          executionId: execution.id,
          status: execution.status,
          dryRunResult: dryRun ? execution.dryRunResult : undefined,
        };
      });
  }
}
```

### Frontend Hook Usage

The hooks use ORPC's TanStack Query integration with `experimental_liveOptions` and `experimental_streamedOptions` for type-safe, reactive streaming.

```typescript
// apps/web/src/domains/pipelines/hooks.ts

import { useQuery, useMutation, useQueryClient, skipToken } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { useCallback, useState } from "react";

// ============================================================================
// LIVE OPTIONS - Always shows latest event (replaces previous)
// Best for: Progress updates where you only care about current state
// ============================================================================

/**
 * Hook for streaming pipeline execution progress
 * Uses experimental_liveOptions - data is always the latest progress event
 * 
 * @example
 * ```tsx
 * function ExecutionMonitor({ executionId }: { executionId: string }) {
 *   const { data: progress, isLoading, error } = usePipelineExecutionProgress(executionId);
 *   
 *   if (isLoading) return <Spinner />;
 *   if (error) return <ErrorDisplay error={error} />;
 *   
 *   return (
 *     <div>
 *       <ProgressBar value={progress?.progress.percentage ?? 0} />
 *       <span>Step {progress?.progress.currentStep} of {progress?.progress.totalSteps}</span>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePipelineExecutionProgress(executionId: string | null) {
  return useQuery(
    orpc.pipeline.executionProgress.experimental_liveOptions({
      input: executionId ? { executionId } : skipToken,
      retry: true, // Infinite retry for reliable streaming
      refetchOnWindowFocus: false, // Don't restart stream on focus
      staleTime: Infinity, // Stream data is always fresh
    })
  );
}

/**
 * Hook for streaming action-level progress
 * Uses experimental_liveOptions - shows latest action progress
 */
export function useActionProgress(executionId: string | null, actionId: string | null) {
  return useQuery(
    orpc.pipeline.actionProgress.experimental_liveOptions({
      input: executionId && actionId ? { executionId, actionId } : skipToken,
      retry: true,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    })
  );
}

// ============================================================================
// STREAMED OPTIONS - Accumulates events into array
// Best for: Logs, history, or when you need all events
// ============================================================================

/**
 * Hook for streaming execution logs
 * Uses experimental_streamedOptions - accumulates all log entries
 * 
 * @example
 * ```tsx
 * function LogViewer({ executionId }: { executionId: string }) {
 *   const { data: logs } = useExecutionLogs(executionId);
 *   
 *   return (
 *     <div className="font-mono text-sm">
 *       {logs?.map((log, i) => (
 *         <div key={i} className={`log-${log.level}`}>
 *           [{log.level}] {log.message}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useExecutionLogs(
  executionId: string | null, 
  level?: "debug" | "info" | "warn" | "error"
) {
  return useQuery(
    orpc.pipeline.executionLogs.experimental_streamedOptions({
      input: executionId ? { executionId, level } : skipToken,
      queryFnOptions: {
        refetchMode: "reset", // Clear logs on refetch
        maxChunks: 1000, // Limit to last 1000 log entries
      },
      retry: true,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    })
  );
}

/**
 * Hook for streaming completed actions history
 * Uses experimental_streamedOptions - builds up action completion history
 */
export function useCompletedActionsStream(executionId: string | null) {
  return useQuery(
    orpc.pipeline.completedActions.experimental_streamedOptions({
      input: executionId ? { executionId } : skipToken,
      queryFnOptions: {
        refetchMode: "append", // Append new completions
      },
      retry: true,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    })
  );
}

// ============================================================================
// COMPOSITE HOOKS - Combine mutations with streaming
// ============================================================================

/**
 * Hook for executing a pipeline with automatic progress streaming
 * Combines mutation (start execution) with live query (progress stream)
 * 
 * @example
 * ```tsx
 * function PipelineRunner({ pipelineId }: { pipelineId: string }) {
 *   const {
 *     execute,
 *     progress,
 *     isExecuting,
 *     isStreaming,
 *     isCompleted,
 *     isFailed,
 *     reset,
 *   } = useExecutePipeline();
 * 
 *   const handleRun = () => {
 *     execute({
 *       pipelineId,
 *       inputObjects: [{ bucket: "my-bucket", key: "file.txt" }],
 *     });
 *   };
 * 
 *   return (
 *     <div>
 *       <Button onClick={handleRun} disabled={isExecuting || isStreaming}>
 *         {isExecuting ? "Starting..." : isStreaming ? "Running..." : "Execute"}
 *       </Button>
 *       {progress && <ExecutionProgress progress={progress} />}
 *       {isCompleted && <SuccessMessage onDismiss={reset} />}
 *       {isFailed && <ErrorMessage error={progress?.error} onRetry={reset} />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useExecutePipeline() {
  const [executionId, setExecutionId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  // Mutation to start execution
  const executeMutation = useMutation(
    orpc.pipeline.execute.mutationOptions({
      onSuccess: (result) => {
        setExecutionId(result.executionId);
      },
      onError: () => {
        setExecutionId(null);
      },
    })
  );

  // Live progress stream (automatically enabled when executionId is set)
  const progressQuery = usePipelineExecutionProgress(executionId);

  // Derived state
  const progress = progressQuery.data;
  const isCompleted = progress?.status === "completed";
  const isFailed = progress?.status === "failed";
  const isCancelled = progress?.status === "cancelled";
  const isTerminal = isCompleted || isFailed || isCancelled;

  const execute = useCallback(
    async (params: {
      pipelineId: string;
      inputObjects: Array<{ bucket: string; key: string }>;
      variables?: Record<string, unknown>;
      dryRun?: boolean;
    }) => {
      setExecutionId(null);
      return executeMutation.mutateAsync({
        id: params.pipelineId,
        inputObjects: params.inputObjects,
        variables: params.variables,
        dryRun: params.dryRun,
      });
    },
    [executeMutation]
  );

  const reset = useCallback(() => {
    setExecutionId(null);
    executeMutation.reset();
    // Invalidate any cached progress data
    queryClient.removeQueries({
      queryKey: orpc.pipeline.executionProgress.key(),
    });
  }, [executeMutation, queryClient]);

  const cancel = useCallback(async () => {
    if (!executionId) return;
    // Call cancel endpoint (if implemented)
    await orpc.pipeline.cancelExecution.call({ executionId });
  }, [executionId]);

  return {
    // Actions
    execute,
    reset,
    cancel,
    
    // State
    executionId,
    progress,
    
    // Loading states
    isExecuting: executeMutation.isPending,
    isStreaming: progressQuery.isFetching && !isTerminal,
    
    // Terminal states
    isCompleted,
    isFailed,
    isCancelled,
    isTerminal,
    
    // Errors
    executeError: executeMutation.error,
    streamError: progressQuery.error,
    
    // Convenience
    percentage: progress?.progress?.percentage ?? 0,
    currentStep: progress?.progress?.currentStep ?? 0,
    totalSteps: progress?.progress?.totalSteps ?? 0,
    currentAction: progress?.currentAction ?? null,
  };
}

// ============================================================================
// QUERY KEYS - For cache invalidation
// ============================================================================

export const pipelineKeys = {
  /** Invalidate all pipeline queries */
  all: () => orpc.pipeline.key(),
  
  /** Invalidate all progress streams for an execution */
  execution: (executionId: string) => 
    orpc.pipeline.executionProgress.key({ input: { executionId } }),
  
  /** Invalidate action progress for specific action */
  actionProgress: (executionId: string, actionId: string) =>
    orpc.pipeline.actionProgress.key({ input: { executionId, actionId } }),
  
  /** Invalidate execution logs */
  logs: (executionId: string) =>
    orpc.pipeline.executionLogs.key({ input: { executionId } }),
};
```

### Key Differences: `liveOptions` vs `streamedOptions`

| Feature | `experimental_liveOptions` | `experimental_streamedOptions` |
|---------|---------------------------|-------------------------------|
| **Data Shape** | Single latest event | Array of all events |
| **Use Case** | Progress indicators, status | Logs, history, audit trails |
| **Memory** | Constant (1 event) | Growing (N events) |
| **Example** | Current upload percentage | All log entries |

```typescript
// liveOptions: data = { percentage: 75, status: "running" }
const { data } = useQuery(orpc.progress.experimental_liveOptions({ input }));
console.log(data?.percentage); // 75

// streamedOptions: data = [event1, event2, event3, ...]
const { data } = useQuery(orpc.logs.experimental_streamedOptions({ input }));
console.log(data?.length); // 42 log entries
```

### Query Key Management for Streaming

```typescript
// apps/web/src/domains/pipelines/invalidations.ts

import { QueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";

/**
 * Invalidation utilities for pipeline streaming queries
 */
export function createPipelineInvalidations(queryClient: QueryClient) {
  return {
    /** Stop and clear all progress streams for an execution */
    clearExecutionStreams: (executionId: string) => {
      // Cancel ongoing queries (stops SSE connections)
      queryClient.cancelQueries({
        queryKey: orpc.pipeline.executionProgress.key({ input: { executionId } }),
      });
      queryClient.cancelQueries({
        queryKey: orpc.pipeline.executionLogs.key({ input: { executionId } }),
      });
      
      // Remove from cache
      queryClient.removeQueries({
        queryKey: orpc.pipeline.key(),
        predicate: (query) => {
          const key = query.queryKey as unknown[];
          return key.some((k) => 
            typeof k === "object" && k !== null && "executionId" in k && 
            (k as { executionId: string }).executionId === executionId
          );
        },
      });
    },
    
    /** Invalidate pipeline list after execution completes */
    onExecutionComplete: () => {
      queryClient.invalidateQueries({
        queryKey: orpc.pipeline.list.key(),
      });
    },
  };
}
```

### Progress UI Component

```tsx
// apps/web/src/domains/pipelines/components/ExecutionProgress.tsx

"use client";

import { usePipelineExecutionProgress } from "../hooks";
import { Progress } from "@repo/ui/components/shadcn/progress";
import { Badge } from "@repo/ui/components/shadcn/badge";
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Clock 
} from "lucide-react";

interface ExecutionProgressProps {
  executionId: string;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export function ExecutionProgress({ 
  executionId, 
  onComplete,
  onError,
}: ExecutionProgressProps) {
  const { 
    progress, 
    error, 
    isStreaming, 
    isCompleted, 
    isFailed,
    percentage,
  } = usePipelineExecutionProgress(executionId);

  // Callbacks
  useEffect(() => {
    if (isCompleted && onComplete) onComplete();
    if (error && onError) onError(error);
  }, [isCompleted, error, onComplete, onError]);

  if (!progress) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Connecting to execution stream...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <StatusBadge status={progress.status} />
        <span className="text-sm text-muted-foreground">
          Step {progress.progress.currentStep} of {progress.progress.totalSteps}
        </span>
      </div>

      {/* Overall Progress Bar */}
      <div className="space-y-2">
        <Progress value={percentage} className="h-2" />
        <p className="text-sm text-muted-foreground text-center">
          {percentage}% complete
        </p>
      </div>

      {/* Current Action */}
      {progress.currentAction && (
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="font-medium">{progress.currentAction.name}</span>
          </div>
          {progress.currentAction.message && (
            <p className="text-sm text-muted-foreground">
              {progress.currentAction.message}
            </p>
          )}
          {progress.currentAction.progress !== undefined && (
            <Progress 
              value={progress.currentAction.progress} 
              className="h-1 mt-2" 
            />
          )}
        </div>
      )}

      {/* Completed Actions */}
      {progress.completedActions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Completed Steps</h4>
          <div className="space-y-1">
            {progress.completedActions.map((action) => (
              <div 
                key={action.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  {action.status === "completed" ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : action.status === "skipped" ? (
                    <Clock className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span>{action.name}</span>
                </div>
                <span className="text-muted-foreground">
                  {formatDuration(action.duration)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {progress.error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-4 w-4" />
            <span className="font-medium">{progress.error.code}</span>
          </div>
          <p className="mt-1 text-sm">{progress.error.message}</p>
          {progress.error.actionId && (
            <p className="mt-1 text-xs text-muted-foreground">
              Failed at action: {progress.error.actionId}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: string; icon: React.ReactNode }> = {
    pending: { variant: "secondary", icon: <Clock className="h-3 w-3" /> },
    running: { variant: "default", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    completed: { variant: "success", icon: <CheckCircle className="h-3 w-3" /> },
    failed: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
    cancelled: { variant: "outline", icon: <XCircle className="h-3 w-3" /> },
  };

  const { variant, icon } = variants[status] ?? variants.pending;

  return (
    <Badge variant={variant as any} className="gap-1">
      {icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}
```

### Configuration: ORPC Event Iterator Keep-Alive

```typescript
// apps/api/src/app.module.ts

// In the ORPCModule configuration:
ORPCModule.forRoot({
  contract: appContract,
  eventIteratorKeepAliveInterval: 5000, // Send keep-alive every 5 seconds
  // This prevents connection timeouts during long-running operations
})
```

---

## Future Enhancements

1. **Marketplace**: Share and discover community-created actions and pipelines
2. **AI-Assisted Pipeline Creation**: Natural language to pipeline definition
3. **Cost Estimation**: Predict resource usage and costs before execution
4. **Collaborative Editing**: Real-time multi-user pipeline editing
5. **Template Library**: Pre-built pipeline templates for common workflows
6. **External Integrations**: Connect with cloud services (AWS Lambda, Google Cloud Functions)
7. **Versioning & Rollback**: Full version control for pipelines with easy rollback
8. **A/B Testing**: Run multiple pipeline versions and compare results
