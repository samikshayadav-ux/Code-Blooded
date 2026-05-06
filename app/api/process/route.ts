import { NextResponse } from "next/server";
import { runAndSaveReconciliation } from "@/lib/reconciliation-store";

export const runtime = "nodejs";

export async function POST() {
  try {
    const run = await runAndSaveReconciliation();

    return NextResponse.json({
      processed: run.cleanedLogs.length,
      logs: run.cleanedLogs,
      rawLogs: run.rawLogs,
      cleanedLogs: run.cleanedLogs,
      insights: run.insights,
      sourceStats: run.sourceStats,
      summary: run.summary
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
