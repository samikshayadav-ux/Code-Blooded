import { ObjectId, type Document } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { LogRecord } from "@/lib/types";

const COLLECTION = "logs";

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
    eventId: document.eventId,
    correlationId: document.correlationId,
    sequence: document.sequence,
    createdAt: document.createdAt?.toISOString?.() ?? document.createdAt,
    updatedAt: document.updatedAt?.toISOString?.() ?? document.updatedAt
  };
}

export async function ensureLogIndexes() {
  const db = await getDb();
  await db.collection(COLLECTION).createIndexes([
    { key: { normalizedTimestamp: 1 } },
    { key: { source: 1 } },
    { key: { correlationId: 1, sequence: 1 } },
    { key: { eventId: 1, source: 1 } }
  ]);
}

export async function insertLogs(logs: LogRecord[]) {
  if (logs.length === 0) return [];

  const db = await getDb();
  await ensureLogIndexes();

  const now = new Date();
  const result = await db.collection(COLLECTION).insertMany(
    logs.map((log) => {
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

  return Object.values(result.insertedIds).map((id, index) => ({
    ...logs[index],
    _id: id.toHexString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  }));
}

export async function getLogs(source?: string) {
  const db = await getDb();
  await ensureLogIndexes();
  const filter = source && source !== "all" ? { source } : {};
  const logs = await db
    .collection(COLLECTION)
    .find(filter)
    .sort({ normalizedTimestamp: 1, sequence: 1 })
    .limit(1000)
    .toArray();

  return logs.map(serializeLog);
}

export async function updateLog(id: string, log: LogRecord) {
  const db = await getDb();
  await ensureLogIndexes();

  const { _id, createdAt, updatedAt, ...updateableLog } = log;
  void _id;
  void createdAt;
  void updatedAt;

  await db.collection(COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...updateableLog,
        updatedAt: new Date()
      }
    }
  );

  const updated = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
  return updated ? serializeLog(updated) : null;
}

export async function deleteLog(id: string) {
  const db = await getDb();
  await ensureLogIndexes();
  const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}
