ALTER TABLE "mirrors" DROP COLUMN IF EXISTS "weight";--> statement-breakpoint
ALTER TABLE "mirrors" DROP COLUMN IF EXISTS "requests_processed";--> statement-breakpoint
ALTER TABLE "mirrors" DROP COLUMN IF EXISTS "requests_failed";--> statement-breakpoint
ALTER TABLE "mirrors" DROP COLUMN IF EXISTS "requests_total";