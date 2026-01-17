/**
 * Pipeline Schema - Planified File Actions System
 * 
 * This schema defines the database structure for the planified file actions system,
 * which enables users to create reusable pipelines of actions that can be triggered
 * on storage objects (buckets and files).
 * 
 * @see docs/PLANIFIED-FILE-ACTIONS-SYSTEM.md for full architecture documentation
 */

import { relations } from "drizzle-orm";
import {
  index,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";
import { bucket } from "./storage";
import { user } from "./auth";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Processing strategies for pipeline execution
 */
export const processingStrategyEnum = pgEnum("processing_strategy", [
  "parallel", // Execute all actions in parallel
  "queue", // Execute actions sequentially (FIFO)
  "abort", // Cancel previous execution when new one starts
  "ignore", // Ignore new execution if one is already running
]);

/**
 * Action provider types - defines where actions come from
 */
export const actionProviderTypeEnum = pgEnum("action_provider_type", [
  "builtin", // Built-in actions (compress, resize, etc.)
  "custom", // User-defined custom actions
  "external", // External service integrations
  "webhook", // HTTP webhook actions
]);

/**
 * Trigger types - defines what initiates pipeline execution
 */
export const triggerTypeEnum = pgEnum("trigger_type", [
  "manual", // User-initiated
  "object_created", // On object upload
  "object_deleted", // On object deletion
  "object_updated", // On object modification
  "scheduled", // Time-based (cron)
  "webhook", // External webhook
]);

/**
 * Pipeline execution status
 */
export const executionStatusEnum = pgEnum("execution_status", [
  "pending", // Waiting to start
  "running", // Currently executing
  "completed", // Successfully finished
  "failed", // Execution failed
  "cancelled", // Manually cancelled
  "timeout", // Exceeded time limit
]);

/**
 * Action execution status within a pipeline
 */
export const actionStatusEnum = pgEnum("action_status", [
  "pending", // Not yet started
  "running", // Currently executing
  "completed", // Successfully finished
  "failed", // Action failed
  "skipped", // Skipped due to conditions
]);

// ============================================================================
// TABLES
// ============================================================================

/**
 * Action Providers - Registry of available actions
 * 
 * Each provider defines a reusable action that can be used in pipelines.
 * Actions can be built-in (system-provided), custom (user-defined), or
 * external (third-party integrations).
 */
export const actionProviders = pgTable(
  "action_providers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    
    // Basic info
    name: text("name").notNull(), // e.g., "compress", "resize-image"
    displayName: text("display_name").notNull(), // User-friendly name
    description: text("description"),
    
    // Provider type
    type: actionProviderTypeEnum("type").notNull(),
    
    // Configuration
    configSchema: json("config_schema").notNull(), // JSON Schema for configuration
    inputSchema: json("input_schema"), // Expected input format
    outputSchema: json("output_schema"), // Output format
    
    // Execution details
    handlerFunction: text("handler_function"), // For builtin/custom actions
    webhookUrl: text("webhook_url"), // For webhook actions
    externalServiceId: text("external_service_id"), // For external integrations
    
    // Metadata
    version: text("version").notNull().default("1.0.0"),
    category: text("category"), // e.g., "image", "video", "compression"
    tags: json("tags").$type<string[]>(), // Searchable tags
    
    // Permissions
    isPublic: boolean("is_public").notNull().default(false),
    ownerId: text("owner_id").references(() => user.id, { onDelete: "cascade" }),
    
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [{
    nameIdx: index("action_providers_name_idx").on(table.name),
    typeIdx: index("action_providers_type_idx").on(table.type),
    categoryIdx: index("action_providers_category_idx").on(table.category),
    ownerIdx: index("action_providers_owner_idx").on(table.ownerId),
  }]
);

/**
 * Actions - Configured instances of action providers
 * 
 * An action is a configured instance of an action provider, ready to be
 * used in a pipeline. It includes the specific configuration values needed
 * to execute the provider's logic.
 */
export const actions = pgTable(
  "actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    
    // Provider reference
    providerId: uuid("provider_id")
      .notNull()
      .references(() => actionProviders.id, { onDelete: "restrict" }),
    
    // Action details
    name: text("name").notNull(), // User-defined name
    description: text("description"),
    
    // Configuration (validated against provider's configSchema)
    config: json("config").notNull().default({}),
    
    // Ownership
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [{
    providerIdx: index("actions_provider_idx").on(table.providerId),
    ownerIdx: index("actions_owner_idx").on(table.ownerId),
  }]
);

/**
 * Triggers - Events that initiate pipeline execution
 * 
 * Triggers define when and how pipelines should be executed. They can be
 * manual (user-initiated), automatic (on storage events), or scheduled.
 */
export const triggers = pgTable(
  "triggers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    
    // Trigger details
    name: text("name").notNull(),
    description: text("description"),
    type: triggerTypeEnum("type").notNull(),
    
    // Scope - where this trigger applies
    bucketId: text("bucket_id").references(() => bucket.id, { onDelete: "cascade" }),
    objectKeyPattern: text("object_key_pattern"), // Glob pattern, e.g., "*.jpg"
    
    // Schedule configuration (for scheduled triggers)
    cronExpression: text("cron_expression"),
    timezone: text("timezone"),
    
    // Webhook configuration
    webhookSecret: text("webhook_secret"),
    
    // State
    isEnabled: boolean("is_enabled").notNull().default(true),
    
    // Ownership
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastTriggeredAt: timestamp("last_triggered_at"),
  },
  (table) => [{
    typeIdx: index("triggers_type_idx").on(table.type),
    bucketIdx: index("triggers_bucket_idx").on(table.bucketId),
    ownerIdx: index("triggers_owner_idx").on(table.ownerId),
    enabledIdx: index("triggers_enabled_idx").on(table.isEnabled),
  }]
);

/**
 * Pipelines - Ordered sequences of actions
 * 
 * A pipeline defines a workflow consisting of multiple actions executed
 * in a specific order or pattern (parallel, sequential, conditional).
 */
export const pipelines = pgTable(
  "pipelines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    
    // Pipeline details
    name: text("name").notNull(),
    description: text("description"),
    
    // Execution strategy
    processingStrategy: processingStrategyEnum("processing_strategy")
      .notNull()
      .default("queue"),
    
    // Timeout (milliseconds)
    timeoutMs: integer("timeout_ms").default(300000), // 5 minutes default
    maxRetries: integer("max_retries").notNull().default(0),
    
    // Variables - user can override at execution time
    variablesSchema: json("variables_schema"), // JSON Schema
    defaultVariables: json("default_variables").default({}),
    
    // State
    isEnabled: boolean("is_enabled").notNull().default(true),
    
    // Ownership
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [{
    ownerIdx: index("pipelines_owner_idx").on(table.ownerId),
    enabledIdx: index("pipelines_enabled_idx").on(table.isEnabled),
  }]
);

/**
 * Pipeline Actions - Actions within a pipeline (with ordering)
 * 
 * This table creates the many-to-many relationship between pipelines and actions,
 * including execution order and conditional logic.
 */
export const pipelineActions = pgTable(
  "pipeline_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    
    // References
    pipelineId: uuid("pipeline_id")
      .notNull()
      .references(() => pipelines.id, { onDelete: "cascade" }),
    actionId: uuid("action_id")
      .notNull()
      .references(() => actions.id, { onDelete: "restrict" }),
    
    // Execution order
    order: integer("order").notNull().default(0),
    
    // Conditional execution
    condition: json("condition"), // e.g., { "variable": "fileSize", "operator": ">", "value": 1048576 }
    
    // Dependencies (execute after these actions complete)
    dependsOn: json("depends_on").$type<string[]>(), // Array of pipeline_action IDs
    
    // Error handling
    continueOnError: boolean("continue_on_error").notNull().default(false),
    retryCount: integer("retry_count").notNull().default(0),
    
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [{
    pipelineIdx: index("pipeline_actions_pipeline_idx").on(table.pipelineId),
    actionIdx: index("pipeline_actions_action_idx").on(table.actionId),
    orderIdx: index("pipeline_actions_order_idx").on(table.pipelineId, table.order),
  }]
);

/**
 * Pipeline Triggers - Association between pipelines and triggers
 */
export const pipelineTriggers = pgTable(
  "pipeline_triggers",
  {
    pipelineId: uuid("pipeline_id")
      .notNull()
      .references(() => pipelines.id, { onDelete: "cascade" }),
    triggerId: uuid("trigger_id")
      .notNull()
      .references(() => triggers.id, { onDelete: "cascade" }),
    
    // Configuration
    isEnabled: boolean("is_enabled").notNull().default(true),
    
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [{
    pk: primaryKey({ columns: [table.pipelineId, table.triggerId] }),
    pipelineIdx: index("pipeline_triggers_pipeline_idx").on(table.pipelineId),
    triggerIdx: index("pipeline_triggers_trigger_idx").on(table.triggerId),
  }]
);

/**
 * Pipeline Executions - Track pipeline execution instances
 * 
 * Each time a pipeline is executed, a record is created here with the
 * execution context, status, and results.
 */
export const pipelineExecutions = pgTable(
  "pipeline_executions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    
    // Pipeline reference
    pipelineId: uuid("pipeline_id")
      .notNull()
      .references(() => pipelines.id, { onDelete: "cascade" }),
    
    // Trigger info (if triggered automatically)
    triggerId: uuid("trigger_id").references(() => triggers.id, { onDelete: "set null" }),
    triggerType: triggerTypeEnum("trigger_type"),
    
    // Input context
    inputObjects: json("input_objects")
      .$type<{ bucket: string; key: string }[]>()
      .notNull(),
    variables: json("variables").notNull().default({}),
    
    // Execution state
    status: executionStatusEnum("status").notNull().default("pending"),
    
    // Progress tracking
    currentStep: integer("current_step").default(0),
    totalSteps: integer("total_steps").notNull(),
    
    // Results
    output: json("output"),
    error: json("error"), // { code, message, actionId, stack }
    
    // Timing
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    durationMs: integer("duration_ms"),
    
    // Ownership
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    
    // Dry run mode
    isDryRun: boolean("is_dry_run").notNull().default(false),
    dryRunResult: json("dry_run_result"),
    
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [{
    pipelineIdx: index("pipeline_executions_pipeline_idx").on(table.pipelineId),
    statusIdx: index("pipeline_executions_status_idx").on(table.status),
    ownerIdx: index("pipeline_executions_owner_idx").on(table.ownerId),
    createdIdx: index("pipeline_executions_created_idx").on(table.createdAt),
  }]
);

/**
 * Execution Actions - Track individual action executions within a pipeline
 * 
 * For each action in a pipeline execution, this table tracks its status,
 * timing, and results.
 */
export const executionActions = pgTable(
  "execution_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    
    // References
    executionId: uuid("execution_id")
      .notNull()
      .references(() => pipelineExecutions.id, { onDelete: "cascade" }),
    pipelineActionId: uuid("pipeline_action_id")
      .notNull()
      .references(() => pipelineActions.id, { onDelete: "restrict" }),
    actionId: uuid("action_id")
      .notNull()
      .references(() => actions.id, { onDelete: "restrict" }),
    
    // State
    status: actionStatusEnum("status").notNull().default("pending"),
    
    // Input/Output
    input: json("input"),
    output: json("output"),
    error: json("error"), // { code, message, stack }
    
    // Progress (for long-running actions)
    progress: integer("progress").default(0), // 0-100
    progressMessage: text("progress_message"),
    
    // Timing
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    durationMs: integer("duration_ms"),
    
    // Retry tracking
    retryAttempt: integer("retry_attempt").default(0),
    
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [{
    executionIdx: index("execution_actions_execution_idx").on(table.executionId),
    statusIdx: index("execution_actions_status_idx").on(table.status),
    actionIdx: index("execution_actions_action_idx").on(table.actionId),
  }]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const actionProvidersRelations = relations(actionProviders, ({ one, many }) => ({
  owner: one(user, {
    fields: [actionProviders.ownerId],
    references: [user.id],
  }),
  actions: many(actions),
}));

export const actionsRelations = relations(actions, ({ one, many }) => ({
  provider: one(actionProviders, {
    fields: [actions.providerId],
    references: [actionProviders.id],
  }),
  owner: one(user, {
    fields: [actions.ownerId],
    references: [user.id],
  }),
  pipelineActions: many(pipelineActions),
  executionActions: many(executionActions),
}));

export const triggersRelations = relations(triggers, ({ one, many }) => ({
  bucket: one(bucket, {
    fields: [triggers.bucketId],
    references: [bucket.id],
  }),
  owner: one(user, {
    fields: [triggers.ownerId],
    references: [user.id],
  }),
  pipelineTriggers: many(pipelineTriggers),
  executions: many(pipelineExecutions),
}));

export const pipelinesRelations = relations(pipelines, ({ one, many }) => ({
  owner: one(user, {
    fields: [pipelines.ownerId],
    references: [user.id],
  }),
  pipelineActions: many(pipelineActions),
  pipelineTriggers: many(pipelineTriggers),
  executions: many(pipelineExecutions),
}));

export const pipelineActionsRelations = relations(pipelineActions, ({ one, many }) => ({
  pipeline: one(pipelines, {
    fields: [pipelineActions.pipelineId],
    references: [pipelines.id],
  }),
  action: one(actions, {
    fields: [pipelineActions.actionId],
    references: [actions.id],
  }),
  executionActions: many(executionActions),
}));

export const pipelineTriggersRelations = relations(pipelineTriggers, ({ one }) => ({
  pipeline: one(pipelines, {
    fields: [pipelineTriggers.pipelineId],
    references: [pipelines.id],
  }),
  trigger: one(triggers, {
    fields: [pipelineTriggers.triggerId],
    references: [triggers.id],
  }),
}));

export const pipelineExecutionsRelations = relations(pipelineExecutions, ({ one, many }) => ({
  pipeline: one(pipelines, {
    fields: [pipelineExecutions.pipelineId],
    references: [pipelines.id],
  }),
  trigger: one(triggers, {
    fields: [pipelineExecutions.triggerId],
    references: [triggers.id],
  }),
  owner: one(user, {
    fields: [pipelineExecutions.ownerId],
    references: [user.id],
  }),
  executionActions: many(executionActions),
}));

export const executionActionsRelations = relations(executionActions, ({ one }) => ({
  execution: one(pipelineExecutions, {
    fields: [executionActions.executionId],
    references: [pipelineExecutions.id],
  }),
  pipelineAction: one(pipelineActions, {
    fields: [executionActions.pipelineActionId],
    references: [pipelineActions.id],
  }),
  action: one(actions, {
    fields: [executionActions.actionId],
    references: [actions.id],
  }),
}));
