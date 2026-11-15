CREATE TABLE IF NOT EXISTS "requests" (
	"request_id" serial PRIMARY KEY NOT NULL,
	"base_url" text NOT NULL,
	"endpoint" text NOT NULL,
	"method" text NOT NULL,
	"status" integer NOT NULL,
	"latency" integer,
	"data" text,
	"updated_at" text DEFAULT now()::timestamp without time zone NOT NULL,
	"created_at" text DEFAULT now()::timestamp without time zone NOT NULL,
	"deleted_at" text
);
