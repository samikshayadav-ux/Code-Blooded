import { ArrowRight, GitBranch } from "lucide-react";
import { LOG_SOURCES, type LogRecord } from "@/lib/types";

type TimelineProps = {
  logs: LogRecord[];
};

export function Timeline({ logs }: TimelineProps) {
  const confidenceTone = (confidence: number) => {
    if (confidence >= 0.8) return "bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.55)]";
    if (confidence >= 0.55) return "bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.55)]";
    return "bg-rose-300 shadow-[0_0_18px_rgba(253,164,175,0.55)]";
  };

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05] p-4">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Causal Timeline</h2>
          <p className="text-sm text-slate-400">UTC-normalized sequence reconstructed across service boundaries.</p>
        </div>
        <GitBranch className="text-cyan-200" size={22} aria-hidden />
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[9rem_repeat(4,minmax(8rem,1fr))] items-center gap-3 border-b border-white/10 pb-3 text-xs font-semibold text-slate-400">
            <span>Service lane</span>
            {["1am", "9am", "3pm", "6pm"].map((marker) => (
              <span key={marker} className="text-center">
                {marker}
              </span>
            ))}
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute left-[9rem] right-0 top-0 grid h-full grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((marker) => (
                <div key={marker} className="border-l border-white/10" />
              ))}
            </div>

            {LOG_SOURCES.map((source) => {
              const sourceLogs = logs.filter((log) => log.source === source);
              return (
                <div key={source} className="grid min-h-28 grid-cols-[9rem_1fr] items-center gap-3 border-b border-white/10 py-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{source}</p>
                    <p className="mt-1 text-xs text-slate-500">{sourceLogs.length} events</p>
                  </div>
                  <div className="relative h-20 rounded-lg bg-black/20">
                    <div className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-cyan-300/30 via-white/20 to-cyan-300/30" />
                    {sourceLogs.map((log, index) => {
                      const time = new Date(log.normalizedTimestamp);
                      const percent = ((time.getUTCHours() * 60 + time.getUTCMinutes()) / 1440) * 100;
                      const left = Math.min(94, Math.max(6, percent));
                      return (
                        <div
                          key={`${log._id ?? log.eventId ?? log.event}-${index}`}
                          className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                          style={{ left: `${left}%` }}
                        >
                          {index > 0 && (
                            <ArrowRight
                              className="absolute -left-8 top-1/2 -translate-y-1/2 text-cyan-200/50"
                              size={16}
                              aria-hidden
                            />
                          )}
                          <button
                            type="button"
                            className={`size-5 rounded-full ring-4 ring-slate-950/70 transition duration-300 group-hover:scale-125 ${confidenceTone(log.confidence)}`}
                            aria-label={`${log.event} confidence ${Math.round(log.confidence * 100)} percent`}
                          />
                          <div className="pointer-events-none absolute bottom-8 left-1/2 z-10 w-64 -translate-x-1/2 rounded-lg border border-white/10 bg-slate-950/95 p-3 text-left opacity-0 shadow-2xl transition duration-200 group-hover:opacity-100">
                            <p className="text-sm font-semibold text-white">{log.event}</p>
                            <p className="mt-1 font-mono text-xs text-cyan-200">{time.toISOString()}</p>
                            <p className="mt-2 text-xs capitalize text-slate-400">
                              {log.status} · {Math.round(log.confidence * 100)}% confidence
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Correlation: {log.correlationId || "none"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
