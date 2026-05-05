import { NextResponse } from "next/server";
import { deleteLog, getLogs, insertLogs, replaceProcessedLogs, updateLog } from "@/lib/logs";
import { reconcileLogs, toLogRecord } from "@/lib/reconciliation";

export const runtime = "nodejs";

async function rebuildTimeline() {
  const logs = await getLogs();
  return replaceProcessedLogs(reconcileLogs(logs));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const [log] = reconcileLogs([toLogRecord(body)]);
    const [created] = await insertLogs([log]);
    const logs = await rebuildTimeline();

    return NextResponse.json({ log: created, logs }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create log.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: "Missing log id." }, { status: 400 });
    }

    const [log] = reconcileLogs([toLogRecord(body)]);
    const updated = await updateLog(body.id, log);

    if (!updated) {
      return NextResponse.json({ error: "Log not found." }, { status: 404 });
    }

    const logs = await rebuildTimeline();

    return NextResponse.json({ log: updated, logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update log.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing log id." }, { status: 400 });
    }

    const deleted = await deleteLog(id);
    if (!deleted) {
      return NextResponse.json({ error: "Log not found." }, { status: 404 });
    }

    const logs = await rebuildTimeline();

    return NextResponse.json({ deleted: true, logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete log.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
