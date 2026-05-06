import { NextResponse } from "next/server";
import { getReconciliationRun, runAndSaveReconciliation } from "@/lib/reconciliation-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const run = await getReconciliationRun("all");
    return NextResponse.json(run);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reconciliation lookup failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const run = await runAndSaveReconciliation();
    return NextResponse.json(run);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reconciliation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
