"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Database, Filter, GitCompareArrows, Network, Radar, ShieldX } from "lucide-react";
import { InsightsPanel } from "@/components/insights-panel";
import { SourceCards } from "@/components/source-cards";
import { Timeline } from "@/components/timeline";
import { UploadPanel } from "@/components/upload-panel";
import { LOG_SOURCES, type LogRecord, type LogSource, type TimelineResponse } from "@/lib/types";

type FilterValue = "all" | LogSource;

export default function Dashboard() {
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [timeline, setTimeline] = useState<TimelineResponse>({
    logs: [],
    insights: [],
    sourceStats: []
  });
  const [filter, setFilter] = useState<FilterValue>("all");
  const [status, setStatus] = useState("Ready. Sample data loads automatically when MongoDB is empty.");
  const [isBusy, setIsBusy] = useState(false);

  const visibleLogs = useMemo(
    () => (filter === "all" ? logs : logs.filter((log) => log.source === filter)),
    [filter, logs]
  );
  const duplicateCount = logs.filter((log) => log.status === "duplicate").length;
  const missingCount = logs.filter((log) => log.status === "missing").length;
  const outOfOrderCount = logs.filter((log) => log.status === "out-of-order").length;

  async function loadTimeline(nextFilter: FilterValue = filter) {
    setIsBusy(true);
    setStatus("Fetching reconciled timeline...");
    try {
      const response = await fetch(`/api/timeline?source=${encodeURIComponent(nextFilter)}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Unable to load timeline.");

      setTimeline(data);
      setLogs(data.logs);
      setStatus(`Loaded ${data.logs.length} timeline records.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load timeline.");
    } finally {
      setIsBusy(false);
    }
  }

  async function uploadFile(file: File) {
    setIsBusy(true);
    setStatus(`Uploading ${file.name}...`);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Upload failed.");

      setStatus(`Inserted ${data.inserted} logs from ${file.name}. Skipped ${data.skipped} duplicate logs.`);
      await loadTimeline("all");
      setFilter("all");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function processLogs() {
    setIsBusy(true);
    setStatus("Running reconciliation pipeline...");
    try {
      const response = await fetch("/api/process", { method: "POST" });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Processing failed.");

      setTimeline(data);
      setLogs(data.logs);
      setStatus(`Processed ${data.processed} logs and rebuilt the causal timeline.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Processing failed.");
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    loadTimeline("all");
    // Initial load should run once and then user controls refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
            <Network size={14} aria-hidden />
            Distributed Log Reconciliation
          </div>
          <h1 className="max-w-3xl text-3xl font-semibold text-white sm:text-4xl">
            Distributed Log Reconciliation System
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Normalize logs from four simulated services, detect duplicate, missing, out-of-order,
            and causal anomalies, then rebuild one confidence-scored UTC timeline.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:min-w-72">
          <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Database size={15} aria-hidden />
              Records
            </div>
            <p className="mt-2 text-2xl font-semibold text-white">{logs.length}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Radar size={15} aria-hidden />
              Anomalies
            </div>
            <p className="mt-2 text-2xl font-semibold text-amber-100">
              {logs.filter((log) => log.status !== "normal").length}
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Out of Order Logs",
            value: outOfOrderCount,
            icon: GitCompareArrows,
            tone: "from-emerald-400/22 to-cyan-400/10 text-emerald-200",
            badge: "OK"
          },
          {
            label: "Duplicate Logs",
            value: duplicateCount,
            icon: AlertTriangle,
            tone: "from-amber-400/24 to-orange-400/10 text-amber-200",
            badge: "Watch"
          },
          {
            label: "Missing Logs",
            value: missingCount,
            icon: ShieldX,
            tone: "from-rose-400/24 to-red-400/10 text-rose-200",
            badge: "Risk"
          },
          {
            label: "Total Logs Processed",
            value: logs.length,
            icon: Database,
            tone: "from-sky-400/24 to-indigo-400/10 text-sky-200",
            badge: "Live"
          }
        ].map((card, index) => {
          const Icon = card.icon;
          return (
            <article
              key={card.label}
              className={`animate-rise-in rounded-lg border border-white/10 bg-gradient-to-br ${card.tone} p-4 shadow-glow transition duration-300 hover:-translate-y-0.5 hover:border-white/20`}
              style={{ animationDelay: `${index * 55}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-md bg-white/10">
                  <Icon size={20} aria-hidden />
                </div>
                <span className="rounded-md bg-black/20 px-2 py-1 text-xs font-semibold text-slate-100">
                  {card.badge}
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold text-white">{card.value}</p>
              <p className="mt-1 text-sm font-medium text-slate-300">{card.label}</p>
            </article>
          );
        })}
      </section>

      <UploadPanel
        isBusy={isBusy}
        status={status}
        onUpload={uploadFile}
        onProcess={processLogs}
        onRefresh={() => loadTimeline(filter)}
      />

      <SourceCards stats={timeline.sourceStats} />

      <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <Filter size={17} className="text-cyan-200" aria-hidden />
          Filter by source
        </div>
        <div className="relative w-full sm:w-72">
          <select
            value={filter}
            onChange={(event) => {
              const source = event.target.value as FilterValue;
              setFilter(source);
              loadTimeline(source);
            }}
            className="h-11 w-full appearance-none rounded-md border border-white/10 bg-slate-950/60 px-3 pr-10 text-sm font-semibold text-slate-100 outline-none transition hover:bg-white/8 focus:border-cyan-200"
          >
            {(["all", ...LOG_SOURCES] as FilterValue[]).map((source) => (
              <option key={source} value={source}>
                {source === "all" ? "All sources" : source}
              </option>
            ))}
          </select>
          <ChevronDown
            size={17}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cyan-200"
            aria-hidden
          />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <Timeline logs={visibleLogs} />
        <InsightsPanel insights={timeline.insights} />
      </div>
    </main>
  );
}
