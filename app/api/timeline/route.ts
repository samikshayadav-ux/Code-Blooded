import { NextResponse } from "next/server";
import { getLogs, insertLogs } from "@/lib/logs";
import { buildInsights, buildSourceStats, generateSampleLogs } from "@/lib/reconciliation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source") ?? "all";
    let logs = await getLogs(source);

    if (logs.length === 0 && source === "all") {
      logs = await insertLogs(generateSampleLogs());
    }

    return NextResponse.json({
      logs,
      insights: buildInsights(logs),
      sourceStats: buildSourceStats(logs)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Timeline lookup failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
