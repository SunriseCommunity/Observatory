CREATE TABLE IF NOT EXISTS "beatmap_osu_files" (
	"id" integer PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"updated_at" text DEFAULT now()::timestamp without time zone NOT NULL,
	"created_at" text DEFAULT now()::timestamp without time zone NOT NULL,
	"deleted_at" text,
	"valid_until" text NOT NULL
);
