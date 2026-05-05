import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { LogsCrud } from "@/components/logs-crud";

export default function LogsRoute() {
  return (
    <AppShell>
      <Suspense fallback={<main className="p-6 text-slate-300">Loading logs...</main>}>
        <LogsCrud />
      </Suspense>
    </AppShell>
  );
}
