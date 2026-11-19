import React from "react";
import { cn } from "@/lib/utils";

const TONES = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
  info: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20",
  amber: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
  rose: "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20",
  slate: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10",
};

const DOT = {
  success: "bg-emerald-500",
  info: "bg-blue-500",
  indigo: "bg-indigo-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  slate: "bg-slate-400",
};

export const StatusPill = ({ label, tone = "slate", pulse = true, className, ...props }) => {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium",
        TONES[tone],
        className
      )}
      {...props}
    >
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping",
              DOT[tone]
            )}
          />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", DOT[tone])} />
      </span>
      {label}
    </div>
  );
};
