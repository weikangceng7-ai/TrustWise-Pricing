CREATE TABLE "commodities" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"english_name" varchar(100),
	"category" varchar(50) NOT NULL,
	"unit" varchar(20) DEFAULT '元/吨',
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "commodities_code_unique" UNIQUE("code")
);
--> statement-breakpoint
DROP INDEX "multi_dimensional_prices_date_category_uidx";--> statement-breakpoint
ALTER TABLE "enterprise_price_predictions" ADD COLUMN "commodity_code" varchar(20) DEFAULT 'sulfur';--> statement-breakpoint
ALTER TABLE "multi_dimensional_prices" ADD COLUMN "commodity_code" varchar(20) DEFAULT 'sulfur';--> statement-breakpoint
ALTER TABLE "port_inventory" ADD COLUMN "commodity_code" varchar(20) DEFAULT 'sulfur';--> statement-breakpoint
ALTER TABLE "sulfur_prices" ADD COLUMN "commodity_code" varchar(20) DEFAULT 'sulfur';--> statement-breakpoint
CREATE UNIQUE INDEX "multi_dimensional_prices_date_category_uidx" ON "multi_dimensional_prices" USING btree ("date","commodity_code","category");