import { NextResponse } from "next/server";
import { getReconciliationRun } from "@/lib/reconciliation-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source") ?? "all";
    const run = await getReconciliationRun(source);

    return NextResponse.json({
      logs: run.cleanedLogs,
      rawLogs: run.rawLogs,
      cleanedLogs: run.cleanedLogs,
      insights: run.insights,
      sourceStats: run.sourceStats,
      summary: run.summary
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Timeline lookup failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
