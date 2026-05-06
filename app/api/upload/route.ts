import { NextResponse } from "next/server";
import Papa from "papaparse";
import { insertLogs } from "@/lib/logs";
import { toLogRecord } from "@/lib/reconciliation";
import { runAndSaveReconciliation } from "@/lib/reconciliation-store";

export const runtime = "nodejs";

const CSV_FIELD_ALIASES: Record<string, string> = {
  source: "service",
  service: "service",
  event: "event",
  message: "event",
  timestamp: "timestamp",
  rawtimestamp: "timestamp",
  time: "timestamp",
  createdat: "timestamp",
  correlationid: "correlationId",
  traceid: "correlationId",
  sequence: "sequence",
  metadata: "metadata"
};

function normalizeCsvKey(key: string) {
  return key.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseMetadata(value: unknown, rowNumber: number) {
  if (!value) return {};
  if (typeof value === "object") return value;
  if (typeof value !== "string") return { value };
  const trimmed = value.trim();
  if (!trimmed) return {};

  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error(`Malformed CSV row ${rowNumber}: metadata must be valid JSON when provided.`);
  }
}

function normalizeCsvRows(rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    throw new Error("CSV file is empty.");
  }

  const required = new Set(["service", "event", "timestamp"]);
  return rows.map((row, index) => {
    const normalized: Record<string, unknown> = {};
    const metadata: Record<string, unknown> = {};

    Object.entries(row).forEach(([rawKey, rawValue]) => {
      const mappedKey = CSV_FIELD_ALIASES[normalizeCsvKey(rawKey)];
      const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
      if (value === "" || value === undefined || value === null) return;

      if (!mappedKey) {
        metadata[rawKey.trim()] = value;
        return;
      }

      if (mappedKey === "metadata") {
        Object.assign(metadata, parseMetadata(value, index + 2));
        return;
      }

      normalized[mappedKey] = mappedKey === "sequence" ? Number(value) : value;
    });

    required.forEach((field) => {
      if (!normalized[field]) {
        throw new Error(`Malformed CSV row ${index + 2}: missing ${field}.`);
      }
    });

    if (normalized.sequence !== undefined && Number.isNaN(normalized.sequence)) {
      throw new Error(`Malformed CSV row ${index + 2}: sequence must be a number.`);
    }

    if (Number.isNaN(new Date(String(normalized.timestamp)).getTime())) {
      throw new Error(`Malformed CSV row ${index + 2}: timestamp is invalid.`);
    }

    return { ...normalized, metadata };
  });
}

async function parseUpload(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new Error("Attach a JSON or CSV file using the `file` form field.");
  }

  const text = await file.text();
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "json" || extension === "ndjson") {
    const trimmed = text.trim();
    const parsed = trimmed.startsWith("[")
      ? JSON.parse(trimmed)
      : trimmed
          .split(/\r?\n/)
          .filter(Boolean)
          .map((line) => JSON.parse(line));
    return Array.isArray(parsed) ? parsed : parsed.logs ?? [parsed];
  }

  if (extension === "csv") {
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true
    });

    if (parsed.errors.length) {
      throw new Error(parsed.errors.map((error) => error.message).join(", "));
    }

    const headers = parsed.meta.fields ?? [];
    const normalizedHeaders = new Set(headers.map(normalizeCsvKey).map((key) => CSV_FIELD_ALIASES[key]).filter(Boolean));
    for (const field of ["service", "event", "timestamp"]) {
      if (!normalizedHeaders.has(field)) {
        throw new Error(`Malformed CSV: missing required ${field} column.`);
      }
    }

    return normalizeCsvRows(parsed.data);
  }

  throw new Error("Unsupported file type. Upload a .json, .ndjson, or .csv file.");
}

export async function POST(request: Request) {
  try {
    const rawLogs = await parseUpload(request);
    const logs = rawLogs.map(toLogRecord);
    const insertedLogs = await insertLogs(logs);
    await runAndSaveReconciliation();

    return NextResponse.json({
      inserted: insertedLogs.length,
      skipped: 0,
      logs: insertedLogs
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
