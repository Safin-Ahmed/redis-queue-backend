const { NodeSDK } = require("@opentelemetry/sdk-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-otlp-grpc");

const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");

const { Resource } = require("@opentelemetry/resources");

const {
  SemanticResourceAttributes,
} = require("@opentelemetry/semantic-conventions");

const resource = Resource.default().merge(
  new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "redis-job-queue",
  })
);

const traceExporter = new OTLPTraceExporter({
  url: "http://10.0.1.33:4317",
});

const sdk = new NodeSDK({
  resource,
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
