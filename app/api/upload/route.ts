import { NextResponse } from "next/server";
import Papa from "papaparse";
import { insertLogs } from "@/lib/logs";
import { reconcileLogs, toLogRecord } from "@/lib/reconciliation";

export const runtime = "nodejs";

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

    return parsed.data;
  }

  throw new Error("Unsupported file type. Upload a .json, .ndjson, or .csv file.");
}

export async function POST(request: Request) {
  try {
    const rawLogs = await parseUpload(request);
    const logs = reconcileLogs(rawLogs.map(toLogRecord));
    const insertedLogs = await insertLogs(logs);

    return NextResponse.json({
      inserted: insertedLogs.length,
      skipped: logs.length - insertedLogs.length,
      logs: insertedLogs
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
