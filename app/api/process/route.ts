import { NextResponse } from "next/server";
import { getLogs, replaceProcessedLogs } from "@/lib/logs";
import { buildInsights, buildSourceStats, reconcileLogs } from "@/lib/reconciliation";

export const runtime = "nodejs";

export async function POST() {
  try {
    const currentLogs = await getLogs();
    const processedLogs = reconcileLogs(currentLogs);
    const savedLogs = await replaceProcessedLogs(processedLogs);

    return NextResponse.json({
      processed: savedLogs.length,
      logs: savedLogs,
      insights: buildInsights(savedLogs),
      sourceStats: buildSourceStats(savedLogs)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
