"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, CloudUpload, Play, RefreshCw } from "lucide-react";

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
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isError = /failed|unable|malformed|unsupported|missing|required|invalid/i.test(status);
  const isSuccess = /inserted|uploaded|processed|loaded|created|updated|deleted|reconciled/i.test(status) && !isError;

  function upload(file?: File) {
    if (!file || isBusy) return;
    onUpload(file);
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            upload(event.dataTransfer.files?.[0]);
          }}
          className={`flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-5 text-center transition ${
            isDragging
              ? "border-cyan-200 bg-cyan-300/15 shadow-glow"
              : "border-cyan-300/40 bg-cyan-300/5 hover:bg-cyan-300/10"
          }`}
        >
          <CloudUpload className="mb-2 text-cyan-200" size={26} aria-hidden />
          <span className="text-sm font-medium text-slate-100">Drop logs here or choose a file</span>
          <span className="mt-1 text-xs text-slate-400">Supports .json, .ndjson, and .csv with service, event, timestamp, correlationId, sequence, metadata.</span>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept=".json,.ndjson,.csv,application/json,application/x-ndjson,text/csv"
            disabled={isBusy}
            onChange={(event) => {
              upload(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>

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
      <div
        className={`mt-4 flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
          isError
            ? "border-rose-300/25 bg-rose-300/10 text-rose-100"
            : isSuccess
              ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
              : "border-white/10 bg-black/20 text-slate-300"
        }`}
      >
        {isError ? <AlertCircle size={16} aria-hidden /> : <CheckCircle2 size={16} aria-hidden />}
        {status}
      </div>
    </section>
  );
}
