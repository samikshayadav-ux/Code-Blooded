import { NextResponse } from "next/server";
import { deleteLog, getLogs, insertLogs, updateLog } from "@/lib/logs";
import { toLogRecord } from "@/lib/reconciliation";
import { runAndSaveReconciliation } from "@/lib/reconciliation-store";

export const runtime = "nodejs";

async function rebuildTimeline() {
  const run = await runAndSaveReconciliation();
  return run.cleanedLogs;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source") ?? "all";
    const logs = await getLogs(source);
    return NextResponse.json({ logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load logs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const [created] = await insertLogs([toLogRecord(body)]);
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

    const updated = await updateLog(body.id, toLogRecord(body));

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
