CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"plan_name" text NOT NULL,
	"amount" integer NOT NULL,
	"quota_amount" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"stripe_session_id" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_stripe_session_id_unique" UNIQUE("stripe_session_id")
);
--> statement-breakpoint
CREATE TABLE "enterprise_supplier_relations" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_code" varchar(50) NOT NULL,
	"supplier_id" integer NOT NULL,
	"purchase_percentage" numeric(5, 2),
	"cost_per_ton" numeric(10, 2),
	"contract_end_date" date,
	"is_preferred" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"region" varchar(50),
	"country" varchar(50),
	"capacity" numeric(10, 2),
	"contact_person" varchar(50),
	"contact_phone" varchar(20),
	"main_products" jsonb DEFAULT '[]'::jsonb,
	"price_range" jsonb,
	"delivery_days" integer,
	"on_time_rate" numeric(5, 2),
	"quality_score" numeric(5, 2),
	"risk_level" varchar(20) DEFAULT 'medium',
	"risk_factors" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "supply_risks" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer,
	"region" varchar(50),
	"risk_type" varchar(30) NOT NULL,
	"severity" varchar(20) DEFAULT 'medium' NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"impact_assessment" jsonb,
	"affected_enterprises" jsonb DEFAULT '[]'::jsonb,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supply_routes" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"origin" varchar(100),
	"destination" varchar(100),
	"transport_mode" varchar(20),
	"lead_time_days" integer,
	"cost_per_ton" numeric(10, 2),
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_code" varchar(50) NOT NULL,
	"alert_type" varchar(30) NOT NULL,
	"severity" varchar(20) DEFAULT 'normal' NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"is_handled" boolean DEFAULT false NOT NULL,
	"handled_at" timestamp,
	"handle_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_code" varchar(50) NOT NULL,
	"date" date NOT NULL,
	"stock_level" numeric(10, 2) NOT NULL,
	"daily_consumption" numeric(10, 2),
	"turnover_rate" numeric(5, 2),
	"days_of_cover" integer,
	"health_score" integer,
	"stagnant_items" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_accuracy_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_code" varchar(50) NOT NULL,
	"prediction_date" date NOT NULL,
	"predicted_trend" varchar(20),
	"actual_trend" varchar(20),
	"was_correct" boolean,
	"accuracy_metric" jsonb,
	"model_version" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_decisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_code" varchar(50) NOT NULL,
	"decision_date" date NOT NULL,
	"action" varchar(20) NOT NULL,
	"suggested_by" varchar(20) DEFAULT 'system' NOT NULL,
	"system_recommendation" jsonb,
	"actual_action" jsonb,
	"outcome" jsonb,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"evaluated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "demand_factors" (
	"id" serial PRIMARY KEY NOT NULL,
	"commodity_code" varchar(20) DEFAULT 'sulfur' NOT NULL,
	"factor_name" varchar(100) NOT NULL,
	"start_month" integer NOT NULL,
	"end_month" integer NOT NULL,
	"demand_multiplier" numeric(5, 2) DEFAULT '1.00' NOT NULL,
	"description" text,
	"is_active" text DEFAULT 'true' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demand_forecasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_code" varchar(50) NOT NULL,
	"forecast_date" date NOT NULL,
	"forecast_period" varchar(20) NOT NULL,
	"predicted_consumption" numeric(10, 2),
	"confidence" numeric(5, 2),
	"basis" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_type" varchar(32) NOT NULL,
	"source_id" varchar(64),
	"source_name" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "port_inventory" ADD COLUMN "source" varchar(100);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprise_supplier_relations" ADD CONSTRAINT "enterprise_supplier_relations_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_risks" ADD CONSTRAINT "supply_risks_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_routes" ADD CONSTRAINT "supply_routes_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_user_id_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_stripe_session_id_idx" ON "orders" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE INDEX "esr_enterprise_code_idx" ON "enterprise_supplier_relations" USING btree ("enterprise_code");--> statement-breakpoint
CREATE INDEX "esr_supplier_id_idx" ON "enterprise_supplier_relations" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "suppliers_region_idx" ON "suppliers" USING btree ("region");--> statement-breakpoint
CREATE INDEX "suppliers_risk_level_idx" ON "suppliers" USING btree ("risk_level");--> statement-breakpoint
CREATE INDEX "supply_risks_status_idx" ON "supply_risks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "supply_risks_severity_idx" ON "supply_risks" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "supply_risks_region_idx" ON "supply_risks" USING btree ("region");--> statement-breakpoint
CREATE INDEX "supply_routes_supplier_id_idx" ON "supply_routes" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "inv_alerts_enterprise_code_idx" ON "inventory_alerts" USING btree ("enterprise_code");--> statement-breakpoint
CREATE INDEX "inv_alerts_alert_type_idx" ON "inventory_alerts" USING btree ("alert_type");--> statement-breakpoint
CREATE INDEX "inv_snapshots_enterprise_code_idx" ON "inventory_snapshots" USING btree ("enterprise_code");--> statement-breakpoint
CREATE INDEX "inv_snapshots_date_idx" ON "inventory_snapshots" USING btree ("date");--> statement-breakpoint
CREATE INDEX "dal_enterprise_code_idx" ON "decision_accuracy_log" USING btree ("enterprise_code");--> statement-breakpoint
CREATE INDEX "dal_prediction_date_idx" ON "decision_accuracy_log" USING btree ("prediction_date");--> statement-breakpoint
CREATE INDEX "pd_enterprise_code_idx" ON "purchase_decisions" USING btree ("enterprise_code");--> statement-breakpoint
CREATE INDEX "pd_decision_date_idx" ON "purchase_decisions" USING btree ("decision_date");--> statement-breakpoint
CREATE INDEX "pd_status_idx" ON "purchase_decisions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "df_commodity_code_idx" ON "demand_factors" USING btree ("commodity_code");--> statement-breakpoint
CREATE INDEX "dfc_enterprise_code_idx" ON "demand_forecasts" USING btree ("enterprise_code");--> statement-breakpoint
CREATE INDEX "dfc_forecast_date_idx" ON "demand_forecasts" USING btree ("forecast_date");--> statement-breakpoint
CREATE INDEX "chat_conversations_user_id_idx" ON "chat_conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_conversations_updated_at_idx" ON "chat_conversations" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "chat_messages_conversation_id_idx" ON "chat_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "ep_pred_lookup_idx" ON "enterprise_price_predictions" USING btree ("commodity_code","enterprise_code","date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_is_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE UNIQUE INDEX "port_inventory_date_commodity_uidx" ON "port_inventory" USING btree ("date","commodity_code");--> statement-breakpoint
CREATE INDEX "purchase_reports_report_date_idx" ON "purchase_reports" USING btree ("report_date");--> statement-breakpoint
CREATE UNIQUE INDEX "sulfur_prices_date_commodity_uidx" ON "sulfur_prices" USING btree ("date","commodity_code");--> statement-breakpoint
CREATE INDEX "api_keys_user_id_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_usage_logs_api_key_id_idx" ON "api_usage_logs" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "tracker_alerts_subscription_id_idx" ON "tracker_alerts" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "tracker_records_subscription_id_idx" ON "tracker_records" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "tracker_subscriptions_user_id_idx" ON "tracker_subscriptions" USING btree ("user_id");