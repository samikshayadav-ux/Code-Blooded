"use client";

import { CloudUpload, Play, RefreshCw } from "lucide-react";

type UploadPanelProps = {
  isBusy: boolean;
  status: string;
  onUpload: (file: File) => void;
  onProcess: () => void;
  onRefresh: () => void;
};

export function UploadPanel({
  isBusy,
  status,
  onUpload,
  onProcess,
  onRefresh
}: UploadPanelProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-cyan-300/40 bg-cyan-300/5 px-4 py-5 text-center transition hover:bg-cyan-300/10">
          <CloudUpload className="mb-2 text-cyan-200" size={26} aria-hidden />
          <span className="text-sm font-medium text-slate-100">Upload JSON or CSV logs</span>
          <span className="mt-1 text-xs text-slate-400">Fields can include source, event, timestamp, correlationId, sequence, metadata.</span>
          <input
            className="sr-only"
            type="file"
            accept=".json,.ndjson,.csv,application/json,application/x-ndjson,text/csv"
            disabled={isBusy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUpload(file);
              event.target.value = "";
            }}
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row lg:min-w-80">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={isBusy}
            onClick={onProcess}
          >
            <Play size={17} aria-hidden />
            Process
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={isBusy}
            onClick={onRefresh}
          >
            <RefreshCw size={17} aria-hidden />
            Refresh
          </button>
        </div>
      </div>
      <div className="mt-4 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-300">
        <span className="mr-2 inline-flex size-2 rounded-full bg-emerald-300" />
        {status}
      </div>
    </section>
  );
}
