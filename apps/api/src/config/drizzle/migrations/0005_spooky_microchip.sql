CREATE TABLE "bucket" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bucket_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "multipart_upload" (
	"id" text PRIMARY KEY NOT NULL,
	"upload_id" text NOT NULL,
	"bucket_id" text NOT NULL,
	"key" text NOT NULL,
	"content_type" text,
	"metadata" jsonb,
	"initiated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "multipart_upload_upload_id_unique" UNIQUE("upload_id")
);
--> statement-breakpoint
CREATE TABLE "multipart_upload_part" (
	"id" text PRIMARY KEY NOT NULL,
	"upload_id" text NOT NULL,
	"part_number" bigint NOT NULL,
	"size" bigint NOT NULL,
	"etag" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "object" (
	"id" text PRIMARY KEY NOT NULL,
	"bucket_id" text NOT NULL,
	"key" text NOT NULL,
	"size" bigint NOT NULL,
	"etag" text NOT NULL,
	"content_type" text DEFAULT 'application/octet-stream' NOT NULL,
	"metadata" jsonb,
	"version_id" text,
	"is_delete_marker" text,
	"storage_class" text DEFAULT 'STANDARD',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bucket" ADD CONSTRAINT "bucket_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multipart_upload" ADD CONSTRAINT "multipart_upload_bucket_id_bucket_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "public"."bucket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multipart_upload_part" ADD CONSTRAINT "multipart_upload_part_upload_id_multipart_upload_upload_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."multipart_upload"("upload_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "object" ADD CONSTRAINT "object_bucket_id_bucket_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "public"."bucket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bucket_name_idx" ON "bucket" USING btree ("name");--> statement-breakpoint
CREATE INDEX "bucket_owner_id_idx" ON "bucket" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "multipart_upload_id_idx" ON "multipart_upload" USING btree ("upload_id");--> statement-breakpoint
CREATE INDEX "multipart_bucket_key_idx" ON "multipart_upload" USING btree ("bucket_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "multipart_part_upload_part_idx" ON "multipart_upload_part" USING btree ("upload_id","part_number");--> statement-breakpoint
CREATE INDEX "multipart_part_upload_id_idx" ON "multipart_upload_part" USING btree ("upload_id");--> statement-breakpoint
CREATE UNIQUE INDEX "object_bucket_key_idx" ON "object" USING btree ("bucket_id","key");--> statement-breakpoint
CREATE INDEX "object_bucket_id_idx" ON "object" USING btree ("bucket_id");--> statement-breakpoint
CREATE INDEX "object_key_idx" ON "object" USING btree ("key");--> statement-breakpoint
CREATE INDEX "object_etag_idx" ON "object" USING btree ("etag");