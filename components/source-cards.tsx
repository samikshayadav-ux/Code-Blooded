import { Activity, Bell, CreditCard, KeyRound, PackageCheck } from "lucide-react";
import type { SourceStat } from "@/lib/types";
import { LOG_SOURCES } from "@/lib/types";

const ICONS = {
  "Auth Service": KeyRound,
  "Payment Service": CreditCard,
  "Notification Service": Bell,
  "Inventory Service": PackageCheck
};

type SourceCardsProps = {
  stats: SourceStat[];
};

export function SourceCards({ stats }: SourceCardsProps) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {LOG_SOURCES.map((source) => {
        const stat = stats.find((item) => item.source === source);
        const Icon = ICONS[source] ?? Activity;

        return (
          <article
            key={source}
            className="rounded-lg border border-white/10 bg-white/[0.045] p-4 shadow-glow"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-md bg-cyan-400/12 text-cyan-200">
                  <Icon size={20} aria-hidden />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">{source}</h2>
                  <p className="text-xs text-slate-400">
                    {stat?.latestTimestamp
                      ? new Date(stat.latestTimestamp).toLocaleTimeString()
                      : "Awaiting logs"}
                  </p>
                </div>
              </div>
              <span className="text-2xl font-semibold text-white">{stat?.total ?? 0}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-black/20 p-2">
                <p className="text-slate-500">Anomalies</p>
                <p className="mt-1 font-semibold text-rose-200">{stat?.anomalies ?? 0}</p>
              </div>
              <div className="rounded-md bg-black/20 p-2">
                <p className="text-slate-500">Avg confidence</p>
                <p className="mt-1 font-semibold text-emerald-200">
                  {Math.round(stat?.averageConfidence ?? 0)}%
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
