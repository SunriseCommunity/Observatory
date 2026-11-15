CREATE TABLE IF NOT EXISTS "benchmarks" (
	"benchmark_id" serial PRIMARY KEY NOT NULL,
	"mirror_id" integer NOT NULL,
	"download_speed" integer,
	"api_latency" integer DEFAULT 0 NOT NULL,
	"updated_at" text DEFAULT now()::timestamp without time zone NOT NULL,
	"created_at" text DEFAULT now()::timestamp without time zone NOT NULL,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mirrors" (
	"mirror_id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"weight" real DEFAULT 1 NOT NULL,
	"requests_processed" integer DEFAULT 0 NOT NULL,
	"requests_failed" integer DEFAULT 0 NOT NULL,
	"requests_total" integer DEFAULT 0 NOT NULL,
	"updated_at" text DEFAULT now()::timestamp without time zone NOT NULL,
	"created_at" text DEFAULT now()::timestamp without time zone NOT NULL,
	"deleted_at" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "benchmarks" ADD CONSTRAINT "benchmarks_mirror_id_mirrors_mirror_id_fk" FOREIGN KEY ("mirror_id") REFERENCES "public"."mirrors"("mirror_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
