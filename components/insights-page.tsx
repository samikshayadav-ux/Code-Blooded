"use client";

import { useEffect, useState } from "react";
import { Lightbulb, Sparkles } from "lucide-react";
import { InsightsPanel } from "@/components/insights-panel";
import { type AnomalyInsight, type SourceStat } from "@/lib/types";

export function InsightsPage() {
  const [insights, setInsights] = useState<AnomalyInsight[]>([]);
  const [stats, setStats] = useState<SourceStat[]>([]);
  const [status, setStatus] = useState("Loading anomaly signals...");

  useEffect(() => {
    async function loadInsights() {
      const response = await fetch("/api/timeline?source=all");
      const data = await response.json();
      setStatus(response.ok ? "Insights are synced with the current timeline." : data.error ?? "Unable to load insights.");
      if (response.ok) {
        setInsights(data.insights);
        setStats(data.sourceStats);
      }
    }

    loadInsights();
  }, []);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">Insights</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Anomaly Intelligence</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{status}</p>
        </div>
        <div className="flex size-12 items-center justify-center rounded-lg border border-white/10 bg-cyan-300/10 text-cyan-200">
          <Lightbulb size={24} aria-hidden />
        </div>
      </header>

      <section className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.source} className="rounded-lg border border-white/10 bg-white/[0.05] p-4 transition hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">{stat.source}</h2>
              <Sparkles className="text-cyan-200" size={16} aria-hidden />
            </div>
            <p className="mt-4 text-3xl font-semibold text-white">{stat.anomalies}</p>
            <p className="mt-1 text-sm text-slate-400">anomalies from {stat.total} logs</p>
          </article>
        ))}
      </section>

      <InsightsPanel insights={insights} />
    </main>
  );
}
