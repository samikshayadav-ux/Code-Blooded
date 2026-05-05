import { AlertTriangle, CheckCircle2, GitBranch } from "lucide-react";
import { ConfidenceBadge } from "@/components/confidence-badge";
import type { LogRecord } from "@/lib/types";

type TimelineProps = {
  logs: LogRecord[];
};

export function Timeline({ logs }: TimelineProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05] p-4">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Causal Timeline</h2>
          <p className="text-sm text-slate-400">UTC-normalized sequence reconstructed across service boundaries.</p>
        </div>
        <GitBranch className="text-cyan-200" size={22} aria-hidden />
      </div>

      <div className="space-y-3">
        {logs.map((log, index) => {
          const isNormal = log.status === "normal";

          return (
            <article
              key={`${log._id ?? log.eventId ?? log.event}-${index}`}
              className="grid gap-3 rounded-lg border border-white/10 bg-black/20 p-3 md:grid-cols-[11rem_1fr_auto]"
            >
              <div>
                <p className="font-mono text-xs text-cyan-200">
                  {new Date(log.normalizedTimestamp).toISOString()}
                </p>
                <p className="mt-1 text-xs text-slate-500">Raw: {log.rawTimestamp}</p>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {isNormal ? (
                    <CheckCircle2 className="text-emerald-300" size={17} aria-hidden />
                  ) : (
                    <AlertTriangle className="text-amber-300" size={17} aria-hidden />
                  )}
                  <h3 className="truncate text-sm font-semibold text-slate-100">{log.event}</h3>
                  <span className="rounded-md bg-white/8 px-2 py-1 text-xs text-slate-300">
                    {log.source}
                  </span>
                  <span className="rounded-md bg-white/8 px-2 py-1 text-xs capitalize text-slate-300">
                    {log.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Correlation: {log.correlationId || "none"} · Sequence: {log.sequence ?? "n/a"}
                </p>
              </div>
              <div className="flex items-start md:justify-end">
                <ConfidenceBadge confidence={log.confidence} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
