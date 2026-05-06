import {
  LOG_SOURCES,
  type AnomalyInsight,
  type LogRecord,
  type LogSource,
  type LogStatus,
  type ReconciliationRun,
  type ReconciliationSummary,
  type SourceStat
} from "@/lib/types";

const WORKFLOW: Array<{ source: LogSource; event: string; label: string }> = [
  { source: "Auth Service", event: "auth.completed", label: "Auth" },
  { source: "Payment Service", event: "payment.authorized", label: "Payment" },
  { source: "Inventory Service", event: "inventory.reserved", label: "Inventory" },
  { source: "Notification Service", event: "notification.sent", label: "Notification" }
];

const SOURCE_ORDER = Object.fromEntries(WORKFLOW.map((step, index) => [step.source, index])) as Record<LogSource, number>;
const EMPTY_METADATA_PENALTY = 10;

type RawLogInput = Record<string, unknown>;
type MutableLog = LogRecord & { rawIndex: number };

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
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  return undefined;
}

function normalizeConfidence(value: unknown) {
  const parsed = numberValue(value);
  if (typeof parsed !== "number") return 100;
  return Math.max(0, Math.min(100, parsed <= 1 ? parsed * 100 : parsed));
}

function metadataFrom(input: RawLogInput) {
  const metadata = input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
    ? (input.metadata as Record<string, unknown>)
    : {};
  const topLevelMetadata = Object.fromEntries(
    Object.entries(input).filter(
      ([key]) =>
        ![
          "_id",
          "source",
          "service",
          "event",
          "message",
          "rawTimestamp",
          "timestamp",
          "time",
          "createdAt",
          "updatedAt",
          "confidence",
          "status",
          "eventId",
          "id",
          "correlationId",
          "traceId",
          "sequence",
          "metadata",
          "predicted",
          "reconciliationNotes"
        ].includes(key)
    )
  );

  return { ...topLevelMetadata, ...metadata };
}

function stableHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

function metadataCompleteness(log: LogRecord) {
  return Object.values(log.metadata ?? {}).filter((value) => value !== undefined && value !== null && value !== "").length;
}

function hasMissingMetadata(log: LogRecord) {
  return metadataCompleteness(log) === 0;
}

function workflowIndex(log: Pick<LogRecord, "source" | "sequence">) {
  return typeof log.sequence === "number" ? log.sequence - 1 : SOURCE_ORDER[log.source];
}

function eventLabel(log: Pick<LogRecord, "source" | "event">) {
  const step = WORKFLOW.find((item) => item.source === log.source);
  return step?.label ?? log.event;
}

function confidenceColor(score: number): ReconciliationSummary["rawConfidenceColor"] {
  if (score >= 90) return "green";
  if (score >= 60) return "yellow";
  return "red";
}

function addStatus(log: LogRecord, status: LogStatus, note: string) {
  log.status = status;
  log.reconciliationNotes = Array.from(new Set([...(log.reconciliationNotes ?? []), note]));
}

function duplicateKey(log: LogRecord) {
  return [log.correlationId, log.eventId, log.source, log.event, log.sequence ?? "", log.normalizedTimestamp].join("|");
}

function timestampConflictKey(log: LogRecord) {
  return [log.correlationId, log.eventId || log.event, log.source].join("|");
}

function mergeDuplicate(candidate: MutableLog, current: MutableLog) {
  const candidateScore = metadataCompleteness(candidate);
  const currentScore = metadataCompleteness(current);
  if (candidateScore <= currentScore) return current;

  return {
    ...candidate,
    reconciliationNotes: Array.from(
      new Set([...(current.reconciliationNotes ?? []), ...(candidate.reconciliationNotes ?? []), "Kept this duplicate because it has the most complete metadata."])
    )
  };
}

function inferredTimestamp(before?: LogRecord, after?: LogRecord) {
  if (before && after) {
    const midpoint = Math.round((new Date(before.normalizedTimestamp).getTime() + new Date(after.normalizedTimestamp).getTime()) / 2);
    return new Date(midpoint).toISOString();
  }
  if (before) return new Date(new Date(before.normalizedTimestamp).getTime() + 1000).toISOString();
  if (after) return new Date(new Date(after.normalizedTimestamp).getTime() - 1000).toISOString();
  return new Date().toISOString();
}

export function toLogRecord(input: RawLogInput): LogRecord {
  const source = normalizeSource(input.source ?? input.service);
  const rawTimestamp = text(input.rawTimestamp ?? input.timestamp ?? input.time ?? input.createdAt, new Date().toISOString());
  const correlationId = text(input.correlationId ?? input.traceId, "");
  const normalizedTimestamp = normalizeTimestamp(rawTimestamp);

  return {
    _id: text(input._id ?? input.id, "") || undefined,
    source,
    event: text(input.event ?? input.message, WORKFLOW.find((step) => step.source === source)?.event ?? "unknown.event"),
    rawTimestamp,
    normalizedTimestamp,
    metadata: metadataFrom(input),
    confidence: normalizeConfidence(input.confidence),
    status: "normal",
    predicted: Boolean(input.predicted),
    reconciliationNotes: Array.isArray(input.reconciliationNotes) ? input.reconciliationNotes.map(String) : [],
    eventId: text(input.eventId ?? input.id, ""),
    correlationId,
    sequence: numberValue(input.sequence),
    createdAt: text(input.createdAt, "") || undefined,
    updatedAt: text(input.updatedAt, "") || undefined
  };
}

export function reconcileLogs(rawInputLogs: LogRecord[]): ReconciliationRun {
  const rawLogs = rawInputLogs.map((log) => ({ ...toLogRecord(log as unknown as RawLogInput), _id: log._id }));
  const missingCorrelationIds = rawLogs.filter((log) => !log.correlationId).length;
  const missingMetadata = rawLogs.filter(hasMissingMetadata).length;

  const normalizedLogs: MutableLog[] = rawLogs.map((log, rawIndex) => {
    const nextLog: MutableLog = {
      ...log,
      rawIndex,
      normalizedTimestamp: normalizeTimestamp(log.rawTimestamp ?? log.normalizedTimestamp),
      confidence: 100,
      reconciliationNotes: [...(log.reconciliationNotes ?? [])]
    };

    if (!nextLog.correlationId) {
      nextLog.correlationId = `generated-${stableHash(`${nextLog.source}|${nextLog.event}|${nextLog.normalizedTimestamp}|${rawIndex}`)}`;
      addStatus(nextLog, "causal-gap", "Generated a missing correlationId so the event can be reconciled.");
    }
    if (hasMissingMetadata(nextLog)) {
      addStatus(nextLog, "metadata-missing", "Metadata is missing or empty.");
    }

    return nextLog;
  });

  let timestampConflictsResolved = 0;
  const byConflictKey = new Map<string, MutableLog[]>();
  normalizedLogs.forEach((log) => {
    const key = timestampConflictKey(log);
    byConflictKey.set(key, [...(byConflictKey.get(key) ?? []), log]);
  });
  byConflictKey.forEach((logs) => {
    const uniqueTimes = new Set(logs.map((log) => log.normalizedTimestamp));
    if (logs.length > 1 && uniqueTimes.size > 1) {
      timestampConflictsResolved += logs.length;
      const best = logs.slice().sort((a, b) => metadataCompleteness(b) - metadataCompleteness(a))[0];
      logs.forEach((log) => {
        log.normalizedTimestamp = best.normalizedTimestamp;
        addStatus(log, "timestamp-conflict", "Resolved conflicting timestamps for matching event identity.");
      });
    }
  });

  const duplicateMap = new Map<string, MutableLog>();
  let duplicatesRemoved = 0;
  normalizedLogs.forEach((log) => {
    const key = duplicateKey(log);
    const existing = duplicateMap.get(key);
    if (!existing) {
      duplicateMap.set(key, log);
      return;
    }
    duplicatesRemoved += 1;
    duplicateMap.set(key, mergeDuplicate(log, existing));
  });

  const dedupedLogs = Array.from(duplicateMap.values());
  const grouped = new Map<string, MutableLog[]>();
  dedupedLogs.forEach((log) => {
    grouped.set(log.correlationId ?? "uncorrelated", [...(grouped.get(log.correlationId ?? "uncorrelated") ?? []), log]);
  });

  let missingEventsInferred = 0;
  const cleanedLogs: LogRecord[] = [];
  grouped.forEach((logs, correlationId) => {
    const expectedRange = WORKFLOW;
    const presentSources = new Set(logs.map((log) => log.source));
    const groupLogs: LogRecord[] = [...logs];

    expectedRange.forEach((step, index) => {
      if (presentSources.has(step.source)) return;
      const before = groupLogs.find((log) => workflowIndex(log) < index);
      const after = groupLogs.find((log) => workflowIndex(log) > index);
      const timestamp = inferredTimestamp(before, after);
      missingEventsInferred += 1;
      groupLogs.push({
        source: step.source,
        event: step.event,
        rawTimestamp: timestamp,
        normalizedTimestamp: timestamp,
        metadata: { inferred: true, reason: "Expected workflow event was missing from raw logs." },
        confidence: 100,
        status: "predicted",
        predicted: true,
        reconciliationNotes: [`Inferred missing ${step.label} event from surrounding workflow context.`],
        eventId: `predicted-${stableHash(`${correlationId}|${step.source}|${step.event}`)}`,
        correlationId,
        sequence: index + 1
      });
    });

    const ordered = groupLogs.sort((a, b) => {
      const causal = workflowIndex(a) - workflowIndex(b);
      if (causal !== 0) return causal;
      return new Date(a.normalizedTimestamp).getTime() - new Date(b.normalizedTimestamp).getTime();
    });

    ordered.forEach((log, index) => {
      const previous = ordered[index - 1];
      if (!previous) return;
      const previousTime = new Date(previous.normalizedTimestamp).getTime();
      const currentTime = new Date(log.normalizedTimestamp).getTime();
      if (currentTime <= previousTime) {
        timestampConflictsResolved += 1;
        log.normalizedTimestamp = new Date(previousTime + 1).toISOString();
        addStatus(log, log.predicted ? "predicted" : "timestamp-conflict", "Adjusted timestamp to preserve causal order.");
      }
    });

    cleanedLogs.push(...ordered);
  });

  const rawPositions = new Map(dedupedLogs.map((log, index) => [log, index]));
  let eventsReordered = 0;
  cleanedLogs.forEach((log, index) => {
    const rawPosition = rawPositions.get(log as MutableLog);
    if (typeof rawPosition === "number" && rawPosition !== index) {
      eventsReordered += 1;
      addStatus(log, log.status === "normal" ? "out-of-order" : log.status, "Moved into causal workflow order.");
    }
  });

  const rawPenalty =
    duplicatesRemoved * 30 +
    eventsReordered * 25 +
    missingCorrelationIds * 20 +
    missingMetadata * EMPTY_METADATA_PENALTY +
    timestampConflictsResolved * 15 +
    missingEventsInferred * 20;
  const rawConfidenceScore = Math.max(
    0,
    100 - rawPenalty
  );
  const repairCredit =
    duplicatesRemoved * 24 +
    eventsReordered * 22 +
    timestampConflictsResolved * 14 +
    missingEventsInferred * 16;
  const unrepairedPenalty = missingCorrelationIds * 8 + missingMetadata * 5;
  const reconciledConfidenceScore = Math.max(
    0,
    Math.min(100, rawConfidenceScore + repairCredit - unrepairedPenalty)
  );
  const lowConfidenceReasons = [
    duplicatesRemoved > 0 && `${duplicatesRemoved} duplicate ${duplicatesRemoved === 1 ? "log was" : "logs were"} removed.`,
    eventsReordered > 0 && `${eventsReordered} event ${eventsReordered === 1 ? "was" : "were"} reordered.`,
    missingCorrelationIds > 0 && `${missingCorrelationIds} log ${missingCorrelationIds === 1 ? "was" : "were"} missing correlationId.`,
    missingMetadata > 0 && `${missingMetadata} log ${missingMetadata === 1 ? "was" : "were"} missing metadata.`,
    timestampConflictsResolved > 0 && `${timestampConflictsResolved} timestamp ${timestampConflictsResolved === 1 ? "conflict was" : "conflicts were"} resolved.`,
    missingEventsInferred > 0 && `${missingEventsInferred} expected event ${missingEventsInferred === 1 ? "was" : "were"} inferred.`
  ].filter(Boolean) as string[];

  const scoredLogs = cleanedLogs.map((log) => ({
    ...log,
    confidence: log.predicted ? Math.max(45, reconciledConfidenceScore - 12) : reconciledConfidenceScore,
    reconciliationNotes: log.reconciliationNotes?.length ? log.reconciliationNotes : ["Log reconciled into the canonical timeline."]
  }));

  const summary: ReconciliationSummary = {
    rawCount: rawLogs.length,
    cleanedCount: scoredLogs.length,
    duplicatesRemoved,
    eventsReordered,
    missingEventsInferred,
    timestampConflictsResolved,
    missingCorrelationIds,
    missingMetadata,
    rawConfidenceScore,
    reconciledConfidenceScore,
    rawConfidenceColor: confidenceColor(rawConfidenceScore),
    reconciledConfidenceColor: confidenceColor(reconciledConfidenceScore),
    confidenceScore: reconciledConfidenceScore,
    confidenceColor: confidenceColor(reconciledConfidenceScore),
    rawSequence: rawLogs.map(eventLabel),
    reconciledSequence: scoredLogs.map(eventLabel),
    lowConfidenceReasons
  };

  return {
    rawLogs,
    cleanedLogs: scoredLogs,
    insights: buildInsights(scoredLogs, summary),
    sourceStats: buildSourceStats(scoredLogs),
    summary
  };
}

export function buildInsights(logs: LogRecord[], summary?: ReconciliationSummary): AnomalyInsight[] {
  const insights: AnomalyInsight[] = [];

  if (summary?.duplicatesRemoved) {
    insights.push({
      id: "duplicates",
      title: "Duplicate removed",
      description: `${summary.duplicatesRemoved} duplicate ${summary.duplicatesRemoved === 1 ? "record was" : "records were"} removed. The canonical copy keeps the richest metadata available for that event.`,
      severity: summary.duplicatesRemoved > 2 ? "high" : "medium"
    });
  }

  if (summary?.eventsReordered) {
    insights.push({
      id: "reordered",
      title: "Event reordered",
      description: `${summary.eventsReordered} event ${summary.eventsReordered === 1 ? "was" : "were"} moved into the expected causal sequence: Auth -> Payment -> Inventory -> Notification.`,
      severity: "medium"
    });
  }

  if (summary?.missingEventsInferred) {
    insights.push({
      id: "inferred",
      title: "Missing event inferred",
      description: `${summary.missingEventsInferred} expected workflow ${summary.missingEventsInferred === 1 ? "event was" : "events were"} inferred and marked as predicted in the cleaned timeline.`,
      severity: "high"
    });
  }

  if (summary && summary.rawConfidenceScore < 60) {
    insights.push({
      id: "low-confidence",
      title: "Low confidence reason",
      description: `Raw confidence is low because ${summary.lowConfidenceReasons.join(" ").toLowerCase()} Reconciled confidence is ${summary.reconciledConfidenceScore}% after correction.`,
      severity: "high"
    });
  }

  logs
    .filter((log) => log.status !== "normal" && !log.predicted)
    .slice(0, 6)
    .forEach((log, index) => {
      insights.push({
        id: `log-${index}-${log.eventId ?? log.event}`,
        title: `${log.source} reconciliation note`,
        description: `${log.event}: ${(log.reconciliationNotes ?? ["Anomaly detected during reconciliation."]).join(" ")}`,
        severity: log.confidence < 60 ? "high" : "medium",
        source: log.source,
        correlationId: log.correlationId
      });
    });

  return insights;
}

export function buildSourceStats(logs: LogRecord[]): SourceStat[] {
  return LOG_SOURCES.map((source) => {
    const sourceLogs = logs.filter((log) => log.source === source);
    const confidenceTotal = sourceLogs.reduce((sum, log) => sum + log.confidence, 0);
    return {
      source,
      total: sourceLogs.length,
      anomalies: sourceLogs.filter((log) => log.status !== "normal").length,
      averageConfidence: sourceLogs.length ? Number((confidenceTotal / sourceLogs.length).toFixed(0)) : 0,
      latestTimestamp: sourceLogs.at(-1)?.normalizedTimestamp
    };
  });
}

export function generateSampleLogs(): LogRecord[] {
  return [
    {
      source: "Auth Service",
      event: "user.login",
      rawTimestamp: "2026-05-05T03:40:00-04:00",
      normalizedTimestamp: "2026-05-05T07:40:00.000Z",
      metadata: { userId: "usr_1024", ip: "203.0.113.24" },
      confidence: 100,
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
      confidence: 100,
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
      confidence: 100,
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
      confidence: 100,
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
      confidence: 100,
      status: "normal",
      eventId: "evt-002",
      correlationId: "order-8841",
      sequence: 2
    }
  ];
}
