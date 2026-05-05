import { clsx } from "clsx";

type ConfidenceBadgeProps = {
  confidence: number;
};

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const level =
    confidence >= 0.8 ? "high" : confidence >= 0.55 ? "medium" : "low";

  return (
    <span
      className={clsx(
        "inline-flex h-7 min-w-16 items-center justify-center rounded-md px-2 text-xs font-semibold",
        level === "high" && "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30",
        level === "medium" && "bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30",
        level === "low" && "bg-rose-400/15 text-rose-300 ring-1 ring-rose-400/30"
      )}
    >
      {Math.round(confidence * 100)}%
    </span>
  );
}
