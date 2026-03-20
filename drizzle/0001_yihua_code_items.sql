CREATE TABLE "yihua_code_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"relative_path" varchar(500) NOT NULL,
	"file_name" text NOT NULL,
	"ext" varchar(16) NOT NULL,
	"kind" varchar(32) NOT NULL,
	"top_folder" varchar(64) NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "yihua_code_items_relpath_uidx" ON "yihua_code_items" USING btree ("relative_path");