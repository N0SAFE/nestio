CREATE TYPE "public"."action_provider_type" AS ENUM('builtin', 'custom', 'external', 'webhook');--> statement-breakpoint
CREATE TYPE "public"."action_status" AS ENUM('pending', 'running', 'completed', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."execution_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled', 'timeout');--> statement-breakpoint
CREATE TYPE "public"."processing_strategy" AS ENUM('parallel', 'queue', 'abort', 'ignore');--> statement-breakpoint
CREATE TYPE "public"."trigger_type" AS ENUM('manual', 'object_created', 'object_deleted', 'object_updated', 'scheduled', 'webhook');--> statement-breakpoint
CREATE TABLE "action_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"type" "action_provider_type" NOT NULL,
	"config_schema" json NOT NULL,
	"input_schema" json,
	"output_schema" json,
	"handler_function" text,
	"webhook_url" text,
	"external_service_id" text,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"category" text,
	"tags" json,
	"is_public" boolean DEFAULT false NOT NULL,
	"owner_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"config" json DEFAULT '{}'::json NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" uuid NOT NULL,
	"pipeline_action_id" uuid NOT NULL,
	"action_id" uuid NOT NULL,
	"status" "action_status" DEFAULT 'pending' NOT NULL,
	"input" json,
	"output" json,
	"error" json,
	"progress" integer DEFAULT 0,
	"progress_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration_ms" integer,
	"retry_attempt" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"action_id" uuid NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"condition" json,
	"depends_on" json,
	"continue_on_error" boolean DEFAULT false NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"trigger_id" uuid,
	"trigger_type" "trigger_type",
	"input_objects" json NOT NULL,
	"variables" json DEFAULT '{}'::json NOT NULL,
	"status" "execution_status" DEFAULT 'pending' NOT NULL,
	"current_step" integer DEFAULT 0,
	"total_steps" integer NOT NULL,
	"output" json,
	"error" json,
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration_ms" integer,
	"owner_id" text NOT NULL,
	"is_dry_run" boolean DEFAULT false NOT NULL,
	"dry_run_result" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_triggers" (
	"pipeline_id" uuid NOT NULL,
	"trigger_id" uuid NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipelines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"processing_strategy" "processing_strategy" DEFAULT 'queue' NOT NULL,
	"timeout_ms" integer DEFAULT 300000,
	"max_retries" integer DEFAULT 0 NOT NULL,
	"variables_schema" json,
	"default_variables" json DEFAULT '{}'::json,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "triggers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" "trigger_type" NOT NULL,
	"bucket_id" text,
	"object_key_pattern" text,
	"cron_expression" text,
	"timezone" text,
	"webhook_secret" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_triggered_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "action_providers" ADD CONSTRAINT "action_providers_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_provider_id_action_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."action_providers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_actions" ADD CONSTRAINT "execution_actions_execution_id_pipeline_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."pipeline_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_actions" ADD CONSTRAINT "execution_actions_pipeline_action_id_pipeline_actions_id_fk" FOREIGN KEY ("pipeline_action_id") REFERENCES "public"."pipeline_actions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_actions" ADD CONSTRAINT "execution_actions_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_actions" ADD CONSTRAINT "pipeline_actions_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_actions" ADD CONSTRAINT "pipeline_actions_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_executions" ADD CONSTRAINT "pipeline_executions_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_executions" ADD CONSTRAINT "pipeline_executions_trigger_id_triggers_id_fk" FOREIGN KEY ("trigger_id") REFERENCES "public"."triggers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_executions" ADD CONSTRAINT "pipeline_executions_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_triggers" ADD CONSTRAINT "pipeline_triggers_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_triggers" ADD CONSTRAINT "pipeline_triggers_trigger_id_triggers_id_fk" FOREIGN KEY ("trigger_id") REFERENCES "public"."triggers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "triggers" ADD CONSTRAINT "triggers_bucket_id_bucket_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "public"."bucket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "triggers" ADD CONSTRAINT "triggers_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;