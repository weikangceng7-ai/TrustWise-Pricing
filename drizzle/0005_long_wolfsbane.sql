CREATE TABLE "tracker_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscription_id" integer NOT NULL,
	"record_id" integer,
	"alert_type" varchar(30) NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"trigger_value" numeric(10, 2),
	"threshold_value" numeric(10, 2),
	"change_percent" numeric(5, 2),
	"urgency" varchar(20) DEFAULT 'normal' NOT NULL,
	"notification_sent" boolean DEFAULT false NOT NULL,
	"notification_sent_at" timestamp,
	"notification_channels_used" jsonb DEFAULT '[]'::jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_handled" boolean DEFAULT false NOT NULL,
	"handled_by" text,
	"handled_at" timestamp,
	"handle_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracker_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscription_id" integer NOT NULL,
	"run_at" timestamp NOT NULL,
	"status" varchar(20) NOT NULL,
	"price_data" jsonb,
	"inventory_data" jsonb,
	"news_data" jsonb,
	"prediction_result" jsonb,
	"duration_ms" integer,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracker_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscription_id" integer NOT NULL,
	"report_type" varchar(20) NOT NULL,
	"report_date" date NOT NULL,
	"title" varchar(200) NOT NULL,
	"summary" text NOT NULL,
	"price_analysis" text,
	"inventory_analysis" text,
	"news_analysis" text,
	"prediction_analysis" text,
	"recommendation" text,
	"data_range_start" date,
	"data_range_end" date,
	"status" varchar(20) DEFAULT 'generated' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracker_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"target_type" varchar(20) NOT NULL,
	"target_region" varchar(50),
	"target_market" varchar(50),
	"frequency" varchar(20) DEFAULT 'daily' NOT NULL,
	"schedule_time" varchar(10) DEFAULT '09:00',
	"alert_rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"report_enabled" boolean DEFAULT true NOT NULL,
	"report_type" varchar(20) DEFAULT 'daily',
	"notification_channels" jsonb DEFAULT '{"email":true,"inApp":true,"sms":false}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tracker_alerts" ADD CONSTRAINT "tracker_alerts_subscription_id_tracker_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."tracker_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracker_alerts" ADD CONSTRAINT "tracker_alerts_record_id_tracker_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."tracker_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracker_alerts" ADD CONSTRAINT "tracker_alerts_handled_by_user_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracker_records" ADD CONSTRAINT "tracker_records_subscription_id_tracker_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."tracker_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracker_reports" ADD CONSTRAINT "tracker_reports_subscription_id_tracker_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."tracker_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracker_subscriptions" ADD CONSTRAINT "tracker_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;