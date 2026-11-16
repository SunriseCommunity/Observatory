import { opentelemetry } from "@elysia/opentelemetry";
import { metrics } from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { HostMetrics } from "@opentelemetry/host-metrics";
import { RuntimeNodeInstrumentation } from "@opentelemetry/instrumentation-runtime-node";
import { envDetector, hostDetector, processDetector } from "@opentelemetry/resources";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { Elysia } from "elysia";

import config from "../config";

const spanProcessor = config.EnableTracing
  ? new BatchSpanProcessor(new OTLPTraceExporter({ url: `${config.OtlpEndpoint}/v1/traces` }))
  : undefined;

const metricReader = config.EnableMetrics
  ? new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ url: `${config.OtlpEndpoint}/v1/metrics` }),
      exportIntervalMillis: 15_000,
    })
  : undefined;

export async function shutdownTelemetry(): Promise<void> {
  await Promise.allSettled([spanProcessor?.shutdown(), metricReader?.shutdown()]);
}

// The explicit empty arrays stop it from creating exporters from its OTEL_* env defaults.
const telemetry = spanProcessor || metricReader
  ? opentelemetry({
      serviceName: "observatory",
      resourceDetectors: [envDetector, hostDetector, processDetector],
      instrumentations: metricReader ? [new RuntimeNodeInstrumentation()] : [],
      spanProcessors: spanProcessor ? [spanProcessor] : [],
      metricReaders: metricReader ? [metricReader] : [],
      logRecordProcessors: [],
    })
  : undefined;

if (metricReader)
  new HostMetrics({ meterProvider: metrics.getMeterProvider() }).start();

export const OTLPPlugin = telemetry ?? new Elysia({ name: "OTLPPlugin" });
