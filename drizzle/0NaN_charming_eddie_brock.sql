CREATE TYPE "public"."first_flame_stage" AS ENUM('ritual_initiation_attempt', 'ritual_initiation_success', 'ritual_initiation_failure_db', 'ritual_initiation_failure_rate_limit', 'ritual_initiation_failure_already_active', 'ritual_imprint_submitted', 'ritual_day_completed', 'ritual_completed');--> statement-breakpoint
CREATE TABLE "auth"."users" (
	"id" uuid PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ritual"."first_flame_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" uuid,
	"quest_id" text NOT NULL,
	"stage" "first_flame_stage" NOT NULL,
	"context" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ritual"."flame_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"current_day_target" integer NOT NULL,
	"is_quest_complete" boolean DEFAULT false NOT NULL,
	"last_imprint_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_day_range" CHECK ("ritual"."flame_progress"."current_day_target" BETWEEN 1 AND 5)
);
--> statement-breakpoint
ALTER TABLE "ritual"."first_flame_logs" ADD CONSTRAINT "first_flame_logs_uid_users_id_fk" FOREIGN KEY ("uid") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ritual"."flame_progress" ADD CONSTRAINT "flame_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_first_flame_logs_uid" ON "ritual"."first_flame_logs" USING btree ("uid");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_flame_progress_user" ON "ritual"."flame_progress" USING btree ("user_id");