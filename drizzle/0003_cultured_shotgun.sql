CREATE TABLE "multi_dimensional_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"category" varchar(30) NOT NULL,
	"category_name" varchar(50) NOT NULL,
	"price" varchar(20),
	"value" varchar(20),
	"change_value" varchar(20),
	"change_percent" varchar(20),
	"source" varchar(200),
	"note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	CONSTRAINT "api_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "api_quotas" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"free_limit" integer DEFAULT 1000 NOT NULL,
	"used_free" integer DEFAULT 0 NOT NULL,
	"paid_limit" integer DEFAULT 0 NOT NULL,
	"used_paid" integer DEFAULT 0 NOT NULL,
	"reset_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_quotas_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "api_usage_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_key_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"method" text NOT NULL,
	"status_code" integer NOT NULL,
	"response_time" integer NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"error_message" text
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_quotas" ADD CONSTRAINT "api_quotas_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "multi_dimensional_prices_date_category_uidx" ON "multi_dimensional_prices" USING btree ("date","category");