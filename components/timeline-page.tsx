"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Filter } from "lucide-react";
import { Timeline } from "@/components/timeline";
import { LOG_SOURCES, type LogRecord, type LogSource } from "@/lib/types";

type FilterValue = "all" | LogSource;

export function TimelinePage() {
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [status, setStatus] = useState("Loading timeline...");
  const visibleLogs = useMemo(() => (filter === "all" ? logs : logs.filter((log) => log.source === filter)), [filter, logs]);

  async function loadTimeline() {
    const response = await fetch("/api/timeline?source=all");
    const data = await response.json();
    setStatus(response.ok ? `Loaded ${data.logs.length} records.` : data.error ?? "Unable to load timeline.");
    if (response.ok) setLogs(data.logs);
  }

  useEffect(() => {
    loadTimeline();
  }, []);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">Timeline</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Lane-Based Causal Timeline</h1>
        <p className="mt-2 text-sm text-slate-400">{status}</p>
      </header>

      <section className="mb-5 flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <Filter size={17} className="text-cyan-200" aria-hidden />
          Filter by source
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", ...LOG_SOURCES] as FilterValue[]).map((source) => (
            <button
              key={source}
              type="button"
              onClick={() => setFilter(source)}
              className={`h-9 rounded-md px-3 text-xs font-semibold transition ${
                filter === source ? "bg-cyan-300 text-slate-950" : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {source === "all" ? "All sources" : source}
            </button>
          ))}
        </div>
      </section>

      <Timeline logs={visibleLogs} />
    </main>
  );
}
