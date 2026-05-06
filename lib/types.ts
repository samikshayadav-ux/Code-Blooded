export const LOG_SOURCES = [
  "Auth Service",
  "Payment Service",
  "Notification Service",
  "Inventory Service"
] as const;

export type LogSource = (typeof LOG_SOURCES)[number];

export type LogStatus =
  | "normal"
  | "duplicate"
  | "missing"
  | "out-of-order"
  | "causal-gap"
  | "predicted"
  | "timestamp-conflict"
  | "metadata-missing";

export type LogRecord = {
  _id?: string;
  source: LogSource;
  event: string;
  rawTimestamp: string;
  normalizedTimestamp: string;
  metadata: Record<string, unknown>;
  confidence: number;
  status: LogStatus;
  predicted?: boolean;
  reconciliationNotes?: string[];
  eventId?: string;
  correlationId?: string;
  sequence?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type TimelineResponse = {
  logs: LogRecord[];
  insights: AnomalyInsight[];
  sourceStats: SourceStat[];
  summary?: ReconciliationSummary;
};

export type AnomalyInsight = {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  source?: LogSource;
  correlationId?: string;
};

export type SourceStat = {
  source: LogSource;
  total: number;
  anomalies: number;
  averageConfidence: number;
  latestTimestamp?: string;
};

export type UploadResult = {
  inserted: number;
  skipped: number;
  logs: LogRecord[];
};

export type ReconciliationSummary = {
  rawCount: number;
  cleanedCount: number;
  duplicatesRemoved: number;
  eventsReordered: number;
  missingEventsInferred: number;
  timestampConflictsResolved: number;
  missingCorrelationIds: number;
  missingMetadata: number;
  rawConfidenceScore: number;
  reconciledConfidenceScore: number;
  rawConfidenceColor: "green" | "yellow" | "red";
  reconciledConfidenceColor: "green" | "yellow" | "red";
  confidenceScore: number;
  confidenceColor: "green" | "yellow" | "red";
  rawSequence: string[];
  reconciledSequence: string[];
  lowConfidenceReasons: string[];
};

export type ReconciliationRun = {
  rawLogs: LogRecord[];
  cleanedLogs: LogRecord[];
  insights: AnomalyInsight[];
  sourceStats: SourceStat[];
  summary: ReconciliationSummary;
};
