"use client";

import { useEffect, useMemo, useState } from "react";
import { Database, Filter, Network, Radar } from "lucide-react";
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

      setStatus(`Inserted ${data.inserted} logs from ${file.name}.`);
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
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
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
        <div className="flex flex-wrap gap-2">
          {(["all", ...LOG_SOURCES] as FilterValue[]).map((source) => (
            <button
              key={source}
              type="button"
              onClick={() => {
                setFilter(source);
                loadTimeline(source);
              }}
              className={`h-9 rounded-md px-3 text-xs font-semibold transition ${
                filter === source
                  ? "bg-cyan-300 text-slate-950"
                  : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {source === "all" ? "All sources" : source}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <Timeline logs={visibleLogs} />
        <InsightsPanel insights={timeline.insights} />
      </div>
    </main>
  );
}
