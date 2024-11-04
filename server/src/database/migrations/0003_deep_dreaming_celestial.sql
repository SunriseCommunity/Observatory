ALTER TABLE "benchmarks" ALTER COLUMN "api_latency" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "benchmarks" ALTER COLUMN "api_latency" DROP NOT NULL;