"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, GitCompareArrows, HelpCircle, ListChecks, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { InsightsPanel } from "@/components/insights-panel";
import type { LogRecord, ReconciliationRun, ReconciliationSummary } from "@/lib/types";

const emptySummary: ReconciliationSummary = {
  rawCount: 0,
  cleanedCount: 0,
  duplicatesRemoved: 0,
  eventsReordered: 0,
  missingEventsInferred: 0,
  timestampConflictsResolved: 0,
  missingCorrelationIds: 0,
  missingMetadata: 0,
  rawConfidenceScore: 100,
  reconciledConfidenceScore: 100,
  rawConfidenceColor: "green",
  reconciledConfidenceColor: "green",
  confidenceScore: 100,
  confidenceColor: "green",
  rawSequence: [],
  reconciledSequence: [],
  lowConfidenceReasons: []
};

function sequenceText(sequence: string[]) {
  return sequence.length ? sequence.join(" -> ") : "No sequence available";
}

function scoreTone(score: number) {
  if (score >= 90) return "bg-emerald-300 text-emerald-100 border-emerald-300/30";
  if (score >= 60) return "bg-amber-300 text-amber-100 border-amber-300/30";
  return "bg-rose-300 text-rose-100 border-rose-300/30";
}

function ConfidenceBar({
  title,
  score,
  explanation
}: {
  title: string;
  score: number;
  explanation: string;
}) {
  const tone = scoreTone(score);
  const fillColor = tone.split(" ")[0];

  return (
    <article className={`rounded-lg border bg-white/[0.05] p-4 ${tone.replace(fillColor, "")}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm leading-5 text-slate-400">{explanation}</p>
        </div>
        <span className="text-2xl font-semibold text-white">{score}%</span>
      </div>
      <div title="Confidence uses green for 90-100, yellow for 60-89, and red for 0-59." className="h-3 overflow-hidden rounded-md bg-black/30">
        <div
          className={`h-full rounded-md ${fillColor} transition-all duration-700 ease-out`}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
    </article>
  );
}

function logKind(log: LogRecord, mode: "raw" | "cleaned") {
  if (log.predicted) return { label: "Inferred", className: "bg-violet-300/15 text-violet-100 ring-1 ring-violet-300/25" };
  if (mode === "cleaned" && log.status !== "normal") return { label: "Repaired", className: "bg-cyan-300/15 text-cyan-100 ring-1 ring-cyan-300/25" };
  if (mode === "raw") return { label: "Raw", className: "bg-slate-300/10 text-slate-200 ring-1 ring-white/10" };
  return { label: "Cleaned", className: "bg-emerald-300/15 text-emerald-100 ring-1 ring-emerald-300/25" };
}

function LogList({ title, logs, mode }: { title: string; logs: LogRecord[]; mode: "raw" | "cleaned" }) {
  return (
    <section className="min-h-[32rem] rounded-lg border border-white/10 bg-white/[0.05] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="text-sm text-slate-400">{logs.length} records</p>
        </div>
        <ListChecks className="text-cyan-200" size={21} aria-hidden />
      </div>

      <div className="space-y-2">
        {logs.map((log, index) => {
          const kind = logKind(log, mode);
          return (
          <article key={`${log._id ?? log.eventId ?? log.event}-${index}`} className="rounded-lg border border-white/10 bg-black/20 p-3 transition hover:border-cyan-200/30 hover:bg-white/[0.07]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">{log.event}</p>
              <ConfidenceBadge confidence={log.confidence} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className={`rounded-md px-2 py-1 font-semibold ${kind.className}`}>{kind.label}</span>
              <span className="rounded-md bg-white/8 px-2 py-1">{log.source}</span>
              <span
                title={
                  log.predicted
                    ? "Inferred logs are predicted events inserted because an expected workflow step was missing."
                    : log.status === "duplicate"
                      ? "Duplicate logs share the same event identity and are removed from the canonical timeline."
                      : log.status === "causal-gap"
                        ? "A causal gap means the event could not be fully linked to its expected workflow context."
                        : "Status assigned by the reconciliation engine."
                }
                className="inline-flex items-center gap-1 rounded-md bg-white/8 px-2 py-1 capitalize"
              >
                {log.predicted ? "predicted" : log.status}
                <HelpCircle size={12} aria-hidden />
              </span>
              <span title="Timestamp normalized to UTC and repaired when needed." className="font-mono text-cyan-200">{log.normalizedTimestamp}</span>
            </div>
            <p title="correlationId groups distributed service events into one workflow trace." className="mt-2 truncate text-xs text-slate-500">
              Correlation: {log.correlationId || "none"}
            </p>
            {!!log.reconciliationNotes?.length && (
              <p className="mt-2 text-xs leading-5 text-slate-400">{log.reconciliationNotes[0]}</p>
            )}
          </article>
        );
        })}
      </div>
    </section>
  );
}

export function ReconciliationPage() {
  const [run, setRun] = useState<ReconciliationRun>({
    rawLogs: [],
    cleanedLogs: [],
    insights: [],
    sourceStats: [],
    summary: emptySummary
  });
  const [status, setStatus] = useState("Loading reconciliation state...");
  const [isBusy, setIsBusy] = useState(false);
  const summary = run.summary ?? emptySummary;

  async function loadRun(method: "GET" | "POST" = "GET") {
    setIsBusy(true);
    setStatus(method === "POST" ? "Running reconciliation engine..." : "Loading reconciliation state...");
    try {
      const response = await fetch("/api/reconciliation", { method });
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error("Reconciliation API is warming up. Refresh or run the engine again.");
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load reconciliation.");
      setRun(data);
      setStatus(
        method === "POST"
          ? `Reconciled ${data.rawLogs.length} raw records into ${data.cleanedLogs.length} canonical records.`
          : `Loaded ${data.cleanedLogs.length} cleaned records.`
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load reconciliation.");
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    loadRun();
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">Reconciliation</p>
            <span className="rounded-md border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 text-xs font-semibold text-emerald-100">
              Cleaned Timeline
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold text-white">Canonical Reconciliation Engine</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{status}</p>
        </div>
        <button
          type="button"
          onClick={() => loadRun("POST")}
          disabled={isBusy}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={17} className={isBusy ? "animate-spin" : ""} aria-hidden />
          Run Engine
        </button>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Duplicates Removed", value: summary.duplicatesRemoved, icon: Trash2 },
          { label: "Events Reordered", value: summary.eventsReordered, icon: GitCompareArrows },
          { label: "Missing Inferred", value: summary.missingEventsInferred, icon: Sparkles },
          { label: "Timestamp Fixes", value: summary.timestampConflictsResolved, icon: CheckCircle2 },
          { label: "Reconciled Confidence", value: `${summary.reconciledConfidenceScore}%`, icon: CheckCircle2 }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="rounded-lg border border-white/10 bg-white/[0.05] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-400">{item.label}</p>
                <Icon className="text-cyan-200" size={16} aria-hidden />
              </div>
              <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <ConfidenceBar
          title="Raw Log Confidence"
          score={summary.rawConfidenceScore}
          explanation="Raw confidence reflects trust in original logs before cleanup."
        />
        <ConfidenceBar
          title="Reconciled Confidence"
          score={summary.reconciledConfidenceScore}
          explanation="Reconciled confidence reflects trust after anomaly correction."
        />
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.05] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
          <ArrowRight className="text-cyan-200" size={17} aria-hidden />
          Raw sequence to reconciled sequence
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <p className="rounded-md bg-black/20 p-3 text-sm text-slate-300">{sequenceText(summary.rawSequence)}</p>
          <ArrowRight className="hidden text-cyan-200 lg:block" size={20} aria-hidden />
          <p className="rounded-md bg-black/20 p-3 text-sm text-slate-100">{sequenceText(summary.reconciledSequence)}</p>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <LogList title="Raw Logs" logs={run.rawLogs} mode="raw" />
        <LogList title="Cleaned Logs" logs={run.cleanedLogs} mode="cleaned" />
      </div>

      <InsightsPanel insights={run.insights} />
    </main>
  );
}
