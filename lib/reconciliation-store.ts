import { ObjectId, type Document } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { buildSourceStats, reconcileLogs } from "@/lib/reconciliation";
import { getLogs, insertLogs } from "@/lib/logs";
import type { AnomalyInsight, LogRecord, ReconciliationRun, ReconciliationSummary } from "@/lib/types";

const RECONCILED_COLLECTION = "reconciled_logs";
const INSIGHTS_COLLECTION = "insights";

function serializeLog(document: Document): LogRecord {
  return {
    _id: document._id instanceof ObjectId ? document._id.toHexString() : String(document._id),
    source: document.source,
    event: document.event,
    rawTimestamp: document.rawTimestamp,
    normalizedTimestamp: document.normalizedTimestamp,
    metadata: document.metadata ?? {},
    confidence: document.confidence,
    status: document.status,
    predicted: document.predicted,
    reconciliationNotes: document.reconciliationNotes ?? [],
    eventId: document.eventId,
    correlationId: document.correlationId,
    sequence: document.sequence,
    createdAt: document.createdAt?.toISOString?.() ?? document.createdAt,
    updatedAt: document.updatedAt?.toISOString?.() ?? document.updatedAt
  };
}

function serializeInsight(document: Document): AnomalyInsight {
  return {
    id: document.id,
    title: document.title,
    description: document.description,
    severity: document.severity,
    source: document.source,
    correlationId: document.correlationId
  };
}

export async function ensureReconciliationIndexes() {
  const db = await getDb();
  await db.collection(RECONCILED_COLLECTION).createIndexes([
    { key: { normalizedTimestamp: 1 } },
    { key: { correlationId: 1, sequence: 1 } },
    { key: { predicted: 1 } }
  ]);
  await db.collection(INSIGHTS_COLLECTION).createIndexes([{ key: { id: 1 } }, { key: { severity: 1 } }]);
}

export async function getReconciledLogs(source?: string) {
  const db = await getDb();
  await ensureReconciliationIndexes();
  const filter = source && source !== "all" ? { source } : {};
  const logs = await db
    .collection(RECONCILED_COLLECTION)
    .find(filter)
    .sort({ correlationId: 1, sequence: 1, normalizedTimestamp: 1 })
    .limit(1000)
    .toArray();

  return logs.map(serializeLog);
}

export async function getStoredInsights() {
  const db = await getDb();
  await ensureReconciliationIndexes();
  const insights = await db.collection(INSIGHTS_COLLECTION).find({ kind: "insight" }).toArray();
  const summaryDocument = await db.collection(INSIGHTS_COLLECTION).findOne({ kind: "summary" });

  return {
    insights: insights.map(serializeInsight),
    summary: summaryDocument?.summary as ReconciliationSummary | undefined
  };
}

export async function saveReconciliationRun(run: ReconciliationRun) {
  const db = await getDb();
  await ensureReconciliationIndexes();
  const now = new Date();

  await db.collection(RECONCILED_COLLECTION).deleteMany({});
  if (run.cleanedLogs.length > 0) {
    await db.collection(RECONCILED_COLLECTION).insertMany(
      run.cleanedLogs.map((log) => {
        const { _id, createdAt, updatedAt, ...insertableLog } = log;
        void _id;
        void createdAt;
        void updatedAt;

        return {
          ...insertableLog,
          createdAt: now,
          updatedAt: now
        };
      })
    );
  }

  await db.collection(INSIGHTS_COLLECTION).deleteMany({});
  if (run.insights.length > 0) {
    await db.collection(INSIGHTS_COLLECTION).insertMany(
      run.insights.map((insight) => ({
        ...insight,
        kind: "insight",
        createdAt: now
      }))
    );
  }
  await db.collection(INSIGHTS_COLLECTION).insertOne({
    kind: "summary",
    summary: run.summary,
    sourceStats: run.sourceStats,
    createdAt: now
  });

  return run;
}

export async function runAndSaveReconciliation() {
  const rawLogs = await getLogs();
  const run = reconcileLogs(rawLogs);
  return saveReconciliationRun(run);
}

export async function getReconciliationRun(source = "all") {
  let rawLogs = await getLogs();
  if (rawLogs.length === 0 && source === "all") {
    const { generateSampleLogs } = await import("@/lib/reconciliation");
    rawLogs = await insertLogs(generateSampleLogs());
    await saveReconciliationRun(reconcileLogs(rawLogs));
  }

  let cleanedLogs = await getReconciledLogs(source);
  const stored = await getStoredInsights();

  if (
    rawLogs.length > 0 &&
    source === "all" &&
    (cleanedLogs.length === 0 || typeof stored.summary?.rawConfidenceScore !== "number")
  ) {
    const run = await saveReconciliationRun(reconcileLogs(rawLogs));
    return run;
  }

  const allCleanedLogs = source === "all" ? cleanedLogs : await getReconciledLogs("all");
  const summary = stored.summary ?? reconcileLogs(rawLogs).summary;

  return {
    rawLogs,
    cleanedLogs,
    insights: stored.insights,
    sourceStats: buildSourceStats(allCleanedLogs),
    summary
  };
}
