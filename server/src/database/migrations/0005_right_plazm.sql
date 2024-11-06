ALTER TABLE "beatmapsets_files" ADD COLUMN "no_video" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmapsets_files" DROP COLUMN IF EXISTS "includes_video";