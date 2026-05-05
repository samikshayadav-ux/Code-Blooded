import { LOG_SOURCES, type AnomalyInsight, type LogRecord, type LogSource, type LogStatus, type SourceStat } from "@/lib/types";

const SOURCE_ORDER: Record<LogSource, number> = {
  "Auth Service": 1,
  "Payment Service": 2,
  "Inventory Service": 3,
  "Notification Service": 4
};

type RawLogInput = Record<string, unknown>;

function isLogSource(value: unknown): value is LogSource {
  return typeof value === "string" && LOG_SOURCES.includes(value as LogSource);
}

function normalizeSource(value: unknown): LogSource {
  if (isLogSource(value)) return value;

  if (typeof value !== "string") return "Auth Service";

  const normalized = value.trim().toLowerCase().replace(/[_\s]+/g, "-");
  const sourceAliases: Record<string, LogSource> = {
    "auth-service": "Auth Service",
    auth: "Auth Service",
    "payment-service": "Payment Service",
    payment: "Payment Service",
    "notification-service": "Notification Service",
    notification: "Notification Service",
    "inventory-service": "Inventory Service",
    inventory: "Inventory Service",
    frontend: "Notification Service"
  };

  return sourceAliases[normalized] ?? "Auth Service";
}

function normalizeTimestamp(value: unknown) {
  const fallback = new Date();
  const parsed = value ? new Date(String(value)) : fallback;
  return Number.isNaN(parsed.getTime()) ? fallback.toISOString() : parsed.toISOString();
}

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
}

export function toLogRecord(input: RawLogInput): LogRecord {
  const source = normalizeSource(input.source ?? input.service);
  const rawTimestamp = text(
    input.rawTimestamp ?? input.timestamp ?? input.time ?? input.createdAt,
    new Date().toISOString()
  );

  const metadata = Object.fromEntries(
    Object.entries(input).filter(
      ([key]) =>
        ![
          "source",
          "service",
          "event",
          "message",
          "rawTimestamp",
          "timestamp",
          "time",
          "createdAt",
          "confidence",
          "status",
          "eventId",
          "id",
          "correlationId",
          "traceId",
          "sequence"
        ].includes(key)
    )
  );

  return {
    source,
    event: text(input.event ?? input.message, "unknown.event"),
    rawTimestamp,
    normalizedTimestamp: normalizeTimestamp(rawTimestamp),
    metadata,
    confidence: numberValue(input.confidence) ?? 1,
    status: "normal",
    eventId: text(input.eventId ?? input.id, ""),
    correlationId: text(input.correlationId ?? input.traceId, ""),
    sequence: numberValue(input.sequence)
  };
}

function fingerprint(log: LogRecord) {
  return [log.source, log.eventId || log.event, log.normalizedTimestamp, log.correlationId || "none"].join("|");
}

function withConfidence(statuses: Set<LogStatus>, baseConfidence: number) {
  let confidence = Math.min(1, Math.max(0, baseConfidence));
  if (statuses.has("duplicate")) confidence -= 0.34;
  if (statuses.has("missing")) confidence -= 0.28;
  if (statuses.has("out-of-order")) confidence -= 0.22;
  if (statuses.has("causal-gap")) confidence -= 0.18;
  return Math.max(0.08, Number(confidence.toFixed(2)));
}

function dominantStatus(statuses: Set<LogStatus>): LogStatus {
  if (statuses.has("duplicate")) return "duplicate";
  if (statuses.has("missing")) return "missing";
  if (statuses.has("out-of-order")) return "out-of-order";
  if (statuses.has("causal-gap")) return "causal-gap";
  return "normal";
}

export function reconcileLogs(inputLogs: LogRecord[]) {
  const seen = new Map<string, number>();
  const statusesByIndex = inputLogs.map(() => new Set<LogStatus>(["normal"]));

  inputLogs.forEach((log, index) => {
    const key = fingerprint(log);
    if (seen.has(key)) {
      statusesByIndex[index].add("duplicate");
      statusesByIndex[seen.get(key)!].add("duplicate");
    } else {
      seen.set(key, index);
    }
  });

  const bySource = new Map<LogSource, LogRecord[]>();
  inputLogs.forEach((log) => {
    bySource.set(log.source, [...(bySource.get(log.source) ?? []), log]);
  });

  bySource.forEach((logs) => {
    logs
      .filter((log) => typeof log.sequence === "number")
      .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
      .forEach((log, sortedIndex, sortedLogs) => {
        const previous = sortedLogs[sortedIndex - 1];
        if (previous && (log.sequence ?? 0) - (previous.sequence ?? 0) > 1) {
          const index = inputLogs.indexOf(log);
          statusesByIndex[index].add("missing");
        }
      });
  });

  inputLogs.forEach((log, index) => {
    const previous = inputLogs[index - 1];
    if (previous && new Date(log.normalizedTimestamp) < new Date(previous.normalizedTimestamp)) {
      statusesByIndex[index].add("out-of-order");
    }
  });

  const byCorrelation = new Map<string, LogRecord[]>();
  inputLogs.forEach((log) => {
    if (!log.correlationId) return;
    byCorrelation.set(log.correlationId, [...(byCorrelation.get(log.correlationId) ?? []), log]);
  });

  byCorrelation.forEach((logs) => {
    const ordered = logs.sort((a, b) => SOURCE_ORDER[a.source] - SOURCE_ORDER[b.source]);
    ordered.forEach((log, index) => {
      const previous = ordered[index - 1];
      if (!previous) return;
      const previousTime = new Date(previous.normalizedTimestamp).getTime();
      const currentTime = new Date(log.normalizedTimestamp).getTime();
      if (currentTime < previousTime) {
        statusesByIndex[inputLogs.indexOf(log)].add("causal-gap");
      }
    });
  });

  const processed = inputLogs
    .map((log, index) => {
      statusesByIndex[index].delete("normal");
      const statuses = statusesByIndex[index];
      return {
        ...log,
        status: dominantStatus(statuses),
        confidence: withConfidence(statuses, log.confidence)
      };
    })
    .sort(
      (a, b) =>
        new Date(a.normalizedTimestamp).getTime() - new Date(b.normalizedTimestamp).getTime() ||
        SOURCE_ORDER[a.source] - SOURCE_ORDER[b.source]
    );

  return processed;
}

export function buildInsights(logs: LogRecord[]): AnomalyInsight[] {
  const anomalies = logs.filter((log) => log.status !== "normal");
  const duplicateCount = anomalies.filter((log) => log.status === "duplicate").length;
  const missingCount = anomalies.filter((log) => log.status === "missing").length;
  const outOfOrderCount = anomalies.filter((log) => log.status === "out-of-order").length;
  const causalGapCount = anomalies.filter((log) => log.status === "causal-gap").length;

  return [
    duplicateCount && {
      id: "duplicates",
      title: "Duplicate log signatures",
      description: `${duplicateCount} records share the same source, event, timestamp, and correlation fingerprint.`,
      severity: duplicateCount > 3 ? "high" : "medium"
    },
    missingCount && {
      id: "missing",
      title: "Sequence gaps detected",
      description: `${missingCount} records indicate skipped sequence numbers inside a source stream.`,
      severity: "high"
    },
    outOfOrderCount && {
      id: "out-of-order",
      title: "Out-of-order arrival",
      description: `${outOfOrderCount} records arrived earlier than the previous raw stream entry after UTC normalization.`,
      severity: "medium"
    },
    causalGapCount && {
      id: "causal",
      title: "Causal timeline conflicts",
      description: `${causalGapCount} records appear before prerequisite service events in the same correlation trace.`,
      severity: "high"
    }
  ].filter(Boolean) as AnomalyInsight[];
}

export function buildSourceStats(logs: LogRecord[]): SourceStat[] {
  return LOG_SOURCES.map((source) => {
    const sourceLogs = logs.filter((log) => log.source === source);
    const confidenceTotal = sourceLogs.reduce((sum, log) => sum + log.confidence, 0);
    return {
      source,
      total: sourceLogs.length,
      anomalies: sourceLogs.filter((log) => log.status !== "normal").length,
      averageConfidence: sourceLogs.length ? Number((confidenceTotal / sourceLogs.length).toFixed(2)) : 0,
      latestTimestamp: sourceLogs.at(-1)?.normalizedTimestamp
    };
  });
}

export function generateSampleLogs(): LogRecord[] {
  return reconcileLogs([
    {
      source: "Auth Service",
      event: "user.login",
      rawTimestamp: "2026-05-05T03:40:00-04:00",
      normalizedTimestamp: "2026-05-05T07:40:00.000Z",
      metadata: { userId: "usr_1024", ip: "203.0.113.24" },
      confidence: 0.97,
      status: "normal",
      eventId: "evt-001",
      correlationId: "order-8841",
      sequence: 1
    },
    {
      source: "Payment Service",
      event: "payment.authorized",
      rawTimestamp: "2026-05-05T07:40:04Z",
      normalizedTimestamp: "2026-05-05T07:40:04.000Z",
      metadata: { amount: 149.99, currency: "USD" },
      confidence: 0.94,
      status: "normal",
      eventId: "evt-002",
      correlationId: "order-8841",
      sequence: 2
    },
    {
      source: "Inventory Service",
      event: "stock.reserved",
      rawTimestamp: "2026-05-05T07:39:59Z",
      normalizedTimestamp: "2026-05-05T07:39:59.000Z",
      metadata: { sku: "DLR-14", warehouse: "iad-2" },
      confidence: 0.88,
      status: "normal",
      eventId: "evt-003",
      correlationId: "order-8841",
      sequence: 4
    },
    {
      source: "Notification Service",
      event: "email.queued",
      rawTimestamp: "2026-05-05T07:40:08Z",
      normalizedTimestamp: "2026-05-05T07:40:08.000Z",
      metadata: { template: "receipt" },
      confidence: 0.91,
      status: "normal",
      eventId: "evt-004",
      correlationId: "order-8841",
      sequence: 5
    },
    {
      source: "Payment Service",
      event: "payment.authorized",
      rawTimestamp: "2026-05-05T07:40:04Z",
      normalizedTimestamp: "2026-05-05T07:40:04.000Z",
      metadata: { amount: 149.99, currency: "USD", replay: true },
      confidence: 0.9,
      status: "normal",
      eventId: "evt-002",
      correlationId: "order-8841",
      sequence: 2
    }
  ]);
}
