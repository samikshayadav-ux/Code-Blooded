import { NextResponse } from "next/server";
import { deleteLog, insertLogs, updateLog } from "@/lib/logs";
import { reconcileLogs, toLogRecord } from "@/lib/reconciliation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const [log] = reconcileLogs([toLogRecord(body)]);
    const [created] = await insertLogs([log]);

    return NextResponse.json({ log: created }, { status: 201 });
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

    return NextResponse.json({ log: updated });
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

    return NextResponse.json({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete log.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
