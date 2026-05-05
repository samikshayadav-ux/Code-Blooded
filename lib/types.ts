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
  | "causal-gap";

export type LogRecord = {
  _id?: string;
  source: LogSource;
  event: string;
  rawTimestamp: string;
  normalizedTimestamp: string;
  metadata: Record<string, unknown>;
  confidence: number;
  status: LogStatus;
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
};

export type AnomalyInsight = {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  source?: LogSource;
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
