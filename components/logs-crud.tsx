"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Database, Pencil, Plus, Trash2 } from "lucide-react";
import { LOG_SOURCES, type LogRecord, type LogSource } from "@/lib/types";

type FormState = {
  id: string;
  source: LogSource;
  event: string;
  rawTimestamp: string;
  metadata: string;
};

const emptyForm: FormState = {
  id: "",
  source: "Auth Service",
  event: "",
  rawTimestamp: new Date().toISOString(),
  metadata: "{\n  \"environment\": \"production\"\n}"
};

export function LogsCrud() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") ?? "create";
  const [mode, setMode] = useState(initialMode);
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [status, setStatus] = useState("Ready to manage reconciled logs.");

  const selectedLog = useMemo(
    () => logs.find((log) => log._id === form.id),
    [form.id, logs]
  );

  async function refreshLogs() {
    const response = await fetch("/api/logs?source=all");
    const data = await response.json();

    if (!response.ok) {
      setStatus(data.error ?? "Unable to load logs.");
      return;
    }

    setLogs(data.logs);
  }

  function fillFromLog(id: string) {
    const log = logs.find((item) => item._id === id);
    setForm(
      log
        ? {
            id: log._id ?? "",
            source: log.source,
            event: log.event,
            rawTimestamp: log.rawTimestamp,
            metadata: JSON.stringify(log.metadata ?? {}, null, 2)
          }
        : { ...emptyForm, id: "" }
    );
  }

  function bodyFromForm() {
    return {
      id: form.id,
      source: form.source,
      event: form.event,
      rawTimestamp: form.rawTimestamp,
      metadata: JSON.parse(form.metadata || "{}")
    };
  }

  async function createLog() {
    const response = await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyFromForm())
    });
    const data = await response.json();
    setStatus(response.ok ? "Created log and saved it to MongoDB." : data.error ?? "Create failed.");
    await refreshLogs();
  }

  async function updateSelectedLog() {
    if (!form.id) {
      setStatus("Choose an existing log before updating.");
      return;
    }

    const response = await fetch("/api/logs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyFromForm())
    });
    const data = await response.json();
    setStatus(response.ok ? "Updated selected log." : data.error ?? "Update failed.");
    await refreshLogs();
  }

  async function deleteSelectedLog() {
    if (!form.id) {
      setStatus("Choose an existing log before deleting.");
      return;
    }

    const response = await fetch(`/api/logs?id=${encodeURIComponent(form.id)}`, {
      method: "DELETE"
    });
    const data = await response.json();
    setStatus(response.ok ? "Deleted selected log." : data.error ?? "Delete failed.");
    setForm(emptyForm);
    await refreshLogs();
  }

  useEffect(() => {
    refreshLogs();
  }, []);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">Logs</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Logs CRUD</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Create, update, and delete records through the same MongoDB-backed log model used by the upload and timeline pipeline.
        </p>
      </header>

      <section className="grid gap-5 xl:grid-cols-[24rem_1fr]">
        <div className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
          <div className="mb-4 flex gap-2">
            {[
              { id: "create", label: "Create", icon: Plus },
              { id: "update", label: "Update", icon: Pencil },
              { id: "delete", label: "Delete", icon: Trash2 }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={`inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md text-sm font-semibold transition ${
                    mode === item.id ? "bg-cyan-300 text-slate-950" : "border border-white/10 bg-white/5 text-slate-300"
                  }`}
                >
                  <Icon size={16} aria-hidden />
                  {item.label}
                </button>
              );
            })}
          </div>

          {(mode === "update" || mode === "delete") && (
            <label className="mb-4 block text-sm font-medium text-slate-300">
              Existing log
              <select
                value={form.id}
                onChange={(event) => fillFromLog(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-200"
              >
                <option value="">Select a log</option>
                {logs.map((log) => (
                  <option key={log._id} value={log._id}>
                    {log.source} · {log.event}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-300">
              Service name
              <select
                value={form.source}
                onChange={(event) => setForm((value) => ({ ...value, source: event.target.value as LogSource }))}
                className="mt-2 h-11 w-full rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-200"
              >
                {LOG_SOURCES.map((source) => (
                  <option key={source}>{source}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-300">
              Event
              <input
                value={form.event}
                onChange={(event) => setForm((value) => ({ ...value, event: event.target.value }))}
                placeholder="payment.authorized"
                className="mt-2 h-11 w-full rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-200"
              />
            </label>

            <label className="block text-sm font-medium text-slate-300">
              Timestamp
              <input
                value={form.rawTimestamp}
                onChange={(event) => setForm((value) => ({ ...value, rawTimestamp: event.target.value }))}
                className="mt-2 h-11 w-full rounded-md border border-white/10 bg-slate-950/60 px-3 font-mono text-sm text-slate-100 outline-none transition focus:border-cyan-200"
              />
            </label>

            <label className="block text-sm font-medium text-slate-300">
              Metadata
              <textarea
                value={form.metadata}
                onChange={(event) => setForm((value) => ({ ...value, metadata: event.target.value }))}
                rows={7}
                className="mt-2 w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-3 font-mono text-sm text-slate-100 outline-none transition focus:border-cyan-200"
              />
            </label>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <button type="button" onClick={createLog} className="h-11 rounded-md bg-emerald-300 text-sm font-semibold text-slate-950">
              Create
            </button>
            <button type="button" onClick={updateSelectedLog} className="h-11 rounded-md bg-cyan-300 text-sm font-semibold text-slate-950">
              Update
            </button>
            <button type="button" onClick={deleteSelectedLog} className="h-11 rounded-md bg-rose-300 text-sm font-semibold text-slate-950">
              Delete
            </button>
          </div>

          <p className="mt-4 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-300">{status}</p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.05] p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Stored Logs</h2>
              <p className="text-sm text-slate-400">Select a row to prepare an update or delete operation.</p>
            </div>
            <Database className="text-cyan-200" size={22} aria-hidden />
          </div>

          <div className="space-y-2">
            {logs.map((log) => (
              <button
                key={log._id}
                type="button"
                onClick={() => fillFromLog(log._id ?? "")}
                className={`w-full rounded-lg border p-3 text-left transition hover:-translate-y-0.5 ${
                  selectedLog?._id === log._id ? "border-cyan-200 bg-cyan-300/10" : "border-white/10 bg-black/20"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{log.event}</p>
                  <span className="rounded-md bg-white/8 px-2 py-1 text-xs text-slate-300">{log.source}</span>
                </div>
                <p className="mt-2 font-mono text-xs text-cyan-200">{log.normalizedTimestamp}</p>
                <p className="mt-1 text-xs capitalize text-slate-500">
                  {log.status} · {Math.round(log.confidence <= 1 ? log.confidence * 100 : log.confidence)}% confidence
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
